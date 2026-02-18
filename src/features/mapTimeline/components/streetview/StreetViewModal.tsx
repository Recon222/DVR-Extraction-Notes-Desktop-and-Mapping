/**
 * Street View Modal Component
 *
 * Large modal view of Street View with fullscreen capability.
 * Uses portal rendering to work in both inline and fullscreen map modes.
 *
 * IMPORTANT: Uses dynamic portal target to work when map is in fullscreen mode.
 * When MAP is fullscreen, portals to fullscreen container; otherwise portals to document.body.
 *
 * FULLSCREEN ARCHITECTURE:
 * - The BACKDROP (outer div) is made fullscreen, not the modal card
 * - This ensures the dark backdrop remains visible when fullscreen
 * - The modal card expands to fill the fullscreen backdrop
 * - Portal target is determined ONCE at mount based on MAP fullscreen state
 * - Portal target does NOT change when Street View modal goes fullscreen
 *
 * KEYBOARD ISOLATION:
 * - Registers 'street-view' keyboard context to prevent timeline navigation
 * - This ensures arrow keys control Street View, not the map timeline underneath
 * - Uses priority-based keyboard manager to isolate keyboard events
 */

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStreetViewPanorama } from '../../hooks/useStreetViewPanorama';
import { useKeyboardContext } from '../../hooks/useKeyboardContext';
import { StreetViewPOVButton } from '@/components/streetview/StreetViewPOVButton';
import { GOOGLE_MAPS_CONFIG } from '../../constants/mapConfig';
import { Z_INDEX } from '@/features/shared/config';
import { useFullscreen, isFullscreenSupported } from '../../hooks/useFullscreen';
import { DOM_IDS } from '../../constants/domIds';
import { useIsViewerMode } from '@/contexts/AppModeContext';
import { useMapTimelineStore } from '../../store/mapTimelineStore';
import type { StreetViewModalProps } from '../../types';

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Find the link closest to a target heading
 * @param links - Array of panorama links
 * @param targetHeading - The desired heading (0-360)
 * @returns The closest link, or null if no links available
 */
function findClosestLink(
  links: (google.maps.StreetViewLink | null)[] | null,
  targetHeading: number
): google.maps.StreetViewLink | null {
  if (!links || links.length === 0) return null;

  const normalizedTarget = normalizeAngle(targetHeading);
  let closestLink: google.maps.StreetViewLink | null = null;
  let smallestDiff = Infinity;

  for (const link of links) {
    // Skip null links and links without heading
    if (!link || link.heading === undefined || link.heading === null) continue;

    const linkHeading = normalizeAngle(link.heading);
    // Calculate angular difference (handles wraparound at 0/360)
    let diff = Math.abs(linkHeading - normalizedTarget);
    if (diff > 180) diff = 360 - diff;

    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestLink = link;
    }
  }

  return closestLink;
}

/**
 * Get the appropriate portal target based on MAP fullscreen state.
 *
 * CRITICAL: This should only check if the MAP is fullscreen, NOT if anything is fullscreen.
 * When the Street View modal itself goes fullscreen, we should NOT change the portal target.
 *
 * - In MAP fullscreen mode: render to map's fullscreen container
 * - In normal/inline mode: render to document.body
 */
const getPortalTarget = (): HTMLElement => {
  const fullscreenContainer = document.getElementById(DOM_IDS.FULLSCREEN_CONTAINER);

  // Check if the MAP's fullscreen container itself is fullscreen
  // (NOT just checking if anything is fullscreen)
  if (fullscreenContainer && document.fullscreenElement === fullscreenContainer) {
    return fullscreenContainer;
  }

  // Validate document.body exists
  if (!document.body) {
    throw new Error('Document body not available for portal rendering');
  }

  // Default to document.body for normal mode
  return document.body;
};

