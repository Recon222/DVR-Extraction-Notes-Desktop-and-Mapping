/**
 * PegmanControl Component
 *
 * Main orchestrating component for the draggable Pegman Street View control.
 * Integrates all sub-components and handles the drop -> Street View modal flow.
 */

import { useState, useCallback, useEffect } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { PegmanButton } from './PegmanButton';
import { PegmanDraggable } from './PegmanDraggable';
import { usePegmanDrag } from './usePegmanDrag';
import { useHighlightLayer } from './useHighlightLayer';
import { StreetViewModal } from '../streetview/StreetViewModal';
import { useMapTimelineStore } from '../../stores/mapTimelineStore';
import { ANIMATION_TIMING } from '../../constants/animations';

interface PegmanControlProps {
  mapRef: React.RefObject<MapRef>;
  isMapReady?: boolean;
}

export const PegmanControl = ({ mapRef, isMapReady = false }: PegmanControlProps) => {
  const [isReturning, setIsReturning] = useState(false);
  const [returnPosition, setReturnPosition] = useState<{ x: number; y: number } | null>(null);

  const streetView = useMapTimelineStore(state => state.streetView);

  const {
    isDragging,
    dragPosition,
    hoveredCoordinates,
    handleDragStart,
    handleTouchStart,
    handleDragEnd,
    handleCancel
  } = usePegmanDrag(mapRef, isMapReady);

  // Set up highlight circle layer
  useHighlightLayer(mapRef, hoveredCoordinates, isDragging, isMapReady);

  /**
   * Animate Pegman returning to button position
   */
  const handleReturnAnimation = useCallback(() => {
    // Get button position
    const button = document.querySelector('[title="Drag to view Street View"]');
    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const buttonCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    setReturnPosition(buttonCenter);
    setIsReturning(true);

    // Reset after animation completes
    setTimeout(() => {
      setIsReturning(false);
      setReturnPosition(null);
    }, ANIMATION_TIMING.PEGMAN_RETURN);
  }, []);

  /**
   * Handle drop: check if valid coordinates and open Street View
   */
  const handleDrop = useCallback(() => {
    const coords = handleDragEnd();

    if (coords) {
      // Valid drop on map - open Street View (from pegman)
      useMapTimelineStore.getState().openStreetView(coords.lat, coords.lng, `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`, 'pegman');
    } else {
      // Invalid drop (outside map or error) - animate return
      handleReturnAnimation();
    }
  }, [handleDragEnd, handleReturnAnimation]);

  /**
   * Handle cancel (ESC key) - animate return to button
   */
  const handleCancelWithAnimation = useCallback(() => {
    handleCancel();
    handleReturnAnimation();
  }, [handleCancel, handleReturnAnimation]);

  /**
   * Listen for drag end events
   */
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseUp = () => {
      handleDrop();
    };

    const handleGlobalTouchEnd = () => {
      handleDrop();
    };

    window.addEventListener('mouseup', handleGlobalMouseUp, { once: true });
    window.addEventListener('touchend', handleGlobalTouchEnd, { once: true });

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, handleDrop]);

  /**
   * Listen for fullscreen changes and cancel drag
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (isDragging) {
        handleCancelWithAnimation();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isDragging, handleCancelWithAnimation]);

  return (
    <>
      {/* Pegman Button - Idle State */}
      <PegmanButton
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchStart}
        isDragging={isDragging}
      />

      {/* Dragging State - Portal Rendered */}
      {(isDragging || isReturning) && dragPosition && (
        <PegmanDraggable
          position={dragPosition}
          returning={isReturning}
          returnPosition={returnPosition || undefined}
        />
      )}

      {/* Street View Modal - render when opened via Pegman or Touch Portal (not from popup) */}
      {streetView.isOpen && (streetView.source === 'pegman' || streetView.source === 'touchportal') && streetView.latitude !== null && streetView.longitude !== null && (
        <StreetViewModal
          latitude={streetView.latitude}
          longitude={streetView.longitude}
          address={streetView.address}
          onClose={() => useMapTimelineStore.getState().closeStreetView()}
        />
      )}
    </>
  );
};
