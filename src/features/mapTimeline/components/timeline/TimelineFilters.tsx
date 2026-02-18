/**
 * Timeline Filters Component
 *
 * Provides a compact filter UI for filtering timeline events by date range,
 * phase, and location. Replaces the playback controls temporarily when active.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import type { TimelineEvent, TimelineFilters as ITimelineFilters } from '../../types';
import {
  getUniqueAddresses,
  toDateTimeLocalFormat,
  fromDateTimeLocalFormat,
  isValidDateRange
} from '../../utils/filterHelpers';

interface TimelineFiltersProps {
  events: TimelineEvent[];
  currentFilters: ITimelineFilters | null;
  onApply: (filters: ITimelineFilters) => void;
  onClear: () => void;
  onCancel: () => void;
}

export const TimelineFilters = ({
  events,
  currentFilters,
  onApply,
  onClear,
  onCancel
}: TimelineFiltersProps) => {
  // Calculate default date range from events (earliest and latest dates)
  const defaultDateRange = useMemo(() => {
    if (events.length === 0) {
      return { from: '', to: '' };
    }

    const dates = events.map(e => e.location.realDateTime);
    const earliest = dates.reduce((min, curr) => curr < min ? curr : min, dates[0]);
    const latest = dates.reduce((max, curr) => curr > max ? curr : max, dates[0]);

    return {
      from: toDateTimeLocalFormat(earliest),
      to: toDateTimeLocalFormat(latest)
    };
  }, [events]);

  // Initialize state from current filters or defaults
  const [dateFrom, setDateFrom] = useState<string>(
    currentFilters?.dateFrom ? toDateTimeLocalFormat(currentFilters.dateFrom) : defaultDateRange.from
  );
  const [dateTo, setDateTo] = useState<string>(
    currentFilters?.dateTo ? toDateTimeLocalFormat(currentFilters.dateTo) : defaultDateRange.to
  );
  const [phase, setPhase] = useState<string>(currentFilters?.phase || 'all');
  const [location, setLocation] = useState<string>(currentFilters?.location || 'all');
  const [isApplying, setIsApplying] = useState(false);

  const dateFromRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Extract unique addresses for dropdown
  const uniqueAddresses = useMemo(() => {
    return getUniqueAddresses(events);
  }, [events]);

  // Validate date range
  const dateRangeInvalid = useMemo(() => {
    const fromISO = fromDateTimeLocalFormat(dateFrom);
    const toISO = fromDateTimeLocalFormat(dateTo);
    return !isValidDateRange(fromISO, toISO);
  }, [dateFrom, dateTo]);

  // Auto-focus first input when component mounts and restore focus on unmount
  useEffect(() => {
    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    if (dateFromRef.current) {
      dateFromRef.current.focus();
    }

    // Restore focus on unmount
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const filters: ITimelineFilters = {
        dateFrom: fromDateTimeLocalFormat(dateFrom),
        dateTo: fromDateTimeLocalFormat(dateTo),
        phase: phase as 'all' | 'pre' | 'incident' | 'post',
        location
      };
      onApply(filters);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClearAndClose = () => {
    // Clear local state
    setDateFrom('');
    setDateTo('');
    setPhase('all');
    setLocation('all');
    // Call parent's onClear to reset filters and close
    onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!dateRangeInvalid && !isApplying) {
        handleApply();
      }
    }
  };

  return (
    <div
      className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Timeline filter controls"
    >
      <div className="text-sm @lg/timeline:text-base font-medium mb-3 text-gray-900 dark:text-gray-100">
        Filter Timeline Events
      </div>

      {/* Two-column grid for inputs - responsive sizing */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Date FROM */}
        <div>
          <label className="block text-xs @lg/timeline:text-sm text-gray-600 dark:text-gray-400 mb-1">
            From
          </label>
          <input
            ref={dateFromRef}
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            disabled={isApplying}
            className="w-full px-2 py-1.5 text-xs @lg/timeline:text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Date TO */}
        <div>
          <label className="block text-xs @lg/timeline:text-sm text-gray-600 dark:text-gray-400 mb-1">
            To
          </label>
          <input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            disabled={isApplying}
            className="w-full px-2 py-1.5 text-xs @lg/timeline:text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Phase dropdown */}
        <div>
          <label className="block text-xs @lg/timeline:text-sm text-gray-600 dark:text-gray-400 mb-1">
            Phase
          </label>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            disabled={isApplying}
            className="w-full px-2 py-1.5 text-xs @lg/timeline:text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">All Phases</option>
            <option value="pre">Pre</option>
            <option value="incident">Incident</option>
            <option value="post">Post</option>
          </select>
        </div>

        {/* Location dropdown */}
        <div>
          <label className="block text-xs @lg/timeline:text-sm text-gray-600 dark:text-gray-400 mb-1">
            Location
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isApplying}
            className="w-full px-2 py-1.5 text-xs @lg/timeline:text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent truncate disabled:opacity-50 disabled:cursor-not-allowed"
            title={location !== 'all' ? location : 'All Locations'}
          >
            <option value="all">All Locations</option>
            {uniqueAddresses.map(addr => (
              <option key={addr} value={addr} title={addr}>
                {addr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Validation message */}
      {dateRangeInvalid && (
        <div className="mb-3 text-xs text-red-600 dark:text-red-400">
          End date must be after start date
        </div>
      )}

      {/* Action buttons - responsive sizing */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          disabled={dateRangeInvalid || isApplying}
          className="flex-1 px-3 py-1.5 text-xs @lg/timeline:text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded font-medium transition-colors flex items-center justify-center"
          aria-label="Apply filters"
        >
          {isApplying ? (
            <>
              <svg
                className="animate-spin -ms-1 me-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Applying...
            </>
          ) : (
            'Apply Filters'
          )}
        </button>
        <button
          onClick={handleClearAndClose}
          disabled={isApplying}
          className="px-3 py-1.5 text-xs @lg/timeline:text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Clear all filters"
        >
          Clear
        </button>
        <button
          onClick={onCancel}
          disabled={isApplying}
          className="px-3 py-1.5 text-xs @lg/timeline:text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Cancel filtering"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
