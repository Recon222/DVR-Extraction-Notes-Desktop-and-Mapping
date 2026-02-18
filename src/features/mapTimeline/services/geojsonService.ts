/**
 * GeoJSON Service (Feature-Local)
 *
 * Extracted subset of the original geojsonService, containing only
 * the getLocationPOV function needed by mapTimeline hooks and components.
 *
 * The full geojsonService.ts is parked at src/features/mapTimeline/geojsonService.ts
 * as reference for later migration.
 *
 * Design Decisions:
 * - In-memory lookup path (preloadedGeoJSON) works immediately
 * - Filesystem read path returns null gracefully until Rust commands exist
 * - NON-BLOCKING: errors are logged, never thrown to callers
 */

import type {
  CCTVFeatureCollection,
  MapboxPOV,
  StreetViewPOV,
} from '../types/geojson';

/**
 * Read GeoJSON file from case directory
 *
 * Stub implementation: returns null until the corresponding Rust command
 * (e.g., commands.readTextFile) is available via tauri-specta bindings.
 * The in-memory path via preloadedGeoJSON covers the immediate need.
 *
 * @param _caseDirectory - Path to case directory (unused until Rust command exists)
 * @returns null (filesystem read not yet implemented)
 */
async function readGeoJSON(
  _caseDirectory: string
): Promise<CCTVFeatureCollection | null> {
  // TODO: Implement filesystem read when Rust text file command is available
  // Will use: const result = await commands.readTextFile(getGeoJSONPath(caseDirectory))
  return null;
}

/**
 * Get POV data for a specific location
 *
 * When preloadedGeoJSON is provided (from exportData in viewer mode),
 * uses in-memory data instead of reading from filesystem. This enables
 * POV lookups in viewer mode where casePath is empty.
 *
 * In editor mode, falls back to reading from the filesystem (currently
 * returns null until the Rust command is wired up).
 *
 * @param caseDirectory - Path to case directory (can be empty in viewer mode)
 * @param uuid - UUID of the location
 * @param preloadedGeoJSON - Optional preloaded GeoJSON from exportData (viewer mode)
 * @returns POV data or null if not found
 */
export async function getLocationPOV(
  caseDirectory: string,
  uuid: string,
  preloadedGeoJSON?: CCTVFeatureCollection | null
): Promise<{ mapboxPOV: MapboxPOV | null; streetViewPOV: StreetViewPOV | null } | null> {
  try {
    // Use preloaded GeoJSON if provided (viewer mode), otherwise read from file (editor mode)
    const geoJSON = preloadedGeoJSON || await readGeoJSON(caseDirectory);

    if (!geoJSON) {
      return null;
    }

    const feature = geoJSON.features.find(f => f.id === uuid);
    if (!feature) {
      return null;
    }

    return {
      mapboxPOV: feature.properties.mapboxPOV,
      streetViewPOV: feature.properties.streetViewPOV,
    };
  } catch (error) {
    console.error('[GeoJSON] Get POV failed:', error);
    return null;
  }
}
