/**
 * DOM ID Constants for Map Timeline Feature
 *
 * Centralizes all hardcoded DOM IDs to prevent typos and make maintenance easier.
 * These IDs are used for portal rendering, fullscreen containers, and element references.
 */

export const DOM_IDS = {
  /**
   * Main fullscreen container for the map timeline view.
   * Used as portal target when in fullscreen mode.
   */
  FULLSCREEN_CONTAINER: 'map-timeline-fullscreen-container',

  /**
   * Portal root for media lightbox.
   * Dynamically created inside fullscreen container.
   */
  LIGHTBOX_PORTAL: 'lightbox-portal-root',
} as const;

export type DomId = typeof DOM_IDS[keyof typeof DOM_IDS];
