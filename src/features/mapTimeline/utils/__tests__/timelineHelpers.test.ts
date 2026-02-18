import { describe, it, expect } from 'vitest';
import {
  transformLocationsToEvents,
  transformToMarkerData,
  sortLocationsByTime,
} from '../timelineHelpers';
import type { CCTVLocation } from '@/types/cctv.types';

const createMockLocation = (overrides: Partial<CCTVLocation>): CCTVLocation => ({
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
  uuid: 'a1b2c3d4-5678-4012-9abc-123456789012',
  ...overrides,
});

describe('timelineHelpers', () => {
  describe('transformLocationsToEvents', () => {
    it('should mark event as active when UUID matches selectedId', () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const locations = [
        createMockLocation({ uuid }),
        createMockLocation({ uuid: 'different-uuid-111111111111', rowIndex: 2 }),
      ];

      const events = transformLocationsToEvents(locations, 2, uuid);

      expect(events[0].isActive).toBe(true);
      expect(events[1].isActive).toBe(false);
    });

    it('should mark no events as active when selectedId is null', () => {
      const locations = [
        createMockLocation({ uuid: 'uuid-1' }),
        createMockLocation({ uuid: 'uuid-2', rowIndex: 2 }),
      ];

      const events = transformLocationsToEvents(locations, 2, null);

      expect(events.every(e => !e.isActive)).toBe(true);
    });

    it('should preserve location uuid in event', () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const locations = [createMockLocation({ uuid })];

      const events = transformLocationsToEvents(locations, 1, null);

      expect(events[0].location.uuid).toBe(uuid);
    });
  });

  describe('transformToMarkerData', () => {
    it('should use location UUID as marker locationId', () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation({ uuid });
      const events = transformLocationsToEvents([location], 1, null);

      const markers = transformToMarkerData(events);

      expect(markers[0].locationId).toBe(uuid);
    });

    it('should preserve UUID through transformation chain', () => {
      const uuid1 = 'a1b2c3d4-5678-4012-9abc-111111111111';
      const uuid2 = 'b2c3d4e5-6789-4123-9bcd-222222222222';
      const locations = [
        createMockLocation({ uuid: uuid1 }),
        createMockLocation({ uuid: uuid2, rowIndex: 2 }),
      ];
      const events = transformLocationsToEvents(locations, 2, null);

      const markers = transformToMarkerData(events);

      expect(markers).toHaveLength(2);
      expect(markers[0].locationId).toBe(uuid1);
      expect(markers[1].locationId).toBe(uuid2);
    });

    it('should handle locations without coordinates', () => {
      const locations = [
        createMockLocation({ uuid: 'uuid-1', latitude: 0, longitude: 0 }),
        createMockLocation({ uuid: 'uuid-2', latitude: 43.7315, longitude: -79.7624, rowIndex: 2 }),
      ];
      const events = transformLocationsToEvents(locations, 2, null);

      const markers = transformToMarkerData(events);

      // Only location with valid coordinates should have marker
      expect(markers).toHaveLength(1);
      expect(markers[0].locationId).toBe('uuid-2');
    });
  });

  describe('sortLocationsByTime', () => {
    it('should preserve UUIDs during sort', () => {
      const uuid1 = 'earlier-uuid';
      const uuid2 = 'later-uuid';
      const locations = [
        createMockLocation({
          uuid: uuid2,
          realDateTime: '2024-08-29T23:00:00.000Z',
          rowIndex: 1
        }),
        createMockLocation({
          uuid: uuid1,
          realDateTime: '2024-08-29T22:00:00.000Z',
          rowIndex: 2
        }),
      ];

      const sorted = sortLocationsByTime(locations);

      expect(sorted[0].uuid).toBe(uuid1); // Earlier time
      expect(sorted[1].uuid).toBe(uuid2); // Later time
    });
  });
});
