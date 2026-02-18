/**
 * Centralized Keyboard Event Priority Manager
 *
 * This module provides a priority-based keyboard event gating system that ensures
 * only the topmost active feature processes keyboard events. This prevents
 * "bleed through" where keyboard shortcuts meant for an overlay (like lightbox)
 * accidentally trigger handlers in underlying features (like the map).
 *
 * ARCHITECTURE:
 * -------------
 * - Each feature registers its "context" when active (e.g., lightbox, street-view, popup)
 * - Components check if they are the "active context" before processing keyboard events
 * - Priority hierarchy ensures only the highest priority context is "active"
 * - Components keep their own event listeners - manager only provides gating
 *
 * PRIORITY HIERARCHY (highest to lowest):
 * ----------------------------------------
 * 1. help-panel      - F12 help overlay (should work even over lightbox)
 * 2. lightbox        - Media viewer (blocks everything below)
 * 3. street-view     - Street View modal (blocks map/timeline)
 * 4. popup           - Location popup (blocks timeline navigation)
 * 5. filters         - Filter panel (blocks timeline navigation)
 * 6. timeline        - Timeline arrow key navigation
 * 7. playback        - Emergency stop (Escape key) - works globally
 *
 * USAGE:
 * ------
 * Components register their context when they become active:
 *
 * ```typescript
 * // In a component:
 * const { setActiveContext, removeContext, isActiveContext } = useKeyboardManager();
 *
 * useEffect(() => {
 *   if (isOpen) {
 *     setActiveContext('lightbox');
 *     return () => removeContext('lightbox');
 *   }
 * }, [isOpen]);
 *
 * // In keyboard event handler:
 * const handleKeyDown = (e: KeyboardEvent) => {
 *   if (!isActiveContext('lightbox')) return; // Gate - don't process if not active
 *
 *   // Process event...
 * };
 * ```
 */

import { create } from 'zustand';

/**
 * Keyboard context identifiers
 * These define the different "layers" of keyboard interaction
 */
export type KeyboardContext =
  | 'help-panel'      // Highest priority - F12 help overlay
  | 'lightbox'        // Media lightbox with J/L frame stepping
  | 'street-view'     // Street View modal
  | 'popup'           // Location popup with Tab/Enter navigation
  | 'filters'         // Filter panel
  | 'timeline'        // Timeline arrow key navigation
  | 'playback';       // Emergency stop (global Escape)

/**
 * Context priority map - lower number = higher priority
 * Used to determine which context is "active" when multiple are registered
 */
const CONTEXT_PRIORITY: Record<KeyboardContext, number> = {
  'help-panel': 1,
  'lightbox': 2,
  'street-view': 3,
  'popup': 4,
  'filters': 5,
  'timeline': 6,
  'playback': 7, // Lowest priority but global (emergency stop)
};

interface KeyboardManagerState {
  /**
   * Set of currently registered contexts
   * When a component is active, it adds its context to this set
   */
  activeContexts: Set<KeyboardContext>;

  /**
   * Register a context as active
   * Should be called when a component mounts or becomes active
   */
  setActiveContext: (context: KeyboardContext) => void;

  /**
   * Remove a context from the active set
   * Should be called when a component unmounts or becomes inactive
   */
  removeContext: (context: KeyboardContext) => void;

  /**
   * Check if a specific context is the currently active (highest priority) context
   * Returns true if the given context should process keyboard events
   */
  isActiveContext: (context: KeyboardContext) => boolean;

  /**
   * Get the currently active context (highest priority)
   * Returns null if no contexts are registered
   */
  getActiveContext: () => KeyboardContext | null;
}

/**
 * Keyboard Manager Store
 *
 * This store manages which keyboard context is currently "active" based on
 * a priority system. Only the highest priority active context should process
 * keyboard events.
 */
export const useKeyboardManager = create<KeyboardManagerState>((set, get) => ({
  activeContexts: new Set(),

  setActiveContext: (context) => {
    set((state) => {
      const newContexts = new Set(state.activeContexts);
      newContexts.add(context);
      return { activeContexts: newContexts };
    });
  },

  removeContext: (context) => {
    set((state) => {
      const newContexts = new Set(state.activeContexts);
      newContexts.delete(context);
      return { activeContexts: newContexts };
    });
  },

  isActiveContext: (context) => {
    const { activeContexts } = get();

    if (activeContexts.size === 0) {
      return false;
    }

    // Special case: 'playback' context (emergency stop) is global
    // It should always be able to process Escape key, regardless of priority
    if (context === 'playback') {
      return activeContexts.has('playback');
    }

    // Find the highest priority active context
    let highestPriorityContext: KeyboardContext | null = null;
    let highestPriority = Infinity;

    activeContexts.forEach((activeContext) => {
      const priority = CONTEXT_PRIORITY[activeContext];
      if (priority < highestPriority) {
        highestPriority = priority;
        highestPriorityContext = activeContext;
      }
    });

    // Return true if this context is the highest priority
    return highestPriorityContext === context;
  },

  getActiveContext: () => {
    const { activeContexts } = get();

    if (activeContexts.size === 0) {
      return null;
    }

    // Find the context with the highest priority (lowest number)
    let highestPriorityContext: KeyboardContext | null = null;
    let highestPriority = Infinity;

    activeContexts.forEach((context) => {
      const priority = CONTEXT_PRIORITY[context];
      if (priority < highestPriority) {
        highestPriority = priority;
        highestPriorityContext = context;
      }
    });

    return highestPriorityContext;
  },
}));
