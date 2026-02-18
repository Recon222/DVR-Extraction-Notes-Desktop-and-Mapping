/**
 * Viewer Data Loader
 *
 * Loads case data from GeoJSON in the viewer executable directory.
 * Transforms GeoJSON features into application state.
 */

import { invoke } from '@tauri-apps/api/core';
import type { ExportedCaseData } from '@/types/export.types';

/**
 * ViewerData returned from Tauri backend
 *
 * IMPORTANT: Backend returns ViewerData struct with geojson as serde_json::Value.
 * Tauri serializes this as a JSON object, NOT a string.
 */
export interface ViewerData {
  case_name: string;
  geojson: unknown; // Parsed GeoJSON object (not a string)
  media_path: string;
}

/**
 * Load viewer data from executable directory
 *
 * Calls the Tauri backend to read CCTV_Chronology.geojson from the
 * same directory as the viewer executable.
 *
 * @returns Promise<{ exportData: ExportedCaseData, exeDir: string }>
 * @throws Error if loading fails
 */
export async function loadViewerData(): Promise<{
  exportData: ExportedCaseData;
  exeDir: string;
}> {
  console.log('[VIEWER-DEBUG] viewerDataLoader: loadViewerData() called');

  try {
    // Get executable directory
    console.log('[VIEWER-DEBUG] viewerDataLoader: Calling get_exe_directory command');
    const exeDir = await invoke<string>('get_exe_directory');
    console.log('[VIEWER-DEBUG] viewerDataLoader: get_exe_directory returned:', exeDir);

    // Load viewer data (backend returns ViewerData struct)
    console.log('[VIEWER-DEBUG] viewerDataLoader: Calling load_viewer_data command');
    const viewerData = await invoke<ViewerData>('load_viewer_data');
    console.log('[VIEWER-DEBUG] viewerDataLoader: load_viewer_data returned:', viewerData);

    // Backend already parsed the GeoJSON, no need to JSON.parse
    const geoJSON = viewerData.geojson;
    console.log('[VIEWER-DEBUG] viewerDataLoader: geoJSON type:', typeof geoJSON);

    // Type guard: ensure geoJSON is an object with expected structure
    if (!geoJSON || typeof geoJSON !== 'object') {
      console.error('[VIEWER-DEBUG] viewerDataLoader: Invalid GeoJSON structure, geoJSON =', geoJSON);
      throw new Error('Invalid GeoJSON structure returned from backend');
    }

    const geoJSONObj = geoJSON as Record<string, unknown>;
    console.log('[VIEWER-DEBUG] viewerDataLoader: geoJSONObj.type =', geoJSONObj.type);
    console.log('[VIEWER-DEBUG] viewerDataLoader: geoJSONObj.features is array:', Array.isArray(geoJSONObj.features));

    // Validate GeoJSON structure
    if (geoJSONObj.type !== 'FeatureCollection' || !Array.isArray(geoJSONObj.features)) {
      console.error('[VIEWER-DEBUG] viewerDataLoader: Invalid FeatureCollection structure');
      throw new Error('GeoJSON must be a FeatureCollection with features array');
    }

    // Extract metadata from GeoJSON
    const metadata = geoJSONObj.metadata as Record<string, unknown> | undefined;
    console.log('[VIEWER-DEBUG] viewerDataLoader: metadata =', metadata);

    const exportData: ExportedCaseData = {
      version: (metadata?.version as string) || '1.0.0',
      exportedAt: (metadata?.exportedAt as string) || new Date().toISOString(),
      geoJSON: geoJSONObj as any, // Cast to CCTVFeatureCollection
      caseName: (metadata?.caseName as string) || viewerData.case_name || 'Unknown Case',
      caseDescription: metadata?.caseDescription as string | undefined,
      initialViewport: (metadata?.initialViewport as any) || {
        longitude: -0.1,
        latitude: 51.5,
        zoom: 10,
      },
      filters: (metadata?.filters as any) || null,
      mediaManifest: {
        images: ((metadata?.mediaManifest as any)?.images as string[]) || [],
        videos: ((metadata?.mediaManifest as any)?.videos as string[]) || [],
      },
      manifest: (metadata?.manifest as any) || {
        fileCount: 0,
        totalSize: 0,
        checksum: '',
        generatedBy: 'CCTV Chronology Creator',
      },
    };

    console.log('[VIEWER-DEBUG] viewerDataLoader: exportData created:', exportData);
    console.log('[VIEWER-DEBUG] viewerDataLoader: Returning successfully');

    return { exportData, exeDir };
  } catch (error) {
    console.error('[VIEWER-DEBUG] viewerDataLoader: Failed to load viewer data:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to load viewer data'
    );
  }
}
