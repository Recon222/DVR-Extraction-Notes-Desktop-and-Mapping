import { useEffect, useRef, useMemo } from 'react';
import { useMapTimelineStore } from '../stores/mapTimelineStore';
import { MAP_CONFIG } from '../constants/mapConfig';
import { HOTKEYS } from '../constants/hotkeys';
import type { CCTVLocation } from '@/types/cctv.types';

export function useTimelinePlayback(
  locations: CCTVLocation[],
  onAdvance: (locationId: string, index: number, location: CCTVLocation) => void  // CHANGED: string
) {
  const { isPlaying, currentIndex, pausePlayback, stepForward, revealUpTo } = useMapTimelineStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sort locations outside effect to avoid re-sorting on every interval
  const sortedLocations = useMemo(() =>
    [...locations].sort((a, b) =>
      new Date(a.realDateTime).getTime() - new Date(b.realDateTime).getTime()
    ), [locations]
  );

  // Emergency stop mechanism - ESC key pauses playback
  useEffect(() => {
    const handleEmergencyStop = (e: KeyboardEvent) => {
      if (e.key === HOTKEYS.global.EMERGENCY_STOP && isPlaying) {
        console.warn('[TimelinePlayback] Emergency stop triggered by ESC key');
        pausePlayback();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleEmergencyStop);
    return () => window.removeEventListener('keydown', handleEmergencyStop);
  }, [isPlaying, pausePlayback]);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const nextIndex = currentIndex + 1;

      // Validate both bounds and array consistency
      if (nextIndex >= sortedLocations.length || nextIndex < 0) {
        console.warn('[TimelinePlayback] Playback reached end or invalid index:', {
          nextIndex,
          arrayLength: sortedLocations.length
        });
        pausePlayback();
        return;
      }

      // Double-check the location exists and is valid
      const nextLocation = sortedLocations[nextIndex];
      if (!nextLocation) {
        console.error('[TimelinePlayback] No location at index:', nextIndex);
        pausePlayback();
        return;
      }

      // Validate location has required fields (UUID)
      if (!nextLocation.uuid || typeof nextLocation.uuid !== 'string') {  // CHANGED: Validate UUID
        console.error('[TimelinePlayback] Invalid location at index:', {
          index: nextIndex,
          location: nextLocation,
          hasUUID: 'uuid' in nextLocation,
          uuidType: typeof nextLocation.uuid,
          uuid: nextLocation.uuid
        });
        pausePlayback();
        return;
      }

      stepForward();
      revealUpTo(nextIndex);
      onAdvance(nextLocation.uuid, nextIndex, nextLocation);  // CHANGED: Pass UUID
    }, MAP_CONFIG.playbackSpeeds.normal);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentIndex, sortedLocations, pausePlayback, stepForward, revealUpTo, onAdvance]);
}
