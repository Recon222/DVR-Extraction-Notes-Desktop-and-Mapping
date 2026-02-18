export const MAP_CONFIG = {
  defaultCenter: { lng: -79.7624, lat: 43.7315 }, // Brampton, ON (from reference images)
  defaultZoom: 13,
  maxZoom: 22,  // Mapbox supports up to 22 - needed for saved POVs at high zoom
  minZoom: 8,
  flyToDuration: 3000,
  flyToZoom: 16, // Zoom level when flying to a location
  popupOffset: 0.0015, // Latitude offset (south) to ensure popup visibility above marker
  panelMaxHeightOffset: 100, // Offset from window height for panel max height
  markerColors: {
    pre: '#22c55e',      // Green
    incident: '#ef4444', // Red
    post: '#3b82f6'      // Blue
  },
  panelWidth: 420,
  panelMargin: 20, // Margin from right edge
  playbackSpeeds: {
    slow: 3000,
    normal: 2000,
    fast: 1000
  },
  // Responsive popup configuration
  popup: {
    sizing: {
      // Width: clamp(min, preferred, max)
      widthMin: '22rem',       // 352px - minimum for small displays (was min-w-[350px])
      widthPreferred: '28vw',  // 28% of viewport - scales with window
      widthMax: '25rem',       // 400px - maximum (original hardcoded maxWidth)

      // Media height: clamp(min, preferred, max)
      mediaHeightMin: '12rem',     // 192px - minimum height (original h-48)
      mediaHeightPreferred: '25vh', // 25% of viewport height - scales
      mediaHeightMax: '12rem'      // 192px - maximum (original h-48)
    },
    container: {
      // Container query breakpoints
      small: '20rem',   // 320px
      medium: '28rem',  // 448px
      large: '32rem'    // 512px
    }
  },
  // Responsive timeline panel configuration
  timeline: {
    sizing: {
      // Panel width: clamp(min, preferred, max)
      widthMin: '320px',    // Minimum panel width
      widthPreferred: '25vw', // 25% of viewport
      widthMax: '450px'     // Maximum panel width
    }
  }
} as const;

/**
 * Validate and clamp zoom level to configured bounds
 *
 * @param zoom - Desired zoom level
 * @returns Validated zoom level within [minZoom, maxZoom] range
 *
 * @example
 * validateZoomLevel(20) // Returns 18 (clamped to maxZoom)
 * validateZoomLevel(5)  // Returns 8 (clamped to minZoom)
 * validateZoomLevel(15) // Returns 15 (within bounds)
 */
export const validateZoomLevel = (zoom: number): number => {
  const { minZoom, maxZoom } = MAP_CONFIG;

  if (!Number.isFinite(zoom)) {
    console.warn(`Invalid zoom level: ${zoom}, using defaultZoom`);
    return MAP_CONFIG.defaultZoom;
  }

  return Math.max(minZoom, Math.min(maxZoom, zoom));
};

/**
 * Calculate the default panel position - must be called at runtime
 * Position panel on right side: window width - panel width - margin
 */
export const getDefaultPanelPosition = () => ({
  x: typeof window !== 'undefined' ? window.innerWidth - MAP_CONFIG.panelWidth - MAP_CONFIG.panelMargin : 20,
  y: 80
});

/**
 * Google Maps / Street View Configuration
 */
export const GOOGLE_MAPS_CONFIG = {
  // Street View search radius in meters
  defaultSearchRadius: 50,
  fallbackRadii: [50, 100, 200],

  // Thumbnail panorama options
  thumbnail: {
    zoom: 0,
    pov: { heading: 0, pitch: 0 },
    addressControl: false,
    fullscreenControl: false,
    enableCloseButton: false,
    linksControl: true,
    panControl: true,
    zoomControl: false,
    motionTracking: false,
    motionTrackingControl: false,
    clickToGo: true,
    scrollwheel: false // Prevent scroll hijacking in popup
  },

  // Modal panorama options
  modal: {
    zoom: 1,
    pov: { heading: 0, pitch: 0 },
    addressControl: true,
    fullscreenControl: false, // We use custom fullscreen button
    enableCloseButton: false,
    linksControl: true,
    panControl: true,
    zoomControl: true,
    motionTracking: false,
    motionTrackingControl: false,
    clickToGo: true
  }
} as const;
