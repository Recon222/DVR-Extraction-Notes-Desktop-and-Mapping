import { describe, it, expect, beforeEach } from 'vitest';
import { useMapTimelineStore } from '../mapTimelineStore';
import { renderHook, act } from '@testing-library/react';

describe('mapTimelineStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { resetTimeline } = useMapTimelineStore.getState();
    act(() => {
      resetTimeline();
    });
  });

  describe('State Initialization', () => {
    it('should initialize with null selectedLocationId', () => {
      const { result } = renderHook(() => useMapTimelineStore());
      expect(result.current.selectedLocationId).toBeNull();
    });

    it('should initialize currentIndex at 0', () => {
      const { result } = renderHook(() => useMapTimelineStore());
      expect(result.current.currentIndex).toBe(0);
    });

    it('should initialize revealedCount at 0', () => {
      const { result } = renderHook(() => useMapTimelineStore());
      expect(result.current.revealedCount).toBe(0);
    });
  });

  describe('selectLocation Action', () => {
    it('should accept string UUID', () => {
      const { result } = renderHook(() => useMapTimelineStore());
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';

      act(() => {
        result.current.selectLocation(uuid);
      });

      expect(result.current.selectedLocationId).toBe(uuid);
    });

    it('should accept null to deselect', () => {
      const { result } = renderHook(() => useMapTimelineStore());
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';

      act(() => {
        result.current.selectLocation(uuid);
        result.current.selectLocation(null);
      });

      expect(result.current.selectedLocationId).toBeNull();
    });

    it('should replace previous selection', () => {
      const { result } = renderHook(() => useMapTimelineStore());
      const uuid1 = 'a1b2c3d4-5678-4012-9abc-111111111111';
      const uuid2 = 'b2c3d4e5-6789-4123-9bcd-222222222222';

      act(() => {
        result.current.selectLocation(uuid1);
        result.current.selectLocation(uuid2);
      });

      expect(result.current.selectedLocationId).toBe(uuid2);
    });

    it('should handle rapid selection changes', () => {
      const { result } = renderHook(() => useMapTimelineStore());
      const uuids = [
        'a1b2c3d4-5678-4012-9abc-111111111111',
        'b2c3d4e5-6789-4123-9bcd-222222222222',
        'c3d4e5f6-7890-4234-9cde-333333333333',
      ];

      act(() => {
        uuids.forEach(uuid => result.current.selectLocation(uuid));
      });

      expect(result.current.selectedLocationId).toBe(uuids[2]);
    });
  });

  describe('resetPlaybackState Batch Action', () => {
    it('should reset selectedLocationId to null', () => {
      const { result } = renderHook(() => useMapTimelineStore());
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';

      act(() => {
        result.current.selectLocation(uuid);
        result.current.resetPlaybackState();
      });

      expect(result.current.selectedLocationId).toBeNull();
    });

    it('should reset all playback state in single batch', () => {
      const { result } = renderHook(() => useMapTimelineStore());

      act(() => {
        result.current.selectLocation('a1b2c3d4-5678-4012-9abc-123456789012');
        result.current.setCurrentIndex(5);
        result.current.revealUpTo(5);
        result.current.startPlayback();

        result.current.resetPlaybackState();
      });

      expect(result.current.selectedLocationId).toBeNull();
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.revealedCount).toBe(0);
      expect(result.current.isPlaying).toBe(false);
    });
  });
});
