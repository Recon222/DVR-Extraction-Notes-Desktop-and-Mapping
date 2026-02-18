import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineEventCard } from '../timeline/TimelineEventCard';
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

describe('TimelineEventCard', () => {
  describe('Rendering', () => {
    it('should render event details', () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid);
      const event = createMockEvent(location);

      render(<TimelineEventCard event={event} onClick={vi.fn()} />);

      expect(screen.getByText(/22:28:30/)).toBeInTheDocument();
      expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    });

    it('should apply active styling when isActive is true', () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid);
      const event = { ...createMockEvent(location), isActive: true };

      const { container } = render(<TimelineEventCard event={event} onClick={vi.fn()} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-blue-50');
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked', () => {
      const uuid = 'a1b2c3d4-5678-4012-9abc-123456789012';
      const location = createMockLocation(uuid);
      const event = createMockEvent(location);
      const mockOnClick = vi.fn();

      render(<TimelineEventCard event={event} onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      button?.click();

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });
});
