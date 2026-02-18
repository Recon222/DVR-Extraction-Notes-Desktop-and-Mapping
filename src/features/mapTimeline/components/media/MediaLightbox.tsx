import { useEffect, useState, useRef, lazy, Suspense, useCallback } from 'react';
import type { SlideImage, SlideVideo, ZoomRef } from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import { convertFileSrc } from '@tauri-apps/api';
import { readFileAsBase64, getStreamingMediaUrl, resolveMediaPath } from '../../services/mediaService';
import { useAppMode } from '@/contexts/AppModeContext';
import { useMapTimelineStore } from '../../stores/mapTimelineStore';
import { useKeyboardContext } from '../../hooks/useKeyboardContext';
import { useFullscreen } from '../../hooks/useFullscreen';
import { DOM_IDS } from '../../constants/domIds';
import { HOTKEYS } from '../../constants/hotkeys';
import { Z_INDEX } from '@/features/shared/config';
import { VIDEO_PLAYBACK } from '@config/mediaConfig';

// Lazy load the main lightbox component
// This reduces initial bundle size by ~100KB and improves load time
const LightboxComponent = lazy(() => import('yet-another-react-lightbox'));

type LightboxSlide = SlideImage | SlideVideo;

// Plugin type from yet-another-react-lightbox
type Plugin = any;

// Fallback component while lightbox is loading
const LightboxFallback = () => (
  <div className={`fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[${Z_INDEX.LIGHTBOX}]`}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
      <p className="text-white text-sm">Loading media viewer...</p>
    </div>
  </div>
);

/**
 * Extract filename from path or return the string if it's already just a filename
 */
function extractFilename(pathOrFilename: string): string {
  // If already just a filename (no path separators), return as-is
  if (!pathOrFilename.includes('\\') && !pathOrFilename.includes('/')) {
    return pathOrFilename;
  }

  // Extract filename from path (handle both Windows and Unix paths)
  const parts = pathOrFilename.split(/[\\\/]/);
  return parts[parts.length - 1];
}

/**
 * Determine MIME type from filename extension
 */
function getMimeType(filename: string, type: 'image' | 'video'): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (type === 'image') {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'bmp':
        return 'image/bmp';
      default:
        return 'image/jpeg';
    }
  } else {
    switch (ext) {
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'avi':
        return 'video/x-msvideo';
      case 'mov':
        return 'video/quicktime';
      default:
        return 'video/mp4';
    }
  }
}

/**
 * Get image dimensions from a data URL or blob URL
 * This is required for the Zoom plugin to work properly.
 * Without width/height, the plugin cannot calculate maxZoom and disables zoom controls.
 */
function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      // Return default dimensions if image fails to load
      // This allows the lightbox to still display the image, just without zoom
      console.warn('[MediaLightbox] Failed to get image dimensions, using defaults');
      resolve({ width: 1920, height: 1080 });
    };
    img.src = src;
  });
}

