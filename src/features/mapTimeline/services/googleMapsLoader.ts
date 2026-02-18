/**
 * Google Maps API Loader
 *
 * Singleton loader for the Google Maps JavaScript API.
 * Ensures the API is loaded only once across the application.
 * Uses the new functional API (importLibrary, setOptions).
 */

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let googleMapsPromise: Promise<typeof google> | null = null;
let googleMapsLoaded = false;

/**
 * Load the Google Maps JavaScript API
 * Uses singleton pattern to ensure the API is loaded only once
 *
 * @returns Promise that resolves to the global google object
 * @throws Error if API key is missing or load fails
 */
export const loadGoogleMaps = async (): Promise<typeof google> => {
  // Return existing promise if already loading/loaded
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Check for API key
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    return Promise.reject(
      new Error(
        'Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.'
      )
    );
  }

  // Load and cache the promise
  const loadPromise = (async () => {
    try {
      // Set options before loading any library
      setOptions({
        key: apiKey,
        v: 'weekly'
      });

      // Load the core library (includes Street View)
      await importLibrary('core');

      googleMapsLoaded = true;
      return google;
    } catch (error) {
      // Reset on error so retry is possible
      googleMapsPromise = null;
      googleMapsLoaded = false;
      throw new Error(
        `Failed to load Google Maps API: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  })();

  googleMapsPromise = loadPromise;
  return loadPromise;
};

/**
 * Check if Google Maps API is already loaded
 */
export const isGoogleMapsLoaded = (): boolean => {
  return googleMapsLoaded;
};

/**
 * Reset the loader state (useful for testing)
 */
export const resetGoogleMapsLoader = (): void => {
  googleMapsPromise = null;
  googleMapsLoaded = false;
};
