import { forwardRef, useCallback, useEffect, useState } from 'react';
import Map, { MapRef, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapTimelineStore } from '../../stores/mapTimelineStore';
import { TimelineMarker } from './TimelineMarker';
import { SearchMarker } from './SearchMarker';
import { LocationPopup } from './LocationPopup';
import { PegmanControl } from '../pegman/PegmanControl';
import { HamburgerMenuControl } from './menu';
import type { MarkerData } from '../../types';
import type { CCTVLocation } from '@/types/cctv.types';

interface MapContainerProps {
  markers: MarkerData[];
  locations: CCTVLocation[];
  caseDir: string;
  onMarkerClick: (locationId: string) => void;  // CHANGED: UUID
  onHelpOpen: () => void;
}

export const MapContainer = forwardRef<MapRef, MapContainerProps>(
  ({ markers, locations, caseDir, onMarkerClick, onHelpOpen }, ref) => {
    const { viewport, setViewport, selectedLocationId, selectLocation, searchMarker, setFlyingToLocationId } = useMapTimelineStore();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);

    // Handle map load
    const handleMapLoad = useCallback(() => {
      setIsMapReady(true);
    }, []);

    const selectedLocation = locations.find(l => l.uuid === selectedLocationId);  // CHANGED: Find by UUID

    const handleMove = useCallback((evt: { viewState: { longitude: number; latitude: number; zoom: number } }) => {
      setViewport({
        longitude: evt.viewState.longitude,
        latitude: evt.viewState.latitude,
        zoom: evt.viewState.zoom
      });
    }, [setViewport]);

    // Custom fullscreen handler
    const handleFullscreenClick = useCallback(() => {
      const container = document.getElementById('map-timeline-fullscreen-container');
      if (!container) {
        console.error('[MapContainer] Fullscreen container not found');
        return;
      }

      if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err) => {
          console.error('[MapContainer] Error attempting to enable fullscreen:', err);
        });
      } else {
        document.exitFullscreen();
      }
    }, []);

    // Monitor fullscreen state
    useEffect(() => {
      const handleFullscreenChange = () => {
        const isNowFullscreen = !!document.fullscreenElement;
        setIsFullscreen(isNowFullscreen);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }, []);

    // NEW: Add moveend listener to clear flyingToLocationId when flyTo animation completes
    useEffect(() => {
      if (!ref || !('current' in ref) || !ref.current) return;

      const map = ref.current.getMap();

      const handleMoveEnd = () => {
        console.log('[MapContainer] Move ended, clearing flyingToLocationId');
        setFlyingToLocationId(null);
      };

      map.on('moveend', handleMoveEnd);

      return () => {
        map.off('moveend', handleMoveEnd);
      };
    }, [ref, setFlyingToLocationId]);

    return (
      <div className="relative w-full h-full">
        {/* Loading overlay - shown while map initializes */}
        {!isMapReady && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading map...</p>
            </div>
          </div>
        )}

        <Map
          ref={ref}
          {...viewport}
          onMove={handleMove}
          onLoad={handleMapLoad}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_API_KEY}
        >
          <NavigationControl position="bottom-right" />

          {markers.map((marker) => (
            <TimelineMarker
              key={marker.locationId}  // Already UUID from Phase 4
              marker={marker}
              onClick={() => onMarkerClick(marker.locationId)}  // Already UUID
            />
          ))}

          {/* Search marker - temporary marker for search results */}
          {searchMarker.latitude !== null && searchMarker.longitude !== null && (
            <SearchMarker
              latitude={searchMarker.latitude}
              longitude={searchMarker.longitude}
              address={searchMarker.address}
            />
          )}

          {selectedLocation && (
            <LocationPopup
              location={selectedLocation}
              caseDir={caseDir}
              onClose={() => selectLocation(null)}
              mapRef={ref as React.RefObject<MapRef>}
            />
          )}
        </Map>

        {/* Custom fullscreen button */}
        <button
          onClick={handleFullscreenClick}
          className="absolute top-2 right-2 bg-white dark:bg-gray-800 rounded shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors p-2 z-10"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            // Exit fullscreen icon
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            // Enter fullscreen icon
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>

        {/* Hamburger Menu Control */}
        <HamburgerMenuControl
          mapRef={ref as React.RefObject<MapRef>}
          onHelpOpen={onHelpOpen}
        />

        {/* Pegman Control - Draggable Street View - moved down to top-26 */}
        <PegmanControl mapRef={ref as React.RefObject<MapRef>} isMapReady={isMapReady} />
      </div>
    );
  }
);

MapContainer.displayName = 'MapContainer';