export const MediaLightbox = () => {
  const { mode } = useAppMode();
  const lightbox = useMapTimelineStore(state => state.lightbox);
  const closeLightbox = useMapTimelineStore(state => state.closeLightbox);
  const setLightboxIndex = useMapTimelineStore(state => state.setLightboxIndex);
  const setLightboxZoomGetter = useMapTimelineStore(state => state.setLightboxZoomGetter);
  const setLightboxVideoGetter = useMapTimelineStore(state => state.setLightboxVideoGetter);
  const [processedSlides, setProcessedSlides] = useState<LightboxSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<ZoomRef | null>(null);

  // Register keyboard context when lightbox is open
  // This ensures lightbox keyboard handlers only work when lightbox is the active context
  const { isActiveContext } = useKeyboardContext('lightbox', lightbox.isOpen);

  // Fullscreen control for the portal container (where the actual lightbox content lives)
  // FIX: Changed from lightboxContainerRef to portalRef so we fullscreen the actual content
  const { isFullscreen: _isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(portalRef);

  /**
   * Track the current processing operation to prevent race conditions
   *
   * This implements a cancellation pattern for async operations:
   * - Each effect run increments processingIdRef
   * - Async operations check if their ID is still current before updating state
   * - Cleanup increments processingIdRef to invalidate in-flight operations
   *
   * This is more suitable than AbortController for this use case because:
   * 1. We're using Tauri invoke() which doesn't support AbortSignal
   * 2. We process multiple slides in parallel and need fine-grained cancellation
   * 3. The processing ID pattern allows checking cancellation at multiple points
   */
  const processingIdRef = useRef(0);

  /**
   * Track blob URLs for cleanup
   * FIX: Use ref-based tracking to prevent memory leaks from closure capturing stale state
   */
  const blobUrlsRef = useRef<Set<string>>(new Set());

  /**
   * Lazy load lightbox plugins when lightbox opens
   * This reduces initial bundle size by loading plugins only when needed
   */
  useEffect(() => {
    if (lightbox.isOpen && plugins.length === 0) {
      // Dynamically import plugins
      Promise.all([
        import('yet-another-react-lightbox/plugins/video'),
        import('yet-another-react-lightbox/plugins/counter'),
        import('yet-another-react-lightbox/plugins/zoom')
      ]).then(([videoModule, counterModule, zoomModule]) => {
        setPlugins([videoModule.default, counterModule.default, zoomModule.default]);
      }).catch(err => {
        console.error('[MediaLightbox] Failed to load plugins:', err);
      });
    }
  }, [lightbox.isOpen, plugins.length]);

  /**
   * Create a stable getter function that returns the current zoom ref value.
   *
   * WHY A GETTER FUNCTION?
   * The zoom plugin uses React.useImperativeHandle to update zoomRef.current on each
   * zoom level change. The new zoomIn/zoomOut callbacks capture the updated zoom level
   * in their closures.
   *
   * We can't store the RefObject directly in Zustand because:
   * 1. Immer (used by Zustand) creates proxy objects for state
   * 2. When zoom plugin tries to update ref.current, it fails because the proxy makes
   *    .current read-only
   * 3. Error: "Cannot assign to read only property 'current' of object"
   *
   * The getter function pattern solves this:
   * - Function is stored as-is (not proxied by immer)
   * - Function dereferences ref.current at call time, getting fresh callbacks
   */
  const getZoomRef = useCallback(() => zoomRef.current, []);

  /**
   * Create a stable getter function that returns video control functions.
   * This allows Touch Portal to control video playback programmatically.
   *
   * The getter queries for the current video element at call time, ensuring
   * we always have the correct element even after slide changes.
   */
  const getVideoControl = useCallback(() => {
    const video = document.querySelector('.yarl__slide_current video') as HTMLVideoElement | null;
    if (!video) return null;

    return {
      play: () => video.play().catch(() => {}),
      pause: () => video.pause(),
      toggle: () => {
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      seek: (seconds: number) => {
        video.currentTime = Math.max(0, Math.min(seconds, video.duration || 0));
      },
      seekPercent: (percent: number) => {
        const duration = video.duration || 0;
        video.currentTime = (percent / 100) * duration;
      },
      toggleFullscreen: () => {
        if (document.fullscreenElement === video) {
          document.exitFullscreen().catch(() => {});
        } else {
          video.requestFullscreen().catch(() => {});
        }
      },
    };
  }, []);

  /**
   * Register zoom getter with store when lightbox opens and slides are processed.
   * This allows Touch Portal to control zoom programmatically.
   */
  useEffect(() => {
    if (!lightbox.isOpen || plugins.length === 0 || isLoading) {
      setLightboxZoomGetter(null);
      return;
    }

    // Register the getter function (not the ref!) so store can get fresh ref.current at call time
    console.log('[MediaLightbox] Registering zoom getter with store');
    setLightboxZoomGetter(getZoomRef);

    return () => {
      setLightboxZoomGetter(null);
    };
  }, [lightbox.isOpen, plugins.length, isLoading, setLightboxZoomGetter, getZoomRef]);

  /**
   * Register video getter with store when a video slide is active.
   * This allows Touch Portal to control video playback programmatically.
   */
  useEffect(() => {
    if (!lightbox.isOpen || isLoading || processedSlides.length === 0) {
      setLightboxVideoGetter(null);
      return;
    }

    const currentSlide = processedSlides[lightbox.currentIndex];

    if (currentSlide?.type === 'video') {
      // Delay to ensure video element is mounted
      const timer = setTimeout(() => {
        setLightboxVideoGetter(getVideoControl);
        console.log('[MediaLightbox] Registering video getter with store');
      }, 100);
      return () => {
        clearTimeout(timer);
        setLightboxVideoGetter(null);
      };
    } else {
      setLightboxVideoGetter(null);
    }
  }, [lightbox.isOpen, lightbox.currentIndex, processedSlides, isLoading, setLightboxVideoGetter, getVideoControl]);

  // Process slides with proper cleanup and race condition prevention
  useEffect(() => {
    // Increment processing ID to invalidate any in-flight operations
    const currentProcessingId = ++processingIdRef.current;

    const processSlides = async () => {
      if (!lightbox.isOpen || lightbox.slides.length === 0) {
        // Only update if this is still the current operation
        if (currentProcessingId === processingIdRef.current) {
          setProcessedSlides([]);
          setIsLoading(false);
        }
        return;
      }

      // Only set loading if this is still the current operation
      if (currentProcessingId === processingIdRef.current) {
        setIsLoading(true);
      }

      try {
        // Process all slides - images get blob URLs, videos get streaming URLs
        // Create array of promises with early exit checks
        const slidePromises = lightbox.slides.map(async (slide): Promise<LightboxSlide | null> => {
          // Check if this operation has been superseded before processing
          if (currentProcessingId !== processingIdRef.current) {
            return null;
          }

          try {
            if (mode === 'viewer') {
              // VIEWER MODE: Extract media from .cadx ZIP container
              const filename = extractFilename(slide.src);
              const mediaType = slide.type === 'image' ? 'images' : 'videos';

              if (slide.type === 'video') {
                // VIDEOS: Use streaming URL (instant, no loading entire file)
                const streamingUrl = await getStreamingMediaUrl(mediaType, filename);

                // Check again after async operation
                if (currentProcessingId !== processingIdRef.current) {
                  return null;
                }

                const mimeType = getMimeType(filename, 'video');

                return {
                  type: 'video' as const,
                  sources: [{ src: streamingUrl, type: mimeType }]
                };
              } else {
                // IMAGES: Use blob URL (images are small, no performance issue)
                const mediaBytes = await resolveMediaPath(mediaType, filename);

                // Check again after async operation
                if (currentProcessingId !== processingIdRef.current) {
                  return null;
                }

                // Convert number array to Uint8Array
                const uint8Array = new Uint8Array(mediaBytes);

                // Determine MIME type
                const mimeType = getMimeType(filename, slide.type);

                // Convert bytes to blob URL
                const blob = new Blob([uint8Array], { type: mimeType });
                const blobUrl = URL.createObjectURL(blob);

                // Track blob URL for cleanup
                blobUrlsRef.current.add(blobUrl);

                // Get image dimensions for zoom plugin
                // Without width/height, the zoom plugin cannot calculate maxZoom
                // and will disable the zoom controls (greyed out buttons)
                const dimensions = await getImageDimensions(blobUrl);

                // Check again after async operation
                if (currentProcessingId !== processingIdRef.current) {
                  return null;
                }

                return {
                  src: blobUrl,
                  width: dimensions.width,
                  height: dimensions.height
                };
              }
            } else {
              // EDITOR MODE: Load from filesystem
              if (slide.type === 'image') {
                // Validate data URL format to prevent XSS
                const dataUrl = await readFileAsBase64(slide.src);

                // Check again after async operation
                if (currentProcessingId !== processingIdRef.current) {
                  return null;
                }

                // Validate it's a proper data URL
                if (!dataUrl.startsWith('data:image/')) {
                  console.error('[MediaLightbox] Invalid image data URL format');
                  return { src: '' };
                }

                // Get image dimensions for zoom plugin
                // Without width/height, the zoom plugin cannot calculate maxZoom
                // and will disable the zoom controls (greyed out buttons)
                const dimensions = await getImageDimensions(dataUrl);

                // Check again after async operation
                if (currentProcessingId !== processingIdRef.current) {
                  return null;
                }

                return {
                  src: dataUrl,
                  width: dimensions.width,
                  height: dimensions.height
                };
              } else {
                // Use asset protocol for video streaming
                const assetUrl = convertFileSrc(slide.src);

                // Check again before returning
                if (currentProcessingId !== processingIdRef.current) {
                  return null;
                }

                return {
                  type: 'video' as const,
                  sources: [{ src: assetUrl, type: 'video/mp4' }]
                };
              }
            }
          } catch (err) {
            // Only log if this operation is still current
            if (currentProcessingId === processingIdRef.current) {
              console.error('[MediaLightbox] Failed to process slide:', err);
            }
            // Return placeholder for failed loads (empty image)
            return {
              src: ''
            };
          }
        });

        // Wait for all promises to resolve
        const results = await Promise.all(slidePromises);

        // Final check before updating state - prevent stale updates
        if (currentProcessingId !== processingIdRef.current) {
          return;
        }

        // Filter out null results (from cancelled operations) and update state
        const processed = results.filter((slide): slide is LightboxSlide => slide !== null);
        setProcessedSlides(processed);
      } catch (err) {
        // Only update state if this operation is still current
        if (currentProcessingId === processingIdRef.current) {
          console.error('[MediaLightbox] Failed to process slides:', err);
          setProcessedSlides([]);
        }
      } finally {
        // Only update loading state if this operation is still current
        if (currentProcessingId === processingIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    processSlides();

    /**
     * Cleanup function increments processingId to invalidate this operation
     * This effectively "aborts" the async operation by making it a no-op
     * when it tries to update state
     *
     * FIX: Use ref-based blob URL tracking to prevent memory leaks
     * Cleanup all tracked blob URLs (only for images in viewer mode now)
     */
    return () => {
      processingIdRef.current++;

      // Clean up all tracked blob URLs
      blobUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current.clear();
    };
  }, [lightbox.isOpen, lightbox.slides, mode]); // Added mode to dependencies

  // Create portal target inside fullscreen container with proper cleanup
  useEffect(() => {
    // Always clean up portal, even if lightbox.isOpen is false
    // This ensures cleanup happens in all scenarios
    const cleanup = () => {
      if (portalRef.current) {
        portalRef.current.remove();
        portalRef.current = null;
      }
    };

    if (!lightbox.isOpen) {
      cleanup();
      return;
    }

    // Get the fullscreen container
    const fullscreenContainer = document.getElementById(DOM_IDS.FULLSCREEN_CONTAINER);

    if (fullscreenContainer) {
      // Create a portal target div inside the fullscreen container
      const portalDiv = document.createElement('div');
      portalDiv.id = DOM_IDS.LIGHTBOX_PORTAL;
      portalDiv.style.position = 'fixed';
      portalDiv.style.inset = '0';
      portalDiv.style.zIndex = String(Z_INDEX.LIGHTBOX);
      fullscreenContainer.appendChild(portalDiv);
      portalRef.current = portalDiv;
    }

    // Cleanup portal div when lightbox closes OR component unmounts
    return cleanup;
  }, [lightbox.isOpen]);

  /**
   * PHASE 3: Auto-focus video elements when they become the current slide
   *
   * Problem: Space bar doesn't work for video play/pause until user clicks the video first
   * Solution: Automatically focus the video element when a video slide is displayed
   *
   * This enables Bluetooth remote controls to work immediately without requiring
   * the user to click the video element first. Critical for court presentations.
   *
   * Fix: Added longer delay and preventFocus flag to avoid interfering with carousel navigation
   */
  useEffect(() => {
    if (!lightbox.isOpen || isLoading || processedSlides.length === 0) return;

    const currentSlide = processedSlides[lightbox.currentIndex];

    if (currentSlide?.type === 'video') {
      // Wait longer for the lightbox carousel to fully settle before focusing
      // This prevents focus from interfering with carousel navigation animations
      const timer = setTimeout(() => {
        // Query for the video element in the current slide
        const videoElement = document.querySelector(
          '.yarl__slide_current video'
        ) as HTMLVideoElement;

        if (videoElement) {
          // Use preventScroll to avoid any scroll-related side effects
          // Use try-catch to handle any edge cases where focus might fail
          try {
            videoElement.focus({ preventScroll: true });
          } catch (err) {
            // Silently fail if focus doesn't work - not critical
            console.debug('[MediaLightbox] Video focus failed (non-critical):', err);
          }

          // Optional: Auto-play video when it appears
          // Commented out to give user control over playback
          // videoElement.play().catch(() => {
          //   // Autoplay might be blocked by browser - that's OK
          // });
        }
      }, 300); // Increased delay to ensure carousel animation is complete

      return () => clearTimeout(timer);
    }
  }, [lightbox.isOpen, lightbox.currentIndex, processedSlides, isLoading]);

  /**
   * Disable arrow key frame stepping on video slides
   *
   * Problem: yet-another-react-lightbox has built-in behavior where pressing Left arrow
   * on the first slide or Right arrow on the last slide attempts to step video frames.
   * This conflicts with our J/L frame stepping implementation.
   *
   * Solution: Intercept Left/Right arrow keys when at slide boundaries and prevent default
   * behavior. This ensures arrow keys ONLY navigate slides, never control video frames.
   *
   * KEYBOARD ISOLATION: Uses keyboard context to only run when lightbox is the active context.
   * This prevents these handlers from running when other overlays (help panel) are open.
   */
  useEffect(() => {
    if (!lightbox.isOpen || isLoading || processedSlides.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // GATE: Only process if lightbox is the active keyboard context
      if (!isActiveContext()) return;

      const isFirstSlide = lightbox.currentIndex === 0;
      const isLastSlide = lightbox.currentIndex === processedSlides.length - 1;
      const currentSlide = processedSlides[lightbox.currentIndex];

      // Only intercept arrow keys on video slides at boundaries
      if (currentSlide?.type !== 'video') return;

      // Prevent Left arrow frame stepping on first slide
      if (event.key === HOTKEYS.lightbox.PREV_SLIDE && isFirstSlide) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Prevent Right arrow frame stepping on last slide
      if (event.key === HOTKEYS.lightbox.NEXT_SLIDE && isLastSlide) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    };

    // Add event listener with capture phase to intercept before lightbox
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [lightbox.isOpen, lightbox.currentIndex, processedSlides, isLoading, isActiveContext]);

  /**
   * Video frame advance keyboard controls (J/L keys)
   *
   * Implements video editing convention:
   * - J = Previous frame (step backward)
   * - L = Next frame (step forward)
   *
   * Frame stepping is done by advancing/rewinding currentTime by 10 frames (~0.33 seconds at 30fps)
   * Only active when a video slide is the current slide
   *
   * FIX: Removed keyboard context gating to restore functionality.
   * These shortcuts work even when help panel is open (acceptable - help shows shortcut info).
   */
  useEffect(() => {
    if (!lightbox.isOpen || isLoading || processedSlides.length === 0) return;

    const currentSlide = processedSlides[lightbox.currentIndex];

    // Only add keyboard handler for video slides
    if (currentSlide?.type !== 'video') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Get the current video element
      const videoElement = document.querySelector(
        '.yarl__slide_current video'
      ) as HTMLVideoElement;

      if (!videoElement) return;

      // Use configured frame step for CCTV review
      const frameStep = VIDEO_PLAYBACK.FRAME_STEP_SECONDS;

      switch (event.key.toLowerCase()) {
        case HOTKEYS.lightbox.FRAME_BACKWARD:
          // Step backward 10 frames
          event.preventDefault();
          event.stopPropagation();
          videoElement.currentTime = Math.max(0, videoElement.currentTime - frameStep);
          break;

        case HOTKEYS.lightbox.FRAME_FORWARD:
          // Step forward 10 frames
          event.preventDefault();
          event.stopPropagation();
          videoElement.currentTime = Math.min(
            videoElement.duration || 0,
            videoElement.currentTime + frameStep
          );
          break;

        // K key could be used for play/pause in the future if needed
        // case 'k':
        //   event.preventDefault();
        //   event.stopPropagation();
        //   if (videoElement.paused) {
        //     videoElement.play();
        //   } else {
        //     videoElement.pause();
        //   }
        //   break;
      }
    };

    // Add event listener to document to catch all keydowns
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightbox.isOpen, lightbox.currentIndex, processedSlides, isLoading]);

  /**
   * Fullscreen keyboard controls (Ctrl+F to enter, Ctrl+A to exit)
   *
   * NOTE: Native HTML5 video fullscreen and lightbox container fullscreen are different:
   * - Lightbox container fullscreen: Controlled by us (Ctrl+F/A work, J/L work)
   * - Video element fullscreen: Controlled by browser (keyboard events are captured)
   *
   * When video enters native fullscreen via controls, keyboard shortcuts won't work
   * because the browser intercepts all keyboard events for security reasons.
   *
   * FIX: Removed keyboard context gating. Fullscreen shortcuts should always work.
   * Uses aggressive event prevention to override browser Ctrl+F "Find" behavior.
   */
  useEffect(() => {
    if (!lightbox.isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+F: Enter fullscreen (override browser "Find")
      if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        // CRITICAL: Prevent browser "Find" dialog
        event.preventDefault();
        event.stopPropagation();
        enterFullscreen();
        return;
      }

      // Ctrl+A: Exit fullscreen (override browser "Select All")
      if (event.ctrlKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        event.stopPropagation();
        exitFullscreen();
        return;
      }
    };

    // Use capture phase to intercept BEFORE yet-another-react-lightbox handlers
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [lightbox.isOpen, enterFullscreen, exitFullscreen]);

  /**
   * Close lightbox with Ctrl+X
   *
   * NOTE: We use Ctrl+X instead of Escape because the native browser fullscreen API
   * captures Escape before JavaScript can handle it. This causes conflicts where
   * Escape exits fullscreen but doesn't close the lightbox, leaving it in a broken state.
   *
   * FIX: Removed keyboard context gating. Ctrl+X should ALWAYS work to close the lightbox.
   * Uses capture phase to intercept keyboard events BEFORE the yet-another-react-lightbox
   * library can capture them. This ensures Ctrl+X works reliably.
   *
   * FULLSCREEN BUG FIX: Exit lightbox fullscreen BEFORE closing to preserve map fullscreen state.
   * When lightbox is fullscreened and Ctrl+X is pressed, we must explicitly exit the lightbox's
   * fullscreen first. Otherwise, the browser exits fullscreen globally when the lightbox unmounts,
   * which also exits the map's fullscreen state.
   */
  useEffect(() => {
    if (!lightbox.isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+X (case insensitive)
      if (event.ctrlKey && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        event.stopPropagation();

        // CRITICAL FIX: If lightbox portal is currently fullscreen, exit it first
        // This prevents the browser from globally exiting fullscreen (which would affect the map)
        if (portalRef.current && document.fullscreenElement === portalRef.current) {
          // Exit fullscreen for the lightbox portal, then close the lightbox
          document.exitFullscreen().then(() => {
            closeLightbox();
          }).catch((err) => {
            console.error('[MediaLightbox] Failed to exit fullscreen:', err);
            // Close anyway even if exitFullscreen fails
            closeLightbox();
          });
        } else {
          // Not in fullscreen, just close normally
          closeLightbox();
        }
      }
    };

    // Use capture phase to intercept BEFORE yet-another-react-lightbox handlers
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [lightbox.isOpen, closeLightbox]);

  // Don't render anything if lightbox is closed, still loading slides, or plugins haven't loaded yet
  if (!lightbox.isOpen || isLoading || plugins.length === 0) {
    return null;
  }

  return (
    <>
      {/* Remove focus outline from video elements while keeping them focusable for keyboard control */}
      <style>
        {`
          .yarl__slide_current video:focus {
            outline: none;
          }
        `}
      </style>

      <Suspense fallback={<LightboxFallback />}>
        <LightboxComponent
          open={lightbox.isOpen}
          close={closeLightbox}
          index={lightbox.currentIndex}
          slides={processedSlides}
          plugins={plugins}
          on={{
            view: ({ index }) => {
              setLightboxIndex(index);
            }
          }}
          carousel={{
            finite: true
          }}
          controller={{
            closeOnBackdropClick: true
          }}
          // Zoom plugin configuration
          // ref: Allows programmatic control via Touch Portal
          // maxZoomPixelRatio: Controls maximum zoom level (default is 1, which limits zoom)
          zoom={{
            ref: zoomRef,
            maxZoomPixelRatio: 3,  // Allow zooming up to 3x the image's pixel density
            scrollToZoom: true     // Enable scroll wheel to zoom
          }}
          styles={{
            container: {
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              // Force position fixed to escape any positioning contexts
              position: 'fixed',
              zIndex: Z_INDEX.LIGHTBOX
            }
          }}
          // Use portal to render inside fullscreen container instead of body
          portal={portalRef.current ? { root: portalRef.current } : undefined}
        />
      </Suspense>
    </>
  );
};
