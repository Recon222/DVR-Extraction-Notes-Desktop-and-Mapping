/**
 * Touch Portal Bridge Hook
 *
 * Manages bidirectional communication between CCTV Viewer and Touch Portal.
 * - Receives commands from Touch Portal via Tauri events
 * - Broadcasts state updates to Touch Portal via Tauri commands
 */

import { useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useMapTimelineStore } from '@/features/mapTimeline/store/mapTimelineStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useAppMode } from '@/contexts/AppModeContext';
import { FILE_SEPARATOR } from '@/features/shared/config';
import { useTouchPortalStore } from '../stores/useTouchPortalStore';
import { TP_CONFIG } from '../constants/touchportalConfig';
import type { TPCommand, TPStateUpdate, TPChoiceUpdate, RichLocationData } from '../types/touchportal.types';
import { isValidAction } from '../types/touchportal.types';
import type { CCTVLocation } from '@/types/cctv.types';
import type { LightboxSlide } from '@/features/mapTimeline/types';

/**
 * Format ISO datetime string to YYYY-MM-DD HH:mm:ss format in LOCAL timezone.
 * The ISO string is stored as UTC (e.g., "2025-12-11T23:32:16.000Z"), but we
 * need to display it in the user's local timezone to match other UI components.
 *
 * Example for EST (UTC-5):
 *   Input:  "2025-12-11T23:32:16.000Z" (UTC)
 *   Output: "2025-12-11 18:32:16"      (Local time)
 */
