import { useState, useEffect, useMemo, useCallback } from 'react';
import { Popup } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type { CCTVLocation } from '@/types/cctv.types';
import type { MapboxPOV, StreetViewPOV } from '../../types/geojson';
import { MediaGrid } from '../media/MediaGrid';
import { StreetViewThumbnail } from '../streetview/StreetViewThumbnail';
import { StreetViewModal } from '../streetview/StreetViewModal';
import { MapPOVButton } from '@/components/map/MapPOVButton';
import { ClearPOVButton } from '@/components/pov/ClearPOVButton';
import { formatDateTime } from '../../utils/timelineHelpers';
import { getMediaCounts, getMediaSlidesByType } from '../../utils/mediaHelpers';
import { getCachedStreetViewAvailability } from '../../services/streetViewService';
import { getLocationPOV } from '../../services/geojsonService';
import { MAP_CONFIG } from '../../constants/mapConfig';
import { HOTKEYS } from '../../constants/hotkeys';
import { isTypingInFormField } from '@/features/shared/utils';
import { useDevicePixelRatio } from '../../hooks/useDevicePixelRatio';
import { useMapTimelineStore } from '../../stores/mapTimelineStore';
import { useIsViewerMode, useAppMode } from '@/contexts/AppModeContext';

interface LocationPopupProps {
  location: CCTVLocation;
  caseDir: string;
  onClose: () => void;
  mapRef?: React.RefObject<MapRef>;
}

