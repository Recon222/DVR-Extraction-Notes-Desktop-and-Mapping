import { Marker } from 'react-map-gl/mapbox';
import type { MarkerData } from '../../types';
import { MAP_CONFIG } from '../../constants/mapConfig';

interface TimelineMarkerProps {
  marker: MarkerData;
  onClick: () => void;
}

export const TimelineMarker = ({ marker, onClick }: TimelineMarkerProps) => {
  const color = MAP_CONFIG.markerColors[marker.timing];

  return (
    <Marker
      longitude={marker.coordinates[0]}
      latitude={marker.coordinates[1]}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div className="flex flex-col items-center cursor-pointer group">
        {/* Camera icon marker */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${marker.isActive ? 'scale-125 ring-4 ring-white' : ''}`}
          style={{ backgroundColor: color }}
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2 0v10h8V5H6z"/>
            <path d="M14 8l4-2v8l-4-2V8z"/>
          </svg>
        </div>
        {/* Time label */}
        <div className="mt-1 px-2 py-0.5 bg-white rounded shadow text-xs font-medium text-gray-700 whitespace-nowrap">
          {marker.label}
        </div>
      </div>
    </Marker>
  );
};
