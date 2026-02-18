import { format, parseISO } from 'date-fns';
import type { CCTVLocation } from '@/types/cctv.types';
import type { TimelineEvent, MarkerData } from '../types';
import { splitFileString } from '@config/filePaths';

/**
 * Sort locations by real date/time in ascending order
 */
export function sortLocationsByTime(locations: CCTVLocation[]): CCTVLocation[] {
  return [...locations].sort((a, b) =>
    new Date(a.realDateTime).getTime() - new Date(b.realDateTime).getTime()
  );
}

/**
 * Transform CCTV locations to timeline events with reveal/active state
 *
 * @param locations - Array of CCTV locations (should already be sorted for performance)
 * @param revealedCount - Number of events to show (progressive reveal)
 * @param selectedId - Currently selected location UUID (shows as active)
 * @returns Array of timeline events
 *
 * @example
 * const sortedLocations = sortLocationsByTime(locations);
 * const events = transformLocationsToEvents(sortedLocations, 5, 'uuid-123');
 * // Returns first 5 events with location uuid-123 marked as active
 */
export function transformLocationsToEvents(
  locations: CCTVLocation[],
  revealedCount: number,
  selectedId: string | null  // CHANGED: UUID instead of number
): TimelineEvent[] {
  // Assume locations are already sorted for performance
  // Caller should use sortLocationsByTime() first and memoize the result
  return locations.map((location, index) => {
    const images = splitFileString(location.image);
    const videos = splitFileString(location.video);

    return {
      location,
      displayTime: formatTime(location.realDateTime),
      displayDate: formatDate(location.realDateTime),
      isRevealed: index < revealedCount,
      isActive: location.uuid === selectedId,  // CHANGED: Compare UUID
      hasImages: images.length > 0,
      hasVideos: videos.length > 0,
      imageCount: images.length,
      videoCount: videos.length
    };
  });
}

export function transformToMarkerData(events: TimelineEvent[]): MarkerData[] {
  return events
    .filter(e => e.isRevealed && e.location.latitude && e.location.longitude)
    .map(e => ({
      locationId: e.location.uuid,  // CHANGED: Use UUID
      coordinates: [e.location.longitude, e.location.latitude] as [number, number],
      label: e.displayTime,
      timing: e.location.timing,
      isRevealed: e.isRevealed,
      isActive: e.isActive
    }));
}

export function formatTime(isoString: string): string {
  try {
    return format(parseISO(isoString), 'HH:mm:ss');
  } catch {
    return '--:--:--';
  }
}

export function formatDate(isoString: string): string {
  try {
    return format(parseISO(isoString), 'MMM dd, yyyy');
  } catch {
    return 'Unknown Date';
  }
}

export function formatDateTime(isoString: string): string {
  try {
    return format(parseISO(isoString), 'MMM dd, yyyy, hh:mm:ss a');
  } catch {
    return 'Unknown';
  }
}

export function getDateRange(locations: CCTVLocation[]): { start: string; end: string } | null {
  if (locations.length === 0) return null;

  const sorted = sortLocationsByTime(locations);

  return {
    start: formatDate(sorted[0].realDateTime),
    end: formatDate(sorted[sorted.length - 1].realDateTime)
  };
}
