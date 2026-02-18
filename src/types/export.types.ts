/**
 * STUB: Lightweight placeholder for Tauri v1.5 app's export type definitions.
 * Will be replaced when the case export feature is fully implemented.
 * Created to unblock viewer and mapTimeline feature compilation.
 *
 * Consumed by:
 * - viewer/stores/useViewerStore.ts (ExportedCaseData)
 * - viewer/services/viewerDataLoader.ts (ExportedCaseData)
 * - viewer/contexts/MediaPathContext.tsx (isSafeFilename)
 * - viewer/__tests__/useViewerStore.test.ts (ExportedCaseData)
 */

/**
 * GeoJSON Feature Collection for CCTV locations.
 * Minimal stub -- real type would include full GeoJSON spec.
 */
export interface CCTVFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    properties: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Map viewport state for restoring saved views.
 */
export interface MapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

/**
 * Media manifest listing all images and videos in the export.
 */
export interface MediaManifest {
  images: string[];
  videos: string[];
}

/**
 * Export package manifest with integrity information.
 */
export interface ExportManifest {
  fileCount: number;
  totalSize: number;
  checksum: string;
  generatedBy: string;
}

/**
 * Complete exported case data structure.
 * Represents the data contained in a .casedata or .cadx export.
 */
export interface ExportedCaseData {
  version: string;
  exportedAt: string;
  geoJSON: CCTVFeatureCollection;
  caseName: string;
  caseDescription?: string;
  initialViewport?: MapViewport;
  filters?: unknown;
  mediaManifest?: MediaManifest;
  manifest?: ExportManifest;
}

/**
 * Check if filename is safe (no path traversal or control characters).
 *
 * @param filename - Filename to validate
 * @returns true if the filename is safe to use
 */
export function isSafeFilename(filename: string | null | undefined): boolean {
  if (!filename) return false;
  if (filename.trim() === '') return false;

  // Reject path traversal attempts
  if (filename.includes('..')) return false;
  if (filename.includes('/')) return false;
  if (filename.includes('\\')) return false;

  // Check for null bytes and control characters (0x00-0x1F)
  if (/[\x00-\x1F]/.test(filename)) return false;

  return true;
}
