import { forwardRef } from 'react';
import type { TimelineEvent } from '../../types';
import { MAP_CONFIG } from '../../constants/mapConfig';

interface TimelineEventCardProps {
  event: TimelineEvent;
  onClick: () => void;
}

export const TimelineEventCard = forwardRef<HTMLDivElement, TimelineEventCardProps>(
  ({ event, onClick }, ref) => {
    const { location, displayTime, isActive, hasImages, hasVideos } = event;
    const color = MAP_CONFIG.markerColors[location.timing];

    return (
      <div ref={ref}>
        <button
          onClick={onClick}
          className={`w-full text-start p-4 rounded-lg border-s-4 transition-all hover:shadow-md
            focus:outline-none
            ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 shadow-md'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          style={{ borderInlineStartColor: isActive ? color : undefined }}
          tabIndex={0}
          aria-label={`CCTV event at ${displayTime} - ${location.address}${hasImages ? `, ${event.imageCount} images` : ''}${hasVideos ? `, ${event.videoCount} videos` : ''}`}
          aria-pressed={isActive}
        >
          <div className="flex items-start gap-3">
            {/* Camera icon */}
            <div
              className="w-10 h-10 @lg/timeline:w-12 @lg/timeline:h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
              style={{ backgroundColor: `${color}20` }}
            >
              <svg
                className="w-5 h-5 @lg/timeline:w-6 @lg/timeline:h-6"
                style={{ color }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2 0v10h8V5H6z"/>
                <path d="M14 8l4-2v8l-4-2V8z"/>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm @lg/timeline:text-base">
                CCTV - {displayTime}
              </div>
              <div className="text-xs @lg/timeline:text-sm text-gray-600 dark:text-gray-400 truncate">
                {location.address}
              </div>

              {/* Media indicators */}
              <div className="flex gap-2 mt-2">
                {hasImages && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                    </svg>
                    {event.imageCount}
                  </span>
                )}
                {hasVideos && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                    </svg>
                    {event.videoCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>
    );
  }
);

TimelineEventCard.displayName = 'TimelineEventCard';
