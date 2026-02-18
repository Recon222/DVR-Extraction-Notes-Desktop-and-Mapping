/**
 * Z-Index Hierarchy Configuration
 *
 * CRITICAL: This file defines the stacking order of UI layers in the application.
 * Never hardcode z-index values in components - always import from this file.
 *
 * Understanding the Z-Index Hierarchy:
 * ------------------------------------
 * The z-index system is designed in layers, from lowest to highest. Each layer
 * represents a logical grouping of UI elements at similar importance levels.
 *
 * Layer Philosophy:
 * - Base Layer (1-49): Normal page content and basic UI elements
 * - Overlay Layer (50-999): Panels and controls that overlay the main content
 * - Modal Layer (1000-9998): Modals and dialogs that block interaction with content below
 * - Critical Layer (9999-10000): Fullscreen overlays like lightbox and help panel
 *
 * Why These Values?
 * -----------------
 * 1. MAP (1): The map is the base layer - everything else appears on top of it
 *
 * 2. MAP_CONTROLS (10): Map controls (pegman, compass, etc.) sit just above the map
 *    but below all other UI to avoid blocking important overlays
 *
 * 3. HAMBURGER_MENU (200): Hamburger menu dropdown appears above map controls and popups
 *    but below modals to allow modal overlays when needed
 *
 * 4. TIMELINE_PANEL (50): The timeline panel overlays the map and must be visible
 *    in fullscreen mode, but should not block modals or dialogs
 *
 * 5. POPUP (100): Location popups appear above the timeline panel to show details
 *    without being blocked by the panel
 *
 * 6. MODALS (50): Standard modals (create case, delete confirmation, etc.) overlay
 *    all normal content but appear below critical fullscreen overlays
 *
 * 7. STREET_VIEW_MODAL (9999): Street View is a fullscreen experience that should
 *    block all other UI except the help panel
 *
 * 8. LIGHTBOX (9999): Media lightbox is fullscreen and blocks all UI except help
 *
 * 9. PEGMAN_DRAGGING (9999): When dragging Pegman, it must appear above everything
 *    (except help panel) to provide clear visual feedback during the drag operation
 *
 * 10. HELP_PANEL (10000): The help panel is the topmost layer - it should be accessible
 *    even when other fullscreen overlays are open, allowing users to see shortcuts
 *    while using the lightbox or Street View
 *
 * Usage Example:
 * --------------
 * ```typescript
 * import { Z_INDEX } from '@/features/shared/config';
 *
 * // In a component:
 * <div className={`fixed inset-0 z-[${Z_INDEX.MODALS}]`}>
 *   {/* Modal content *\/}
 * </div>
 *
 * // Or in inline styles:
 * <div style={{ zIndex: Z_INDEX.LIGHTBOX }}>
 *   {/* Lightbox content *\/}
 * </div>
 * ```
 */

export const Z_INDEX = {
  /** Base map layer - everything overlays on top of this */
  MAP: 1,

  /** Map controls (pegman button, compass, etc.) - just above map */
  MAP_CONTROLS: 10,

  /** Hamburger menu dropdown - above controls and popups, below modals */
  HAMBURGER_MENU: 200,

  /** Timeline panel - overlays map but below modals */
  TIMELINE_PANEL: 50,

  /** Location popup - appears above timeline panel */
  POPUP: 100,

  /** Standard modals and dialogs (create case, delete confirmation, etc.) */
  MODALS: 50,

  /** Street View modal - fullscreen experience */
  STREET_VIEW_MODAL: 9999,

  /** Media lightbox - fullscreen media viewer */
  LIGHTBOX: 9999,

  /** Pegman element when being dragged - must be visible during drag */
  PEGMAN_DRAGGING: 9999,

  /** Help panel - topmost layer, accessible even when overlays are open */
  HELP_PANEL: 10000,
} as const;

/**
 * Type helper for z-index values
 * This ensures type safety when using z-index values
 */
export type ZIndexValue = typeof Z_INDEX[keyof typeof Z_INDEX];