export const LocationPopup = ({ location, caseDir, onClose, mapRef }: LocationPopupProps) => {
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'streetview'>('images');
  const [streetViewAvailable, setStreetViewAvailable] = useState<boolean | null>(null);
  const [povData, setPovData] = useState<{ mapboxPOV: MapboxPOV | null; streetViewPOV: StreetViewPOV | null } | null>(null);
  const [loadingPOV, setLoadingPOV] = useState(true);
  const [isStreetViewModalOpen, setIsStreetViewModalOpen] = useState(false);
  const { dprClass, isDPI2x } = useDevicePixelRatio();
  // Actions accessed via getState() in handlers to avoid subscribing to entire store
  const isViewerMode = useIsViewerMode();
  const { exportData } = useAppMode();

  const mediaCounts = getMediaCounts(location);
  const hasBothMedia = mediaCounts.images > 0 && mediaCounts.videos > 0;
  const hasAnyMedia = mediaCounts.images > 0 || mediaCounts.videos > 0;
  const timingColor = MAP_CONFIG.markerColors[location.timing];

  // Generate responsive width and height using clamp()
  const popupWidth = `clamp(${MAP_CONFIG.popup.sizing.widthMin}, ${MAP_CONFIG.popup.sizing.widthPreferred}, ${MAP_CONFIG.popup.sizing.widthMax})`;

  // Version counter to trigger POV refetch after save
  const [povVersion, setPovVersion] = useState(0);

  /**
   * Callback to refresh POV data after saving
   */
  const handlePOVSaved = useCallback(() => {
    setPovVersion(v => v + 1);
  }, []);

  /**
   * Load POV data for this location
   * VIEWER MODE ENHANCEMENT: Pass in-memory GeoJSON from exportData
   */
  useEffect(() => {
    let mounted = true;

    const loadPOV = async () => {
      try {
        setLoadingPOV(true);
        // Pass preloaded GeoJSON for viewer mode
        const data = await getLocationPOV(
          caseDir,
          location.uuid,
          exportData?.geoJSON || null
        );
        if (mounted) {
          setPovData(data);
        }
      } catch (error) {
        console.error('[LocationPopup] Failed to load POV data:', error);
        if (mounted) {
          setPovData(null);
        }
      } finally {
        if (mounted) {
          setLoadingPOV(false);
        }
      }
    };

    loadPOV();

    return () => {
      mounted = false;
    };
  }, [caseDir, location.uuid, povVersion, exportData]);  // Added exportData dependency

  /**
   * Determine available tabs based on media and Street View availability
   */
  const availableTabs = useMemo(() => {
    const tabs: Array<'images' | 'videos' | 'streetview'> = [];
    if (mediaCounts.images > 0) tabs.push('images');
    if (mediaCounts.videos > 0) tabs.push('videos');
    if (streetViewAvailable) tabs.push('streetview');
    return tabs;
  }, [mediaCounts.images, mediaCounts.videos, streetViewAvailable]);

  /**
   * Open Street View modal with location context
   * Uses BOTH local state (for rendering with props) AND store state (for keyboard isolation)
   */
  const handleOpenStreetView = () => {
    setIsStreetViewModalOpen(true);
    // Also update store so timeline keyboard navigation is disabled
    useMapTimelineStore.getState().openStreetView(location.latitude, location.longitude, location.address, 'popup');
  };

  /**
   * Close Street View modal
   * Updates both local state and store state
   */
  const handleCloseStreetView = () => {
    setIsStreetViewModalOpen(false);
    // Also update store to re-enable timeline keyboard navigation
    useMapTimelineStore.getState().closeStreetView();
  };

  /**
   * Keyboard navigation for popup tabs and quick access shortcuts
   *
   * Tab Navigation:
   * - Tab = cycle forward through tabs
   * - Shift+Tab = cycle backward through tabs
   * - Enter = open current tab's media in lightbox or Street View modal
   * - Escape = close popup
   *
   * Quick Access Shortcuts:
   * - Ctrl+I = Open images in lightbox (if available)
   * - Ctrl+V = Open videos in lightbox (if available)
   * - Ctrl+S = Open Street View (if available)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts if typing in an input
      if (isTypingInFormField(e)) {
        return;
      }

      const { openLightbox } = useMapTimelineStore.getState();

      // Quick access: Ctrl+I - Open images in lightbox
      if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (mediaCounts.images > 0) {
          const slides = getMediaSlidesByType(location, caseDir, 'images');
          openLightbox(slides, 0);
        }
        return;
      }

      // Quick access: Ctrl+V - Open videos in lightbox
      if (e.ctrlKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (mediaCounts.videos > 0) {
          const slides = getMediaSlidesByType(location, caseDir, 'videos');
          openLightbox(slides, 0);
        }
        return;
      }

      // Quick access: Ctrl+S - Open Street View
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (streetViewAvailable) {
          handleOpenStreetView();
        }
        return;
      }

      // Tab key - cycle through tabs
      if (e.key === HOTKEYS.popup.TAB_NEXT && !e.shiftKey) {
        e.preventDefault();

        const currentTabIndex = availableTabs.indexOf(activeTab);
        const nextIndex = (currentTabIndex + 1) % availableTabs.length;

        setActiveTab(availableTabs[nextIndex]);
      }

      // Shift+Tab key - cycle backward through tabs
      if (e.key === HOTKEYS.popup.TAB_NEXT && e.shiftKey) {
        e.preventDefault();

        const currentTabIndex = availableTabs.indexOf(activeTab);
        const prevIndex = (currentTabIndex - 1 + availableTabs.length) % availableTabs.length;

        setActiveTab(availableTabs[prevIndex]);
      }

      // Enter key - open current tab's media
      if (e.key === HOTKEYS.popup.ACTIVATE) {
        e.preventDefault();

        if (activeTab === 'images' && mediaCounts.images > 0) {
          const slides = getMediaSlidesByType(location, caseDir, 'images');
          openLightbox(slides, 0);
        } else if (activeTab === 'videos' && mediaCounts.videos > 0) {
          const slides = getMediaSlidesByType(location, caseDir, 'videos');
          openLightbox(slides, 0);
        } else if (activeTab === 'streetview' && streetViewAvailable) {
          handleOpenStreetView();
        }
      }

      // Escape key - close popup
      if (e.key === HOTKEYS.popup.CLOSE) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, availableTabs, mediaCounts, location, caseDir, streetViewAvailable, onClose]);

  /**
   * Check Street View availability for this location
   * Uses AbortController to cancel the request if component unmounts
   */
  useEffect(() => {
    const abortController = new AbortController();
    let mounted = true;

    // Wrap the async operation to support cancellation
    const checkAvailability = async () => {
      try {
        // Note: getCachedStreetViewAvailability doesn't natively support AbortSignal
        // but we use the mounted flag to prevent state updates after unmount
        const result = await getCachedStreetViewAvailability(location.latitude, location.longitude);

        // Check if component is still mounted and not aborted
        if (mounted && !abortController.signal.aborted) {
          setStreetViewAvailable(result.available);
        }
      } catch (err) {
        // Only handle error if not aborted
        if (!abortController.signal.aborted && mounted) {
          console.error('Street View availability check failed:', err);
          setStreetViewAvailable(false);
        }
      }
    };

    checkAvailability();

    // Cleanup: abort the operation and mark as unmounted
    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [location.latitude, location.longitude]);

  // Reload POV data after save or clear
  const handlePOVChange = async () => {
    try {
      // Pass preloaded GeoJSON for viewer mode
      const data = await getLocationPOV(
        caseDir,
        location.uuid,
        exportData?.geoJSON || null
      );
      setPovData(data);
    } catch (error) {
      console.error('[LocationPopup] Failed to reload POV data:', error);
    }
  };

  // Parse persons involved into array
  const persons = location.personsInvolved?.split(',').map(p => p.trim()).filter(Boolean) || [];

  // Determine which tabs to show
  const hasStreetView = streetViewAvailable === true;
  const showTabs = hasBothMedia || hasStreetView;

  // Count how many tabs will be displayed
  const tabCount = [
    mediaCounts.images > 0,
    mediaCounts.videos > 0,
    hasStreetView
  ].filter(Boolean).length;

  // Dynamic tab styling based on number of tabs
  const getTabClasses = (isActive: boolean) => {
    // Base classes
    let classes = 'flex-1 py-2 transition-colors font-medium ';

    // Adjust padding and text size based on tab count
    if (tabCount === 3) {
      // Tighter spacing when all 3 tabs present
      classes += isDPI2x ? 'px-2 text-[10px] ' : 'px-2 text-xs ';
    } else if (tabCount === 2) {
      // Medium spacing for 2 tabs
      classes += isDPI2x ? 'px-3 text-xs ' : 'px-3 text-sm ';
    } else {
      // Full spacing for single tab
      classes += isDPI2x ? 'px-4 text-xs ' : 'px-4 text-sm ';
    }

    // Active/inactive state
    if (isActive) {
      classes += 'text-blue-600 border-b-2 border-blue-600';
    } else {
      classes += 'text-gray-500 hover:text-gray-700';
    }

    // Add focus ring for keyboard navigation
    classes += ' focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400';

    return classes;
  };

  /**
   * Auto-select first available tab
   */
  useEffect(() => {
    if (!hasAnyMedia && hasStreetView) {
      setActiveTab('streetview');
    } else if (mediaCounts.images > 0) {
      setActiveTab('images');
    } else if (mediaCounts.videos > 0) {
      setActiveTab('videos');
    }
  }, [hasAnyMedia, hasStreetView, mediaCounts.images, mediaCounts.videos]);

  return (
    <>
      <Popup
        longitude={location.longitude}
        latitude={location.latitude}
        anchor="bottom"
        offset={65}
        onClose={onClose}
        closeButton={false}
        closeOnClick={false}
        className="map-popup"
        maxWidth={popupWidth}
      >
        <div
          className={`bg-white rounded-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.1)] overflow-hidden @container/popup relative ${dprClass}`}
          style={{ width: popupWidth }}
        >
          {/* Close button - positioned inside the popup bounds */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition-colors shadow-sm"
            aria-label="Close popup"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Tabs - show if has both media OR has Street View */}
          {showTabs && (
            <div className="flex border-b border-gray-200 pr-8" role="tablist" aria-label="Media tabs">
              {mediaCounts.images > 0 && (
                <button
                  onClick={() => setActiveTab('images')}
                  className={getTabClasses(activeTab === 'images')}
                  role="tab"
                  aria-selected={activeTab === 'images'}
                  aria-controls="images-panel"
                  tabIndex={activeTab === 'images' ? 0 : -1}
                >
                  Images
                </button>
              )}
              {mediaCounts.videos > 0 && (
                <button
                  onClick={() => setActiveTab('videos')}
                  className={getTabClasses(activeTab === 'videos')}
                  role="tab"
                  aria-selected={activeTab === 'videos'}
                  aria-controls="videos-panel"
                  tabIndex={activeTab === 'videos' ? 0 : -1}
                >
                  Videos
                </button>
              )}
              {hasStreetView && (
                <button
                  onClick={() => setActiveTab('streetview')}
                  className={getTabClasses(activeTab === 'streetview')}
                  role="tab"
                  aria-selected={activeTab === 'streetview'}
                  aria-controls="streetview-panel"
                  tabIndex={activeTab === 'streetview' ? 0 : -1}
                >
                  Street View
                </button>
              )}
            </div>
          )}

          {/* Tab Content - Images (always mounted, hidden when inactive) */}
          {mediaCounts.images > 0 && (
            <div
              className={activeTab === 'images' ? 'p-3' : 'hidden'}
              id="images-panel"
              role="tabpanel"
            >
              <MediaGrid
                location={location}
                caseDir={caseDir}
                mediaType="images"
              />
            </div>
          )}

          {/* Tab Content - Videos (always mounted, hidden when inactive) */}
          {mediaCounts.videos > 0 && (
            <div
              className={activeTab === 'videos' ? 'p-3' : 'hidden'}
              id="videos-panel"
              role="tabpanel"
            >
              <MediaGrid
                location={location}
                caseDir={caseDir}
                mediaType="videos"
              />
            </div>
          )}

          {/* Tab Content - Street View (lazy-loaded only when tab is active) */}
          {hasStreetView && activeTab === 'streetview' && (
            <div
              className="p-3"
              id="streetview-panel"
              role="tabpanel"
            >
              <StreetViewThumbnail
                latitude={location.latitude}
                longitude={location.longitude}
                onDoubleClick={handleOpenStreetView}
                existingPOV={povData?.streetViewPOV ?? null}
              />
            </div>
          )}

          {/* Location Info */}
          <div className={`p-4 space-y-3 @lg/popup:space-y-4 ${isDPI2x ? 'text-xs' : 'text-sm'}`}>
            {/* Date/Time */}
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`${isDPI2x ? 'text-xs' : 'text-sm'} @lg/popup:text-base font-medium`}>
                {formatDateTime(location.realDateTime)}
              </span>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 text-gray-700">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
              </svg>
              <span className={`${isDPI2x ? 'text-xs' : 'text-sm'} @lg/popup:text-base`}>
                {location.address}
              </span>
            </div>

            {/* Notes */}
            {location.notes && (
              <div className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 rounded-r">
                <p className={`${isDPI2x ? 'text-xs' : 'text-sm'} text-gray-700`}>
                  {location.notes}
                </p>
              </div>
            )}

            {/* Persons */}
            {persons.length > 0 && (
              <div className="flex items-center gap-2">
                <span className={`${isDPI2x ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>
                  Persons:
                </span>
                <div className="flex flex-wrap gap-1">
                  {persons.map((person, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Phase/Timing */}
            <div className="flex items-center gap-2">
              <span className={`${isDPI2x ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>
                Phase:
              </span>
              <span
                className="px-2 py-0.5 text-xs rounded capitalize"
                style={{ backgroundColor: `${timingColor}20`, color: timingColor }}
              >
                {location.timing === 'pre' ? 'Pre Incident' : location.timing === 'post' ? 'Post Incident' : 'Incident'}
              </span>
            </div>

            {/* POV Buttons - HIDDEN IN VIEWER MODE */}
            {!isViewerMode && !loadingPOV && mapRef && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                {/* Map POV Button */}
                <MapPOVButton
                  locationUuid={location.uuid}
                  caseDir={caseDir}
                  mapRef={mapRef}
                  existingPOV={povData?.mapboxPOV ?? null}
                  onSaved={handlePOVChange}
                />

                {/* Clear POV Button - show if any POV data exists */}
                {(povData?.mapboxPOV || povData?.streetViewPOV) && (
                  <ClearPOVButton
                    povType="both"
                    locationUuid={location.uuid}
                    caseDir={caseDir}
                    onCleared={handlePOVChange}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </Popup>

      {/* Street View Modal - with location context for POV editing */}
      {/* Uses local state for rendering (props available), store state for keyboard isolation */}
      {isStreetViewModalOpen && (
        <StreetViewModal
          latitude={location.latitude}
          longitude={location.longitude}
          address={location.address}
          onClose={handleCloseStreetView}
          locationUuid={location.uuid}
          caseDir={caseDir}
          existingPOV={povData?.streetViewPOV ?? null}
          onPOVSaved={handlePOVSaved}
        />
      )}
    </>
  );
};
