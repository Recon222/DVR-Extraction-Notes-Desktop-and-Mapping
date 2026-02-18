import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { LightboxState, MapViewport, TimelineFilters } from '../types';
import { getDefaultPanelPosition } from '../constants/mapConfig';

interface StreetViewState {
  isOpen: boolean;
  latitude: number | null;
  longitude: number | null;
  address?: string;
  source?: 'pegman' | 'popup' | 'touchportal';  // Track where Street View was opened from
}

interface SearchMarkerState {
  latitude: number | null;
  longitude: number | null;
  address?: string;
}

/**
 * Lightbox zoom ref interface
 * Matches yet-another-react-lightbox ZoomRef type
 */
interface LightboxZoomRef {
  zoomIn: () => void;
  zoomOut: () => void;
}

/**
 * Getter function type for lightbox zoom ref.
 *
 * WHY A GETTER FUNCTION?
 * The zoom plugin updates ref.current on each zoom change with new zoomIn/zoomOut
 * callbacks that capture the current zoom level in their closures. If we stored
 * the ref value directly, we'd have stale callbacks.
 *
 * We can't store the RefObject directly in Zustand because:
 * 1. Immer (used by Zustand) creates proxy objects for state
 * 2. When zoom plugin tries to update ref.current, it fails because
 *    the proxy makes .current read-only
 * 3. Error: "Cannot assign to read only property 'current' of object"
 *
 * The getter function pattern solves both problems:
 * - Function is stored as-is (not proxied by immer)
 * - Function dereferences ref.current at call time, getting fresh callbacks
 */
type LightboxZoomGetter = () => LightboxZoomRef | null;

/**
 * Map zoom control interface
 * Provides zoom in/out centered on a specific location,
 * plus pitch (tilt) and bearing (rotation) controls
 */
interface MapZoomControl {
  zoomIn: (lat: number, lng: number) => void;
  zoomOut: (lat: number, lng: number) => void;
  getZoom: () => number;
  pitchUp: () => void;
  pitchDown: () => void;
  bearingLeft: () => void;
  bearingRight: () => void;
  panUp: () => void;
  panDown: () => void;
  panLeft: () => void;
  panRight: () => void;
}

/**
 * Getter function type for map zoom control.
 * Similar to LightboxZoomGetter - avoids storing ref directly in Zustand.
 */
type MapZoomGetter = () => MapZoomControl | null;

/**
 * Street View panorama control interface
 * Provides movement controls to walk between adjacent panoramas
 * and camera rotation, pitch, and zoom control
 */
interface StreetViewPanoramaControl {
  moveForward: () => void;
  moveBackward: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  rotate: (degrees: number) => void;
  pitch: (degrees: number) => void;
  zoom: (direction: 'in' | 'out' | 'reset') => void;
}

/**
 * Getter function type for Street View panorama control.
 * Similar pattern to MapZoomGetter - avoids storing ref directly in Zustand.
 */
type StreetViewPanoramaGetter = () => StreetViewPanoramaControl | null;

/**
 * Video control interface for lightbox video playback
 * Provides play/pause/seek controls for videos displayed in the lightbox
 */
interface LightboxVideoControl {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  seekPercent: (percent: number) => void;
  toggleFullscreen: () => void;
}

/**
 * Getter function type for lightbox video control.
 * Similar pattern to StreetViewPanoramaGetter - avoids storing ref directly in Zustand.
 */
type LightboxVideoGetter = () => LightboxVideoControl | null;

interface MapTimelineState {
  // Timeline state
  currentIndex: number;
  revealedCount: number;
  isPlaying: boolean;
  selectedLocationId: string | null;  // UUID of selected location
  flyingToLocationId: string | null;  // UUID of location we're flying to (for preloading)

  // Panel state
  isPanelCollapsed: boolean;
  panelPosition: { x: number; y: number };

  // Filter state
  filters: TimelineFilters | null;
  filtersOpen: boolean;

  // Lightbox state
  lightbox: LightboxState;
  /**
   * Getter function for programmatic zoom control.
   * Returns the current zoom ref value when called.
   * See LightboxZoomGetter type docs for why we use a getter function.
   */
  lightboxZoomGetter: LightboxZoomGetter | null;

  /**
   * Getter function for lightbox video control.
   * Returns video control functions when a video slide is active.
   * Set by MediaLightbox when video slide is displayed.
   */
  lightboxVideoGetter: LightboxVideoGetter | null;

  /**
   * Getter function for map zoom control.
   * Returns functions to zoom in/out centered on a given location.
   * Set by MapTimelineView when map is ready.
   */
  mapZoomGetter: MapZoomGetter | null;

  // Street View state
  streetView: StreetViewState;
  /**
   * Getter function for Street View panorama control.
   * Returns movement functions when panorama is active.
   * Set by StreetViewModal when panorama is ready.
   */
  streetViewPanoramaGetter: StreetViewPanoramaGetter | null;

