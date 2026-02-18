/**
 * Media Service Layer - Plain Exported Async Functions
 *
 * Wraps media-related Tauri commands for the mapTimeline feature.
 * Used by:
 * - components/media/MediaLightbox.tsx
 * - components/media/MediaThumbnail.tsx
 * - hooks/useVideoPreloader.ts
 *
 * CRITICAL: Services own ALL Tauri command invocations for this feature.
 * ALWAYS use the type-safe commands.* API from tauri-bindings, NEVER raw invoke().
 *
 * @see services/exampleService.ts for the canonical pattern
 */

import { commands } from '@/lib/tauri-bindings'

/**
 * Read a local file and return its contents as a base64-encoded data URL.
 * Used in editor mode for loading images from the filesystem.
 *
 * @param filePath - Absolute path to the file on disk
 * @returns Base64-encoded data URL string (e.g., "data:image/jpeg;base64,...")
 * @throws Error if the command fails or file cannot be read
 */
export async function readFileAsBase64(filePath: string): Promise<string> {
  const result = await commands.readFileAsBase64(filePath)
  if (result.status === 'error') throw new Error(result.error as string)
  return result.data
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
  mediaType: string,
  filename: string,
): Promise<string> {
  const result = await commands.getStreamingMediaUrl(mediaType, filename)
  if (result.status === 'error') throw new Error(result.error as string)
  return result.data
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
  mediaType: string,
  filename: string,
): Promise<number[]> {
  const result = await commands.resolveMediaPath(mediaType, filename)
  if (result.status === 'error') throw new Error(result.error as string)
  return result.data
}
