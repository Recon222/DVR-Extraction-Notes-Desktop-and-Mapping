/**
 * SearchMenuItem Component
 *
 * Expandable search menu item with Mapbox geocoder.
 * Allows users to search for locations and fly the map to them.
 * Displays a temporary marker at the searched location.
 */

import { useState } from 'react';
import { SearchBox } from '@mapbox/search-js-react';
import type { SearchBoxRetrieveResponse } from '@mapbox/search-js-core';
import type { MapRef } from 'react-map-gl/mapbox';
import { MenuItem } from './MenuItem';
import { useMapTimelineStore } from '../../../stores/mapTimelineStore';

interface SearchMenuItemProps {
  mapRef: React.RefObject<MapRef>;
  onClose: () => void;
}

export const SearchMenuItem = ({ mapRef, onClose }: SearchMenuItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // Actions accessed via getState() in handlers below

  const handleLocationSelect = (result: SearchBoxRetrieveResponse) => {
    const feature = result.features[0];
    if (!feature) return;

    const [lng, lat] = feature.geometry.coordinates;

    // Get short address (street and city only, no province/postal/country)
    const fullAddress = feature.properties.full_address || feature.properties.name || '';
    // Split by comma and take first 2 parts (e.g., "123 Main St, Toronto")
    const addressParts = fullAddress.split(',').map((p: string) => p.trim());
    const address = addressParts.slice(0, 2).join(', ') || 'Search Result';

    // Clear previous search marker
    const { clearSearchMarker, setSearchMarker } = useMapTimelineStore.getState();
    clearSearchMarker();

    // Set new search marker
    setSearchMarker(lat, lng, address);

    // Fly map to selected location
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 16,
      duration: 1500,
      essential: true,
    });

    // Close search and menu
    setIsExpanded(false);
    onClose();
  };

  if (isExpanded) {
    return (
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <SearchBox
          accessToken={import.meta.env.VITE_MAPBOX_API_KEY}
          placeholder="Search location..."
          onRetrieve={handleLocationSelect}
          options={{
            language: 'en',
            country: 'CA',
          }}
        />
        <button
          onClick={() => setIsExpanded(false)}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mt-2"
          type="button"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <MenuItem
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        label="Search Location"
        onClick={() => setIsExpanded(true)}
      />
    </div>
  );
};
