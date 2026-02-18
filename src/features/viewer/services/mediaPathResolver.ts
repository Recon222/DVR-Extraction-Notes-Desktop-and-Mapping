/**
 * Media Path Resolver for Viewer Mode
 *
 * Resolves media files from .cadx ZIP containers by calling Rust backend.
 * Validates filenames to prevent path traversal attacks.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Check if filename is safe (no path traversal)
 */
export function isSafeFilename(filename: string | null | undefined): boolean {
  if (!filename) return false;
  if (filename.trim() === '') return false;

  // Reject path traversal attempts
  if (filename.includes('..')) return false;
  if (filename.includes('/')) return false;
  if (filename.includes('\\')) return false;

  // Check for null bytes and control characters (0x00-0x1F)
  // FIX: Added control character validation for security
  if (/[\x00-\x1F]/.test(filename)) return false;

  return true;
}

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string, mediaType: 'images' | 'videos'): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (mediaType === 'images') {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'bmp':
        return 'image/bmp';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'image/jpeg'; // Default fallback
    }
  } else {
    switch (ext) {
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ogg':
        return 'video/ogg';
      case 'avi':
        return 'video/x-msvideo';
      case 'mov':
        return 'video/quicktime';
      case 'wmv':
        return 'video/x-ms-wmv';
      default:
        return 'video/mp4'; // Default fallback
    }
  }
}

/**
 * Resolve image from .cadx container
 *
 * Calls Rust backend to extract image bytes from ZIP and converts to blob URL
 *
 * @param filename - Image filename (e.g., "screenshot.jpg")
 * @returns Blob URL for the image, or null if resolution fails
 */
export async function resolveImagePath(
  filename: string | null | undefined
): Promise<string | null> {
  if (!filename) return null;
  if (!isSafeFilename(filename)) {
    console.error('[MediaPathResolver] Invalid filename:', filename);
    return null;
  }

  const startTime = performance.now();
  console.log(`[MEDIA-DEBUG] resolveImagePath: Starting - filename="${filename}"`);

  try {
    // Call Rust command to extract bytes from .cadx ZIP
    const invokeStart = performance.now();
    const imageBytes = await invoke<number[]>('resolve_media_path', {
      mediaType: 'images',
      filename: filename,
    });
    const invokeEnd = performance.now();

    // Convert number array to Uint8Array
    const uint8Array = new Uint8Array(imageBytes);
    const fileSizeKB = (uint8Array.length / 1024).toFixed(2);

    console.log(`[MEDIA-DEBUG] resolveImagePath: Success - filename="${filename}", size=${fileSizeKB}KB, invoke_time=${(invokeEnd - invokeStart).toFixed(2)}ms`);

    // Convert bytes to blob URL
    const blob = new Blob([uint8Array], { type: getMimeType(filename, 'images') });
    const url = URL.createObjectURL(blob);

    const totalTime = performance.now() - startTime;
    console.log(`[MEDIA-DEBUG] resolveImagePath: Complete - filename="${filename}", total_time=${totalTime.toFixed(2)}ms`);

    return url;
  } catch (error) {
    const totalTime = performance.now() - startTime;
    console.error(`[MEDIA-DEBUG] resolveImagePath: FAILED - filename="${filename}", total_time=${totalTime.toFixed(2)}ms, error:`, error);
    return null;
  }
}

/**
 * Resolve video from .cadx container using HTTP streaming
 *
 * Returns a streaming URL that enables instant playback without loading entire file into memory.
 * The browser handles Range requests automatically for smooth seeking.
 *
 * @param filename - Video filename (e.g., "footage.mp4")
 * @returns Streaming URL for the video, or null if resolution fails
 */
export async function resolveVideoPath(
  filename: string | null | undefined
): Promise<string | null> {
  if (!filename) return null;
  if (!isSafeFilename(filename)) {
    console.error('[MediaPathResolver] Invalid filename:', filename);
    return null;
  }

  const startTime = performance.now();
  console.log(`[MEDIA-DEBUG] resolveVideoPath: Starting - filename="${filename}"`);

  try {
    // NEW: Use streaming URL instead of loading entire file
    const streamUrl = await invoke<string>('get_streaming_media_url', {
      mediaType: 'videos',
      filename: filename,
    });

    const totalTime = performance.now() - startTime;
    console.log(`[MEDIA-DEBUG] resolveVideoPath: Streaming URL obtained - filename="${filename}", url="${streamUrl}", total_time=${totalTime.toFixed(2)}ms`);

    return streamUrl;
  } catch (error) {
    const totalTime = performance.now() - startTime;
    console.error(`[MEDIA-DEBUG] resolveVideoPath: FAILED - filename="${filename}", total_time=${totalTime.toFixed(2)}ms, error:`, error);
    return null;
  }
}
