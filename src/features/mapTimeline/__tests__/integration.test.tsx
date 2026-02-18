import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMapControls } from '../hooks/useMapControls';
import { useMapTimelineStore } from '../stores/mapTimelineStore';
import { transformLocationsToEvents, transformToMarkerData, sortLocationsByTime } from '../utils/timelineHelpers';
import type { CCTVLocation } from '@/types/cctv.types';
import type { MapRef } from 'react-map-gl/mapbox';
import * as geojsonService from '@/services/geojsonService';

// Mock the geojsonService
vi.mock('@/services/geojsonService', () => ({
  getLocationPOV: vi.fn(),
}));

const createMockLocation = (uuid: string, rowIndex: number): CCTVLocation => ({
  rowIndex,
  realDateTime: `2024-08-29T${20 + rowIndex}:00:00.000Z`,
  dvrDateTime: '2024-08-29T22:30:45.000Z',
  dvrTimeOffset: '+00:02:15',
  address: `${rowIndex} Main St`,
  latitude: 43.7315 + rowIndex * 0.001,
  longitude: -79.7624 + rowIndex * 0.001,
  notes: 'Test',
  personsInvolved: 'John Doe',
  timing: 'incident',
  image: '',
  video: '',
  uuid,
});

describe('Map/Timeline Integration with UUID', () => {
  let mockMapRef: React.RefObject<MapRef>;
  const mockCaseDir = 'C:/test/case';

  beforeEach(() => {
    const { resetTimeline } = useMapTimelineStore.getState();
    act(() => resetTimeline());

    mockMapRef = {
      current: {
        flyTo: vi.fn(),
        getMap: vi.fn(),
      } as any,
    };

    // Reset mock - default to no saved POV
    vi.clearAllMocks();
    vi.mocked(geojsonService.getLocationPOV).mockResolvedValue(null);
  });

  describe('Full Flow: Click Event → Store Update → Map Highlight → Auto-Scroll', () => {
    it('should handle complete interaction flow with UUID', async () => {
      const uuid1 = 'a1b2c3d4-5678-4012-9abc-111111111111';
      const uuid2 = 'b2c3d4e5-6789-4123-9bcd-222222222222';
      const uuid3 = 'c3d4e5f6-7890-4234-9cde-333333333333';

      const locations = [
        createMockLocation(uuid1, 1),
        createMockLocation(uuid2, 2),
        createMockLocation(uuid3, 3),
      ];

      // Step 1: Transform locations to events/markers
      const sortedLocations = sortLocationsByTime(locations);
      const events = transformLocationsToEvents(sortedLocations, sortedLocations.length, null);
      const markers = transformToMarkerData(events);

      expect(events).toHaveLength(3);
      expect(markers).toHaveLength(3);

      // Step 2: Click event
      const { result: controlsResult } = renderHook(() =>
        useMapControls(mockMapRef, mockCaseDir)
      );

      await act(async () => {
        await controlsResult.current.handleEventClick(uuid2, 1, locations[1]);
      });

      // Step 3: Verify store updated with UUID
      const state = useMapTimelineStore.getState();
      expect(state.selectedLocationId).toBe(uuid2);
      expect(state.currentIndex).toBe(1);
      expect(state.revealedCount).toBe(2);

      // Step 4: Verify marker is marked as active
      const updatedEvents = transformLocationsToEvents(sortedLocations, state.revealedCount, state.selectedLocationId);
      const activeEvent = updatedEvents.find(e => e.isActive);
      expect(activeEvent?.location.uuid).toBe(uuid2);

      const updatedMarkers = transformToMarkerData(updatedEvents);
      const activeMarker = updatedMarkers.find(m => m.isActive);
      expect(activeMarker?.locationId).toBe(uuid2);
    });

    it('should handle keyboard navigation with UUID lookup', async () => {
      const uuid1 = 'a1b2c3d4-5678-4012-9abc-111111111111';
      const uuid2 = 'b2c3d4e5-6789-4123-9bcd-222222222222';

      const locations = [
        createMockLocation(uuid1, 1),
        createMockLocation(uuid2, 2),
      ];

      // Start with first location selected
      const { result: controlsResult } = renderHook(() =>
        useMapControls(mockMapRef, mockCaseDir)
      );

      await act(async () => {
        await controlsResult.current.handleEventClick(uuid1, 0, locations[0]);
      });

      // Store should have UUID, not rowIndex
      let state = useMapTimelineStore.getState();
      expect(state.selectedLocationId).toBe(uuid1);

      // Navigate to next
      await act(async () => {
        await controlsResult.current.handleEventClick(uuid2, 1, locations[1]);
      });

      state = useMapTimelineStore.getState();
      expect(state.selectedLocationId).toBe(uuid2);
    });
  });

  describe('Playback Mode with UUID Transitions', () => {
    it('should transition between locations using UUID', async () => {
      const uuid1 = 'a1b2c3d4-5678-4012-9abc-111111111111';
      const uuid2 = 'b2c3d4e5-6789-4123-9bcd-222222222222';
      const uuid3 = 'c3d4e5f6-7890-4234-9cde-333333333333';

      const locations = [
        createMockLocation(uuid1, 1),
        createMockLocation(uuid2, 2),
        createMockLocation(uuid3, 3),
      ];

      const { result: controlsResult } = renderHook(() =>
        useMapControls(mockMapRef, mockCaseDir)
      );

      // Simulate playback advancing through locations
      await act(async () => {
        await controlsResult.current.handleEventClick(uuid1, 0, locations[0]);
      });

      let state = useMapTimelineStore.getState();
      expect(state.selectedLocationId).toBe(uuid1);

      await act(async () => {
        await controlsResult.current.handleEventClick(uuid2, 1, locations[1]);
      });

      state = useMapTimelineStore.getState();
      expect(state.selectedLocationId).toBe(uuid2);

      await act(async () => {
        await controlsResult.current.handleEventClick(uuid3, 2, locations[2]);
      });

      state = useMapTimelineStore.getState();
      expect(state.selectedLocationId).toBe(uuid3);
    });
  });
});
