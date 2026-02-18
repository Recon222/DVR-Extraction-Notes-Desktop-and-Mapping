/**
 * Street View POV Button Component
 *
 * Button to save the current Street View point-of-view (heading, pitch, zoom)
 * for a specific CCTV location. This allows investigators to bookmark
 * the exact view angle they want to present in court.
 *
 * TODO: Wire up to backend save command when POV persistence is implemented.
 * Currently captures POV from the panorama and logs it.
 */

import { useState } from 'react';
import type { StreetViewPOV } from '../../types/geojson';

interface StreetViewPOVButtonProps {
  locationUuid: string;
  caseDir: string;
  panoramaRef: React.RefObject<google.maps.StreetViewPanorama | null>;
  existingPOV: StreetViewPOV | null;
  onSaved?: () => void;
}

export const StreetViewPOVButton = ({
  locationUuid,
  caseDir,
  panoramaRef,
  existingPOV,
  onSaved,
}: StreetViewPOVButtonProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const handleSavePOV = async () => {
    const pano = panoramaRef.current;
    if (!pano) {
      console.warn('[StreetViewPOVButton] No panorama available');
      return;
    }

    setIsSaving(true);
    try {
      const pov = pano.getPov();
      const position = pano.getPosition();
      const zoom = pano.getZoom();

      const povData: StreetViewPOV = {
        heading: pov.heading,
        pitch: pov.pitch,
        zoom,
        latitude: position?.lat(),
        longitude: position?.lng(),
        panoId: pano.getPano(),
      };

      // TODO: Replace with actual save command when backend is ready
      // await savePOV(caseDir, locationUuid, povData);
      console.log('[StreetViewPOVButton] POV captured:', {
        locationUuid,
        caseDir,
        pov: povData,
      });

      setHasSaved(true);
      onSaved?.();

      // Reset saved indicator after a short delay
      setTimeout(() => setHasSaved(false), 2000);
    } catch (error) {
      console.error('[StreetViewPOVButton] Failed to save POV:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      onClick={handleSavePOV}
      disabled={isSaving}
      className={`px-3 py-2 rounded-lg shadow-lg transition-all text-sm font-medium ${
        hasSaved
          ? 'bg-green-600 text-white'
          : existingPOV
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title={existingPOV ? 'Update saved view angle' : 'Save current view angle'}
      aria-label={existingPOV ? 'Update saved point of view' : 'Save point of view'}
    >
      {isSaving ? (
        <span className="flex items-center gap-1">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving...
        </span>
      ) : hasSaved ? (
        <span className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l-4 4m0 0l-4-4m4 4V3m0 0a9 9 0 110 18 9 9 0 010-18z" />
          </svg>
          {existingPOV ? 'Update POV' : 'Save POV'}
        </span>
      )}
    </button>
  );
};
