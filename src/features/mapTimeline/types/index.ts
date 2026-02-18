/**
 * Map Timeline Feature Types
 *
 * Centralized type definitions for the Map Timeline view.
 */

import type { CCTVLocation } from '@/types/cctv.types';
import type { StreetViewPOV } from './geojson';

// Timeline Event Types
export interface TimelineEvent {
  location: CCTVLocation;  // Full location object for easy access
  displayTime: string;     // Formatted time (HH:mm:ss)
  displayDate: string;     // Formatted date (MMM dd, yyyy)
  isRevealed: boolean;     // Whether event is shown in progressive reveal
  isActive: boolean;       // Whether event is currently selected
  hasImages: boolean;      // Whether location has images
  hasVideos: boolean;      // Whether location has videos
  imageCount: number;      // Number of images
  videoCount: number;      // Number of videos
}

// Map Marker Types
export interface MarkerData {
  locationId: string;      // Location UUID
  coordinates: [number, number];  // [longitude, latitude] for Mapbox
  label: string;           // Display label (usually formatted time)
  timing: 'pre' | 'incident' | 'post';
  isRevealed: boolean;     // Whether marker is shown in progressive reveal
  isActive: boolean;       // Whether marker is currently selected
  // Legacy fields (kept for compatibility if needed)
  latitude?: number;
  longitude?: number;
  address?: string;
}

// Lightbox Types
export interface LightboxSlide {
  type: 'image' | 'video';
  src: string;
  alt?: string;
  title?: string;          // Optional filename/title for display
}

export interface LightboxState {
  isOpen: boolean;
  currentIndex: number;
  slides: LightboxSlide[];
}

// Map Viewport Types
export interface MapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

// Street View Types
export interface StreetViewModalProps {
  latitude: number;
  longitude: number;
  address?: string;
  onClose: () => void;
  // Optional POV editing props - only provided when opened from location popup
  locationUuid?: string;
  caseDir?: string;
  existingPOV?: StreetViewPOV | null;
  onPOVSaved?: () => void;  // Callback to refresh POV data after save
}

export interface StreetViewThumbnailProps {
  latitude: number;
  longitude: number;
  onDoubleClick: () => void;
  existingPOV?: StreetViewPOV | null;
}

// Pegman Control Types
export interface PegmanState {
  isDragging: boolean;
  dragPosition: { x: number; y: number } | null;
  active: boolean;
}

export interface PegmanControlProps {
  mapRef: React.RefObject<any>;
  isMapReady: boolean;
}

export type UsePegmanDragResult = {
  isDragging: boolean;
  dragPosition: { x: number; y: number } | null;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleReturnAnimation: () => void;
};

// Re-export TimelineFilters from filters.ts to avoid duplication
export type { TimelineFilters } from './filters';
