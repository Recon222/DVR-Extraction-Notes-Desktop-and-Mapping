import { useEffect } from 'react';
import { useMapTimelineStore } from '../store/mapTimelineStore';
import { HOTKEYS } from '../constants/hotkeys';
import { isTypingInFormField } from '@/features/shared/utils';
import type { TimelineEvent } from '../types';
import type { CCTVLocation } from '@/types/cctv.types';

interface UseTimelineKeyboardNavigationParams {
  events: TimelineEvent[];
  locations: CCTVLocation[];
  onEventClick: (locationId: string, index: number, location: CCTVLocation) => void;  // CHANGED: string
  isEnabled: boolean; // Disable when filters open, lightbox open, etc.
}

/**
 * Custom hook for keyboard navigation through timeline events
 *
 * Provides Left/Right arrow navigation through the timeline:
 * - Left arrow: Select previous event (earlier in time)
 * - Right arrow: Select next event (later in time)
 *
 * The hook automatically:
 * - Pauses playback when manually navigating
 * - Ignores keyboard events when typing in form fields
 * - Can be disabled when overlays are open (filters, lightbox, etc.)
 */
export function useTimelineKeyboardNavigation({
  events,
  locations,
  onEventClick,
  isEnabled
}: UseTimelineKeyboardNavigationParams) {
  const currentIndex = useMapTimelineStore(state => state.currentIndex);
  const isPlaying = useMapTimelineStore(state => state.isPlaying);
  const pausePlayback = useMapTimelineStore(state => state.pausePlayback);

  useEffect(() => {
    // Don't register handler if disabled
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts when user is typing in form fields
      if (isTypingInFormField(e)) {
        return;
      }

      // Handle Left Arrow - Previous Event (earlier in time)
      if (e.key === HOTKEYS.timeline.PREV_EVENT) {
        // Always prevent default to stop map from panning
        e.preventDefault();
        e.stopPropagation();

        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0 && prevIndex < events.length) {
          // Pause playback if active - manual navigation takes priority
          if (isPlaying) {
            pausePlayback();
          }

          const event = events[prevIndex];
          const location = locations.find(l => l.uuid === event.location.uuid);  // CHANGED: Compare UUID

          if (location) {
            console.log('[Timeline] Keyboard nav:', { direction: 'prev', uuid: event.location.uuid, index: prevIndex });
            onEventClick(event.location.uuid, prevIndex, location);  // CHANGED: Pass UUID
          }
        }
        // At start of list - do nothing, but event is already prevented
      }

      // Handle Right Arrow - Next Event (later in time)
      if (e.key === HOTKEYS.timeline.NEXT_EVENT) {
        // Always prevent default to stop map from panning
        e.preventDefault();
        e.stopPropagation();

        const nextIndex = currentIndex + 1;
        if (nextIndex >= 0 && nextIndex < events.length) {
          // Pause playback if active - manual navigation takes priority
          if (isPlaying) {
            pausePlayback();
          }

          const event = events[nextIndex];
          const location = locations.find(l => l.uuid === event.location.uuid);  // CHANGED: Compare UUID

          if (location) {
            console.log('[Timeline] Keyboard nav:', { direction: 'next', uuid: event.location.uuid, index: nextIndex });
            onEventClick(event.location.uuid, nextIndex, location);  // CHANGED: Pass UUID
          }
        }
        // At end of list - do nothing, but event is already prevented
      }
    };

    // Register global keyboard handler
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount or when dependencies change
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [events, locations, onEventClick, currentIndex, isPlaying, pausePlayback, isEnabled]);
}
