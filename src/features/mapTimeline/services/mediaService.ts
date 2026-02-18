/**
 * Media Service Layer - Plain Exported Async Functions
 *
 * STUB: This file defines the service interface for media-related Tauri commands.
 * Implementation will replace the raw invoke() calls currently in:
 * - components/media/MediaLightbox.tsx
 * - components/media/MediaThumbnail.tsx
 * - hooks/useVideoPreloader.ts
 *
 * CRITICAL: Services own ALL Tauri command invocations for this feature.
 * ALWAYS use the type-safe commands.* API from tauri-bindings, NEVER raw invoke().
 *
 * @see services/exampleService.ts for the canonical pattern
 */

// TODO: Implement - currently stubs for TDD RED phase

/**
 * Read a local file and return its contents as a base64-encoded data URL.
 * Used in editor mode for loading images from the filesystem.
 *
 * @param filePath - Absolute path to the file on disk
 * @returns Base64-encoded data URL string (e.g., "data:image/jpeg;base64,...")
 * @throws Error if the command fails or file cannot be read
 */
export async function readFileAsBase64(_filePath: string): Promise<string> {
  throw new Error('Not implemented')
}

/**
 * Get a streaming URL for media content extracted from a .cadx archive.
 * Used in viewer mode where media is served via a local HTTP server.
 *
 * @param mediaType - The media category: 'images' or 'videos'
 * @param filename - The filename within the archive (not a full path)
 * @returns HTTP URL for streaming the media content
 * @throws Error if the command fails or media cannot be found
 */
export async function getStreamingMediaUrl(
  _mediaType: string,
  _filename: string,
): Promise<string> {
  throw new Error('Not implemented')
}

/**
 * Resolve a media file from a .cadx archive to its raw byte array.
 * Used in viewer mode for images where blob URLs are created client-side.
 *
 * @param mediaType - The media category: 'images' or 'videos'
 * @param filename - The filename within the archive (not a full path)
 * @returns Array of bytes representing the file content
 * @throws Error if the command fails or media cannot be found
 */
export async function resolveMediaPath(
  _mediaType: string,
  _filename: string,
): Promise<number[]> {
  throw new Error('Not implemented')
}
