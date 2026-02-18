/**
 * useKeyboardContext Hook
 *
 * Convenient hook for components to register their keyboard context
 * and automatically clean up when they unmount or become inactive.
 *
 * This hook manages the lifecycle of a keyboard context:
 * - Registers the context when enabled=true
 * - Unregisters when enabled=false or component unmounts
 * - Ensures proper cleanup in all cases
 *
 * USAGE:
 * ------
 * ```typescript
 * const MyOverlay = ({ isOpen }: { isOpen: boolean }) => {
 *   const { isActiveContext } = useKeyboardContext('lightbox', isOpen);
 *
 *   useEffect(() => {
 *     const handleKeyDown = (e: KeyboardEvent) => {
 *       if (!isActiveContext()) return; // Gate - only process if we're the active context
 *
 *       if (e.key === 'Escape') {
 *         // Handle escape...
 *       }
 *     };
 *
 *     window.addEventListener('keydown', handleKeyDown);
 *     return () => window.removeEventListener('keydown', handleKeyDown);
 *   }, [isActiveContext]);
 *
 *   return <div>...</div>;
 * };
 * ```
 *
 * PARAMETERS:
 * -----------
 * @param context - The keyboard context (determines priority)
 * @param enabled - Whether the context is currently active (default: true)
 *
 * RETURNS:
 * --------
 * @returns isActiveContext - Function to check if this context is currently active
 *
 * NOTES:
 * ------
 * - When enabled changes from true to false, the context is unregistered
 * - When enabled changes from false to true, the context is registered
 * - On unmount, the context is always unregistered
 * - The returned isActiveContext() function checks the live state
 */

import { useEffect } from 'react';
import { useKeyboardManager, type KeyboardContext } from '../store/keyboardManager';

export function useKeyboardContext(context: KeyboardContext, enabled = true) {
  const setActiveContext = useKeyboardManager(state => state.setActiveContext);
  const removeContext = useKeyboardManager(state => state.removeContext);
  const isActiveContext = useKeyboardManager(state => state.isActiveContext);

  useEffect(() => {
    if (!enabled) {
      // Unregister if disabled
      removeContext(context);
      return;
    }

    // Register the context as active
    setActiveContext(context);

    // Cleanup: unregister on unmount or when disabled
    return () => {
      removeContext(context);
    };
  }, [context, enabled, setActiveContext, removeContext]);

  // Return a function that components can call to check if they're active
  // This uses the store's isActiveContext method which checks live state
  return {
    isActiveContext: () => isActiveContext(context),
  };
}
