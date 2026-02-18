import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTimelinePlayback } from '../useTimelinePlayback';
import { useMapTimelineStore } from '../../stores/mapTimelineStore';
import type { CCTVLocation } from '@/types/cctv.types';

vi.useFakeTimers();

const createMockLocation = (uuid: string, rowIndex: number): CCTVLocation => ({
  rowIndex,
  realDateTime: `2024-08-29T${20 + rowIndex}:00:00.000Z`,
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

describe('useTimelinePlayback', () => {
  let mockOnAdvance: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAdvance = vi.fn();
    const { resetTimeline } = useMapTimelineStore.getState();
    act(() => resetTimeline());
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe('Playback with UUID', () => {
    it('should call onAdvance with UUID when advancing', async () => {
      const uuid1 = 'a1b2c3d4-5678-4012-9abc-111111111111';
      const uuid2 = 'b2c3d4e5-6789-4123-9bcd-222222222222';
      const locations = [
        createMockLocation(uuid1, 1),
        createMockLocation(uuid2, 2),
      ];

      renderHook(() => useTimelinePlayback(locations, mockOnAdvance));

      // Start playback
      act(() => {
        useMapTimelineStore.getState().startPlayback();
      });

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Should call with UUID, index, and location object
      expect(mockOnAdvance).toHaveBeenCalledWith(
        uuid2,
        1,
        locations[1]
      );
    });

    it('should validate location has UUID before advancing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create location WITHOUT valid UUID
      const invalidLocation = createMockLocation('', 1);
      invalidLocation.uuid = ''; // Force empty UUID

      renderHook(() => useTimelinePlayback([invalidLocation], mockOnAdvance));

      act(() => {
        useMapTimelineStore.getState().startPlayback();
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Should NOT call onAdvance with invalid location
      expect(mockOnAdvance).not.toHaveBeenCalled();
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should pause if location UUID is missing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const validLocation = createMockLocation('valid-uuid', 1);
      const invalidLocation = { ...createMockLocation('', 2), uuid: '' };
      const locations = [validLocation, invalidLocation as CCTVLocation];

      renderHook(() => useTimelinePlayback(locations, mockOnAdvance));

      act(() => {
        useMapTimelineStore.getState().startPlayback();
      });

      // First advance - should work
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Second advance - should fail and pause
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      const state = useMapTimelineStore.getState();
      expect(state.isPlaying).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });
});
