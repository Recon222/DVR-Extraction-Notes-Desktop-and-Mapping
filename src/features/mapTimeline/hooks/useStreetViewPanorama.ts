/**
 * Custom Hook: useStreetViewPanorama
 *
 * Manages Google Street View panorama initialization and lifecycle.
 * Handles async loading, status monitoring, error states, cleanup, and retry logic.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps } from '../services/googleMapsLoader';
import type { StreetViewPOV } from '@/types/geojson.types';

export interface UseStreetViewPanoramaOptions {
  latitude: number;
  longitude: number;
  panoramaOptions?: google.maps.StreetViewPanoramaOptions;
  initialPOV?: StreetViewPOV | null;  // Saved POV to restore
}

export interface UseStreetViewPanoramaResult {
  panorama: google.maps.StreetViewPanorama | null;
  status: 'loading' | 'ok' | 'error';
  error: string | null;
  retry: () => void;
}

const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000]; // 1s, 2s exponential backoff

/**
 * Hook for initializing and managing a Street View panorama instance
 *
 * @param containerRef - Ref to the DOM element to mount the panorama
 * @param options - Configuration options (lat, lng, panorama settings)
 * @returns Panorama instance, status, error state, and retry function
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { panorama, status, error, retry } = useStreetViewPanorama(containerRef, {
 *   latitude: 43.7315,
 *   longitude: -79.7624,
 *   panoramaOptions: GOOGLE_MAPS_CONFIG.thumbnail
 * });
 *
 * // Allow user to retry after error
 * {status === 'error' && <button onClick={retry}>Retry</button>}
 * ```
 */
export const useStreetViewPanorama = (
  containerRef: React.RefObject<HTMLDivElement>,
  options: UseStreetViewPanoramaOptions
): UseStreetViewPanoramaResult => {
  const { latitude, longitude, panoramaOptions, initialPOV } = options;

  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const retry = useCallback(() => {
    retryCountRef.current = 0;
    setStatus('loading');
    setError(null);
    setRetryTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    let panorama: google.maps.StreetViewPanorama | null = null;
    let retryTimeoutId: NodeJS.Timeout | null = null;

    const initStreetView = async (attemptNumber: number = 0) => {
      try {
        // Load Google Maps API
        const google = await loadGoogleMaps();

        if (!mounted || !containerRef.current) return;

        // Build panorama options, applying saved POV if available
        const mergedOptions: google.maps.StreetViewPanoramaOptions = {
          position: { lat: latitude, lng: longitude },
          ...panoramaOptions,
        };

        // Apply saved POV if available (overrides default pov/zoom from panoramaOptions)
        if (initialPOV) {
          console.log('[StreetView] Applying saved POV:', initialPOV);
          mergedOptions.pov = {
            heading: initialPOV.heading,
            pitch: initialPOV.pitch,
          };
          mergedOptions.zoom = initialPOV.zoom;

          // If panoId is saved, use it for exact panorama position
          if (initialPOV.panoId) {
            mergedOptions.pano = initialPOV.panoId;
          }
        }

        // Create panorama instance
        panorama = new google.maps.StreetViewPanorama(
          containerRef.current,
          mergedOptions
        );

        panoramaRef.current = panorama;

        // Listen for status change to detect if panorama loaded successfully
        google.maps.event.addListenerOnce(panorama, 'status_changed', () => {
          if (!mounted) return;

          const panoramaStatus = panorama!.getStatus();

          if (panoramaStatus === google.maps.StreetViewStatus.OK) {
            setStatus('ok');
            setError(null);
            retryCountRef.current = 0;

            // FOCUS FIX: Auto-focus the panorama canvas element so keyboard navigation
            // works immediately without requiring a mouse click first.
            // The Street View panorama creates a canvas element that needs focus
            // to receive keyboard events for navigation (arrow keys, WASD, +/-, etc.)
            setTimeout(() => {
              if (!mounted || !containerRef.current) return;

              // Try to find and focus the panorama canvas element
              const canvas = containerRef.current.querySelector('canvas');
              if (canvas instanceof HTMLElement) {
                // Make canvas focusable if it doesn't have tabIndex
                if (canvas.tabIndex < 0) {
                  canvas.tabIndex = 0;
                }
                canvas.focus();
              } else {
                // Fallback: focus the container div
                const container = containerRef.current;
                if (container.tabIndex < 0) {
                  container.tabIndex = 0;
                }
                container.focus();
              }
            }, 100); // Small delay to ensure DOM is ready
          } else {
            setStatus('error');
            setError('Street View not available at this location');
          }
        });

      } catch (err) {
        if (!mounted) return;

        // Check if it's an API key error (non-retryable)
        if (err instanceof Error && err.message.includes('API key')) {
          setError('Google Maps API key not configured');
          setStatus('error');
          return;
        }

        // Retry with exponential backoff
        if (attemptNumber < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attemptNumber];
          retryCountRef.current = attemptNumber + 1;

          retryTimeoutId = setTimeout(() => {
            if (mounted) {
              initStreetView(attemptNumber + 1);
            }
          }, delay);
        } else {
          // Max retries reached
          setError(`Failed to load Street View after ${MAX_RETRIES + 1} attempts`);
          setStatus('error');
        }
      }
    };

    initStreetView();

    // Cleanup function
    return () => {
      mounted = false;
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
      if (panorama) {
        google.maps.event.clearInstanceListeners(panorama);
      }
      panoramaRef.current = null;
    };
    // IMPORTANT: containerRef should NOT be in deps array
    // Refs are stable objects and including them can cause unnecessary re-initialization
    // retryTrigger allows manual retry via retry() function
    // initialPOV is included to apply saved POV on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, panoramaOptions, initialPOV, retryTrigger]);

  return {
    panorama: panoramaRef.current,
    status,
    error,
    retry
  };
};
