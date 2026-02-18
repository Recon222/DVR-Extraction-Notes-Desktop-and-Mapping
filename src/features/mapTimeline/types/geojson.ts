/**
 * GeoJSON Types for Map Timeline Feature
 *
 * Minimal type definitions for the GeoJSON data structures used by
 * the getLocationPOV service function and related components.
 *
 * These are feature-local copies. The canonical types from the old app
 * lived at @/types/geojson.types which does not exist in this template.
 * These will be replaced during the Supabase migration.
 */

/**
 * Mapbox camera point-of-view
 */
export interface MapboxPOV {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

/**
 * Google Street View point-of-view
 */
export interface StreetViewPOV {
  heading: number;
  pitch: number;
  zoom?: number;
  latitude?: number;
  longitude?: number;
  panoId?: string;
}

/**
 * Properties attached to each GeoJSON feature
 */
export interface CCTVFeatureProperties {
  uuid: string;
  rowIndex: number;
  realDateTime: string;
  dvrDateTime: string;
  dvrTimeOffset: string;
  address: string;
  timing: 'pre' | 'incident' | 'post';
  notes: string;
  personsInvolved: string;
  images: string[];
  videos: string[];
  mapboxPOV: MapboxPOV | null;
  streetViewPOV: StreetViewPOV | null;
}

/**
 * A single CCTV location as a GeoJSON Feature
 */
export interface CCTVFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat] per GeoJSON spec
  };
  properties: CCTVFeatureProperties;
}

/**
 * GeoJSON FeatureCollection with metadata
 */
export interface CCTVFeatureCollection {
  type: 'FeatureCollection';
  metadata: {
    caseName: string;
    createdAt: string;
    lastModified: string;
    version: string;
    sourceFile: string;
  };
  features: CCTVFeature[];
}
