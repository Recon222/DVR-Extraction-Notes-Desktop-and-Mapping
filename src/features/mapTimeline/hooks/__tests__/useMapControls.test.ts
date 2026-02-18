import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapControls } from '../useMapControls';
import { useMapTimelineStore } from '../../stores/mapTimelineStore';
import type { MapRef } from 'react-map-gl/mapbox';
import type { CCTVLocation } from '@/types/cctv.types';
import * as geojsonService from '../../services/geojsonService';

// Mock the geojsonService
vi.mock('../../services/geojsonService', () => ({
  getLocationPOV: vi.fn(),
}));

const createMockLocation = (uuid: string): CCTVLocation => ({
  rowIndex: 1,
  realDateTime: '2024-08-29T22:28:30.000Z',
  dvrDateTime: '2024-08-29T22:30:45.000Z',
  dvrTimeOffset: '+00:02:15',
  address: '123 Main St',
  latitude: 43.7315,
  longitude: -79.7624,
  notes: 'Test',
  personsInvolved: 'John Doe',
  timing: 'incident',
  image: '',
  video: '',
  uuid,
});

describe('useMapControls', () => {
  let mockMapRef: React.RefObject<MapRef>;
  const mockCaseDir = 'C:/test/case';

  beforeEach(() => {
    // Reset store
    const { resetTimeline } = useMapTimelineStore.getState();
    act(() => resetTimeline());

    // Create mock map ref
    mockMapRef = {
      current: {
        flyTo: vi.fn(),
        getMap: vi.fn(),
      } as any,
    };

    // Reset mock
    vi.clearAllMocks();

    // Default mock: no saved POV
    vi.mocked(geojsonService.getLocationPOV).mockResolvedValue(null);
  });

  describe('handleEventClick', () => {
    it('should call selectLocation with UUID string', async () => {
      const { result } = renderHook(() => useMapControls(mockMapRef, mockCaseDir));
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid);

      await act(async () => {
        await result.current.handleEventClick(uuid, 0, location);
      });

      const state = useMapTimelineStore.getState();
      expect(state.selectedLocationId).toBe(uuid);
    });

    it('should update currentIndex', async () => {
      const { result } = renderHook(() => useMapControls(mockMapRef, mockCaseDir));
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid);

      await act(async () => {
        await result.current.handleEventClick(uuid, 5, location);
      });

      const state = useMapTimelineStore.getState();
      expect(state.currentIndex).toBe(5);
    });

    it('should reveal markers up to clicked event', async () => {
      const { result } = renderHook(() => useMapControls(mockMapRef, mockCaseDir));
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid);

      await act(async () => {
        await result.current.handleEventClick(uuid, 3, location);
      });

      const state = useMapTimelineStore.getState();
      expect(state.revealedCount).toBe(4); // index 3 + 1
    });
  });

  describe('handleMarkerClick', () => {
    it('should select location by UUID', () => {
      const { result } = renderHook(() => useMapControls(mockMapRef, mockCaseDir));
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';

      act(() => {
        result.current.handleMarkerClick(uuid);
      });

      const state = useMapTimelineStore.getState();
      expect(state.selectedLocationId).toBe(uuid);
    });

    it('should not change revealedCount', () => {
      const { result } = renderHook(() => useMapControls(mockMapRef, mockCaseDir));
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';

      act(() => {
        result.current.handleMarkerClick(uuid);
      });

      const state = useMapTimelineStore.getState();
      expect(state.revealedCount).toBe(0); // Should not change
    });
  });

  describe('flyToLocation with POV', () => {
    it('should use saved POV when available', async () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid);

      // Mock saved POV data
      vi.mocked(geojsonService.getLocationPOV).mockResolvedValue({
        mapboxPOV: {
          longitude: -79.7624,
          latitude: 43.7315,
          zoom: 18,
          bearing: 45,
          pitch: 60,
        },
        streetViewPOV: null,
      });

      const { result } = renderHook(() => useMapControls(mockMapRef, mockCaseDir));

      await act(async () => {
        await result.current.flyToLocation(location);
      });

      // Verify flyTo was called with saved POV
      expect(mockMapRef.current?.flyTo).toHaveBeenCalledWith({
        center: [-79.7624, 43.7315],
        zoom: 18,
        bearing: 45,
        pitch: 60,
        duration: expect.any(Number),
        essential: true,
      });

      // Verify POV was queried
      expect(geojsonService.getLocationPOV).toHaveBeenCalledWith(mockCaseDir, uuid);
    });

    it('should use default view when no POV saved', async () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid);

      // No saved POV (default mock)
      vi.mocked(geojsonService.getLocationPOV).mockResolvedValue(null);

      const { result } = renderHook(() => useMapControls(mockMapRef, mockCaseDir));

      await act(async () => {
        await result.current.flyToLocation(location);
      });

      // Verify flyTo was called with default view (no bearing/pitch)
      expect(mockMapRef.current?.flyTo).toHaveBeenCalledWith({
        center: expect.any(Array),
        zoom: expect.any(Number),
        duration: expect.any(Number),
        essential: true,
      });

      // Should NOT have pitch or bearing in default view
      const callArgs = (mockMapRef.current?.flyTo as any).mock.calls[0][0];
      expect(callArgs.pitch).toBeUndefined();
      expect(callArgs.bearing).toBeUndefined();
    });

    it('should fall back to default view when POV lookup fails', async () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid);

      // Mock POV lookup failure
      vi.mocked(geojsonService.getLocationPOV).mockRejectedValue(new Error('File not found'));

      const { result } = renderHook(() => useMapControls(mockMapRef, mockCaseDir));

      await act(async () => {
        await result.current.flyToLocation(location);
      });

      // Verify flyTo was called with default view
      expect(mockMapRef.current?.flyTo).toHaveBeenCalledWith({
        center: expect.any(Array),
        zoom: expect.any(Number),
        duration: expect.any(Number),
        essential: true,
      });
    });
  });
});
