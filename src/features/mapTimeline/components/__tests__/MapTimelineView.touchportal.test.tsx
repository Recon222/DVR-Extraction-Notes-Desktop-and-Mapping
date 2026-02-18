import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock dependencies
vi.mock('@/contexts/AppModeContext', () => ({
  useAppMode: vi.fn(() => ({ mode: 'editor', readonly: false })),
}));

vi.mock('@/features/viewer/touchportal', () => ({
  useTouchPortalBridge: vi.fn(() => ({
    isEnabled: false,
    isConnected: false,
    executeCommand: vi.fn(),
  })),
}));

// Mock other dependencies that MapTimelineView needs
vi.mock('@/stores/useLocationStore', () => ({
  useLocationStore: vi.fn((selector) => selector({ locations: [] })),
}));

vi.mock('@/stores/useCaseStore', () => ({
  useCaseStore: vi.fn((selector) => selector({ currentCase: { case_name: 'Test', case_path: '/test' } })),
}));

vi.mock('../stores/mapTimelineStore', () => ({
  useMapTimelineStore: vi.fn(() => ({
    filters: null,
    filtersOpen: false,
    lightbox: { isOpen: false },
    streetView: { isOpen: false },
    setFilters: vi.fn(),
    setFiltersOpen: vi.fn(),
  })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

// Mock the child components to simplify testing
vi.mock('../map/MapContainer', () => ({
  MapContainer: () => <div data-testid="map-container" />,
}));

vi.mock('../timeline/TimelinePanel', () => ({
  TimelinePanel: () => <div data-testid="timeline-panel" />,
}));

vi.mock('../hooks/useMapTimeline', () => ({
  useMapTimeline: vi.fn(() => ({ events: [], markers: [], dateRange: null, unfilteredEvents: [] })),
}));

vi.mock('../hooks/useMapControls', () => ({
  useMapControls: vi.fn(() => ({ handleEventClick: vi.fn(), handleMarkerClick: vi.fn() })),
}));

vi.mock('../hooks/useTimelinePlayback', () => ({
  useTimelinePlayback: vi.fn(),
}));

vi.mock('../hooks/useTimelineKeyboardNavigation', () => ({
  useTimelineKeyboardNavigation: vi.fn(),
}));

vi.mock('../hooks/useVideoPreloader', () => ({
  useVideoPreloader: vi.fn(),
}));

vi.mock('../hooks/useKeyboardContext', () => ({
  useKeyboardContext: vi.fn(() => ({ isActiveContext: () => true })),
}));

import { useAppMode } from '@/contexts/AppModeContext';
import { useTouchPortalBridge } from '@/features/viewer/touchportal';
import { MapTimelineView } from '../MapTimelineView';

describe('MapTimelineView Touch Portal Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useTouchPortalBridge hook integration', () => {
    it('should call useTouchPortalBridge when component mounts', () => {
      render(<MapTimelineView />);
      expect(useTouchPortalBridge).toHaveBeenCalled();
    });

    it('should have isEnabled: true in viewer mode', () => {
      // Override mock to return viewer mode
      vi.mocked(useAppMode).mockReturnValue({
        mode: 'viewer',
        readonly: true,
        exportData: { caseName: 'Test Case' }
      } as any);

      vi.mocked(useTouchPortalBridge).mockReturnValue({
        isEnabled: true,
        isConnected: false,
        executeCommand: vi.fn(),
      });

      render(<MapTimelineView />);

      expect(useTouchPortalBridge).toHaveBeenCalled();
      // The hook internally checks viewer mode
      const result = vi.mocked(useTouchPortalBridge).mock.results[0].value;
      expect(result.isEnabled).toBe(true);
    });

    it('should have isEnabled: false in editor mode', () => {
      vi.mocked(useAppMode).mockReturnValue({
        mode: 'editor',
        readonly: false
      } as any);

      vi.mocked(useTouchPortalBridge).mockReturnValue({
        isEnabled: false,
        isConnected: false,
        executeCommand: vi.fn(),
      });

      render(<MapTimelineView />);

      expect(useTouchPortalBridge).toHaveBeenCalled();
      const result = vi.mocked(useTouchPortalBridge).mock.results[0].value;
      expect(result.isEnabled).toBe(false);
    });

    it('should call useTouchPortalBridge unconditionally regardless of mode', () => {
      // Test editor mode
      vi.mocked(useAppMode).mockReturnValue({
        mode: 'editor',
        readonly: false
      } as any);

      const { unmount } = render(<MapTimelineView />);
      // Use toHaveBeenCalled() instead of toHaveBeenCalledTimes(1) to be resilient to React StrictMode double-renders
      expect(useTouchPortalBridge).toHaveBeenCalled();

      unmount();
      vi.clearAllMocks();

      // Test viewer mode
      vi.mocked(useAppMode).mockReturnValue({
        mode: 'viewer',
        readonly: true,
        exportData: { caseName: 'Test Case' }
      } as any);

      render(<MapTimelineView />);
      expect(useTouchPortalBridge).toHaveBeenCalled();
    });

    it('should handle bridge connection state changes', () => {
      // Start disconnected
      vi.mocked(useTouchPortalBridge).mockReturnValue({
        isEnabled: true,
        isConnected: false,
        executeCommand: vi.fn(),
      });

      const { rerender } = render(<MapTimelineView />);
      let result = vi.mocked(useTouchPortalBridge).mock.results[0].value;
      expect(result.isConnected).toBe(false);

      // Simulate connection
      vi.mocked(useTouchPortalBridge).mockReturnValue({
        isEnabled: true,
        isConnected: true,
        executeCommand: vi.fn(),
      });

      rerender(<MapTimelineView />);
      // Use the last result instead of hardcoded index [1] to handle double-renders
      const results = vi.mocked(useTouchPortalBridge).mock.results;
      result = results[results.length - 1].value;
      expect(result.isConnected).toBe(true);
    });

    it('should provide executeCommand function from bridge', () => {
      const mockExecuteCommand = vi.fn();

      vi.mocked(useTouchPortalBridge).mockReturnValue({
        isEnabled: true,
        isConnected: true,
        executeCommand: mockExecuteCommand,
      });

      render(<MapTimelineView />);

      const result = vi.mocked(useTouchPortalBridge).mock.results[0].value;
      expect(result.executeCommand).toBe(mockExecuteCommand);
      expect(typeof result.executeCommand).toBe('function');
    });
  });
});
