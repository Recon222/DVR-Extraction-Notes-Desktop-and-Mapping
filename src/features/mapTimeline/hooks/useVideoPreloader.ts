/**
 * Video Preloader Hook
 *
 * Preloads videos when flying to a marker so they play instantly in the lightbox.
 * Creates hidden video elements that buffer in background during the flyTo animation.
 * Cleans up when user navigates away.
 *
 * Phase 2 Optimization:
 * Now watches flyingToLocationId instead of selectedLocationId to utilize the
 * 3-second flyTo animation window for preloading, instead of waiting for animation
 * to complete. This gives videos a head start on buffering.
 *
 * Phase 3 Fix:
 * Added debouncing to prevent excessive preload requests on rapid navigation.
 */

import { useEffect, useRef } from 'react';
import { useMapTimelineStore } from '../stores/mapTimelineStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { splitFileString } from '@/features/shared/config';
import { getStreamingMediaUrl } from '../services/mediaService';
import { useAppMode } from '@/contexts/AppModeContext';
import { useDebounce } from '@/hooks/useDebounce';

export function useVideoPreloader() {
  const { mode } = useAppMode();
  // NEW: Watch flyingToLocationId to start preloading during the flyTo animation
  const flyingToLocationId = useMapTimelineStore(state => state.flyingToLocationId);
  const lightboxOpen = useMapTimelineStore(state => state.lightbox.isOpen);
  const locations = useLocationStore(state => state.locations);
  const preloadElementsRef = useRef<HTMLVideoElement[]>([]);

  // FIX: Debounce flyingToLocationId to prevent excessive preload requests on rapid navigation
  // Only trigger preload if user stays on location for 300ms
  const debouncedFlyingToLocationId = useDebounce(flyingToLocationId, 300);

  useEffect(() => {
    // Only preload in viewer mode
    if (mode !== 'viewer') return;

    // Don't preload if lightbox is already open (video is playing)
    if (lightboxOpen) return;

    // No flyTo in progress = nothing to preload
    if (!debouncedFlyingToLocationId) return;

    const location = locations.find(l => l.uuid === debouncedFlyingToLocationId);
    if (!location) return;

    // Get video files for this location
    const videoFiles = splitFileString(location.video || '').filter(Boolean);
    if (videoFiles.length === 0) return;

    console.log('[VideoPreloader] Starting preload during flyTo for location:', debouncedFlyingToLocationId, 'videos:', videoFiles.length);

    let isCancelled = false;

    const startPreload = async () => {
      // Preload first video only (conservative approach for memory)
      // Can expand to all videos if performance is good
      const firstVideo = videoFiles[0];

      try {
        const streamingUrl = await getStreamingMediaUrl('videos', firstVideo);

        if (isCancelled) return;

        const video = document.createElement('video');
        video.preload = 'auto';
        video.src = streamingUrl;
        video.muted = true;
        video.playsInline = true;

        // Hide element completely
        video.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';

        // Debug attributes
        video.dataset.preloader = 'true';
        video.dataset.locationId = debouncedFlyingToLocationId;
        video.dataset.filename = firstVideo;

        document.body.appendChild(video);
        preloadElementsRef.current.push(video);

        console.log('[VideoPreloader] Preloading started:', firstVideo, 'URL:', streamingUrl);

        // Optional: Log when buffering progresses
        video.addEventListener('progress', () => {
          if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const duration = video.duration || 0;
            const percent = duration > 0 ? Math.round((bufferedEnd / duration) * 100) : 0;
            console.log('[VideoPreloader] Buffered:', percent + '%', 'of', firstVideo);
          }
        }, { passive: true });

      } catch (error) {
        console.error('[VideoPreloader] Failed to start preload:', error);
      }
    };

    startPreload();

    // Cleanup function - runs when flyingToLocationId changes or component unmounts
    return () => {
      isCancelled = true;

      if (preloadElementsRef.current.length > 0) {
        console.log('[VideoPreloader] Cleaning up', preloadElementsRef.current.length, 'preload elements');

        preloadElementsRef.current.forEach(video => {
          video.pause();
          video.src = ''; // Stop download
          video.load(); // Reset video element
          video.remove(); // Remove from DOM
        });

        preloadElementsRef.current = [];
      }
    };
  }, [debouncedFlyingToLocationId, lightboxOpen, locations, mode]);
}
