/**
 * Custom Hook: usePortalTarget
 *
 * Determines the correct portal render target based on fullscreen state.
 * Used for components that need to render in portals (modals, overlays, etc.)
 *
 * IMPORTANT: This hook checks if the MAP container is in fullscreen mode.
 * If the map is fullscreen, portals render inside the fullscreen container.
 * Otherwise, portals render to document.body.
 */

import { useState, useEffect } from 'react';
import { DOM_IDS } from '../constants/domIds';

/**
 * Get the appropriate portal target based on MAP fullscreen state
 *
 * @returns HTMLElement to use as portal target
 *
 * @example
 * ```tsx
 * const portalTarget = usePortalTarget();
 * return createPortal(<YourComponent />, portalTarget);
 * ```
 */
export const usePortalTarget = (): HTMLElement => {
  const [target, setTarget] = useState<HTMLElement>(() => getPortalTarget());

  useEffect(() => {
    const updateTarget = () => {
      setTarget(getPortalTarget());
    };

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', updateTarget);

    return () => {
      document.removeEventListener('fullscreenchange', updateTarget);
    };
  }, []);

  return target;
};

/**
 * Get the portal target element (internal utility)
 *
 * Checks if the MAP's fullscreen container is in fullscreen mode.
 * Does NOT just check if anything is fullscreen - specifically checks
 * if the map container itself is the fullscreen element.
 *
 * @returns HTMLElement to render portal into
 * @throws Error if document.body is not available
 */
function getPortalTarget(): HTMLElement {
  const fullscreenContainer = document.getElementById(DOM_IDS.FULLSCREEN_CONTAINER);

  // Check if the MAP's fullscreen container itself is fullscreen
  // (NOT just checking if anything is fullscreen)
  if (fullscreenContainer && document.fullscreenElement === fullscreenContainer) {
    return fullscreenContainer;
  }

  // Validate document.body exists
  if (!document.body) {
    throw new Error('Document body not available for portal rendering');
  }

  // Default to document.body for normal mode
  return document.body;
}
