/**
 * SearchMarker Component
 *
 * Temporary marker displayed at searched location.
 * Appears as a red pin/teardrop marker with optional address label.
 * Cleared when a new search is performed.
 */

import { Marker } from 'react-map-gl/mapbox';

interface SearchMarkerProps {
  latitude: number;
  longitude: number;
  address?: string;
}

export const SearchMarker = ({ latitude, longitude, address }: SearchMarkerProps) => {
  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
    >
      <div className="flex flex-col items-center animate-bounce-once">
        {/* Pin/teardrop marker */}
        <div className="relative">
          {/* Teardrop shape */}
          <svg
            width="40"
            height="52"
            viewBox="0 0 40 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            {/* Main teardrop shape */}
            <path
              d="M20 0C8.954 0 0 8.954 0 20c0 13.5 20 32 20 32s20-18.5 20-32C40 8.954 31.046 0 20 0z"
              fill="#EF4444"
            />
            {/* Inner white circle */}
            <circle cx="20" cy="20" r="8" fill="white" />
            {/* Search icon */}
            <g transform="translate(15, 15)">
              <path
                d="M9 9l-2.5-2.5M4 2a2 2 0 100 4 2 2 0 000-4z"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          </svg>
        </div>

        {/* Address label (if provided) */}
        {address && (
          <div className="mt-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-xs">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis">
              {address}
            </p>
          </div>
        )}
      </div>
    </Marker>
  );
};
