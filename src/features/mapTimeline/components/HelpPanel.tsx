import { useEffect } from 'react';
import { useKeyboardContext } from '../hooks/useKeyboardContext';
import { HOTKEYS } from '../constants/hotkeys';
import { Z_INDEX } from '@config/zIndex';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Keyboard Shortcuts Help Panel
 *
 * Displays all available keyboard shortcuts organized by context.
 * Opens with F12, closes with F12 or Escape.
 *
 * Uses the centralized keyboard manager - when open, it registers as
 * the 'help-panel' context which has highest priority. This ensures
 * the help panel's Escape key works even when other overlays are open.
 *
 * @param isOpen - Whether the help panel is visible
 * @param onClose - Callback to close the panel
 */
export const HelpPanel = ({ isOpen, onClose }: HelpPanelProps) => {
  // Register keyboard context when help panel is open
  // Note: The F12 toggle is handled in MapTimelineView since it needs to work even when panel is closed
  // This registers a second instance of 'help-panel' context that handles Escape when panel is open
  const { isActiveContext } = useKeyboardContext('help-panel', isOpen);

  // Handle Escape key to close when panel is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if we're the active context
      if (!isActiveContext()) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isActiveContext, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[${Z_INDEX.HELP_PANEL}]`}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Close help panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Global Shortcuts */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Global
            </h3>
            <div className="space-y-2">
              <ShortcutRow
                keys={[HOTKEYS.global.SHOW_HELP]}
                description="Show/hide this help panel"
              />
              <ShortcutRow
                keys={[HOTKEYS.global.CLOSE_OVERLAY]}
                description="Close popup or help panel"
              />
            </div>
          </section>

          {/* Timeline Navigation */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Timeline Navigation
            </h3>
            <div className="space-y-2">
              <ShortcutRow
                keys={[HOTKEYS.timeline.NEXT_EVENT]}
                description="Navigate to next event in timeline"
              />
              <ShortcutRow
                keys={[HOTKEYS.timeline.PREV_EVENT]}
                description="Navigate to previous event in timeline"
              />
              <ShortcutRow
                keys={['↑']}
                description="Navigate up in timeline (when no overlay is open)"
              />
              <ShortcutRow
                keys={['↓']}
                description="Navigate down in timeline (when no overlay is open)"
              />
            </div>
          </section>

          {/* Location Popup */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Location Popup
            </h3>
            <div className="space-y-2">
              <ShortcutRow
                keys={[HOTKEYS.popup.TAB_NEXT]}
                description="Navigate to next button"
              />
              <ShortcutRow
                keys={[HOTKEYS.popup.TAB_PREV]}
                description="Navigate to previous button"
              />
              <ShortcutRow
                keys={[HOTKEYS.popup.ACTIVATE]}
                description="Activate focused button"
              />
              <ShortcutRow
                keys={[HOTKEYS.popup.CLOSE]}
                description="Close popup"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Quick Access
              </h4>
              <div className="space-y-2">
                <ShortcutRow
                  keys={['Ctrl', 'I']}
                  description="Open images in lightbox"
                />
                <ShortcutRow
                  keys={['Ctrl', 'V']}
                  description="Open videos in lightbox"
                />
                <ShortcutRow
                  keys={['Ctrl', 'S']}
                  description="Open Street View"
                />
              </div>
            </div>
          </section>

          {/* Lightbox Media Controls */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Media Lightbox
            </h3>
            <div className="space-y-2">
              <ShortcutRow
                keys={[HOTKEYS.lightbox.NEXT_SLIDE]}
                description="Next media item"
              />
              <ShortcutRow
                keys={[HOTKEYS.lightbox.PREV_SLIDE]}
                description="Previous media item"
              />
              <ShortcutRow
                keys={[HOTKEYS.lightbox.PLAY_PAUSE]}
                description="Play/pause video (native browser control)"
              />
              <ShortcutRow
                keys={[HOTKEYS.lightbox.FRAME_FORWARD]}
                description="Step forward 10 frames (video only)"
              />
              <ShortcutRow
                keys={[HOTKEYS.lightbox.FRAME_BACKWARD]}
                description="Step backward 10 frames (video only)"
              />
              <ShortcutRow
                keys={['Ctrl', 'F']}
                description="Enter fullscreen"
              />
              <ShortcutRow
                keys={['Ctrl', 'A']}
                description="Exit fullscreen (Adios!)"
              />
              <ShortcutRow
                keys={['Ctrl', 'X']}
                description="Close lightbox"
              />
            </div>
          </section>

          {/* Street View */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Street View
            </h3>
            <div className="space-y-2">
              <ShortcutRow
                keys={['Arrow Keys']}
                description="Pan and navigate panorama"
              />
              <ShortcutRow
                keys={['W', 'A', 'S', 'D']}
                description="Pan and navigate panorama (alternative)"
              />
              <ShortcutRow
                keys={['+']}
                description="Zoom in"
              />
              <ShortcutRow
                keys={['-']}
                description="Zoom out"
              />
              <ShortcutRow
                keys={['Ctrl', 'F']}
                description="Enter fullscreen"
              />
              <ShortcutRow
                keys={['Ctrl', 'A']}
                description="Exit fullscreen (Adios!)"
              />
              <ShortcutRow
                keys={['Ctrl', 'X']}
                description="Close Street View"
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-3 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">F12</kbd> or{' '}
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">Escape</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

interface ShortcutRowProps {
  keys: string[];
  description: string;
}

/**
 * Single row displaying a keyboard shortcut and its description
 */
const ShortcutRow = ({ keys, description }: ShortcutRowProps) => {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {description}
      </span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <kbd
            key={index}
            className="px-3 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
          >
            {formatKey(key)}
          </kbd>
        ))}
      </div>
    </div>
  );
};

/**
 * Format key name for display
 * - Converts special keys to readable names
 * - Handles modifier key combinations
 */
const formatKey = (key: string): string => {
  // Handle special keys
  const specialKeys: Record<string, string> = {
    'ArrowRight': '→',
    'ArrowLeft': '←',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    ' ': 'Space',
    'Escape': 'Esc',
    'Enter': '↵',
  };

  // Handle modifier combinations (e.g., "Shift+Tab")
  if (key.includes('+')) {
    return key.split('+').map(k => specialKeys[k] || k).join(' + ');
  }

  return specialKeys[key] || key;
};
