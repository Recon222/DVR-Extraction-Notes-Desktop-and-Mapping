import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MapRef } from 'react-map-gl/mapbox';
import { useLocationStore } from '@/stores/useLocationStore';
import { useCaseStore } from '@/stores/useCaseStore';
import { useAppMode } from '@/contexts/AppModeContext';
import { EditPOVProvider } from '@/contexts/EditPOVContext';
import { ViewerHeader } from '@/components/viewer/ViewerHeader';
import { MapContainer } from './map/MapContainer';
import { TimelinePanel } from './timeline/TimelinePanel';
import { MediaLightbox } from './media/MediaLightbox';
import { HelpPanel } from './HelpPanel';
import { MapErrorBoundary } from './MapErrorBoundary';
import { useMapTimeline } from '../hooks/useMapTimeline';
import { useMapControls } from '../hooks/useMapControls';
import { useTimelinePlayback } from '../hooks/useTimelinePlayback';
import { useTimelineKeyboardNavigation } from '../hooks/useTimelineKeyboardNavigation';
import { useVideoPreloader } from '../hooks/useVideoPreloader';
import { useMapTimelineStore } from '../stores/mapTimelineStore';
import { useKeyboardContext } from '../hooks/useKeyboardContext';
import { useTouchPortalBridge } from '@/features/viewer/touchportal';
import { DOM_IDS } from '../constants/domIds';
import { HOTKEYS } from '../constants/hotkeys';
import { validateZoomLevel } from '../constants/mapConfig';
import type { TimelineFilters } from '../types';

