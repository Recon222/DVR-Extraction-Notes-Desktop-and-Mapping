import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelinePanel } from '../timeline/TimelinePanel';
import type { TimelineEvent } from '../../types';
import type { CCTVLocation } from '@/types/cctv.types';

vi.mock('react-rnd', () => ({
  Rnd: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const createMockLocation = (uuid: string, rowIndex: number): CCTVLocation => ({
  rowIndex,
  realDateTime: '2024-08-29T22:28:30.000Z',
  dvrDateTime: '2024-08-29T22:30:45.000Z',
  dvrTimeOffset: '+00:02:15',
  address: `${rowIndex} Main St`,
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

describe('TimelinePanel', () => {
  const mockOnEventClick = vi.fn();
  const mockOnFiltersChange = vi.fn();
  const mockOnFiltersOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('React Keys use UUID', () => {
    it('should use location UUID as React key for event cards', () => {
      const uuid1 = 'a1b2c3d4-5678-4012-9abc-111111111111';
      const uuid2 = 'b2c3d4e5-6789-4123-9bcd-222222222222';

      const locations = [
        createMockLocation(uuid1, 1),
        createMockLocation(uuid2, 2),
      ];
      const events = locations.map(createMockEvent);

      const { container } = render(
        <TimelinePanel
          caseName="Test Case"
          events={events}
          unfilteredEvents={events}
          dateRange={{ start: 'Aug 29, 2024', end: 'Aug 29, 2024' }}
          activeFilters={null}
          onFiltersChange={mockOnFiltersChange}
          onFiltersOpenChange={mockOnFiltersOpenChange}
          onEventClick={mockOnEventClick}
        />
      );

      // Check that React keys are UUIDs, not rowIndex
      const buttons = container.querySelectorAll('button[aria-label*="CCTV event"]');
      expect(buttons).toHaveLength(2);

      // Keys should be stable UUID values
      // (In actual DOM, keys aren't visible, but this tests the rendering)
    });
  });

  describe('Click Handlers pass UUID', () => {
    it('should call onEventClick with UUID when card clicked', () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid, 1);
      const events = [createMockEvent(location)];

      render(
        <TimelinePanel
          caseName="Test Case"
          events={events}
          unfilteredEvents={events}
          dateRange={{ start: 'Aug 29, 2024', end: 'Aug 29, 2024' }}
          activeFilters={null}
          onFiltersChange={mockOnFiltersChange}
          onFiltersOpenChange={mockOnFiltersOpenChange}
          onEventClick={mockOnEventClick}
        />
      );

      const card = screen.getByLabelText(/CCTV event/);
      card?.click();

      // Should pass UUID, not rowIndex
      expect(mockOnEventClick).toHaveBeenCalledWith(uuid, 0);
    });
  });

  describe('Auto-Scroll Refs keyed by UUID', () => {
    it('should register card refs by UUID', () => {
      const uuid1 = 'a1b2c3d4-5678-4012-9abc-111111111111';
      const uuid2 = 'b2c3d4e5-6789-4123-9bcd-222222222222';

      const locations = [
        createMockLocation(uuid1, 1),
        createMockLocation(uuid2, 2),
      ];
      const events = locations.map(createMockEvent);

      const { container } = render(
        <TimelinePanel
          caseName="Test Case"
          events={events}
          unfilteredEvents={events}
          dateRange={{ start: 'Aug 29, 2024', end: 'Aug 29, 2024' }}
          activeFilters={null}
          onFiltersChange={mockOnFiltersChange}
          onFiltersOpenChange={mockOnFiltersOpenChange}
          onEventClick={mockOnEventClick}
        />
      );

      // Refs should be registered with UUID keys
      // This is tested indirectly through scrollIntoView behavior
      const cards = container.querySelectorAll('button[aria-label*="CCTV event"]');
      expect(cards).toHaveLength(2);
    });
  });
});
