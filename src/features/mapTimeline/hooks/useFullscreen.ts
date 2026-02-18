/**
 * useFullscreen Hook
 *
 * Custom hook for managing fullscreen state for a specific element.
 * Provides toggle functionality and tracks fullscreen state.
 *
 * IMPORTANT: This hook tracks fullscreen state for the SPECIFIC element only,
 * not global fullscreen state. This allows multiple components to use fullscreen
 * independently (e.g., map can be fullscreen AND Street View modal can be fullscreen).
 */

import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
}

// Extend Document interface for browser-specific fullscreen properties
interface FullscreenDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  mozFullScreenEnabled?: boolean;
  msFullscreenEnabled?: boolean;
}

/**
 * Hook to manage fullscreen state for a specific element
 *
 * @param elementRef - Reference to the element to make fullscreen
 * @returns Object with fullscreen state and control functions
 */
export const useFullscreen = (elementRef: RefObject<HTMLElement>): UseFullscreenReturn => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  /**
   * Check if THIS specific element is currently fullscreen
   * NOTE: Not using useCallback here to avoid stale closure issues with elementRef
   */
  const isThisElementFullscreen = (): boolean => {
    if (!elementRef.current) return false;

    // Check if this specific element or any of its descendants is the fullscreen element
    return document.fullscreenElement === elementRef.current ||
           elementRef.current.contains(document.fullscreenElement);
  };

  /**
   * Enter fullscreen mode for this element
   */
  const enterFullscreen = useCallback(() => {
    if (!elementRef.current) {
      return;
    }

    // Only enter fullscreen if this element is not already fullscreen
    if (!isThisElementFullscreen()) {
      elementRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    }
  }, []);

  /**
   * Exit fullscreen mode (only if this element is fullscreen)
   */
  const exitFullscreen = useCallback(() => {
    // Only exit if THIS element is the one in fullscreen
    if (isThisElementFullscreen()) {
      document.exitFullscreen().catch((err) => {
        console.error('Exit fullscreen failed:', err);
      });
    }
  }, []);

  /**
   * Toggle fullscreen state for this element
   */
  const toggleFullscreen = useCallback(() => {
    if (isThisElementFullscreen()) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  /**
   * Listen for fullscreen change events and update state only for THIS element
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Only update state if it's about THIS element
      const nowFullscreen = isThisElementFullscreen();
      setIsFullscreen(nowFullscreen);
    };

    // Listen for fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    document.addEventListener('mozfullscreenchange', handleFullscreenChange); // Firefox
    document.addEventListener('MSFullscreenChange', handleFullscreenChange); // IE11

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
    // No dependencies needed - elementRef is stable and we want fresh reads of elementRef.current
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen
  };
};

/**
 * Check if the Fullscreen API is supported
 */
export const isFullscreenSupported = (): boolean => {
  const doc = document as FullscreenDocument;
  return !!(
    document.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled
  );
};
