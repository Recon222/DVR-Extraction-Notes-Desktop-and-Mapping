/**
 * Media Playback Configuration Constants
 *
 * Configuration for video playback controls in the media lightbox.
 * Tuned for CCTV footage review workflows.
 */

export const VIDEO_PLAYBACK = {
  /**
   * Number of seconds to step when using frame advance controls (J/L keys).
   * Equivalent to ~10 frames at 30fps, optimized for CCTV review.
   */
  FRAME_STEP_SECONDS: 1 / 30 * 10, // ~0.333 seconds (10 frames at 30fps)
} as const;
