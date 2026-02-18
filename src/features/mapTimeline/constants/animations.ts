/**
 * Animation Constants
 *
 * Centralized timing and easing configurations for all map timeline animations.
 * This ensures consistent animation behavior across components and makes it easy
 * to adjust animation feel globally.
 */

/**
 * Animation Timing (in milliseconds)
 */
export const ANIMATION_TIMING = {
  /** Pegman return animation duration */
  PEGMAN_RETURN: 300,

  /** Pulse highlight circle animation duration */
  PULSE_DURATION: 1500,

  /** Map flyTo animation duration */
  FLY_TO: 3000,

  /** Toast notification display duration */
  TOAST: 3000,

  /** Modal fade in/out */
  MODAL_FADE: 200,

  /** Panel resize animation */
  PANEL_RESIZE: 150
} as const;

/**
 * Animation Easing Functions
 * Based on CSS cubic-bezier timing functions
 */
export const EASING = {
  /** Standard ease-out (decelerating curve) */
  EASE_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',

  /** Standard ease-in-out (smooth start and end) */
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.6, 1)',

  /** Spring-like bounce effect */
  SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  /** Sharp ease-in (accelerating) */
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',

  /** Linear (no easing) */
  LINEAR: 'cubic-bezier(0, 0, 1, 1)'
} as const;

/**
 * Pulse Animation Parameters
 * Used for the highlight circle that pulses when hovering during Pegman drag
 */
export const PULSE_PARAMS = {
  /** Minimum radius (pixels) */
  RADIUS_MIN: 30,

  /** Maximum radius (pixels) */
  RADIUS_MAX: 50,

  /** Opacity at minimum radius */
  OPACITY_MAX: 0.6,

  /** Opacity at maximum radius */
  OPACITY_MIN: 0.1,

  /** Circle color (CSS color string) */
  COLOR: 'rgba(59, 130, 246, 1)' // Blue-500
} as const;

/**
 * Transition CSS Helper
 * Generates a complete CSS transition string
 *
 * @example
 * ```typescript
 * style={{
 *   transition: getTransition('all', ANIMATION_TIMING.PEGMAN_RETURN, EASING.EASE_OUT)
 * }}
 * ```
 */
export const getTransition = (
  property: string = 'all',
  duration: number = ANIMATION_TIMING.MODAL_FADE,
  easing: string = EASING.EASE_OUT
): string => {
  return `${property} ${duration}ms ${easing}`;
};
