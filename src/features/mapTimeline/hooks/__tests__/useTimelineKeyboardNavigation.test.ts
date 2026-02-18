import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTimelineKeyboardNavigation } from '../useTimelineKeyboardNavigation';
import { useMapTimelineStore } from '../../stores/mapTimelineStore';
import type { TimelineEvent } from '../../types';
import type { CCTVLocation } from '@/types/cctv.types';

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

const createMockEvent = (location: CCTVLocation): TimelineEvent => ({
  location,
  displayTime: '22:28:30',
  displayDate: 'Aug 29, 2024',
  isRevealed: true,
  isActive: false,
  hasImages: false,
  hasVideos: false,
  imageCount: 0,
  videoCount: 0,
});

describe('useTimelineKeyboardNavigation', () => {
  let mockOnEventClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnEventClick = vi.fn();
    const { resetTimeline } = useMapTimelineStore.getState();
    resetTimeline();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Arrow Key Navigation with UUID', () => {
    it('should find location by UUID when navigating right', () => {
      const uuid1 = 'a1b2c3d4-5678-4012-9abc-111111111111';
      const uuid2 = 'b2c3d4e5-6789-4123-9bcd-222222222222';

      const locations = [
        createMockLocation(uuid1),
        createMockLocation(uuid2),
      ];
      const events = locations.map(createMockEvent);

      renderHook(() =>
        useTimelineKeyboardNavigation({
          events,
          locations,
          onEventClick: mockOnEventClick,
          isEnabled: true,
        })
      );

      // Simulate ArrowRight key press
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      window.dispatchEvent(event);

      // Should call with UUID, not rowIndex
      expect(mockOnEventClick).toHaveBeenCalledWith(
        uuid2,
        1,
        locations[1]
      );
    });

    it('should find location by UUID when navigating left', () => {
      const uuid1 = 'a1b2c3d4-5678-4012-9abc-111111111111';
      const uuid2 = 'b2c3d4e5-6789-4123-9bcd-222222222222';

      const locations = [
        createMockLocation(uuid1),
        createMockLocation(uuid2),
      ];
      const events = locations.map(createMockEvent);

      // Start at index 1
      useMapTimelineStore.getState().setCurrentIndex(1);

      renderHook(() =>
        useTimelineKeyboardNavigation({
          events,
          locations,
          onEventClick: mockOnEventClick,
          isEnabled: true,
        })
      );

      // Simulate ArrowLeft key press
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      window.dispatchEvent(event);

      // Should call with UUID
      expect(mockOnEventClick).toHaveBeenCalledWith(
        uuid1,
        0,
        locations[0]
      );
    });

    it('should handle UUID lookup failure gracefully', () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid);
      const events = [createMockEvent(location)];

      // locations array is EMPTY (UUID won't be found)
      const emptyLocations: CCTVLocation[] = [];

      renderHook(() =>
        useTimelineKeyboardNavigation({
          events,
          locations: emptyLocations,
          onEventClick: mockOnEventClick,
          isEnabled: true,
        })
      );

      // Try to navigate
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      window.dispatchEvent(event);

      // Should NOT call onEventClick if location not found
      expect(mockOnEventClick).not.toHaveBeenCalled();
    });
  });
});
