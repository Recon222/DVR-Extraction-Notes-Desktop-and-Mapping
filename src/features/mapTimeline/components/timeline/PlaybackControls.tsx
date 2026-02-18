import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { useMapTimelineStore } from '../../store/mapTimelineStore';
import type { TimelineEvent } from '../../types';

interface PlaybackControlsProps {
  totalEvents: number;
  events: TimelineEvent[];
  onEventClick: (locationId: string, index: number) => void;  // CHANGED: UUID
  isFiltered?: boolean;
  filteredCount?: number;
  totalUnfilteredCount?: number;
  onToggleFilters?: () => void;
}

export const PlaybackControls = ({
  totalEvents,
  events,
  onEventClick,
  isFiltered = false,
  filteredCount = 0,
  totalUnfilteredCount = 0,
  onToggleFilters
}: PlaybackControlsProps) => {
  const currentIndex = useMapTimelineStore(state => state.currentIndex);
  const isPlaying = useMapTimelineStore(state => state.isPlaying);
  const revealedCount = useMapTimelineStore(state => state.revealedCount);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < totalEvents - 1;

  const handleStepBackward = () => {
    if (!canGoBack) return;
    const newIndex = currentIndex - 1;

    // Validate array bounds before accessing
    if (newIndex < 0 || newIndex >= events.length) {
      console.error('[PlaybackControls] Invalid event index after step backward:', newIndex, 'events length:', events.length);
      return;
    }

    const { stepBackward, revealUpTo } = useMapTimelineStore.getState();
    stepBackward();
    revealUpTo(newIndex);

    const event = events[newIndex];
    if (!event || !event.location?.uuid) {  // CHANGED: Validate UUID
      console.error('[PlaybackControls] Invalid event object at index:', newIndex);
      return;
    }

    onEventClick(event.location.uuid, newIndex);  // CHANGED: Pass UUID
  };

  const handleStepForward = () => {
    if (!canGoForward) return;
    const newIndex = currentIndex + 1;

    // Validate array bounds before accessing
    if (newIndex < 0 || newIndex >= events.length) {
      console.error('[PlaybackControls] Invalid event index after step forward:', newIndex, 'events length:', events.length);
      return;
    }

    const { stepForward, revealUpTo } = useMapTimelineStore.getState();
    stepForward();
    revealUpTo(newIndex);

    const event = events[newIndex];
    if (!event || !event.location?.uuid) {  // CHANGED: Validate UUID
      console.error('[PlaybackControls] Invalid event object at index:', newIndex);
      return;
    }

    onEventClick(event.location.uuid, newIndex);  // CHANGED: Pass UUID
  };

  return (
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        {/* Filter button with filter indicator */}
        <div className="flex gap-2">
          <button
            onClick={onToggleFilters}
            className={`px-3 py-1.5 text-xs @lg/timeline:text-sm font-medium rounded flex items-center gap-1 transition-colors ${
              isFiltered
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/50'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            aria-label="Toggle timeline filters"
            aria-expanded={false}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {isFiltered && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                {filteredCount}
              </span>
            )}
          </button>

          {/* Filter status indicator */}
          {isFiltered && (
            <div className="flex items-center text-xs @lg/timeline:text-sm text-gray-600 dark:text-gray-400">
              <span className="hidden @lg/timeline:inline">
                Showing {filteredCount} of {totalUnfilteredCount} events
              </span>
              <span className="@lg/timeline:hidden">
                {filteredCount}/{totalUnfilteredCount}
              </span>
            </div>
          )}
        </div>

        {/* Progress indicator - moved to left/center */}
        <div className="text-xs @lg/timeline:text-sm font-medium text-gray-600 dark:text-gray-400">
          <span className="hidden @sm/timeline:inline">Event: {currentIndex + 1} / {totalEvents}</span>
          <span className="@sm/timeline:hidden">Event: {currentIndex + 1}/{totalEvents}</span>
        </div>

        {/* Playback controls - moved to right */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStepBackward}
            disabled={!canGoBack}
            className="p-1.5 @sm/timeline:p-2 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 dark:disabled:hover:bg-blue-700 transition-colors"
            aria-label="Previous event"
            title="Previous event (Left Arrow)"
          >
            <svg className="w-4 h-4 @sm/timeline:w-5 @sm/timeline:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {!isPlaying ? (
            <button
              onClick={() => useMapTimelineStore.getState().startPlayback()}
              disabled={!canGoForward}
              className="p-1.5 @sm/timeline:p-2 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 dark:disabled:hover:bg-blue-700 transition-colors"
              aria-label="Start playback"
              title="Start playback (Space)"
            >
              <PlayIcon className="w-4 h-4 @sm/timeline:w-5 @sm/timeline:h-5" />
            </button>
          ) : (
            <button
              onClick={() => useMapTimelineStore.getState().pausePlayback()}
              className="p-1.5 @sm/timeline:p-2 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white transition-colors"
              aria-label="Pause playback"
              title="Pause playback (Space or Esc)"
            >
              <PauseIcon className="w-4 h-4 @sm/timeline:w-5 @sm/timeline:h-5" />
            </button>
          )}

          <button
            onClick={handleStepForward}
            disabled={!canGoForward}
            className="p-1.5 @sm/timeline:p-2 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 dark:disabled:hover:bg-blue-700 transition-colors"
            aria-label="Next event"
            title="Next event (Right Arrow)"
          >
            <svg className="w-4 h-4 @sm/timeline:w-5 @sm/timeline:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progressive reveal progress bar */}
      {totalEvents > 0 && (
        <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(revealedCount / totalEvents) * 100}%` }}
            role="progressbar"
            aria-valuenow={revealedCount}
            aria-valuemin={0}
            aria-valuemax={totalEvents}
            aria-label={`${revealedCount} of ${totalEvents} markers revealed`}
          />
        </div>
      )}
    </div>
  );
};
