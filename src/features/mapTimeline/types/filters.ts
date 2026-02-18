/**
 * Timeline Filter Types
 *
 * Defines the filter criteria structure and utilities for filtering timeline events.
 */

/**
 * Filter criteria for timeline events
 */
export interface TimelineFilters {
  dateFrom: string;    // ISO 8601 datetime string or empty
  dateTo: string;      // ISO 8601 datetime string or empty
  phase: 'all' | 'pre' | 'incident' | 'post';
  location: string;    // 'all' or exact address match
}

/**
 * Default filter state (no filtering - show all events)
 */
export const DEFAULT_FILTERS: TimelineFilters = {
  dateFrom: '',
  dateTo: '',
  phase: 'all',
  location: 'all'
};

/**
 * Check if any filters are active (i.e., different from defaults)
 */
export function hasActiveFilters(filters: TimelineFilters | null): boolean {
  if (!filters) return false;

  return (
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.phase !== 'all' ||
    filters.location !== 'all'
  );
}

/**
 * Filter state type for tracking active/inactive filters
 */
export type FilterState = 'active' | 'inactive' | null;
