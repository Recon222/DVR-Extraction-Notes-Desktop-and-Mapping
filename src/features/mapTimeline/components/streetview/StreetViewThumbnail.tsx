/**
 * Street View Thumbnail Component
 *
 * Displays an interactive Street View panorama in a small thumbnail size.
 * Double-click to expand to modal view.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStreetViewPanorama } from '../../hooks/useStreetViewPanorama';
import { GOOGLE_MAPS_CONFIG, MAP_CONFIG } from '../../constants/mapConfig';
import type { StreetViewThumbnailProps } from '../../types';

export const StreetViewThumbnail = ({
  latitude,
  longitude,
  onDoubleClick,
  existingPOV
}: StreetViewThumbnailProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [doubleClickHint, setDoubleClickHint] = useState(false);

  // Initialize Street View panorama with thumbnail settings
  const { status, error } = useStreetViewPanorama(containerRef, {
    latitude,
    longitude,
    panoramaOptions: GOOGLE_MAPS_CONFIG.thumbnail,
    initialPOV: existingPOV ?? undefined
  });

  const loading = status === 'loading';

  // Responsive height using clamp()
  const streetViewHeight = `clamp(${MAP_CONFIG.popup.sizing.mediaHeightMin}, ${MAP_CONFIG.popup.sizing.mediaHeightPreferred}, ${MAP_CONFIG.popup.sizing.mediaHeightMax})`;

  /**
   * Show double-click hint after panorama loads
   */
  useEffect(() => {
    if (status === 'ok') {
      const timeout = setTimeout(() => {
        setDoubleClickHint(true);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  /**
   * Handle double-click to expand
   */
  const handleDoubleClick = useCallback(() => {
    if (!loading && !error) {
      setDoubleClickHint(false);
      onDoubleClick();
    }
  }, [loading, error, onDoubleClick]);

  /**
   * Auto-hide hint after 3 seconds
   */
  useEffect(() => {
    if (doubleClickHint) {
      const timeout = setTimeout(() => {
        setDoubleClickHint(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [doubleClickHint]);

  return (
    <div className="relative w-full" style={{ height: streetViewHeight }}>
      {/* Street View Container */}
      <div
        ref={containerRef}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full cursor-pointer"
        title="Double-click to expand"
      />

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Loading Street View...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center px-4">
            <svg
              className="w-10 h-10 text-gray-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        </div>
      )}

      {/* Double-click Hint */}
      {doubleClickHint && !loading && !error && (
        <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs py-1.5 px-2 rounded text-center animate-fade-in">
          Double-click to expand
        </div>
      )}
    </div>
  );
};