  // Search marker state
  searchMarker: SearchMarkerState;

  // Map viewport
  viewport: MapViewport;
}

interface MapTimelineActions {
  setCurrentIndex: (index: number) => void;
  revealUpTo: (index: number) => void;
  selectLocation: (id: string | null) => void;  // UUID
  setFlyingToLocationId: (id: string | null) => void;  // NEW: Set location being flown to

  startPlayback: () => void;
  pausePlayback: () => void;
  stepForward: () => void;
  stepBackward: () => void;

  togglePanel: () => void;
  setPanelPosition: (x: number, y: number) => void;

  setFilters: (filters: TimelineFilters | null) => void;
  setFiltersOpen: (isOpen: boolean) => void;

  openLightbox: (slides: LightboxState['slides'], index: number) => void;
  closeLightbox: () => void;
  setLightboxIndex: (index: number) => void;
  setLightboxZoomGetter: (getter: LightboxZoomGetter | null) => void;
  lightboxZoomIn: () => void;
  lightboxZoomOut: () => void;

  setMapZoomGetter: (getter: MapZoomGetter | null) => void;
  mapZoomIn: (lat: number, lng: number) => void;
  mapZoomOut: (lat: number, lng: number) => void;
  mapPitchUp: () => void;
  mapPitchDown: () => void;
  mapBearingLeft: () => void;
  mapBearingRight: () => void;
  mapPanUp: () => void;
  mapPanDown: () => void;
  mapPanLeft: () => void;
  mapPanRight: () => void;

  openStreetView: (latitude: number, longitude: number, address?: string, source?: 'pegman' | 'popup' | 'touchportal') => void;
  closeStreetView: () => void;
  setStreetViewPanoramaGetter: (getter: StreetViewPanoramaGetter | null) => void;
  streetViewMoveForward: () => void;
  streetViewMoveBackward: () => void;
  streetViewMoveLeft: () => void;
  streetViewMoveRight: () => void;
  streetViewRotate: (degrees: number) => void;
  streetViewPitch: (degrees: number) => void;
  streetViewZoom: (direction: 'in' | 'out' | 'reset') => void;

  setLightboxVideoGetter: (getter: LightboxVideoGetter | null) => void;
  videoPlay: () => void;
  videoPause: () => void;
  videoToggle: () => void;
  videoSeek: (seconds: number) => void;
  videoFullscreen: () => void;

  setSearchMarker: (latitude: number, longitude: number, address?: string) => void;
  clearSearchMarker: () => void;

  setViewport: (viewport: MapViewport) => void;
  resetTimeline: () => void;
  resetPlaybackState: () => void; // Batch action
}

const getInitialState = (): MapTimelineState => ({
  currentIndex: 0,
  revealedCount: 0, // Start with no markers revealed
  isPlaying: false,
  selectedLocationId: null,
  flyingToLocationId: null,  // NEW: Initially not flying to any location
  isPanelCollapsed: false,
  panelPosition: getDefaultPanelPosition(), // Calculate at runtime
  filters: null,
  filtersOpen: false,
  lightbox: { isOpen: false, currentIndex: 0, slides: [] },
  lightboxZoomGetter: null,  // Set by MediaLightbox when zoom plugin is ready
  lightboxVideoGetter: null,  // Set by MediaLightbox when video slide is displayed
  mapZoomGetter: null,  // Set by MapTimelineView when map is ready
  streetView: { isOpen: false, latitude: null, longitude: null, address: undefined },
  streetViewPanoramaGetter: null,  // Set by StreetViewModal when panorama is ready
  searchMarker: { latitude: null, longitude: null, address: undefined },
  viewport: { longitude: -79.7624, latitude: 43.7315, zoom: 13 }
});

