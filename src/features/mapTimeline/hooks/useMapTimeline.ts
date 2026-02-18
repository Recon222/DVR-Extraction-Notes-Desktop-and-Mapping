import { useMemo } from 'react';
import { useMapTimelineStore } from '../stores/mapTimelineStore';
import { sortLocationsByTime, transformLocationsToEvents, transformToMarkerData, getDateRange } from '../utils/timelineHelpers';
import { applyLocationFilters } from '../utils/filterHelpers';
import type { CCTVLocation } from '@/types/cctv.types';
import type { TimelineFilters } from '../types';

/**
 * Main hook for Map Timeline feature
 *
 * Applies filters BEFORE transforming to events, then applies progressive reveal
 * to the FILTERED set. This ensures:
 * 1. Markers only show for filtered events
 * 2. Progressive reveal works on filtered events (not all at once)
 *
 * @param locations - All CCTV locations from the store
 * @param filters - Active filter criteria (null = no filtering)
 * @returns Filtered events, markers, and unfiltered events for dropdown options
 */
export function useMapTimeline(locations: CCTVLocation[], filters: TimelineFilters | null) {
  const revealedCount = useMapTimelineStore(state => state.revealedCount);
  const selectedLocationId = useMapTimelineStore(state => state.selectedLocationId);
  const currentIndex = useMapTimelineStore(state => state.currentIndex);

  // Memoize sorted locations to prevent unnecessary sorting
  // This is expensive with large datasets, so we cache it
  const sortedLocations = useMemo(() =>
    sortLocationsByTime(locations),
    [locations]
  );

  // Transform to events using pre-sorted locations
  // These are the UNFILTERED events - used for filter dropdown options
  const unfilteredEvents = useMemo(() =>
    transformLocationsToEvents(sortedLocations, sortedLocations.length - 1, selectedLocationId),
    [sortedLocations, selectedLocationId]
  );

  // Apply filters to LOCATIONS first (before transforming to events)
  // This gives us a filtered subset that progressive reveal can work on
  const filteredLocations = useMemo(() => {
    if (!filters) return sortedLocations;
    return applyLocationFilters(sortedLocations, filters);
  }, [sortedLocations, filters]);

  // Transform filtered locations to events with progressive reveal
  // Progressive reveal now applies to the FILTERED set, not the full set
  const filteredEvents = useMemo(() => {
    return transformLocationsToEvents(filteredLocations, revealedCount, selectedLocationId);
  }, [filteredLocations, revealedCount, selectedLocationId]);

  // Create markers from FILTERED events only
  // This ensures markers only show for events that pass the filter AND are revealed
  const markers = useMemo(() =>
    transformToMarkerData(filteredEvents),
    [filteredEvents]
  );

  const dateRange = useMemo(() =>
    getDateRange(locations),
    [locations]
  );

  const currentEvent = filteredEvents[currentIndex] || null;

  return {
    // Filtered events for timeline display and markers
    events: filteredEvents,
    markers,
    dateRange,
    currentEvent,
    totalLocations: locations.length,

    // Unfiltered events for filter dropdown options
    // (so dropdowns show all available addresses/phases)
    unfilteredEvents
  };
}
