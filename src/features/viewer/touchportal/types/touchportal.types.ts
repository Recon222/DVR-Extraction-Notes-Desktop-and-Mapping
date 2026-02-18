/**
 * Touch Portal Integration Types
 *
 * Defines message formats for WebSocket communication
 * between CCTV Viewer and Touch Portal plugin.
 */

// ============================================
// COMMANDS: Touch Portal → Viewer
// ============================================

export type TPAction =
  // Timeline playback
  | 'play'
  | 'pause'
  | 'toggle_playback'
  | 'step_forward'
  | 'step_backward'
  | 'goto_start'
  | 'goto_end'
  | 'seek_percent'
  | 'goto_location'
  // Location navigation
  | 'next_location'
  | 'prev_location'
  // Video controls
  | 'video_play'
  | 'video_pause'
  | 'video_toggle'
  | 'video_seek'
  | 'video_fullscreen'
  // Image controls
  | 'image_next'
  | 'image_prev'
  | 'image_zoom'
  // Lightbox zoom
  | 'lightbox_zoom_in'
  | 'lightbox_zoom_out'
  // Lightbox
  | 'lightbox_open'
  | 'lightbox_open_images'
  | 'lightbox_open_videos'
  | 'lightbox_close'
  // Street View
  | 'streetview_open'
  | 'streetview_close'
  | 'streetview_rotate'
  | 'streetview_pitch'
  | 'streetview_zoom'
  // Street View movement (walk to adjacent panoramas)
  | 'streetview_move_forward'
  | 'streetview_move_backward'
  | 'streetview_move_left'
  | 'streetview_move_right'
  // Map controls
  | 'map_zoom_in'
  | 'map_zoom_out'
  | 'map_pitch_up'
  | 'map_pitch_down'
  | 'map_bearing_left'
  | 'map_bearing_right'
  | 'map_pan_up'
  | 'map_pan_down'
  | 'map_pan_left'
  | 'map_pan_right'
  // UI controls
  | 'toggle_panel'
  | 'toggle_fullscreen'
  | 'popup_toggle';

export interface TPCommand {
  action: TPAction;
  locationId?: string;
  percent?: number;
  seconds?: number;
  direction?: 'left' | 'right' | 'up' | 'down';  // 'up'/'down' for streetview_pitch
  degrees?: number;
  zoom?: 'in' | 'out' | 'reset';
}

// ============================================
// STATE: Viewer → Touch Portal
// ============================================

export interface TPStateUpdate {
  type: 'state';

  // Timeline state
  isPlaying: boolean;
  currentIndex: number;
  totalLocations: number;
  timelinePercent?: number; // 0-100 (kept for slider connector)
  mediaCount: string; // Formatted media count, e.g. "3 img | 2 vid" or "No media"

  // Current location
  currentLocationId: string | null;
  currentLocationName: string;
  currentLocationAddress: string;
  currentLocationTime: string;
  currentTiming: 'pre' | 'incident' | 'post' | null;

  // Media availability
  hasImages: boolean;
  hasVideos: boolean;
  hasStreetView: boolean;
  imageCount: number;
  videoCount: number;

  // UI state
  lightboxOpen: boolean;
  streetViewOpen: boolean;
  panelCollapsed: boolean;
}

/**
 * Rich location data sent with choices message for enhanced Remote display.
 * Provides full datetime, timing indicator, and media counts.
 */
export interface RichLocationData {
  /** Location UUID - matches lookup value */
  uuid: string;
  /** Full ISO 8601 datetime (e.g., "2024-03-15T09:45:32") */
  realDateTime: string;
  /** Timing indicator for color-coded badge */
  timing: 'pre' | 'incident' | 'post';
  /** Number of images at this location */
  imageCount: number;
  /** Number of videos at this location */
  videoCount: number;
  /** Full address text */
  address: string;
}

export interface TPChoiceUpdate {
  type: 'choices';
  listId: string;
  values: string[]; // Display text only (e.g., "23:32 - 450 Markham St, Toronto")
  lookup?: Record<string, string>; // Maps display text → UUID for plugin lookup
  richData?: Record<string, RichLocationData>; // Rich location data indexed by UUID
}

export type TPMessage = TPStateUpdate | TPChoiceUpdate;

// ============================================
// CONNECTION STATE
// ============================================

export interface TPConnectionState {
  isConnected: boolean;
  connectionError: string | null;
  lastCommand: TPAction | null;
  lastCommandTime: number | null;
  clientCount: number;
}

// ============================================
// VALIDATION
// ============================================

export const VALID_ACTIONS: readonly TPAction[] = [
  'play', 'pause', 'toggle_playback', 'step_forward', 'step_backward',
  'goto_start', 'goto_end', 'seek_percent', 'goto_location',
  'next_location', 'prev_location',
  'video_play', 'video_pause', 'video_toggle', 'video_seek', 'video_fullscreen',
  'image_next', 'image_prev', 'image_zoom',
  'lightbox_zoom_in', 'lightbox_zoom_out',
  'lightbox_open', 'lightbox_open_images', 'lightbox_open_videos', 'lightbox_close',
  'streetview_open', 'streetview_close', 'streetview_rotate', 'streetview_pitch', 'streetview_zoom',
  'streetview_move_forward', 'streetview_move_backward', 'streetview_move_left', 'streetview_move_right',
  'map_zoom_in', 'map_zoom_out', 'map_pitch_up', 'map_pitch_down', 'map_bearing_left', 'map_bearing_right',
  'map_pan_up', 'map_pan_down', 'map_pan_left', 'map_pan_right',
  'toggle_panel', 'toggle_fullscreen', 'popup_toggle'
] as const;

export function isValidAction(action: string): action is TPAction {
  return VALID_ACTIONS.includes(action as TPAction);
}