export const MapTimelineView = () => {
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const locations = useLocationStore((state) => state.locations);
  const currentCase = useCaseStore((state) => state.currentCase);

  // NEW: Check viewer mode
  const { mode, exportData } = useAppMode();
  const isViewerMode = mode === 'viewer';

  // NEW: Get case info that works in both modes
  const caseName = isViewerMode
    ? (exportData?.caseName || 'Viewer')
    : (currentCase?.case_name || '');

  const casePath = isViewerMode
    ? '' // No file paths in viewer mode - media comes from temp dir
    : (currentCase?.case_path || '');

  // Help panel state
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);

  // Get state from Zustand store (selector pattern prevents render cascades)
  const filters = useMapTimelineStore(state => state.filters);
  const filtersOpen = useMapTimelineStore(state => state.filtersOpen);
  const lightbox = useMapTimelineStore(state => state.lightbox);
  const streetView = useMapTimelineStore(state => state.streetView);
  const setFilters = useMapTimelineStore(state => state.setFilters);
  const setFiltersOpen = useMapTimelineStore(state => state.setFiltersOpen);
  const setMapZoomGetter = useMapTimelineStore(state => state.setMapZoomGetter);

  // Main data hook - now receives filters and applies them before creating markers
  const { events, markers, dateRange, unfilteredEvents } = useMapTimeline(locations, filters);

  // Map interaction controls - now receives caseDir for POV lookup (viewer-aware)
  const { handleEventClick, handleMarkerClick } = useMapControls(
    mapRef,
    casePath  // Uses our viewer-aware variable
  );

  // Progressive reveal playback
  useTimelinePlayback(locations, handleEventClick);

  // Keyboard navigation for Up/Down arrows
  // Disabled when filters panel, lightbox, or Street View modal is open
  useTimelineKeyboardNavigation({
    events,
    locations,
    onEventClick: (locationId, index, location) => {
      handleEventClick(locationId, index, location);
    },
    // Only enable keyboard nav when no overlays are blocking
    isEnabled: !lightbox.isOpen && !streetView.isOpen && !filtersOpen && !helpPanelOpen
  });

  // Preload videos when marker is selected (viewer mode only)
  useVideoPreloader();

  // Initialize Touch Portal bridge (viewer mode only)
  // Enables tablet control of timeline during courtroom presentations
  // Pass handleEventClick to trigger map flyTo animations on step commands
  useTouchPortalBridge({
    onNavigate: handleEventClick
  });

  // Create map zoom getter for Touch Portal integration
  // Uses getter pattern to avoid storing mapRef directly in Zustand (causes immer proxy issues)
  const mapZoomGetter = useCallback(() => {
    if (!mapRef.current) return null;

    const map = mapRef.current;
    const zoomStep = 1; // Zoom step size
    const pitchStep = 10; // Pitch step in degrees (0-60 range typical)
    const bearingStep = 15; // Bearing step in degrees

    return {
      zoomIn: (lat: number, lng: number) => {
        const currentZoom = map.getZoom();
        const newZoom = validateZoomLevel(currentZoom + zoomStep);
        console.log('[MapTimelineView] Map zoom in:', { lat, lng, from: currentZoom, to: newZoom });
        map.easeTo({
          center: [lng, lat],
          zoom: newZoom,
          duration: 300
        });
      },
      zoomOut: (lat: number, lng: number) => {
        const currentZoom = map.getZoom();
        const newZoom = validateZoomLevel(currentZoom - zoomStep);
        console.log('[MapTimelineView] Map zoom out:', { lat, lng, from: currentZoom, to: newZoom });
        map.easeTo({
          center: [lng, lat],
          zoom: newZoom,
          duration: 300
        });
      },
      getZoom: () => map.getZoom(),
      pitchUp: () => {
        const currentPitch = map.getPitch();
        const newPitch = Math.min(currentPitch + pitchStep, 60); // Max pitch is 60 degrees
        console.log('[MapTimelineView] Map pitch up:', { from: currentPitch, to: newPitch });
        map.easeTo({
          pitch: newPitch,
          duration: 300
        });
      },
      pitchDown: () => {
        const currentPitch = map.getPitch();
        const newPitch = Math.max(currentPitch - pitchStep, 0); // Min pitch is 0 degrees
        console.log('[MapTimelineView] Map pitch down:', { from: currentPitch, to: newPitch });
        map.easeTo({
          pitch: newPitch,
          duration: 300
        });
      },
      bearingLeft: () => {
        const currentBearing = map.getBearing();
        const newBearing = currentBearing - bearingStep; // Rotate counter-clockwise
        console.log('[MapTimelineView] Map bearing left:', { from: currentBearing, to: newBearing });
        map.easeTo({
          bearing: newBearing,
          duration: 300
        });
      },
      bearingRight: () => {
        const currentBearing = map.getBearing();
        const newBearing = currentBearing + bearingStep; // Rotate clockwise
        console.log('[MapTimelineView] Map bearing right:', { from: currentBearing, to: newBearing });
        map.easeTo({
          bearing: newBearing,
          duration: 300
        });
      },
      panUp: () => {
        const panDistance = 150; // Pixels to pan per action
        console.log('[MapTimelineView] Map pan up');
        map.panBy([0, -panDistance], { duration: 300 });
      },
      panDown: () => {
        const panDistance = 150; // Pixels to pan per action
        console.log('[MapTimelineView] Map pan down');
        map.panBy([0, panDistance], { duration: 300 });
      },
      panLeft: () => {
        const panDistance = 150; // Pixels to pan per action
        console.log('[MapTimelineView] Map pan left');
        map.panBy([-panDistance, 0], { duration: 300 });
      },
      panRight: () => {
        const panDistance = 150; // Pixels to pan per action
        console.log('[MapTimelineView] Map pan right');
        map.panBy([panDistance, 0], { duration: 300 });
      }
    };
  }, []);

  // Set the map zoom getter in the store when component mounts
  useEffect(() => {
    setMapZoomGetter(mapZoomGetter);
    return () => setMapZoomGetter(null);
  }, [mapZoomGetter, setMapZoomGetter]);

  // Register help-panel context (always active for F12 toggle)
  // This has highest priority so F12 works even when other overlays are open
  const { isActiveContext: isHelpPanelActive } = useKeyboardContext('help-panel', true);

  // Global F12 keyboard handler for help panel
  // Uses keyboard context to ensure it has highest priority
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if help-panel context is active (should always be true)
      if (!isHelpPanelActive()) return;

      if (e.key === HOTKEYS.global.SHOW_HELP) {
        e.preventDefault();
        setHelpPanelOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpPanelActive]);

  // Wrapper for onFiltersChange to close filter panel after applying
  const handleFiltersChange = (newFilters: TimelineFilters | null) => {
    setFilters(newFilters);
    setFiltersOpen(false); // Close filters panel after applying
  };

  // Only show "No Case Loaded" if we're NOT in viewer mode AND have no case
  if (!currentCase && !isViewerMode) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Case Loaded
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Please load or create a case to view the timeline
          </p>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Locations Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Add CCTV locations to view them on the timeline map
          </p>
        </div>
      </div>
    );
  }

  return (
    <MapErrorBoundary>
      <EditPOVProvider>
        <div className="absolute inset-0 flex flex-col overflow-hidden">
          {/* Header - viewer mode only */}
          {isViewerMode && (
            <ViewerHeader
              caseName={`${exportData?.caseName || 'CCTV Chronology'} - Map View`}
              buttonLabel="Back"
              buttonIcon="back"
              buttonColor="gray"
              onButtonClick={() => navigate('/chronology')}
            />
          )}

          {/* Map content - takes remaining space */}
          <div id={DOM_IDS.FULLSCREEN_CONTAINER} className="flex-1 relative">
            {/* Map fills entire area */}
            <MapContainer
              ref={mapRef}
              markers={markers}
              locations={locations}
              caseDir={casePath}
              onMarkerClick={handleMarkerClick}
              onHelpOpen={() => setHelpPanelOpen(true)}
            />

            {/* Timeline panel overlays on top - will remain visible in fullscreen */}
            <TimelinePanel
              caseName={caseName}
              events={events}
              unfilteredEvents={unfilteredEvents}
              dateRange={dateRange}
              activeFilters={filters}
              onFiltersChange={handleFiltersChange}
              onFiltersOpenChange={setFiltersOpen}
              onEventClick={(locationId, index) => {
                const location = locations.find(l => l.uuid === locationId);  // CHANGED: Find by UUID
                if (location) {
                  handleEventClick(locationId, index, location);
                }
              }}
            />

            {/* Media lightbox - shown when user clicks media in popup */}
            {lightbox.isOpen && (
              <MediaLightbox />
            )}

            {/* Help Panel - shown when user presses F12 */}
            <HelpPanel
              isOpen={helpPanelOpen}
              onClose={() => setHelpPanelOpen(false)}
            />
          </div>
        </div>
      </EditPOVProvider>
    </MapErrorBoundary>
  );
};