export const StreetViewModal = ({
  latitude,
  longitude,
  address,
  onClose,
  locationUuid,
  caseDir,
  existingPOV,
  onPOVSaved
}: StreetViewModalProps) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panoramaContainerRef = useRef<HTMLDivElement>(null);
  const panoramaInstanceRef = useRef<google.maps.StreetViewPanorama | null>(null);

  const { isFullscreen, toggleFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(backdropRef);
  const supportsFullscreen = isFullscreenSupported();
  const isViewerMode = useIsViewerMode();
  const setStreetViewPanoramaGetter = useMapTimelineStore((s) => s.setStreetViewPanoramaGetter);

  // Register keyboard context to isolate Street View from timeline navigation
  // This prevents arrow keys from affecting the map timeline when Street View is open
  useKeyboardContext('street-view', true);

  // Determine portal target ONCE at mount based on MAP's fullscreen state
  // Use useMemo with empty deps to ensure it's only calculated once
  const portalTarget = useMemo(() => getPortalTarget(), []);

  // Initialize Street View panorama with modal settings and saved POV
  const { panorama, status, error, retry } = useStreetViewPanorama(panoramaContainerRef, {
    latitude,
    longitude,
    panoramaOptions: GOOGLE_MAPS_CONFIG.modal,
    initialPOV: existingPOV  // Apply saved POV if available
  });

  // Store panorama reference for POV button
  useEffect(() => {
    panoramaInstanceRef.current = panorama;
  }, [panorama]);

  /**
   * Create movement functions for remote control
   * These navigate to adjacent panoramas based on current heading
   */
  const moveInDirection = useCallback((headingOffset: number) => {
    const pano = panoramaInstanceRef.current;
    if (!pano) {
      console.warn('[StreetView] moveInDirection: No panorama available');
      return;
    }

    const pov = pano.getPov();
    const links = pano.getLinks();
    const targetHeading = pov.heading + headingOffset;

    console.log('[StreetView] moveInDirection:', {
      currentHeading: pov.heading,
      offset: headingOffset,
      targetHeading,
      linksAvailable: links?.length ?? 0
    });

    const closestLink = findClosestLink(links, targetHeading);

    if (closestLink?.pano) {
      console.log('[StreetView] Moving to panorama:', closestLink.pano, 'heading:', closestLink.heading);
      pano.setPano(closestLink.pano);
    } else {
      console.warn('[StreetView] No link found in direction:', targetHeading);
    }
  }, []);

  /**
   * Expose panorama controls to the store for remote control (Touch Portal)
   * Sets up a getter function that returns movement controls when panorama is ready
   */
  useEffect(() => {
    if (status === 'ok' && panorama) {
      // Create the control object
      const createControl = () => ({
        moveForward: () => moveInDirection(0),      // Same direction as current heading
        moveBackward: () => moveInDirection(180),   // Opposite direction
        moveLeft: () => moveInDirection(-90),       // 90 degrees left
        moveRight: () => moveInDirection(90),       // 90 degrees right
        rotate: (degrees: number) => {
          const pano = panoramaInstanceRef.current;
          if (!pano) return;
          const pov = pano.getPov();
          pano.setPov({ heading: pov.heading + degrees, pitch: pov.pitch });
        },
        pitch: (degrees: number) => {
          const pano = panoramaInstanceRef.current;
          if (!pano) return;
          const pov = pano.getPov();
          // Clamp pitch to Google's limits: -90 to 90
          const newPitch = Math.max(-90, Math.min(90, pov.pitch + degrees));
          pano.setPov({ heading: pov.heading, pitch: newPitch });
        },
        zoom: (direction: 'in' | 'out' | 'reset') => {
          const pano = panoramaInstanceRef.current;
          if (!pano) return;
          const currentZoom = pano.getZoom();
          // Street View zoom range: 0 (most zoomed out) to 5+ (most zoomed in)
          // Default is 1
          switch (direction) {
            case 'in':
              pano.setZoom(Math.min(currentZoom + 0.5, 5));
              break;
            case 'out':
              pano.setZoom(Math.max(currentZoom - 0.5, 0));
              break;
            case 'reset':
              pano.setZoom(1);  // Default zoom level
              break;
          }
        },
      });

      // Set the getter function in the store
      setStreetViewPanoramaGetter(createControl);
      console.log('[StreetView] Panorama controls exposed to store');

      // Cleanup: clear the getter when unmounting or panorama changes
      return () => {
        setStreetViewPanoramaGetter(null);
        console.log('[StreetView] Panorama controls cleared from store');
      };
    }
  }, [status, panorama, setStreetViewPanoramaGetter, moveInDirection]);

  const loading = status === 'loading';

  /**
   * Re-focus panorama canvas when fullscreen state changes
   *
   * CRITICAL: Uses TWO mechanisms for reliable focus restoration:
   * 1. React state dependency (isFullscreen) - for React-triggered updates
   * 2. Direct fullscreenchange event listener - for browser-triggered updates
   *
   * This ensures focus is restored whether entering OR exiting fullscreen.
   * The direct event listener is particularly important for EXIT, as browser
   * focus behavior can be unpredictable when exiting fullscreen.
   */
  useEffect(() => {
    // Skip if still loading or in error state
    if (loading || error) return;

    const focusCanvas = () => {
      const canvas = panoramaContainerRef.current?.querySelector('canvas');
      if (canvas instanceof HTMLElement) {
        // Ensure canvas is focusable
        if (canvas.tabIndex < 0) {
          canvas.tabIndex = 0;
        }
        canvas.focus();
      }
    };

    // Mechanism 1: React state-driven focus (when isFullscreen changes)
    const stateTimer = setTimeout(focusCanvas, 150);

    // Mechanism 2: Direct browser event-driven focus (more reliable for EXIT)
    const handleFullscreenChange = () => {
      // Longer delay for fullscreen transitions (especially when exiting)
      setTimeout(focusCanvas, 200);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      clearTimeout(stateTimer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, loading, error]); // Trigger on fullscreen state change

  /**
   * Handle Ctrl+X to close modal
   *
   * NOTE: We use Ctrl+X instead of Escape because the native browser fullscreen API
   * captures Escape before JavaScript can handle it. This causes conflicts where
   * Escape exits fullscreen but doesn't close the modal, leaving it in a broken state.
   *
   * FULLSCREEN BUG FIX: Exit Street View fullscreen BEFORE closing to preserve map fullscreen state.
   * When Street View is fullscreened and Ctrl+X is pressed, we must explicitly exit the modal's
   * fullscreen first. Otherwise, the browser exits fullscreen globally when the modal unmounts,
   * which also exits the map's fullscreen state.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+X: Close modal
      if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        e.stopPropagation();

        // CRITICAL FIX: If Street View backdrop is currently fullscreen, exit it first
        // This prevents the browser from globally exiting fullscreen (which would affect the map)
        if (backdropRef.current && document.fullscreenElement === backdropRef.current) {
          // Exit fullscreen for the Street View modal, then close it
          document.exitFullscreen().then(() => {
            onClose();
          }).catch((err) => {
            console.error('[StreetViewModal] Failed to exit fullscreen:', err);
            // Close anyway even if exitFullscreen fails
            onClose();
          });
        } else {
          // Not in fullscreen, just close normally
          onClose();
        }
        return;
      }

      // Ctrl+F: Enter fullscreen
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        enterFullscreen();
        return;
      }

      // Ctrl+A: Exit fullscreen ("Adios")
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        e.stopPropagation();
        exitFullscreen();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, enterFullscreen, exitFullscreen]);

  // Show POV button if location UUID and case directory are provided AND not in viewer mode
  const showPOVButton = !isViewerMode && !!locationUuid && !!caseDir;

  const modalContent = (
    <div
      ref={backdropRef}
      className={`fixed inset-0 bg-black bg-opacity-90 z-[${Z_INDEX.STREET_VIEW_MODAL}] flex items-center justify-center p-4`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Street View Modal"
    >
      <div
        className={`bg-white overflow-hidden relative transition-all ${
          isFullscreen
            ? 'w-screen h-screen rounded-none'
            : 'w-[80vw] h-[80vh] rounded-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar (hidden in fullscreen) */}
        {!isFullscreen && (
          <div className="absolute top-0 start-0 end-0 bg-white bg-opacity-95 shadow-md z-10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700 truncate max-w-[600px]">
                {address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
              </span>
            </div>

            <div className="flex gap-2">
              {/* Fullscreen Button */}
              {supportsFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
                  title="Toggle fullscreen (Ctrl+F)"
                  aria-label="Toggle fullscreen"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
                title="Close (Ctrl+X)"
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Exit Fullscreen Button (only in fullscreen) */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 end-4 z-10 p-3 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg shadow-lg transition-all text-gray-700"
            title="Exit fullscreen (Ctrl+A)"
            aria-label="Exit fullscreen"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* POV Button - HIDDEN IN VIEWER MODE */}
        {!loading && !error && showPOVButton && (
          <div className="absolute bottom-4 start-4 z-10">
            <StreetViewPOVButton
              locationUuid={locationUuid!}
              caseDir={caseDir!}
              panoramaRef={panoramaInstanceRef}
              existingPOV={existingPOV ?? null}
              onSaved={onPOVSaved}
            />
          </div>
        )}

        {/* Street View Container */}
        <div
          ref={panoramaContainerRef}
          className={`w-full h-full ${!isFullscreen ? 'pt-14' : ''}`}
        />

        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading Street View...</p>
            </div>
          </div>
        )}

        {/* Error State with Retry */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center px-4">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={retry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  aria-label="Retry loading Street View"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  aria-label="Close modal"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, portalTarget);
};
