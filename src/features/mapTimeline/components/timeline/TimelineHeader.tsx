interface TimelineHeaderProps {
  caseName: string;
  dateRange: { start: string; end: string } | null;
  totalEvents: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const TimelineHeader = ({ caseName, dateRange, totalEvents, isCollapsed, onToggleCollapse }: TimelineHeaderProps) => {
  return (
    <div className="timeline-drag-handle bg-gray-800 dark:bg-gray-950 text-white p-4 cursor-move">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Case name and title - responsive text sizing */}
          <span className="text-sm @lg/timeline:text-base font-medium truncate max-w-[200px]" title={caseName}>
            {caseName}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-sm @lg/timeline:text-base font-medium">CCTV Chronology</span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <svg className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {!isCollapsed && dateRange && (
        <div className="mt-3 flex gap-8 text-sm @lg/timeline:text-base">
          <div>
            <span className="text-gray-400 uppercase text-xs @lg/timeline:text-sm">Time Range:</span>
            <div className="font-medium">{dateRange.start} - {dateRange.end}</div>
          </div>
          <div>
            <span className="text-gray-400 uppercase text-xs @lg/timeline:text-sm">Total Events:</span>
            <div className="font-medium">{totalEvents}</div>
          </div>
        </div>
      )}
    </div>
  );
};
