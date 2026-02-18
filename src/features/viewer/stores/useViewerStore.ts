/**
 * Viewer Store (ENHANCED FOR PORTABLE VIEWER)
 *
 * Manages state for viewer mode (read-only viewing).
 * Supports both .casedata temp extraction and portable viewer (exe directory).
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ExportedCaseData } from '@/types/export.types';
import { useLocationStore } from '@/stores/useLocationStore';
import { useMapTimelineStore } from '@/features/mapTimeline/stores/mapTimelineStore';
import type { CCTVLocation } from '@/types/cctv.types';

/**
 * Viewer State
 */
interface ViewerState {
  // Export data loaded from .casedata file or portable viewer
  exportData: ExportedCaseData | null;

  // Temporary directory where .casedata files are extracted
  tempDirectory: string | null;

  // Executable directory for portable viewer
  exeDirectory: string | null;

  // Loading state
  isLoading: boolean;
  loadError: string | null;

  // Actions
  loadExport: (exportData: ExportedCaseData, tempDir: string) => void;
  loadPortableExport: (exportData: ExportedCaseData, exeDir: string) => void;
  clearExport: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Transform GeoJSON feature to CCTVLocation
 */
function featureToLocation(feature: any): CCTVLocation {
  const props = feature.properties;

  return {
    uuid: props.uuid,
    rowIndex: props.rowIndex || 0,
    realDateTime: props.realDateTime || '',
    dvrDateTime: props.dvrDateTime || '',
    dvrTimeOffset: props.dvrTimeOffset || '+00:00:00',
    address: props.address || '',
    latitude: feature.geometry.coordinates[1],
    longitude: feature.geometry.coordinates[0],
    timing: props.timing || 'pre',
    notes: props.notes || '',
    personsInvolved: props.personsInvolved || '',
    image: Array.isArray(props.images) ? props.images.join('; ') : (props.images || ''),
    video: Array.isArray(props.videos) ? props.videos.join('; ') : (props.videos || ''),
  };
}

/**
 * Viewer Store
 *
 * Use this store in viewer mode to manage exported case data.
 */
export const useViewerStore = create<ViewerState>()(
  immer((set) => ({
    exportData: null,
    tempDirectory: null,
    exeDirectory: null,
    isLoading: false,
    loadError: null,

    /**
     * Load export data from .casedata file (temp directory mode)
     */
    loadExport: (exportData: ExportedCaseData, tempDir: string) => {
      try {
        // Store export data
        set((state) => {
          state.exportData = exportData;
          state.tempDirectory = tempDir;
          state.exeDirectory = null; // Not portable mode
          state.isLoading = false;
          state.loadError = null;
        });

        // Transform GeoJSON features to locations
        const locations = exportData.geoJSON.features.map(featureToLocation);

        // Populate location store
        useLocationStore.getState().setLocations(locations);

        // Restore map viewport
        if (exportData.initialViewport) {
          useMapTimelineStore.getState().setViewport(exportData.initialViewport);
        }

        // Apply saved filters if present
        if (exportData.filters) {
          useMapTimelineStore.getState().setFilters(exportData.filters);
        }

        console.log('[Viewer] Export loaded (temp mode):', {
          locations: locations.length,
          tempDir,
          caseName: exportData.caseName,
        });
      } catch (error) {
        console.error('[Viewer] Failed to load export:', error);
        set((state) => {
          state.loadError =
            error instanceof Error ? error.message : 'Failed to load export data';
          state.isLoading = false;
        });
      }
    },

    /**
     * NEW: Load export data from portable viewer (exe directory)
     */
    loadPortableExport: (exportData: ExportedCaseData, exeDir: string) => {
      try {
        set((state) => {
          state.exportData = exportData;
          state.exeDirectory = exeDir; // Portable mode
          state.tempDirectory = null;
          state.isLoading = false;
          state.loadError = null;
        });

        // Transform GeoJSON features to locations
        const locations = exportData.geoJSON.features.map(featureToLocation);

        // Populate location store
        useLocationStore.getState().setLocations(locations);

        // Restore map viewport
        if (exportData.initialViewport) {
          useMapTimelineStore.getState().setViewport(exportData.initialViewport);
        }

        // Apply saved filters if present
        if (exportData.filters) {
          useMapTimelineStore.getState().setFilters(exportData.filters);
        }

        console.log('[Viewer] Export loaded (portable mode):', {
          locations: locations.length,
          exeDir,
          caseName: exportData.caseName,
        });
      } catch (error) {
        console.error('[Viewer] Failed to load portable export:', error);
        set((state) => {
          state.loadError =
            error instanceof Error ? error.message : 'Failed to load portable export';
          state.isLoading = false;
        });
      }
    },

    /**
     * Clear export data and reset stores
     */
    clearExport: () => {
      set((state) => {
        state.exportData = null;
        state.tempDirectory = null;
        state.exeDirectory = null;
        state.isLoading = false;
        state.loadError = null;
      });

      // Clear location store
      useLocationStore.getState().clearLocations();

      // Reset map timeline store
      useMapTimelineStore.getState().resetTimeline();
    },

    /**
     * Set loading state
     */
    setLoading: (loading: boolean) => {
      set((state) => {
        state.isLoading = loading;
      });
    },

    /**
     * Set error state
     */
    setError: (error: string | null) => {
      set((state) => {
        state.loadError = error;
        state.isLoading = false;
      });
    },
  }))
);
