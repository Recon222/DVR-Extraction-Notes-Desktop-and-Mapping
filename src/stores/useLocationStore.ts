/**
 * STUB: Lightweight placeholder for Tauri v1.5 app's location data store.
 * Will be replaced when the location management feature is fully implemented.
 * Created to unblock mapTimeline feature compilation.
 *
 * Consumed by:
 * - mapTimeline/components/MapTimelineView.tsx (selector: state.locations)
 * - mapTimeline/hooks/useVideoPreloader.ts (selector: state.locations)
 * - viewer/stores/useViewerStore.ts (getState().setLocations, getState().clearLocations)
 * - viewer/touchportal/hooks/useTouchPortalBridge.ts (selector: state.locations)
 */

import { create } from 'zustand';
import type { CCTVLocation } from '@/types/cctv.types';

interface LocationState {
  /** Array of all CCTV locations for the current case */
  locations: CCTVLocation[];

  /** Replace all locations (used by viewer store on data load) */
  setLocations: (locations: CCTVLocation[]) => void;

  /** Clear all locations (used by viewer store on data unload) */
  clearLocations: () => void;
}

export const useLocationStore = create<LocationState>()((set) => ({
  locations: [],

  setLocations: (locations) => set({ locations }),

  clearLocations: () => set({ locations: [] }),
}));
