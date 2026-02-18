/**
 * Street View Service
 *
 * Service layer for checking Street View availability and managing panoramas.
 * Handles error cases and provides retry logic with LRU cache eviction.
 */

import { loadGoogleMaps } from './googleMapsLoader';

export interface StreetViewCheckResult {
  available: boolean;
  panoramaId?: string;
  location?: google.maps.LatLng;
  error?: string;
}

/**
 * Check if Street View is available at a given location
 *
 * @param lat Latitude
 * @param lng Longitude
 * @param radius Search radius in meters (default: 50m)
 * @param retries Number of retry attempts on failure (default: 2)
 * @param onRetry Optional callback for retry attempts
 * @returns Promise with availability result
 */
export const checkStreetViewAvailability = async (
  lat: number,
  lng: number,
  radius: number = 50,
  retries: number = 2,
  onRetry?: (attempt: number, error: string) => void
): Promise<StreetViewCheckResult> => {
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const google = await loadGoogleMaps();
      const streetViewService = new google.maps.StreetViewService();

      // Add timeout to prevent hanging requests
      const result = await Promise.race([
        new Promise<StreetViewCheckResult>((resolve) => {
          streetViewService.getPanorama(
            {
              location: { lat, lng },
              radius,
              source: google.maps.StreetViewSource.OUTDOOR,
              preference: google.maps.StreetViewPreference.NEAREST
            },
            (data, status) => {
              if (status === google.maps.StreetViewStatus.OK && data) {
                resolve({
                  available: true,
                  panoramaId: data.location?.pano,
                  location: data.location?.latLng || undefined
                });
              } else {
                lastError = `Street View status: ${status}`;
                resolve({
                  available: false,
                  error: lastError
                });
              }
            }
          );
        }),
        new Promise<StreetViewCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error('Street View request timeout')), 10000)
        )
      ]);

      // Return immediately if successful or definitively unavailable
      if (result.available || attempt === retries) {
        return result;
      }

    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';

      // Report retry to callback if provided
      if (onRetry && attempt < retries) {
        onRetry(attempt, lastError);
      }

      // If this was the last attempt, return error
      if (attempt === retries) {
        return {
          available: false,
          error: lastError
        };
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  // Fallback return (should never reach here)
  return {
    available: false,
    error: lastError || 'Unknown error'
  };
};

/**
 * Check Street View availability with fallback search radii
 * Tries increasing search radii if not found
 *
 * @param lat Latitude
 * @param lng Longitude
 * @returns Promise with availability result
 */
export const checkStreetViewWithFallback = async (
  lat: number,
  lng: number
): Promise<StreetViewCheckResult> => {
  const radii = [50, 100, 200]; // Try 50m, 100m, 200m

  for (const radius of radii) {
    const result = await checkStreetViewAvailability(lat, lng, radius, 1);
    if (result.available) {
      return result;
    }
  }

  return {
    available: false,
    error: 'No Street View available within 200m'
  };
};

/**
 * Street View availability cache with LRU eviction
 * Caches results for 1 hour to reduce API calls
 */
const availabilityCache = new Map<string, {
  result: StreetViewCheckResult;
  timestamp: number;
}>();

const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 1000; // Maximum number of cached entries

/**
 * Evict expired entries from the cache
 * Called when cache size exceeds MAX_CACHE_SIZE
 */
const evictExpiredEntries = (): void => {
  const now = Date.now();
  const entries = Array.from(availabilityCache.entries());

  // Remove expired entries
  entries
    .filter(([_, v]) => now - v.timestamp >= CACHE_DURATION)
    .forEach(([k]) => availabilityCache.delete(k));
};

/**
 * Evict oldest entries to maintain cache size limit
 * Uses LRU (Least Recently Used) strategy
 */
const evictOldestEntries = (): void => {
  if (availabilityCache.size < MAX_CACHE_SIZE) return;

  const entries = Array.from(availabilityCache.entries());

  // Sort by timestamp (oldest first) and remove oldest entries
  const entriesToRemove = entries
    .sort((a, b) => a[1].timestamp - b[1].timestamp)
    .slice(0, Math.floor(MAX_CACHE_SIZE * 0.1)); // Remove 10% of cache

  entriesToRemove.forEach(([k]) => availabilityCache.delete(k));
};

/**
 * Get cached Street View availability or fetch if not cached
 * Implements LRU cache eviction when size limit is reached
 *
 * @param lat Latitude
 * @param lng Longitude
 * @returns Promise with availability result
 */
export const getCachedStreetViewAvailability = async (
  lat: number,
  lng: number
): Promise<StreetViewCheckResult> => {
  // Create cache key (6 decimal places for ~0.1m precision)
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const now = Date.now();

  // Check cache
  const cached = availabilityCache.get(key);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    // Update timestamp for LRU (move to end)
    availabilityCache.delete(key);
    availabilityCache.set(key, { ...cached, timestamp: now });
    return cached.result;
  }

  // Evict expired entries if cache is large
  if (availabilityCache.size > MAX_CACHE_SIZE * 0.8) {
    evictExpiredEntries();
  }

  // Evict oldest entries if still too large
  if (availabilityCache.size >= MAX_CACHE_SIZE) {
    evictOldestEntries();
  }

  // Fetch and cache
  const result = await checkStreetViewAvailability(lat, lng);
  availabilityCache.set(key, {
    result,
    timestamp: now
  });

  return result;
};

/**
 * Clear the Street View availability cache
 * Useful for testing or memory management
 */
export const clearStreetViewCache = (): void => {
  availabilityCache.clear();
};

/**
 * Get cache statistics for monitoring
 */
export const getStreetViewCacheStats = (): {
  size: number;
  maxSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} => {
  const entries = Array.from(availabilityCache.values());
  const timestamps = entries.map(e => e.timestamp);

  return {
    size: availabilityCache.size,
    maxSize: MAX_CACHE_SIZE,
    oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
    newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null
  };
};
