/**
 * STUB: Lightweight placeholder for Tauri v1.5 app's CCTV type definitions.
 * Will be replaced when the CCTV data management feature is fully implemented.
 * Created to unblock mapTimeline feature compilation.
 *
 * Type shape derived from usage across mapTimeline, viewer, and touchportal features.
 */

/**
 * Represents a single CCTV location with associated metadata and media.
 *
 * This is the core data type used throughout the application to represent
 * a surveillance camera location and its captured evidence.
 */
export interface CCTVLocation {
  /** Unique identifier for this location */
  uuid: string;

  /** Row index in the original spreadsheet/data source */
  rowIndex: number;

  /** Actual date/time of the event (ISO 8601 string) */
  realDateTime: string;

  /** DVR-reported date/time (ISO 8601 string, may differ from real time) */
  dvrDateTime: string;

  /** Time offset between DVR clock and real time (e.g., "+00:00:00") */
  dvrTimeOffset: string;

  /** Street address of the CCTV location */
  address: string;

  /** GPS latitude coordinate */
  latitude: number;

  /** GPS longitude coordinate */
  longitude: number;

  /** Timing phase relative to the incident */
  timing: 'pre' | 'incident' | 'post';

  /** Investigator notes about this location */
  notes: string;

  /** Comma-separated list of persons involved */
  personsInvolved: string;

  /** Semicolon-separated list of image filenames (e.g., "img1.jpg; img2.jpg") */
  image: string;

  /** Semicolon-separated list of video filenames (e.g., "vid1.mp4; vid2.mp4") */
  video: string;
}