export const useMapTimelineStore = create<MapTimelineState & MapTimelineActions>()(
  immer((set) => ({
    ...getInitialState(),

    setCurrentIndex: (index) => set((state) => { state.currentIndex = index; }),

    revealUpTo: (index) => set((state) => {
      // Always set revealed count to index + 1, whether moving forward OR backward
      // This ensures markers hide when going back in time
      state.revealedCount = index + 1;
    }),

    selectLocation: (id) => set((state) => {
      console.log('[Timeline] Selection changed:', { uuid: id });
      state.selectedLocationId = id;
    }),

    setFlyingToLocationId: (id) => set((state) => {
      console.log('[Timeline] Flying to location:', { uuid: id });
      state.flyingToLocationId = id;
    }),

    startPlayback: () => set((state) => { state.isPlaying = true; }),
    pausePlayback: () => set((state) => { state.isPlaying = false; }),

    stepForward: () => set((state) => { state.currentIndex += 1; }),
    stepBackward: () => set((state) => {
      if (state.currentIndex > 0) state.currentIndex -= 1;
    }),

    togglePanel: () => set((state) => { state.isPanelCollapsed = !state.isPanelCollapsed; }),
    setPanelPosition: (x, y) => set((state) => { state.panelPosition = { x, y }; }),

    setFilters: (filters) => set((state) => { state.filters = filters; }),
    setFiltersOpen: (isOpen) => set((state) => { state.filtersOpen = isOpen; }),

    openLightbox: (slides, index) => {
      set((state) => {
        state.lightbox = { isOpen: true, currentIndex: index, slides };
      });
    },
    closeLightbox: () => {
      set((state) => {
        state.lightbox.isOpen = false;
      });
    },
    setLightboxIndex: (index) => set((state) => { state.lightbox.currentIndex = index; }),
    setLightboxZoomGetter: (getter) => set((state) => { state.lightboxZoomGetter = getter; }),
    lightboxZoomIn: () => {
      // Call the getter function to get the current zoom ref value
      // The getter dereferences ref.current at call time, ensuring fresh callbacks
      const getter = useMapTimelineStore.getState().lightboxZoomGetter;
      const ref = getter?.();
      if (ref) {
        console.log('[MapTimelineStore] lightboxZoomIn called, zoom ref available');
        ref.zoomIn();
      } else {
        console.warn('[MapTimelineStore] lightboxZoomIn called but zoom ref is null');
      }
    },
    lightboxZoomOut: () => {
      // Call the getter function to get the current zoom ref value
      // The getter dereferences ref.current at call time, ensuring fresh callbacks
      const getter = useMapTimelineStore.getState().lightboxZoomGetter;
      const ref = getter?.();
      if (ref) {
        console.log('[MapTimelineStore] lightboxZoomOut called, zoom ref available');
        ref.zoomOut();
      } else {
        console.warn('[MapTimelineStore] lightboxZoomOut called but zoom ref is null');
      }
    },

    setMapZoomGetter: (getter) => set((state) => { state.mapZoomGetter = getter; }),
    mapZoomIn: (lat, lng) => {
      const getter = useMapTimelineStore.getState().mapZoomGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] mapZoomIn called, control available');
        control.zoomIn(lat, lng);
      } else {
        console.warn('[MapTimelineStore] mapZoomIn called but map zoom control is null');
      }
    },
    mapZoomOut: (lat, lng) => {
      const getter = useMapTimelineStore.getState().mapZoomGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] mapZoomOut called, control available');
        control.zoomOut(lat, lng);
      } else {
        console.warn('[MapTimelineStore] mapZoomOut called but map zoom control is null');
      }
    },
    mapPitchUp: () => {
      const getter = useMapTimelineStore.getState().mapZoomGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] mapPitchUp called, control available');
        control.pitchUp();
      } else {
        console.warn('[MapTimelineStore] mapPitchUp called but map zoom control is null');
      }
    },
    mapPitchDown: () => {
      const getter = useMapTimelineStore.getState().mapZoomGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] mapPitchDown called, control available');
        control.pitchDown();
      } else {
        console.warn('[MapTimelineStore] mapPitchDown called but map zoom control is null');
      }
    },
    mapBearingLeft: () => {
      const getter = useMapTimelineStore.getState().mapZoomGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] mapBearingLeft called, control available');
        control.bearingLeft();
      } else {
        console.warn('[MapTimelineStore] mapBearingLeft called but map zoom control is null');
      }
    },
    mapBearingRight: () => {
      const getter = useMapTimelineStore.getState().mapZoomGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] mapBearingRight called, control available');
        control.bearingRight();
      } else {
        console.warn('[MapTimelineStore] mapBearingRight called but map zoom control is null');
      }
    },
    mapPanUp: () => {
      const getter = useMapTimelineStore.getState().mapZoomGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] mapPanUp called, control available');
        control.panUp();
      } else {
        console.warn('[MapTimelineStore] mapPanUp called but map zoom control is null');
      }
    },
    mapPanDown: () => {
      const getter = useMapTimelineStore.getState().mapZoomGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] mapPanDown called, control available');
        control.panDown();
      } else {
        console.warn('[MapTimelineStore] mapPanDown called but map zoom control is null');
      }
    },
    mapPanLeft: () => {
      const getter = useMapTimelineStore.getState().mapZoomGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] mapPanLeft called, control available');
        control.panLeft();
      } else {
        console.warn('[MapTimelineStore] mapPanLeft called but map zoom control is null');
      }
    },
    mapPanRight: () => {
      const getter = useMapTimelineStore.getState().mapZoomGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] mapPanRight called, control available');
        control.panRight();
      } else {
        console.warn('[MapTimelineStore] mapPanRight called but map zoom control is null');
      }
    },

    openStreetView: (latitude, longitude, address, source) => {
      set((state) => {
        state.streetView = { isOpen: true, latitude, longitude, address, source };
      });
    },
    closeStreetView: () => {
      set((state) => {
        state.streetView.isOpen = false;
      });
    },
    setStreetViewPanoramaGetter: (getter) => set((state) => { state.streetViewPanoramaGetter = getter; }),
    streetViewMoveForward: () => {
      const getter = useMapTimelineStore.getState().streetViewPanoramaGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] streetViewMoveForward called, control available');
        control.moveForward();
      } else {
        console.warn('[MapTimelineStore] streetViewMoveForward called but panorama control is null');
      }
    },
    streetViewMoveBackward: () => {
      const getter = useMapTimelineStore.getState().streetViewPanoramaGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] streetViewMoveBackward called, control available');
        control.moveBackward();
      } else {
        console.warn('[MapTimelineStore] streetViewMoveBackward called but panorama control is null');
      }
    },
    streetViewMoveLeft: () => {
      const getter = useMapTimelineStore.getState().streetViewPanoramaGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] streetViewMoveLeft called, control available');
        control.moveLeft();
      } else {
        console.warn('[MapTimelineStore] streetViewMoveLeft called but panorama control is null');
      }
    },
    streetViewMoveRight: () => {
      const getter = useMapTimelineStore.getState().streetViewPanoramaGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] streetViewMoveRight called, control available');
        control.moveRight();
      } else {
        console.warn('[MapTimelineStore] streetViewMoveRight called but panorama control is null');
      }
    },
    streetViewRotate: (degrees: number) => {
      const getter = useMapTimelineStore.getState().streetViewPanoramaGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] streetViewRotate called, degrees:', degrees);
        control.rotate(degrees);
      } else {
        console.warn('[MapTimelineStore] streetViewRotate called but panorama control is null');
      }
    },
    streetViewPitch: (degrees: number) => {
      const getter = useMapTimelineStore.getState().streetViewPanoramaGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] streetViewPitch called, degrees:', degrees);
        control.pitch(degrees);
      } else {
        console.warn('[MapTimelineStore] streetViewPitch called but panorama control is null');
      }
    },
    streetViewZoom: (direction: 'in' | 'out' | 'reset') => {
      const getter = useMapTimelineStore.getState().streetViewPanoramaGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] streetViewZoom called, direction:', direction);
        control.zoom(direction);
      } else {
        console.warn('[MapTimelineStore] streetViewZoom called but panorama control is null');
      }
    },

    setLightboxVideoGetter: (getter) => set((state) => { state.lightboxVideoGetter = getter; }),
    videoPlay: () => {
      const getter = useMapTimelineStore.getState().lightboxVideoGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] videoPlay called');
        control.play();
      } else {
        console.warn('[MapTimelineStore] videoPlay called but video control is null');
      }
    },
    videoPause: () => {
      const getter = useMapTimelineStore.getState().lightboxVideoGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] videoPause called');
        control.pause();
      } else {
        console.warn('[MapTimelineStore] videoPause called but video control is null');
      }
    },
    videoToggle: () => {
      const getter = useMapTimelineStore.getState().lightboxVideoGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] videoToggle called');
        control.toggle();
      } else {
        console.warn('[MapTimelineStore] videoToggle called but video control is null');
      }
    },
    videoSeek: (seconds: number) => {
      const getter = useMapTimelineStore.getState().lightboxVideoGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] videoSeek called, seconds:', seconds);
        control.seek(seconds);
      } else {
        console.warn('[MapTimelineStore] videoSeek called but video control is null');
      }
    },
    videoFullscreen: () => {
      const getter = useMapTimelineStore.getState().lightboxVideoGetter;
      const control = getter?.();
      if (control) {
        console.log('[MapTimelineStore] videoFullscreen called');
        control.toggleFullscreen();
      } else {
        console.warn('[MapTimelineStore] videoFullscreen called but video control is null');
      }
    },

    setSearchMarker: (latitude, longitude, address) => {
      set((state) => {
        state.searchMarker = { latitude, longitude, address };
      });
    },
    clearSearchMarker: () => {
      set((state) => {
        state.searchMarker = { latitude: null, longitude: null, address: undefined };
      });
    },

    setViewport: (viewport) => set((state) => { state.viewport = viewport; }),

    resetTimeline: () => set(() => getInitialState()),

    /**
     * Reset playback state in a single batch operation
     * This prevents multiple re-renders when resetting playback
     */
    resetPlaybackState: () => set((state) => {
      state.currentIndex = 0;
      state.revealedCount = 0;
      state.selectedLocationId = null;
      state.flyingToLocationId = null;  // NEW: Also reset flyingToLocationId
      state.isPlaying = false;
    })
  }))
);
