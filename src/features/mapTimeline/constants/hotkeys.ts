/**
 * Centralized Keyboard Shortcuts Configuration
 *
 * This module defines all keyboard shortcuts used throughout the application,
 * organized by context. Components import key mappings from this config but
 * keep their event handlers locally.
 *
 * @module hotkeys
 */

/**
 * Timeline View Navigation
 *
 * Controls for navigating between events in the map timeline view.
 * Used by: useTimelineKeyboardNavigation hook
 */
const timeline = {
  /** Navigate to the next event in the timeline */
  NEXT_EVENT: 'ArrowRight',
  /** Navigate to the previous event in the timeline */
  PREV_EVENT: 'ArrowLeft',
} as const;

/**
 * Lightbox Media Controls
 *
 * Keyboard controls for the media lightbox component.
 * Includes navigation and video frame-stepping controls.
 * Used by: MediaLightbox component
 *
 * NOTE: Escape key cannot be used for closing as native fullscreen API
 * captures it before JavaScript. Use Ctrl+X instead.
 */
const lightbox = {
  /** Navigate to the next slide/media item */
  NEXT_SLIDE: 'ArrowRight',
  /** Navigate to the previous slide/media item */
  PREV_SLIDE: 'ArrowLeft',
  /** Step forward one frame (video only) */
  FRAME_FORWARD: 'l',
  /** Step backward one frame (video only) */
  FRAME_BACKWARD: 'j',
  /** Toggle play/pause (video only) */
  PLAY_PAUSE: ' ',
  /** Close lightbox (Ctrl+X) */
  CLOSE: 'Ctrl+X',
  /** Enter fullscreen mode (Ctrl+F) */
  ENTER_FULLSCREEN: 'Ctrl+F',
  /** Exit fullscreen mode - "Adios" (Ctrl+A) */
  EXIT_FULLSCREEN: 'Ctrl+A',
} as const;

/**
 * Street View Controls
 *
 * Keyboard controls for Street View modal.
 * Used by: StreetViewModal component
 *
 * NOTE: Escape key cannot be used for closing as native fullscreen API
 * captures it before JavaScript. Use Ctrl+X instead.
 */
const streetView = {
  /** Close Street View modal (Ctrl+X) */
  CLOSE: 'Ctrl+X',
  /** Enter fullscreen mode (Ctrl+F) */
  ENTER_FULLSCREEN: 'Ctrl+F',
  /** Exit fullscreen mode - "Adios" (Ctrl+A) */
  EXIT_FULLSCREEN: 'Ctrl+A',
} as const;

/**
 * Popup Modal Controls
 *
 * Tab navigation and interaction controls for popup modals.
 * Used by: LocationPopup component
 *
 * Quick access shortcuts for opening media and Street View:
 * - Ctrl+I: Open images in lightbox
 * - Ctrl+V: Open videos in lightbox
 * - Ctrl+S: Open Street View modal
 */
const popup = {
  /** Navigate to the next tab */
  TAB_NEXT: 'Tab',
  /** Navigate to the previous tab */
  TAB_PREV: 'Shift+Tab',
  /** Activate the selected tab */
  ACTIVATE: 'Enter',
  /** Close the popup (Escape still works here) */
  CLOSE: 'Escape',
  /** Quick open images in lightbox (Ctrl+I) */
  OPEN_IMAGES: 'Ctrl+I',
  /** Quick open videos in lightbox (Ctrl+V) */
  OPEN_VIDEOS: 'Ctrl+V',
  /** Quick open Street View (Ctrl+S) */
  OPEN_STREET_VIEW: 'Ctrl+S',
} as const;

/**
 * Global Shortcuts
 *
 * Keyboard shortcuts that work across multiple contexts.
 * These may be overridden in specific contexts (e.g., lightbox).
 */
const global = {
  /** Show/hide keyboard shortcuts help panel */
  SHOW_HELP: 'F12',
  /** Close any overlay or modal (universal escape) */
  CLOSE_OVERLAY: 'Escape',
  /** Emergency stop for playback or recording */
  EMERGENCY_STOP: 'Escape',
} as const;

/**
 * Main hotkeys configuration object.
 * All keyboard shortcuts are organized by their context/feature.
 */
export const HOTKEYS = {
  timeline,
  lightbox,
  streetView,
  popup,
  global,
} as const;

/**
 * Type helper for accessing hotkey contexts.
 * Useful for type-safe hotkey context validation.
 */
export type HotkeyContext = keyof typeof HOTKEYS;

/**
 * Type helper for accessing specific hotkey values.
 * Example: HotkeyValue<'timeline', 'NEXT_EVENT'> = 'ArrowRight'
 */
export type HotkeyValue<
  TContext extends HotkeyContext,
  TKey extends keyof typeof HOTKEYS[TContext]
> = typeof HOTKEYS[TContext][TKey];
