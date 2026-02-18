/**
 * STUB: Lightweight placeholder for Tauri v1.5 app's MapPOVButton component.
 * Will be replaced when the POV editing feature is fully implemented.
 * Created to unblock mapTimeline feature compilation.
 *
 * Consumed by:
 * - mapTimeline/components/map/LocationPopup.tsx
 */

import type { MapRef } from 'react-map-gl/mapbox';
import type { MapboxPOV } from '@/features/mapTimeline/types/geojson';

interface MapPOVButtonProps {
  locationUuid: string;
  caseDir: string;
  mapRef: React.RefObject<MapRef>;
  existingPOV: MapboxPOV | null;
  onSaved?: () => void;
}

export const MapPOVButton = (_props: MapPOVButtonProps) => {
  return null;
};