function formatTimeForDisplay(isoString: string): string {
  if (!isoString) return '';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const pad = (num: number): string => num.toString().padStart(2, '0');

  // These methods return LOCAL time values (not UTC)
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

interface UseTouchPortalBridgeOptions {
  /**
   * Optional callback to handle navigation events.
   * When provided, this callback will be invoked for step commands
   * instead of directly calling store actions.
   * This allows the map to trigger flyTo animations.
   */
  onNavigate?: (locationId: string, eventIndex: number, location: CCTVLocation) => void;
}

export function useTouchPortalBridge(options: UseTouchPortalBridgeOptions = {}) {
  const { onNavigate } = options;
  const { mode } = useAppMode();
  const isViewerMode = mode === 'viewer';

  const {
    setConnected,
    setError,
    setLastCommand,
    isConnected,
  } = useTouchPortalStore();

  // Refs for throttling
  const lastBroadcastRef = useRef<number>(0);
  const pendingBroadcastRef = useRef<NodeJS.Timeout | null>(null);

  // Get store states (read-only)
  const {
    currentIndex,
    isPlaying,
    selectedLocationId,
    lightbox,
    streetView,
    isPanelCollapsed,
    // Actions we'll call
    startPlayback,
    pausePlayback,
    setCurrentIndex,
    revealUpTo,
    selectLocation,
    openLightbox,
    closeLightbox,
    setLightboxIndex,
    lightboxZoomIn,
    lightboxZoomOut,
    openStreetView,
    closeStreetView,
    togglePanel,
    mapZoomIn,
    mapZoomOut,
    mapPitchUp,
    mapPitchDown,
    mapBearingLeft,
    mapBearingRight,
    mapPanUp,
    mapPanDown,
    mapPanLeft,
    mapPanRight,
    streetViewMoveForward,
    streetViewMoveBackward,
    streetViewMoveLeft,
    streetViewMoveRight,
    streetViewRotate,
    streetViewPitch,
    streetViewZoom,
    videoPlay,
    videoPause,
    videoToggle,
    videoSeek,
    videoFullscreen,
  } = useMapTimelineStore();

  const locations = useLocationStore((s) => s.locations);

  // ============================================
  // COMMAND EXECUTION
  // ============================================

  // ============================================
  // SHARED NAVIGATION HELPER
  // ============================================

  /**
   * Navigate to a specific index in the timeline.
   * Handles both callback-based navigation (for flyTo animations)
   * and direct store calls (fallback).
   *
   * @param targetIndex - The index to navigate to
   * @returns true if navigation was successful, false otherwise
   */
  const navigateToIndex = useCallback((targetIndex: number): boolean => {
    const loc = locations[targetIndex];
    if (!loc?.uuid) {
      return false;
    }

    if (onNavigate) {
      // Use callback if provided (triggers flyTo animation)
      onNavigate(loc.uuid, targetIndex, loc);
    } else {
      // Fallback to direct store calls
      setCurrentIndex(targetIndex);
      revealUpTo(targetIndex);
      selectLocation(loc.uuid);
    }

    return true;
  }, [locations, onNavigate, setCurrentIndex, revealUpTo, selectLocation]);

  const executeCommand = useCallback((cmd: TPCommand) => {
    // Always log incoming commands to help debug
    console.log('[TP] executeCommand called:', cmd.action, cmd);

    if (!isValidAction(cmd.action)) {
      console.warn('[TP] Invalid action:', cmd.action);
      return;
    }

    if (TP_CONFIG.DEBUG_LOGGING) {
      console.log('[TP] Executing command:', cmd.action, cmd);
    }

    setLastCommand(cmd.action);

    switch (cmd.action) {
      // Timeline playback
      case 'play':
        startPlayback();
        break;
      case 'pause':
        pausePlayback();
        break;
      case 'toggle_playback':
        if (isPlaying) {
          pausePlayback();
        } else {
          startPlayback();
        }
        break;
      case 'step_forward':
        if (currentIndex < locations.length - 1) {
          navigateToIndex(currentIndex + 1);
        }
        break;
      case 'step_backward':
        if (currentIndex > 0) {
          navigateToIndex(currentIndex - 1);
        }
        break;
      case 'goto_start':
        navigateToIndex(0);
        break;
      case 'goto_end':
        navigateToIndex(locations.length - 1);
        break;
      case 'goto_location':
        if (cmd.locationId) {
          const locIndex = locations.findIndex((l) => l.uuid === cmd.locationId);
          if (locIndex >= 0) {
            navigateToIndex(locIndex);
          }
        }
        break;

      // UI controls
      case 'toggle_panel':
        togglePanel();
        break;
      case 'popup_toggle': {
        // Toggle the location details popup (opens when a location is selected)
        // Get current state to avoid stale closure
        const currentSelectedId = useMapTimelineStore.getState().selectedLocationId;
        const currentIdx = useMapTimelineStore.getState().currentIndex;

        if (currentSelectedId) {
          // Popup is open, close it
          selectLocation(null);
        } else {
          // Popup is closed, open it for the current location
          const loc = locations[currentIdx];
          if (loc?.uuid) {
            selectLocation(loc.uuid);
          }
        }
        break;
      }
      case 'lightbox_close':
        closeLightbox();
        break;
      case 'streetview_close':
        closeStreetView();
        break;

      // ============================================
      // PHASE 1: QUICK WINS
      // ============================================

      // Seek to percentage position in timeline
      case 'seek_percent':
        if (cmd.percent !== undefined && locations.length > 0) {
          // Calculate target index from percentage
          const maxIndex = locations.length - 1;
          const targetIndex = Math.round((cmd.percent / 100) * maxIndex);
          const clampedIndex = Math.max(0, Math.min(targetIndex, maxIndex));
          navigateToIndex(clampedIndex);
        }
        break;

      // Location navigation aliases (same as step_forward/step_backward)
      case 'next_location':
        if (currentIndex < locations.length - 1) {
          navigateToIndex(currentIndex + 1);
        }
        break;

      case 'prev_location':
        if (currentIndex > 0) {
          navigateToIndex(currentIndex - 1);
        }
        break;

      // Toggle fullscreen mode
      case 'toggle_fullscreen':
        (async () => {
          try {
            const currentWindow = getCurrentWindow();
            const isFullscreen = await currentWindow.isFullscreen();
            await currentWindow.setFullscreen(!isFullscreen);
          } catch (error) {
            console.error('[TP] Failed to toggle fullscreen:', error);
          }
        })();
        break;

      // ============================================
      // PHASE 2: LIGHTBOX CONTROLS
      // ============================================

      // Open lightbox with all media from current location
      case 'lightbox_open': {
        const currentLoc = selectedLocationId
          ? locations.find((l) => l.uuid === selectedLocationId)
          : locations[currentIndex];

        if (currentLoc) {
          const slides: LightboxSlide[] = [];

          // Add images
          if (currentLoc.image) {
            const images = currentLoc.image.split(FILE_SEPARATOR).filter(Boolean);
            images.forEach((filename) => {
              slides.push({ type: 'image', src: filename, title: filename });
            });
          }

          // Add videos
          if (currentLoc.video) {
            const videos = currentLoc.video.split(FILE_SEPARATOR).filter(Boolean);
            videos.forEach((filename) => {
              slides.push({ type: 'video', src: filename, title: filename });
            });
          }

          if (slides.length > 0) {
            openLightbox(slides, 0);
          }
        }
        break;
      }

      // Open lightbox with only images from current location
      case 'lightbox_open_images': {
        const imgLoc = selectedLocationId
          ? locations.find((l) => l.uuid === selectedLocationId)
          : locations[currentIndex];

        if (imgLoc?.image) {
          const images = imgLoc.image.split(FILE_SEPARATOR).filter(Boolean);
          const slides: LightboxSlide[] = images.map((filename) => ({
            type: 'image',
            src: filename,
            title: filename,
          }));

          if (slides.length > 0) {
            openLightbox(slides, 0);
          }
        }
        break;
      }

      // Open lightbox with only videos from current location
      case 'lightbox_open_videos': {
        const vidLoc = selectedLocationId
          ? locations.find((l) => l.uuid === selectedLocationId)
          : locations[currentIndex];

        if (vidLoc?.video) {
          const videos = vidLoc.video.split(FILE_SEPARATOR).filter(Boolean);
          const slides: LightboxSlide[] = videos.map((filename) => ({
            type: 'video',
            src: filename,
            title: filename,
          }));

          if (slides.length > 0) {
            openLightbox(slides, 0);
          }
        }
        break;
      }

      // Navigate to next slide in lightbox
      case 'image_next': {
        // Get current state to avoid stale closure
        const lb = useMapTimelineStore.getState().lightbox;
        if (lb.isOpen && lb.slides.length > 0) {
          const nextSlideIndex = (lb.currentIndex + 1) % lb.slides.length;
          setLightboxIndex(nextSlideIndex);
        }
        break;
      }

      // Navigate to previous slide in lightbox
      case 'image_prev': {
        // Get current state to avoid stale closure
        const lb = useMapTimelineStore.getState().lightbox;
        if (lb.isOpen && lb.slides.length > 0) {
          const prevSlideIndex = lb.currentIndex === 0
            ? lb.slides.length - 1
            : lb.currentIndex - 1;
          setLightboxIndex(prevSlideIndex);
        }
        break;
      }

      // Zoom in on lightbox slide (images and videos)
      case 'lightbox_zoom_in': {
        // Get current state to avoid stale closure
        const currentLightbox = useMapTimelineStore.getState().lightbox;
        console.log('[TP] lightbox_zoom_in - isOpen:', currentLightbox.isOpen);
        if (currentLightbox.isOpen) {
          lightboxZoomIn();
        }
        break;
      }

      // Zoom out on lightbox slide (images and videos)
      case 'lightbox_zoom_out': {
        // Get current state to avoid stale closure
        const currentLightbox = useMapTimelineStore.getState().lightbox;
        console.log('[TP] lightbox_zoom_out - isOpen:', currentLightbox.isOpen);
        if (currentLightbox.isOpen) {
          lightboxZoomOut();
        }
        break;
      }

      // ============================================
      // PHASE 3: STREET VIEW CONTROLS
      // ============================================

      // Open Street View for current location
      case 'streetview_open': {
        const svLoc = selectedLocationId
          ? locations.find((l) => l.uuid === selectedLocationId)
          : locations[currentIndex];

        if (svLoc?.latitude && svLoc?.longitude) {
          openStreetView(svLoc.latitude, svLoc.longitude, svLoc.address, 'touchportal');
        }
        break;
      }

      // NOTE: streetview_rotate, streetview_pitch, streetview_zoom require exposing
      // the Street View panorama ref from the StreetViewPanel component.
      // This would require additional refactoring to create a context or store
      // that holds the panorama reference. These are left as future enhancements.

      // Street View movement - walk to adjacent panoramas
      case 'streetview_move_forward':
        streetViewMoveForward();
        break;

      case 'streetview_move_backward':
        streetViewMoveBackward();
        break;

      case 'streetview_move_left':
        streetViewMoveLeft();
        break;

      case 'streetview_move_right':
        streetViewMoveRight();
        break;

      case 'streetview_rotate': {
        const degrees = cmd.direction === 'left' ? -(cmd.degrees ?? 15) : (cmd.degrees ?? 15);
        streetViewRotate(degrees);
        break;
      }

      case 'streetview_pitch': {
        const degrees = cmd.direction === 'down' ? -(cmd.degrees ?? 10) : (cmd.degrees ?? 10);
        streetViewPitch(degrees);
        break;
      }

      case 'streetview_zoom': {
        const direction = cmd.zoom ?? 'in';
        streetViewZoom(direction);
        break;
      }

      // ============================================
      // VIDEO CONTROLS
      // ============================================

      case 'video_play':
        videoPlay();
        break;

      case 'video_pause':
        videoPause();
        break;

      case 'video_toggle':
        videoToggle();
        break;

      case 'video_seek': {
        const seconds = cmd.seconds ?? 0;
        videoSeek(seconds);
        break;
      }

      case 'video_fullscreen':
        videoFullscreen();
        break;

      // ============================================
      // PHASE 4: MAP CONTROLS
      // ============================================

      // Zoom in on map centered on current location
      case 'map_zoom_in': {
        const zoomLoc = selectedLocationId
          ? locations.find((l) => l.uuid === selectedLocationId)
          : locations[currentIndex];

        if (zoomLoc?.latitude && zoomLoc?.longitude) {
          mapZoomIn(zoomLoc.latitude, zoomLoc.longitude);
        }
        break;
      }

      // Zoom out on map centered on current location
      case 'map_zoom_out': {
        const zoomLoc = selectedLocationId
          ? locations.find((l) => l.uuid === selectedLocationId)
          : locations[currentIndex];

        if (zoomLoc?.latitude && zoomLoc?.longitude) {
          mapZoomOut(zoomLoc.latitude, zoomLoc.longitude);
        }
        break;
      }

      // Increase map pitch (tilt more 3D)
      case 'map_pitch_up':
        mapPitchUp();
        break;

      // Decrease map pitch (tilt more flat)
      case 'map_pitch_down':
        mapPitchDown();
        break;

      // Rotate map left (counter-clockwise)
      case 'map_bearing_left':
        mapBearingLeft();
        break;

      // Rotate map right (clockwise)
      case 'map_bearing_right':
        mapBearingRight();
        break;

      // Pan map up (north)
      case 'map_pan_up':
        mapPanUp();
        break;

      // Pan map down (south)
      case 'map_pan_down':
        mapPanDown();
        break;

      // Pan map left (west)
      case 'map_pan_left':
        mapPanLeft();
        break;

      // Pan map right (east)
      case 'map_pan_right':
        mapPanRight();
        break;

      default:
        console.log('[TP] Unhandled action:', cmd.action);
    }
  }, [
    isPlaying, currentIndex, locations, selectedLocationId, lightbox,
    startPlayback, pausePlayback, navigateToIndex,
    openLightbox, closeLightbox, setLightboxIndex,
    lightboxZoomIn, lightboxZoomOut,
    openStreetView, closeStreetView,
    togglePanel, setLastCommand, selectLocation,
    mapZoomIn, mapZoomOut, mapPitchUp, mapPitchDown, mapBearingLeft, mapBearingRight,
    mapPanUp, mapPanDown, mapPanLeft, mapPanRight,
    streetViewMoveForward, streetViewMoveBackward, streetViewMoveLeft, streetViewMoveRight, streetViewRotate,
    streetViewPitch, streetViewZoom,
    videoPlay, videoPause, videoToggle, videoSeek, videoFullscreen,
  ]);

  // ============================================
  // STATE BROADCASTING (Throttled)
  // ============================================

  const broadcastState = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastBroadcast = now - lastBroadcastRef.current;

    // Throttle to 10Hz
    if (timeSinceLastBroadcast < TP_CONFIG.STATE_BROADCAST_INTERVAL_MS) {
      // Schedule pending broadcast
      if (!pendingBroadcastRef.current) {
        pendingBroadcastRef.current = setTimeout(() => {
          pendingBroadcastRef.current = null;
          broadcastState();
        }, TP_CONFIG.STATE_BROADCAST_INTERVAL_MS - timeSinceLastBroadcast);
      }
      return;
    }

    lastBroadcastRef.current = now;

    const currentLocation = selectedLocationId
      ? locations.find((l) => l.uuid === selectedLocationId)
      : locations[currentIndex];

    // Calculate media counts for the current location
    const imageCount = currentLocation?.image?.split(FILE_SEPARATOR).filter(Boolean).length || 0;
    const videoCount = currentLocation?.video?.split(FILE_SEPARATOR).filter(Boolean).length || 0;

    // Format media count string with icons: "📷 3 🎬 2" (always show both, side by side)
    const mediaCount = `📷 ${imageCount} 🎬 ${videoCount}`;

    const stateUpdate: TPStateUpdate = {
      type: 'state',
      isPlaying,
      currentIndex,
      totalLocations: locations.length,
      mediaCount,
      // timelinePercent is still sent for the slider connector
      timelinePercent: Math.round(
        (currentIndex / Math.max(locations.length - 1, 1)) * 100
      ),
      currentLocationId: selectedLocationId,
      currentLocationName: currentLocation?.address?.split(',')[0] || '',
      // Truncate address to street + city only, then limit to 27 chars with "..." if needed
      currentLocationAddress: (() => {
        if (!currentLocation?.address) return '';
        // First get street + city only (first 2 comma-separated parts)
        const streetAndCity = currentLocation.address.split(', ').slice(0, 2).join(', ');
        // Then truncate to 27 chars if still too long
        return streetAndCity.length > 27
          ? `${streetAndCity.substring(0, 27)}...`
          : streetAndCity;
      })(),
      // Format time as YYYY-MM-DD HH:mm:ss (e.g., "2025-12-11 23:32:16")
      currentLocationTime: currentLocation?.realDateTime
        ? formatTimeForDisplay(currentLocation.realDateTime)
        : '',
      currentTiming: (currentLocation?.timing as 'pre' | 'incident' | 'post') || null,
      hasImages: !!currentLocation?.image,
      hasVideos: !!currentLocation?.video,
      hasStreetView: !!(currentLocation?.latitude && currentLocation?.longitude),
      imageCount: currentLocation?.image?.split(FILE_SEPARATOR).filter(Boolean).length || 0,
      videoCount: currentLocation?.video?.split(FILE_SEPARATOR).filter(Boolean).length || 0,
      lightboxOpen: lightbox.isOpen,
      streetViewOpen: streetView.isOpen,
      panelCollapsed: isPanelCollapsed,
    };

    try {
      await invoke('emit_tp_state', {
        stateJson: JSON.stringify(stateUpdate),
      });
    } catch (error) {
      if (TP_CONFIG.DEBUG_LOGGING) {
        console.error('[TP] Broadcast failed:', error);
      }
    }
  }, [
    isPlaying, currentIndex, selectedLocationId, locations,
    lightbox.isOpen, streetView.isOpen, isPanelCollapsed
  ]);

  // ============================================
  // LOCATION CHOICES BROADCASTING
  // ============================================

  /**
   * Helper to count media files from semicolon-separated string.
   */
  const countMedia = (mediaString: string): number => {
    if (!mediaString || mediaString.trim() === '') return 0;
    return mediaString.split(FILE_SEPARATOR).filter(s => s.trim() !== '').length;
  };

  /**
   * Broadcast location choices to Touch Portal for the "Go To Location" dropdown.
   * The dropdown shows user-friendly text (e.g., "23:32 - 450 Markham St, Toronto").
   * The plugin uses a lookup map to resolve display text back to UUID.
   * Also includes rich location data for enhanced Remote display.
   */
  const broadcastLocationChoices = useCallback(async () => {
    if (locations.length === 0) return;

    // Build parallel data structures:
    // 1. values: Display strings for the dropdown (what user sees)
    // 2. lookup: Mapping from display string to UUID (for plugin lookup)
    // 3. richData: Full location data indexed by UUID (for Remote app)
    const values: string[] = [];
    const lookup: Record<string, string> = {};
    const richData: Record<string, RichLocationData> = {};

    locations.forEach((loc, index) => {
      // Get address or default, then extract street + city only
      const fullAddress = loc.address || 'Unknown';
      const streetAndCity = fullAddress.split(', ').slice(0, 2).join(', ');

      // Truncate to 27 characters max if still too long, append "..."
      const MAX_ADDRESS_LENGTH = 27;
      const truncatedAddress = streetAndCity.length > MAX_ADDRESS_LENGTH
        ? `${streetAndCity.substring(0, MAX_ADDRESS_LENGTH)}...`
        : streetAndCity;

      // Extract just HH:mm from the datetime
      const dateStr = loc.realDateTime || loc.dvrDateTime || '';
      let timeOnly = '';
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          timeOnly = `${hours}:${minutes}`;
        }
      }

      // Format: "HH:mm - Address" for display
      let displayText = timeOnly
        ? `${timeOnly} - ${truncatedAddress}`
        : truncatedAddress;

      // Handle duplicate display text by appending index
      if (lookup[displayText]) {
        displayText = `${displayText} (${index + 1})`;
      }

      values.push(displayText);
      lookup[displayText] = loc.uuid;

      // Build rich location data for Remote app
      richData[loc.uuid] = {
        uuid: loc.uuid,
        realDateTime: loc.realDateTime || '',
        timing: loc.timing,
        imageCount: countMedia(loc.image),
        videoCount: countMedia(loc.video),
        address: loc.address || '',
      };
    });

    const choicesMessage: TPChoiceUpdate = {
      type: 'choices',
      listId: 'location_id',
      values,
      lookup, // Maps display text → UUID for plugin lookup
      richData, // Rich location data indexed by UUID for Remote app
    };

    try {
      await invoke('emit_tp_state', {
        stateJson: JSON.stringify(choicesMessage),
      });

      if (TP_CONFIG.DEBUG_LOGGING) {
        console.log('[TP] Sent location choices:', values.length, 'locations');
      }
    } catch (error) {
      if (TP_CONFIG.DEBUG_LOGGING) {
        console.error('[TP] Failed to send location choices:', error);
      }
    }
  }, [locations]);

  // ============================================
  // EFFECTS
  // ============================================

  // Listen for commands from Touch Portal (via Tauri events)
  useEffect(() => {
    if (!isViewerMode) return;

    let unlistenFn: (() => void) | undefined;
    let isMounted = true;

    const setupListener = async () => {
      try {
        const fn = await listen<string>('tp-command', (event) => {
          try {
            const cmd = JSON.parse(event.payload) as TPCommand;
            executeCommand(cmd);
          } catch (error) {
            console.error('[TP] Failed to parse command:', error);
          }
        });

        // Only set if still mounted (avoids race condition)
        if (isMounted) {
          unlistenFn = fn;
          setConnected(true);
        } else {
          // Already unmounted, clean up immediately
          fn();
        }
      } catch (error) {
        if (isMounted) {
          setError(String(error));
        }
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      unlistenFn?.();
      setConnected(false);
    };
  }, [isViewerMode, executeCommand, setConnected, setError]);

  // Broadcast state when relevant values change
  useEffect(() => {
    if (!isViewerMode) return;
    broadcastState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isViewerMode,
    isPlaying,
    currentIndex,
    selectedLocationId,
    lightbox.isOpen,
    streetView.isOpen,
    isPanelCollapsed,
    // Note: broadcastState excluded to prevent infinite loop - it's stable via useCallback deps
  ]);

  // Broadcast location choices when locations change (for "Go To Location" dropdown)
  useEffect(() => {
    if (!isViewerMode) return;
    broadcastLocationChoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewerMode, locations]);

  // Cleanup pending broadcasts on unmount
  useEffect(() => {
    return () => {
      if (pendingBroadcastRef.current) {
        clearTimeout(pendingBroadcastRef.current);
      }
    };
  }, []);

  return {
    isEnabled: isViewerMode,
    isConnected,
    executeCommand,
  };
}
