import { useState, useEffect, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { readFileAsBase64, getStreamingMediaUrl, resolveMediaPath } from '../../services/mediaService';
import { useAppMode } from '@/contexts/AppModeContext';
import { MAP_CONFIG } from '../../constants/mapConfig';

interface MediaThumbnailProps {
  src: string; // Full file path (editor) or filename (viewer)
  type: 'image' | 'video';
  onClick: () => void;
  size?: 'small' | 'large';
  count?: number; // Optional count badge (for showing "3" when there are 3 images)
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 3000]; // 1s, 2s, 3s exponential backoff

/**
 * Extract filename from path or return the string if it's already just a filename
 */
function extractFilename(pathOrFilename: string): string {
  // If already just a filename (no path separators), return as-is
  if (!pathOrFilename.includes('\\') && !pathOrFilename.includes('/')) {
    return pathOrFilename;
  }

  // Extract filename from path (handle both Windows and Unix paths)
  const parts = pathOrFilename.split(/[\\\/]/);
  return parts[parts.length - 1];
}

export const MediaThumbnail = ({ src, type, onClick, size = 'small', count }: MediaThumbnailProps) => {
  const { mode } = useAppMode();
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>('');
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  /**
   * Track current blob URL for cleanup
   * FIX: Use ref to track blob URL to prevent race condition during cleanup
   */
  const currentBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const loadMedia = async (attemptNumber: number = 0) => {
      const filename = extractFilename(src);
      console.log(`[MEDIA-DEBUG] MediaThumbnail: Loading ${type} thumbnail - filename="${filename}", attempt=${attemptNumber + 1}`);

      try {
        if (mode === 'viewer') {
          // Viewer mode: Extract media from .cadx ZIP container
          const mediaType = type === 'image' ? 'images' : 'videos';

          if (type === 'video') {
            // VIDEOS: Use streaming URL (instant, no freeze)
            console.log(`[MEDIA-DEBUG] MediaThumbnail: Getting streaming URL - filename="${filename}"`);
            const startTime = performance.now();

            const streamingUrl = await getStreamingMediaUrl(mediaType, filename);

            const elapsed = performance.now() - startTime;
            console.log(`[MEDIA-DEBUG] MediaThumbnail: Streaming URL obtained - filename="${filename}", url="${streamingUrl}", time=${elapsed.toFixed(2)}ms`);

            if (!mountedRef.current) return;

            setDisplaySrc(streamingUrl);
            setError(false);
            retryCountRef.current = 0;
          } else {
            // IMAGES: Use blob URL (images are small, no performance issue)
            console.log(`[MEDIA-DEBUG] MediaThumbnail: Calling resolve_media_path - type="${mediaType}", filename="${filename}"`);
            const startTime = performance.now();

            const mediaBytes = await resolveMediaPath(mediaType, filename);

            const elapsed = performance.now() - startTime;
            const sizeKB = (mediaBytes.length / 1024).toFixed(2);
            console.log(`[MEDIA-DEBUG] MediaThumbnail: resolve_media_path returned - filename="${filename}", size=${sizeKB}KB, time=${elapsed.toFixed(2)}ms`);

            if (!mountedRef.current) return;

            // Convert number array to Uint8Array
            const uint8Array = new Uint8Array(mediaBytes);

            // Determine MIME type
            const ext = filename.split('.').pop()?.toLowerCase();
            let mimeType = 'application/octet-stream';

            switch (ext) {
              case 'jpg':
              case 'jpeg':
                mimeType = 'image/jpeg';
                break;
              case 'png':
                mimeType = 'image/png';
                break;
              case 'gif':
                mimeType = 'image/gif';
                break;
              case 'webp':
                mimeType = 'image/webp';
                break;
              default:
                mimeType = 'image/jpeg';
            }

            // Convert bytes to blob URL
            const blob = new Blob([uint8Array], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);

            console.log(`[MEDIA-DEBUG] MediaThumbnail: Blob URL created - filename="${filename}", url="${blobUrl}"`);

            // Track blob URL for cleanup
            if (blobUrl.startsWith('blob:')) {
              currentBlobUrlRef.current = blobUrl;
            }

            setDisplaySrc(blobUrl);
            setError(false);
            retryCountRef.current = 0;
          }
        } else {
          // Editor mode: Load from filesystem
          if (type === 'image') {
            console.log(`[MEDIA-DEBUG] MediaThumbnail: Loading image from filesystem - path="${src}"`);

            // For images: Load as base64 Data URL
            const dataUrl = await readFileAsBase64(src);

            if (!mountedRef.current) return;

            console.log(`[MEDIA-DEBUG] MediaThumbnail: Image loaded - path="${src}"`);

            setDisplaySrc(dataUrl);
            setError(false);
            retryCountRef.current = 0;
          } else {
            console.log(`[MEDIA-DEBUG] MediaThumbnail: Using asset protocol for video - path="${src}"`);

            // For videos: Use asset protocol URL for streaming
            const assetUrl = convertFileSrc(src);

            if (!mountedRef.current) return;

            console.log(`[MEDIA-DEBUG] MediaThumbnail: Asset URL created - url="${assetUrl}"`);

            setDisplaySrc(assetUrl);
            setError(false);
            retryCountRef.current = 0;
          }
        }
      } catch (err) {
        if (!mountedRef.current) return;

        console.error(`[MEDIA-DEBUG] MediaThumbnail: FAILED to load ${type} (attempt ${attemptNumber + 1}/${MAX_RETRIES + 1}) - filename="${filename}", error:`, err);

        // Retry with exponential backoff
        if (attemptNumber < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attemptNumber];
          retryCountRef.current = attemptNumber + 1;

          console.log(`[MEDIA-DEBUG] MediaThumbnail: Scheduling retry in ${delay}ms - filename="${filename}"`);

          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              loadMedia(attemptNumber + 1);
            }
          }, delay);
        } else {
          // Max retries reached
          console.error(`[MEDIA-DEBUG] MediaThumbnail: Max retries reached - filename="${filename}"`);
          setError(true);
        }
      }
    };

    loadMedia();

    /**
     * FIX: Delay blob URL cleanup to prevent race condition where image is still loading
     * Use separate cleanup effect to avoid revoking while image element is loading
     */
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [src, type, mode]); // Added mode to dependencies

  /**
   * Separate effect for blob URL cleanup with delay
   * FIX: Delay cleanup to allow pending image loads to complete
   */
  useEffect(() => {
    return () => {
      const blobUrl = currentBlobUrlRef.current;
      if (blobUrl) {
        // Use timeout to avoid revoking while image loads
        // 500ms grace period ensures image load completes
        setTimeout(() => {
          console.log(`[MEDIA-DEBUG] MediaThumbnail: Revoking blob URL (delayed) - url="${blobUrl}"`);
          URL.revokeObjectURL(blobUrl);
        }, 500);
      }
    };
  }, []); // Empty deps - only cleanup on unmount

  // Responsive height using clamp() for large size
  const mediaHeight = `clamp(${MAP_CONFIG.popup.sizing.mediaHeightMin}, ${MAP_CONFIG.popup.sizing.mediaHeightPreferred}, ${MAP_CONFIG.popup.sizing.mediaHeightMax})`;

  const sizeClasses = size === 'large'
    ? 'w-full'
    : 'w-full aspect-square';

  if (error) {
    return (
      <div
        className={`${sizeClasses} bg-gray-200 rounded flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors`}
        style={size === 'large' ? { height: mediaHeight } : undefined}
        onClick={onClick}
      >
        <div className="text-center">
          <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xs text-gray-500 mt-1">Failed to load</p>
        </div>
      </div>
    );
  }

  // Enhanced skeleton loading state
  if (!displaySrc) {
    return (
      <div
        className={`${sizeClasses} relative rounded overflow-hidden bg-gray-200`}
        style={size === 'large' ? { height: mediaHeight } : undefined}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }}
        />

        {/* Icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {type === 'image' ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            )}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} relative rounded overflow-hidden cursor-pointer group`}
      style={size === 'large' ? { height: mediaHeight } : undefined}
      onClick={onClick}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {type === 'image' ? (
        <img
          src={displaySrc}
          alt="CCTV capture"
          className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${loaded ? '' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      ) : (
        <video
          src={displaySrc}
          className={`w-full h-full object-cover ${loaded ? '' : 'opacity-0'}`}
          onLoadedData={() => setLoaded(true)}
          onError={() => setError(true)}
          muted
          preload="metadata"
        />
      )}

      {/* Video play overlay */}
      {type === 'video' && loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/20 via-black/30 to-black/40 group-hover:from-black/30 group-hover:via-black/40 group-hover:to-black/50 transition-all duration-300">
          {/* Play button circle */}
          <div className="relative">
            {/* Outer ring for depth */}
            <div className="absolute inset-0 rounded-full bg-black/20 blur-md transform scale-110" />

            {/* Main play button */}
            <div className="relative w-16 h-16 rounded-full bg-white shadow-2xl flex items-center justify-center transform transition-all duration-200 group-hover:scale-110 group-hover:shadow-3xl">
              {/* Play icon - proper triangle pointing right */}
              <svg
                className="w-7 h-7 text-gray-900 ms-1"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Count badge - show if count exists and > 1 */}
      {count && count > 1 && loaded && (
        <div className="absolute top-2 end-2 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
          {count}
        </div>
      )}
    </div>
  );
};
