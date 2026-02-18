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

/**
 * Resolve the control object from a getter stored in state.
 * Used by proxy actions to avoid repeating the getter lookup pattern.
 *
 * @param getterKey - The state key holding the getter function
 * @returns The control object, or undefined if getter is null or returns null
 */
function getControl<T>(getterKey: keyof MapTimelineState): T | undefined {
  const getter = useMapTimelineStore.getState()[getterKey] as (() => T | null) | null;
  return getter?.() ?? undefined;
}

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
      state.selectedLocationId = id;
    }),

    setFlyingToLocationId: (id) => set((state) => {
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

    // Lightbox zoom proxy actions
    lightboxZoomIn: () => { getControl<LightboxZoomRef>('lightboxZoomGetter')?.zoomIn(); },
    lightboxZoomOut: () => { getControl<LightboxZoomRef>('lightboxZoomGetter')?.zoomOut(); },

    setMapZoomGetter: (getter) => set((state) => { state.mapZoomGetter = getter; }),

    // Map control proxy actions
    mapZoomIn: (lat, lng) => { getControl<MapZoomControl>('mapZoomGetter')?.zoomIn(lat, lng); },
    mapZoomOut: (lat, lng) => { getControl<MapZoomControl>('mapZoomGetter')?.zoomOut(lat, lng); },
    mapPitchUp: () => { getControl<MapZoomControl>('mapZoomGetter')?.pitchUp(); },
    mapPitchDown: () => { getControl<MapZoomControl>('mapZoomGetter')?.pitchDown(); },
    mapBearingLeft: () => { getControl<MapZoomControl>('mapZoomGetter')?.bearingLeft(); },
    mapBearingRight: () => { getControl<MapZoomControl>('mapZoomGetter')?.bearingRight(); },
    mapPanUp: () => { getControl<MapZoomControl>('mapZoomGetter')?.panUp(); },
    mapPanDown: () => { getControl<MapZoomControl>('mapZoomGetter')?.panDown(); },
    mapPanLeft: () => { getControl<MapZoomControl>('mapZoomGetter')?.panLeft(); },
    mapPanRight: () => { getControl<MapZoomControl>('mapZoomGetter')?.panRight(); },

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

    // Street View panorama proxy actions
    streetViewMoveForward: () => { getControl<StreetViewPanoramaControl>('streetViewPanoramaGetter')?.moveForward(); },
    streetViewMoveBackward: () => { getControl<StreetViewPanoramaControl>('streetViewPanoramaGetter')?.moveBackward(); },
    streetViewMoveLeft: () => { getControl<StreetViewPanoramaControl>('streetViewPanoramaGetter')?.moveLeft(); },
    streetViewMoveRight: () => { getControl<StreetViewPanoramaControl>('streetViewPanoramaGetter')?.moveRight(); },
    streetViewRotate: (degrees: number) => { getControl<StreetViewPanoramaControl>('streetViewPanoramaGetter')?.rotate(degrees); },
    streetViewPitch: (degrees: number) => { getControl<StreetViewPanoramaControl>('streetViewPanoramaGetter')?.pitch(degrees); },
    streetViewZoom: (direction: 'in' | 'out' | 'reset') => { getControl<StreetViewPanoramaControl>('streetViewPanoramaGetter')?.zoom(direction); },

    setLightboxVideoGetter: (getter) => set((state) => { state.lightboxVideoGetter = getter; }),

    // Lightbox video proxy actions
    videoPlay: () => { getControl<LightboxVideoControl>('lightboxVideoGetter')?.play(); },
    videoPause: () => { getControl<LightboxVideoControl>('lightboxVideoGetter')?.pause(); },
    videoToggle: () => { getControl<LightboxVideoControl>('lightboxVideoGetter')?.toggle(); },
    videoSeek: (seconds: number) => { getControl<LightboxVideoControl>('lightboxVideoGetter')?.seek(seconds); },
    videoFullscreen: () => { getControl<LightboxVideoControl>('lightboxVideoGetter')?.toggleFullscreen(); },

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
