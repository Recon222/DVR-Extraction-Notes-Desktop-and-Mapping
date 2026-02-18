import { useCallback, RefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { useMapTimelineStore } from '../stores/mapTimelineStore';
import { MAP_CONFIG, validateZoomLevel } from '../constants/mapConfig';
import type { CCTVLocation } from '@/types/cctv.types';
import { getLocationPOV } from '../services/geojsonService';
import { useAppMode } from '@/contexts/AppModeContext';

export function useMapControls(mapRef: RefObject<MapRef>, caseDir: string) {
  const { selectLocation, revealUpTo, setCurrentIndex, setFlyingToLocationId } = useMapTimelineStore();
  const { exportData } = useAppMode();

  const flyToLocation = useCallback(async (location: CCTVLocation) => {
    if (!mapRef.current) return;

    // NEW: Set flyingToLocationId BEFORE animation starts (for preloader timing)
    setFlyingToLocationId(location.uuid);

    try {
      // Try to get saved POV data for this location
      // Pass in-memory GeoJSON for viewer mode (where caseDir is empty)
      const povData = await getLocationPOV(
        caseDir,
        location.uuid,
        exportData?.geoJSON || null
      );

      if (povData?.mapboxPOV) {
        // Use saved POV if available
        console.log('[Timeline] Flying to saved POV:', {
          uuid: location.uuid,
          center: [povData.mapboxPOV.longitude, povData.mapboxPOV.latitude],
          zoom: povData.mapboxPOV.zoom,
          pitch: povData.mapboxPOV.pitch,
          bearing: povData.mapboxPOV.bearing
        });

        mapRef.current.flyTo({
          center: [povData.mapboxPOV.longitude, povData.mapboxPOV.latitude],
          zoom: validateZoomLevel(povData.mapboxPOV.zoom),
          pitch: povData.mapboxPOV.pitch,
          bearing: povData.mapboxPOV.bearing,
          duration: MAP_CONFIG.flyToDuration,
          essential: true
        });
      } else {
        // No saved POV - use default view
        console.log('[Timeline] Flying to default view:', {
          uuid: location.uuid,
          center: [location.longitude, location.latitude + MAP_CONFIG.popupOffset],
          zoom: MAP_CONFIG.flyToZoom
        });

        // Offset latitude slightly north so marker lands below viewport center
        // This gives room for the popup above the marker
        mapRef.current.flyTo({
          center: [location.longitude, location.latitude + MAP_CONFIG.popupOffset],
          zoom: validateZoomLevel(MAP_CONFIG.flyToZoom),
          duration: MAP_CONFIG.flyToDuration,
          essential: true
        });
      }
    } catch (error) {
      // If POV lookup fails, fall back to default view
      console.error('[Timeline] POV lookup failed, using default view:', error);

      mapRef.current.flyTo({
        center: [location.longitude, location.latitude + MAP_CONFIG.popupOffset],
        zoom: validateZoomLevel(MAP_CONFIG.flyToZoom),
        duration: MAP_CONFIG.flyToDuration,
        essential: true
      });
    }
  }, [mapRef, caseDir, setFlyingToLocationId, exportData]);

  const handleEventClick = useCallback((locationId: string, eventIndex: number, location: CCTVLocation) => {  // CHANGED: string
    console.log('[Timeline] Event clicked:', { uuid: locationId, address: location.address, index: eventIndex });

    // Reveal all markers up to this one
    revealUpTo(eventIndex);

    // Set current index
    setCurrentIndex(eventIndex);

    // Select location (shows popup)
    selectLocation(locationId);  // Now passes UUID

    // Fly to location (now POV-aware, sets flyingToLocationId internally)
    flyToLocation(location);
  }, [revealUpTo, setCurrentIndex, selectLocation, flyToLocation]);

  const handleMarkerClick = useCallback((locationId: string) => {  // CHANGED: string
    console.log('[Timeline] Marker clicked:', { uuid: locationId });

    // Just select the location to show popup - no fly-to, no reveal change
    selectLocation(locationId);  // Now passes UUID
  }, [selectLocation]);

  return {
    flyToLocation,
    handleEventClick,
    handleMarkerClick
  };
}
