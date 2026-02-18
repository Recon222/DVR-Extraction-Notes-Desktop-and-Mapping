/**
 * useHighlightLayer Hook
 *
 * Manages the Mapbox GL JS circle layer that shows where Pegman will be dropped.
 * Uses a pulsing blue circle that follows the cursor during drag.
 * Performance optimized by using Mapbox layers instead of DOM elements.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import type { Map } from 'mapbox-gl';
import { ANIMATION_TIMING, PULSE_PARAMS } from '../../constants/animations';

interface Coordinates {
  lat: number;
  lng: number;
}

const SOURCE_ID = 'pegman-highlight-source';
const LAYER_ID = 'pegman-highlight-layer';

export const useHighlightLayer = (
  mapRef: React.RefObject<MapRef>,
  coordinates: Coordinates | null,
  isDragging: boolean,
  isMapReady: boolean = false
) => {
  const layerAddedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const pulseStartRef = useRef<number>(Date.now());
  // Store map instance to avoid dependency on mapRef object identity
  const mapInstanceRef = useRef<Map | null>(null);

  /**
   * Add highlight layer to map
   */
  const addHighlightLayer = useCallback((map: Map) => {
    if (layerAddedRef.current) {
      return;
    }

    try {
      // Add GeoJSON source
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0, 0]
          },
          properties: {
            visible: false
          }
        }
      });

      // Add circle layer with pulsing animation
      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': PULSE_PARAMS.RADIUS_MIN,
          'circle-color': 'rgba(59, 130, 246, 0.15)', // blue-500 with transparency
          'circle-stroke-width': 3,
          'circle-stroke-color': PULSE_PARAMS.COLOR,
          'circle-opacity': ['case', ['boolean', ['get', 'visible'], false], 1, 0],
          'circle-stroke-opacity': ['case', ['boolean', ['get', 'visible'], false], 1, 0]
        }
      });

      layerAddedRef.current = true;
    } catch (error) {
      console.error('[Pegman:Layer] Error adding highlight layer:', error);
    }
  }, []);

  /**
   * Remove highlight layer from map
   */
  const removeHighlightLayer = useCallback((map: Map) => {
    if (!layerAddedRef.current) {
      return;
    }

    try {
      if (map.getLayer(LAYER_ID)) {
        map.removeLayer(LAYER_ID);
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
      layerAddedRef.current = false;
    } catch (error) {
      console.error('[Pegman:Layer] Error removing highlight layer:', error);
    }
  }, []);

  /**
   * Update highlight circle position and visibility
   */
  const updateHighlightPosition = useCallback((map: Map, coords: Coordinates | null, visible: boolean) => {
    try {
      const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (!source) return;

      source.setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords ? [coords.lng, coords.lat] : [0, 0]
        },
        properties: {
          visible
        }
      });
    } catch (error) {
      // Ignore errors during position update (source might not exist yet)
    }
  }, []);

  /**
   * Animate pulsing circle effect
   * Uses requestAnimationFrame for smooth 60fps animation
   */
  const animatePulse = useCallback((map: Map, isActive: boolean) => {
    if (!isActive) {
      return;
    }

    const now = Date.now();
    const elapsed = now - pulseStartRef.current;

    // Calculate pulse progress (0 to 1 and back)
    const progress = (elapsed % ANIMATION_TIMING.PULSE_DURATION) / ANIMATION_TIMING.PULSE_DURATION;
    const pulseValue = progress < 0.5
      ? progress * 2 // 0 to 1
      : 2 - progress * 2; // 1 to 0

    // Apply easing function for smoother animation
    const easedValue = 0.5 + Math.sin((pulseValue - 0.5) * Math.PI) * 0.5;

    // Update circle radius using configured parameters
    const radius = PULSE_PARAMS.RADIUS_MIN +
      (PULSE_PARAMS.RADIUS_MAX - PULSE_PARAMS.RADIUS_MIN) * easedValue;

    // Update opacity using configured parameters
    const opacity = PULSE_PARAMS.OPACITY_MAX +
      (PULSE_PARAMS.OPACITY_MIN - PULSE_PARAMS.OPACITY_MAX) * easedValue;

    try {
      map.setPaintProperty(LAYER_ID, 'circle-radius', radius);
      map.setPaintProperty(LAYER_ID, 'circle-stroke-opacity', [
        'case',
        ['boolean', ['get', 'visible'], false],
        opacity,
        0
      ]);
    } catch (error) {
      // Ignore errors during animation (layer might not exist yet)
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(() => animatePulse(map, isActive));
  }, []); // Empty deps - uses refs for all mutable state

  /**
   * Set up highlight layer
   * Only depend on isMapReady changing, not mapRef object identity
   */
  useEffect(() => {
    if (!isMapReady) {
      return;
    }

    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    // Store map instance
    mapInstanceRef.current = map;

    // Add layer
    addHighlightLayer(map);

    // Cleanup on unmount
    return () => {
      // Cancel animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Remove layer
      if (mapInstanceRef.current) {
        removeHighlightLayer(mapInstanceRef.current);
      }
    };
  }, [isMapReady, addHighlightLayer, removeHighlightLayer, mapRef]);

  /**
   * Update highlight position and start/stop animation when dragging changes
   * Stable dependency on isDragging and coordinates, not on mapRef
   */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) {
      return;
    }

    if (isDragging && coordinates) {
      // Update position and show
      updateHighlightPosition(map, coordinates, true);

      // Start pulsing animation
      pulseStartRef.current = Date.now();
      if (!animationFrameRef.current) {
        animatePulse(map, true);
      }
    } else {
      // Hide highlight
      updateHighlightPosition(map, null, false);

      // Stop animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isDragging, coordinates, isMapReady, updateHighlightPosition, animatePulse]);
};
