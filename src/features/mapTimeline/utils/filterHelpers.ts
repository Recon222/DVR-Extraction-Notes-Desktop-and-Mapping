/**
 * Timeline Filter Utilities
 *
 * Provides functions for filtering timeline events based on various criteria.
 */

import { parseISO } from 'date-fns';
import type { CCTVLocation } from '@/types/cctv.types';
import type { TimelineEvent, TimelineFilters } from '../types';

/**
 * Apply filter criteria to CCTV locations array
 * This is more efficient than filtering events, as we filter before transformation
 *
 * @param locations - Array of CCTV locations to filter
 * @param filters - Filter criteria to apply (null = no filtering)
 * @returns Filtered array of CCTV locations
 */
export function applyLocationFilters(
  locations: CCTVLocation[],
  filters: TimelineFilters | null
): CCTVLocation[] {
  // Validate locations array
  if (!Array.isArray(locations)) {
    console.error('[FilterHelpers] applyLocationFilters: locations is not an array', locations);
    return [];
  }

  if (!filters) return locations;

  return locations.filter(location => {
    // Validate location object structure
    if (!location) {
      console.warn('[FilterHelpers] Invalid location object (null/undefined):', location);
      return false;
    }

    // Date FROM filter (inclusive)
    if (filters.dateFrom) {
      try {
        // Validate location has realDateTime
        if (!location.realDateTime) {
          console.warn('[FilterHelpers] Location missing realDateTime:', location);
          return false;
        }

        const locationDate = parseISO(location.realDateTime);
        const fromDate = parseISO(filters.dateFrom);

        // Validate parsed dates
        if (isNaN(locationDate.getTime()) || isNaN(fromDate.getTime())) {
          console.warn('[FilterHelpers] Invalid date format:', {
            locationDate: location.realDateTime,
            filterFrom: filters.dateFrom
          });
          return false;
        }

        if (locationDate < fromDate) return false;
      } catch (err) {
        // Log parse errors for debugging
        console.warn('[FilterHelpers] Date parsing error:', err);
        return false;
      }
    }

    // Date TO filter (inclusive)
    if (filters.dateTo) {
      try {
        // Validate location has realDateTime
        if (!location.realDateTime) {
          console.warn('[FilterHelpers] Location missing realDateTime:', location);
          return false;
        }

        const locationDate = parseISO(location.realDateTime);
        const toDate = parseISO(filters.dateTo);

        // Validate parsed dates
        if (isNaN(locationDate.getTime()) || isNaN(toDate.getTime())) {
          console.warn('[FilterHelpers] Invalid date format:', {
            locationDate: location.realDateTime,
            filterTo: filters.dateTo
          });
          return false;
        }

        if (locationDate > toDate) return false;
      } catch (err) {
        // Log parse errors for debugging
        console.warn('[FilterHelpers] Date parsing error:', err);
        return false;
      }
    }

    // Phase filter
    if (filters.phase !== 'all') {
      // Validate timing field exists
      if (typeof location.timing !== 'string') {
        console.warn('[FilterHelpers] Location missing or invalid timing field:', location);
        return false;
      }

      if (location.timing !== filters.phase) {
        return false;
      }
    }

    // Location filter (exact match)
    if (filters.location !== 'all') {
      // Validate address field exists
      if (typeof location.address !== 'string') {
        console.warn('[FilterHelpers] Location missing or invalid address field:', location);
        return false;
      }

      if (location.address !== filters.location) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Apply filter criteria to events array
 * Returns a new filtered array (does not mutate original)
 *
 * @param events - Array of timeline events to filter
 * @param filters - Filter criteria to apply (null = no filtering)
 * @returns Filtered array of timeline events
 */
export function applyFilters(
  events: TimelineEvent[],
  filters: TimelineFilters | null
): TimelineEvent[] {
  // Validate events array
  if (!Array.isArray(events)) {
    console.error('[FilterHelpers] applyFilters: events is not an array', events);
    return [];
  }

  if (!filters) return events;

  return events.filter(event => {
    // Validate event object structure
    if (!event?.location) {
      console.warn('[FilterHelpers] Invalid event object (missing location):', event);
      return false;
    }

    // Date FROM filter (inclusive)
    if (filters.dateFrom) {
      try {
        // Validate event has realDateTime
        if (!event.location.realDateTime) {
          console.warn('[FilterHelpers] Event missing realDateTime:', event.location);
          return false;
        }

        const eventDate = parseISO(event.location.realDateTime);
        const fromDate = parseISO(filters.dateFrom);

        // Validate parsed dates
        if (isNaN(eventDate.getTime()) || isNaN(fromDate.getTime())) {
          console.warn('[FilterHelpers] Invalid date format:', {
            eventDate: event.location.realDateTime,
            filterFrom: filters.dateFrom
          });
          return false;
        }

        if (eventDate < fromDate) return false;
      } catch (err) {
        // Log parse errors for debugging
        console.warn('[FilterHelpers] Date parsing error:', err);
        return false;
      }
    }

    // Date TO filter (inclusive)
    if (filters.dateTo) {
      try {
        // Validate event has realDateTime
        if (!event.location.realDateTime) {
          console.warn('[FilterHelpers] Event missing realDateTime:', event.location);
          return false;
        }

        const eventDate = parseISO(event.location.realDateTime);
        const toDate = parseISO(filters.dateTo);

        // Validate parsed dates
        if (isNaN(eventDate.getTime()) || isNaN(toDate.getTime())) {
          console.warn('[FilterHelpers] Invalid date format:', {
            eventDate: event.location.realDateTime,
            filterTo: filters.dateTo
          });
          return false;
        }

        if (eventDate > toDate) return false;
      } catch (err) {
        // Log parse errors for debugging
        console.warn('[FilterHelpers] Date parsing error:', err);
        return false;
      }
    }

    // Phase filter
    if (filters.phase !== 'all') {
      // Validate timing field exists
      if (typeof event.location.timing !== 'string') {
        console.warn('[FilterHelpers] Event missing or invalid timing field:', event.location);
        return false;
      }

      if (event.location.timing !== filters.phase) {
        return false;
      }
    }

    // Location filter (exact match)
    if (filters.location !== 'all') {
      // Validate address field exists
      if (typeof event.location.address !== 'string') {
        console.warn('[FilterHelpers] Event missing or invalid address field:', event.location);
        return false;
      }

      if (event.location.address !== filters.location) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extract unique addresses from events for location dropdown
 * Returns addresses sorted alphabetically
 *
 * @param events - Array of timeline events
 * @returns Sorted array of unique addresses
 */
export function getUniqueAddresses(events: TimelineEvent[]): string[] {
  // Validate input
  if (!Array.isArray(events)) {
    console.error('[FilterHelpers] getUniqueAddresses: events is not an array', events);
    return [];
  }

  // Filter valid addresses and remove empty/null values
  const addresses = events
    .filter(e => e?.location?.address && typeof e.location.address === 'string')
    .map(e => e.location.address.trim())
    .filter(addr => addr.length > 0);

  return Array.from(new Set(addresses)).sort();
}

/**
 * Get default date range from events (first and last event times)
 * Useful for initializing date filter inputs
 *
 * @param events - Array of timeline events
 * @returns Object with from/to dates, or null if no events
 */
export function getDefaultDateRange(events: TimelineEvent[]): {
  from: string;
  to: string;
} | null {
  // Validate input
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }

  // Filter events with valid realDateTime
  const validEvents = events.filter(
    e => e?.location?.realDateTime && typeof e.location.realDateTime === 'string'
  );

  if (validEvents.length === 0) {
    return null;
  }

  // Events are already sorted by realDateTime in transformLocationsToEvents
  return {
    from: validEvents[0].location.realDateTime,
    to: validEvents[validEvents.length - 1].location.realDateTime
  };
}

/**
 * Convert ISO datetime to datetime-local input format
 *
 * @param isoString - ISO 8601 datetime string (e.g., "2024-11-26T14:30:00.000Z")
 * @returns datetime-local format (e.g., "2024-11-26T14:30")
 */
export function toDateTimeLocalFormat(isoString: string): string {
  if (!isoString || typeof isoString !== 'string') return '';

  try {
    const date = parseISO(isoString);

    // Validate parsed date
    if (isNaN(date.getTime())) {
      console.warn('[FilterHelpers] Invalid date string:', isoString);
      return '';
    }

    // Format: YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (err) {
    console.warn('[FilterHelpers] Error converting date to local format:', err);
    return '';
  }
}

/**
 * Convert datetime-local input to ISO string
 *
 * @param dateTimeLocal - datetime-local format (e.g., "2024-11-26T14:30")
 * @returns ISO 8601 datetime string (e.g., "2024-11-26T14:30:00.000Z")
 */
export function fromDateTimeLocalFormat(dateTimeLocal: string): string {
  if (!dateTimeLocal || typeof dateTimeLocal !== 'string') return '';

  try {
    const date = new Date(dateTimeLocal);

    // Validate parsed date
    if (isNaN(date.getTime())) {
      console.warn('[FilterHelpers] Invalid datetime-local string:', dateTimeLocal);
      return '';
    }

    return date.toISOString();
  } catch (err) {
    console.warn('[FilterHelpers] Error converting datetime-local to ISO:', err);
    return '';
  }
}

/**
 * Validate that date range is logical (from <= to)
 *
 * @param dateFrom - Start date in ISO format
 * @param dateTo - End date in ISO format
 * @returns true if range is valid or either date is empty
 */
export function isValidDateRange(dateFrom: string, dateTo: string): boolean {
  if (!dateFrom || !dateTo) return true;

  try {
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);

    // Validate both dates parsed successfully
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      console.warn('[FilterHelpers] Invalid date format in range validation:', {
        dateFrom,
        dateTo
      });
      return true; // Don't show validation error for unparseable dates
    }

    return from <= to;
  } catch (err) {
    console.warn('[FilterHelpers] Error validating date range:', err);
    return true; // If parsing fails, don't show validation error
  }
}
