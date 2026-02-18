/**
 * STUB: Lightweight placeholder for Tauri v1.5 app's ClearPOVButton component.
 * Will be replaced when the POV editing feature is fully implemented.
 * Created to unblock mapTimeline feature compilation.
 *
 * Consumed by:
 * - mapTimeline/components/map/LocationPopup.tsx
 */

interface ClearPOVButtonProps {
  povType: 'mapbox' | 'streetview' | 'both';
  locationUuid: string;
  caseDir: string;
  onCleared?: () => void;
}

export const ClearPOVButton = (_props: ClearPOVButtonProps) => {
  return null;
};
