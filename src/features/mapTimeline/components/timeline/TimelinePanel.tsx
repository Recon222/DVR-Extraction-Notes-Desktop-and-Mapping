import { useState, useRef, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useMapTimelineStore } from '../../stores/mapTimelineStore';
import { TimelineHeader } from './TimelineHeader';
import { TimelineEventCard } from './TimelineEventCard';
import { PlaybackControls } from './PlaybackControls';
import { TimelineFilters } from './TimelineFilters';
import type { TimelineEvent, TimelineFilters as ITimelineFilters } from '../../types';
import { hasActiveFilters } from '../../types/filters';
import { MAP_CONFIG } from '../../constants/mapConfig';

interface TimelinePanelProps {
  caseName: string;
  events: TimelineEvent[]; // Filtered events for display
  unfilteredEvents: TimelineEvent[]; // Unfiltered events for filter dropdowns
  dateRange: { start: string; end: string } | null;
  activeFilters: ITimelineFilters | null;
  onFiltersChange: (filters: ITimelineFilters | null) => void;
  onFiltersOpenChange: (isOpen: boolean) => void; // New prop to track filter panel state
  onEventClick: (locationId: string, index: number) => void;  // CHANGED: UUID
}

export const TimelinePanel = ({
  caseName,
  events,
  unfilteredEvents,
  dateRange,
  activeFilters,
  onFiltersChange,
  onFiltersOpenChange,
  onEventClick
}: TimelinePanelProps) => {
  const { isPanelCollapsed, panelPosition, setPanelPosition, togglePanel, selectedLocationId } = useMapTimelineStore();
  const mapTimelineStore = useMapTimelineStore();

  // Local UI state for showing/hiding filter panel
  const [showFilters, setShowFilters] = useState(false);

  // Refs for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());  // CHANGED: Map<string, ...> for UUID keys

  // Check if filters are active
  const isFiltered = hasActiveFilters(activeFilters);

  // Responsive panel width using clamp()
  const panelWidth = `clamp(${MAP_CONFIG.timeline.sizing.widthMin}, ${MAP_CONFIG.timeline.sizing.widthPreferred}, ${MAP_CONFIG.timeline.sizing.widthMax})`;

  // Callback to register card refs
  const registerCardRef = useCallback((locationId: string, element: HTMLDivElement | null) => {  // CHANGED: string
    if (element) {
      cardRefsMap.current.set(locationId, element);  // Now keyed by UUID
    } else {
      cardRefsMap.current.delete(locationId);
    }
  }, []);

  // Auto-scroll when selected location changes
  useEffect(() => {
    if (selectedLocationId === null || isPanelCollapsed) {
      return;
    }

    const cardElement = cardRefsMap.current.get(selectedLocationId);
    if (cardElement) {
      // Use 'center' to always center the selected card in the viewport
      // This ensures consistent positioning and scrolls even when partially visible
      cardElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [selectedLocationId, isPanelCollapsed]);

  // Notify parent when filter panel state changes
  useEffect(() => {
    onFiltersOpenChange(showFilters);
  }, [showFilters, onFiltersOpenChange]);

  const handleToggleFilters = () => {
    // Auto-pause playback when opening filters
    if (mapTimelineStore.isPlaying) {
      mapTimelineStore.pausePlayback();
    }
    setShowFilters(true);
  };

  const handleApplyFilters = (filters: ITimelineFilters) => {
    onFiltersChange(filters);
    setShowFilters(false);

    // Reset playback state to start of filtered events
    mapTimelineStore.setCurrentIndex(0);
    mapTimelineStore.revealUpTo(-1); // Hide all markers initially
    mapTimelineStore.selectLocation(null);
    mapTimelineStore.pausePlayback();
  };

  const handleClearFilters = () => {
    onFiltersChange(null);
    setShowFilters(false);

    // Reset playback state
    mapTimelineStore.setCurrentIndex(0);
    mapTimelineStore.revealUpTo(-1);
    mapTimelineStore.selectLocation(null);
    mapTimelineStore.pausePlayback();
  };

  const handleCancelFilters = () => {
    setShowFilters(false);
  };

  return (
    <Rnd
      position={panelPosition}
      size={{ width: panelWidth, height: isPanelCollapsed ? 60 : 'auto' }}
      minWidth={MAP_CONFIG.timeline.sizing.widthMin}
      maxWidth={MAP_CONFIG.timeline.sizing.widthMax}
      minHeight={60}
      maxHeight={window.innerHeight - MAP_CONFIG.panelMaxHeightOffset}
      bounds="parent"
      dragHandleClassName="timeline-drag-handle"
      onDragStop={(_, d) => setPanelPosition(d.x, d.y)}
      enableResizing={!isPanelCollapsed}
      className="z-50"
      aria-label="Timeline panel - draggable and resizable"
      role="region"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col @container/timeline"
        style={{ maxHeight: 'calc(100vh - 100px)' }}
      >
        <TimelineHeader
          caseName={caseName}
          dateRange={dateRange}
          totalEvents={unfilteredEvents.length}
          isCollapsed={isPanelCollapsed}
          onToggleCollapse={togglePanel}
        />

        {/* Conditional rendering: show filters OR playback controls (even when collapsed) */}
        {showFilters ? (
          <TimelineFilters
            events={unfilteredEvents}
            currentFilters={activeFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            onCancel={handleCancelFilters}
          />
        ) : (
          <PlaybackControls
            totalEvents={events.length}
            events={events}
            onEventClick={onEventClick}
            isFiltered={isFiltered}
            filteredCount={events.length}
            totalUnfilteredCount={unfilteredEvents.length}
            onToggleFilters={handleToggleFilters}
          />
        )}

        {/* Event cards - only show when NOT collapsed */}
        {!isPanelCollapsed && (
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {events.length > 0 ? (
              events.map((event, index) => (
                <TimelineEventCard
                  key={event.location.uuid}  // CHANGED: UUID as React key
                  event={event}
                  onClick={() => onEventClick(event.location.uuid, index)}  // CHANGED: Pass UUID
                  ref={(el) => registerCardRef(event.location.uuid, el)}  // CHANGED: Register by UUID
                />
              ))
            ) : (
              <div className="flex items-center justify-center p-8 text-center">
                <div>
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm @lg/timeline:text-base">
                    No events match the selected filters
                  </p>
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear filters to show all events
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Rnd>
  );
};
