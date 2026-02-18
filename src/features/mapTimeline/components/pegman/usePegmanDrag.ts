/**
 * usePegmanDrag Hook
 *
 * Custom hook for handling all Pegman drag logic including:
 * - Mouse and touch events
 * - Screen to map coordinate conversion with validation
 * - ESC key cancellation
 * - Performance optimization with requestAnimationFrame
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';

interface DragPosition {
  x: number;
  y: number;
}

interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface UsePegmanDragResult {
  isDragging: boolean;
  dragPosition: DragPosition | null;
  hoveredCoordinates: MapCoordinates | null;
  handleDragStart: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleDragEnd: () => MapCoordinates | null;
  handleCancel: () => void;
}

/**
 * Validate that coordinates are within valid geographic bounds
 */
const isValidCoordinate = (coords: MapCoordinates): boolean => {
  return (
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180 &&
    !isNaN(coords.lat) &&
    !isNaN(coords.lng)
  );
};

export const usePegmanDrag = (mapRef: React.RefObject<MapRef>, _isMapReady: boolean = false): UsePegmanDragResult => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(null);
  const [hoveredCoordinates, setHoveredCoordinates] = useState<MapCoordinates | null>(null);

  const dragStartRef = useRef<DragPosition | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef({ x: 0, y: 0 });

  // Movement threshold to reduce unnecessary coordinate conversions
  const MOVEMENT_THRESHOLD = 5; // pixels

  /**
   * Get map container bounds for coordinate conversion
   */
  const getMapBounds = useCallback((): DOMRect | null => {
    const map = mapRef.current?.getMap();
    if (!map) return null;

    const container = map.getContainer();
    return container.getBoundingClientRect();
  }, [mapRef]);

  /**
   * Convert screen coordinates to map coordinates with validation
   * CRITICAL: Coordinates must be relative to the map container, not the viewport
   */
  const convertToMapCoords = useCallback((clientX: number, clientY: number): MapCoordinates | null => {
    const map = mapRef.current?.getMap();

    if (!map) {
      return null;
    }

    // Get map container bounds
    const mapBounds = getMapBounds();
    if (!mapBounds) {
      return null;
    }

    // Convert viewport coordinates to map-relative coordinates
    const mapX = clientX - mapBounds.left;
    const mapY = clientY - mapBounds.top;

    try {
      const point = map.unproject([mapX, mapY]);
      const coords = {
        lat: point.lat,
        lng: point.lng
      };

      // Validate coordinate bounds
      if (!isValidCoordinate(coords)) {
        console.warn('[Pegman:Hook] Invalid coordinates:', coords);
        return null;
      }

      return coords;
    } catch (error) {
      console.error('[Pegman:Hook] Error converting coordinates:', error);
      return null;
    }
  }, [mapRef, getMapBounds]);

  /**
   * Start dragging (mouse)
   */
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastUpdateRef.current = { x: e.clientX, y: e.clientY };
    setDragPosition({ x: e.clientX, y: e.clientY });

    const coords = convertToMapCoords(e.clientX, e.clientY);
    setHoveredCoordinates(coords);
  }, [convertToMapCoords]);

  /**
   * Start dragging (touch)
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    lastUpdateRef.current = { x: touch.clientX, y: touch.clientY };
    setDragPosition({ x: touch.clientX, y: touch.clientY });

    const coords = convertToMapCoords(touch.clientX, touch.clientY);
    setHoveredCoordinates(coords);
  }, [convertToMapCoords]);

  /**
   * Update drag position and convert to map coordinates (mouse)
   * Throttled with requestAnimationFrame and movement threshold
   */
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    // Cancel any pending RAF
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Throttle with requestAnimationFrame for smooth 60fps updates
    rafIdRef.current = requestAnimationFrame(() => {
      const x = e.clientX;
      const y = e.clientY;

      // Only update if moved more than threshold
      const dx = Math.abs(x - lastUpdateRef.current.x);
      const dy = Math.abs(y - lastUpdateRef.current.y);

      if (dx > MOVEMENT_THRESHOLD || dy > MOVEMENT_THRESHOLD) {
        setDragPosition({ x, y });

        const coords = convertToMapCoords(x, y);
        setHoveredCoordinates(coords);
        lastUpdateRef.current = { x, y };
      }
    });
  }, [isDragging, convertToMapCoords]);

  /**
   * Update drag position and convert to map coordinates (touch)
   * Throttled with requestAnimationFrame and movement threshold
   */
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];

    // Cancel any pending RAF
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Throttle with requestAnimationFrame
    rafIdRef.current = requestAnimationFrame(() => {
      const x = touch.clientX;
      const y = touch.clientY;

      // Only update if moved more than threshold
      const dx = Math.abs(x - lastUpdateRef.current.x);
      const dy = Math.abs(y - lastUpdateRef.current.y);

      if (dx > MOVEMENT_THRESHOLD || dy > MOVEMENT_THRESHOLD) {
        setDragPosition({ x, y });

        const coords = convertToMapCoords(x, y);
        setHoveredCoordinates(coords);
        lastUpdateRef.current = { x, y };
      }
    });
  }, [isDragging, convertToMapCoords]);

  /**
   * End dragging and return final coordinates
   */
  const handleDragEnd = useCallback((): MapCoordinates | null => {
    if (!isDragging) {
      return null;
    }

    setIsDragging(false);
    setDragPosition(null);

    // Cancel any pending RAF
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Return final coordinates (already validated in convertToMapCoords)
    const finalCoords = hoveredCoordinates;
    setHoveredCoordinates(null);

    return finalCoords;
  }, [isDragging, hoveredCoordinates]);

  /**
   * Cancel drag operation (ESC key or outside drop)
   */
  const handleCancel = useCallback(() => {
    setIsDragging(false);
    setDragPosition(null);
    setHoveredCoordinates(null);

    // Cancel any pending RAF
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  /**
   * Handle keyboard events (ESC to cancel)
   */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleCancel]);

  /**
   * Set up global event listeners when dragging
   * NOTE: We do NOT handle mouseup/touchend here - let the parent handle the drop
   */
  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);

      // Clean up RAF on unmount
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isDragging, handleDragMove, handleTouchMove, handleKeyDown]);

  return {
    isDragging,
    dragPosition,
    hoveredCoordinates,
    handleDragStart,
    handleTouchStart,
    handleDragEnd,
    handleCancel
  };
};
