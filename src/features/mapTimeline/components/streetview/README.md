# Google Street View Integration

Interactive Google Street View integration for CCTV location popups.

## Overview

This feature provides investigators with immediate visual context of CCTV locations through an interactive Street View interface. The implementation follows a three-level engagement model:

1. **Thumbnail** (350x200px) - Interactive panorama in popup
2. **Modal** (80% viewport) - Expanded view on double-click
3. **Fullscreen** - Immersive full-viewport experience

## Components

### StreetViewThumbnail

Small, interactive Street View panorama embedded in the location popup.

**Props:**
```typescript
interface StreetViewThumbnailProps {
  latitude: number;
  longitude: number;
  onDoubleClick: () => void;
}
```

**Features:**
- Fully interactive pan/rotate/zoom
- Loading state with spinner
- Error state with friendly message
- Double-click hint (auto-shows after 1s, auto-hides after 3s)
- Optimized for small viewport (no zoom control, scroll wheel disabled)

**Usage:**
```tsx
<StreetViewThumbnail
  latitude={location.latitude}
  longitude={location.longitude}
  onDoubleClick={() => setModalOpen(true)}
/>
```

### StreetViewModal

Large modal view with fullscreen capability.

**Props:**
```typescript
interface StreetViewModalProps {
  latitude: number;
  longitude: number;
  address?: string;
  onClose: () => void;
}
```

**Features:**
- Portal rendering (works in fullscreen map mode)
- Browser Fullscreen API integration
- Header with address/coordinates (hidden in fullscreen)
- Fullscreen toggle button
- ESC key to close (when not fullscreen)
- Click backdrop to close
- Loading and error states

**Usage:**
```tsx
{modalOpen && (
  <StreetViewModal
    latitude={location.latitude}
    longitude={location.longitude}
    address={location.address}
    onClose={() => setModalOpen(false)}
  />
)}
```

## Services

### googleMapsLoader.ts

Singleton loader for the Google Maps JavaScript API using the new functional API.

**Functions:**
```typescript
loadGoogleMaps(): Promise<typeof google>
isGoogleMapsLoaded(): boolean
resetGoogleMapsLoader(): void
```

**Features:**
- Singleton pattern (loads API once)
- API key validation
- Error handling with retry support
- Uses modern `importLibrary` API

### streetViewService.ts

Street View availability checking with caching and retry logic.

**Functions:**
```typescript
checkStreetViewAvailability(lat, lng, radius?, retries?): Promise<StreetViewCheckResult>
checkStreetViewWithFallback(lat, lng): Promise<StreetViewCheckResult>
getCachedStreetViewAvailability(lat, lng): Promise<StreetViewCheckResult>
clearStreetViewCache(): void
```

**Features:**
- Availability checking with configurable radius
- Automatic retry with exponential backoff
- Fallback search with increasing radii (50m → 100m → 200m)
- 1-hour caching to minimize API calls
- Detailed error reporting

## Hooks

### useFullscreen.ts

Reusable hook for Fullscreen API with cross-browser support.

**Returns:**
```typescript
interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
}
```

**Helper:**
```typescript
isFullscreenSupported(): boolean
```

**Features:**
- Cross-browser event handling (Chrome, Firefox, Safari, IE11)
- State tracking
- Error handling
- Browser capability detection

## Configuration

### Environment Variables

Required in `.env` file:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Getting an API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Maps JavaScript API"
4. Create credentials (API key)
5. Restrict the key:
   - **Application restrictions**: HTTP referrers
   - **API restrictions**: Maps JavaScript API
6. Add to `.env` file

### Map Config

Street View settings in `constants/mapConfig.ts`:

```typescript
export const GOOGLE_MAPS_CONFIG = {
  defaultSearchRadius: 50,
  fallbackRadii: [50, 100, 200],

  thumbnail: {
    zoom: 0,
    pov: { heading: 0, pitch: 0 },
    addressControl: false,
    zoomControl: false,
    scrollwheel: false,
    // ... more settings
  },

  modal: {
    zoom: 1,
    pov: { heading: 0, pitch: 0 },
    addressControl: true,
    zoomControl: true,
    // ... more settings
  }
}
```

## Integration

### LocationPopup Integration

The Street View tab is automatically added when:
1. Location has valid lat/lng coordinates
2. Street View is available at that location
3. Availability check succeeds

```typescript
// Auto-check availability
useEffect(() => {
  getCachedStreetViewAvailability(location.latitude, location.longitude)
    .then(result => setStreetViewAvailable(result.available))
    .catch(() => setStreetViewAvailable(false));
}, [location.latitude, location.longitude]);

// Show tab if available
{hasStreetView && (
  <button onClick={() => setActiveTab('streetview')}>
    Street View
  </button>
)}
```

### Tab Auto-Selection Logic

Priority order when popup opens:
1. If no media: Select Street View (if available)
2. If has images: Select Images
3. If has videos: Select Videos

## Performance

### Bundle Impact

- `@googlemaps/js-api-loader`: ~5KB gzipped
- Google Maps SDK: ~120KB gzipped (cached by Google CDN)
- Feature components/services: ~8KB gzipped
- **Total Added to Bundle**: ~13KB (Google SDK cached separately)

### Optimization Strategies

1. **Lazy Loading**: Street View only loads when tab is active
2. **Caching**: Availability checks cached for 1 hour
3. **Singleton Loader**: API loaded once across app
4. **Debouncing**: Availability checks debounced if needed
5. **Optimized Settings**: Lower quality in thumbnail, higher in modal

### API Costs

Google Maps Platform pricing (2025):
- **Street View Panorama (Dynamic)**: $7.00 per 1,000 loads
- **Monthly Free Tier**: $200 credit (~28,500 Street View loads)
- **Realistic Usage**: Law enforcement use case typically well within free tier

## Error Handling

### Common Errors

**API Key Missing/Invalid:**
```
Error: Google Maps API key not configured
```
**Solution**: Add valid API key to `.env`

**Street View Not Available:**
```
Error: Street View not available at this location
```
**Solution**: Automatic - shows friendly message in UI

**Quota Exceeded (rare):**
```
Error: Failed to load Google Maps API: [quota details]
```
**Solution**: Wait for quota refresh or upgrade plan

### Graceful Degradation

- Tab hidden if Street View unavailable
- Error messages user-friendly
- App continues to function without Street View
- No impact on other features if Google Maps fails

## Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Edge**: Full support
- **Safari**: Full support (with vendor prefixes)
- **IE11**: Basic support (fullscreen may not work)

## Testing

### Manual Testing Checklist

- [ ] Street View tab appears when available
- [ ] Thumbnail loads and is interactive
- [ ] Pan/rotate/zoom work in thumbnail
- [ ] Double-click opens modal
- [ ] Modal Street View is larger and interactive
- [ ] Fullscreen button works
- [ ] Exit fullscreen works (button and ESC)
- [ ] ESC closes modal (when not fullscreen)
- [ ] Close button works in all states
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Works with locations that have no Street View
- [ ] Works on different screen sizes
- [ ] Keyboard navigation works
- [ ] No memory leaks (check dev tools)

### Test Locations

**Has Street View:**
- Toronto: 43.6532, -79.3832
- London: 51.5074, -0.1278
- New York: 40.7128, -74.0060

**No Street View:**
- Middle of ocean: 0.0, 0.0
- Antarctica: -77.8463, 166.6683

## Future Enhancements

### Potential Features

1. **Historical Street View**: Time travel to view past panoramas
2. **Snapshot Export**: Capture current view as image for case files
3. **Measurement Tools**: Measure distances in Street View
4. **Annotations**: Add markers/notes to Street View
5. **Custom POV Presets**: Save preferred viewing angles
6. **Camera FOV Overlay**: Show CCTV camera field of view on Street View
7. **Offline Caching**: Pre-download tiles for offline use

## Troubleshooting

### Street View Not Loading

1. Check API key in `.env`
2. Verify API key has Maps JavaScript API enabled
3. Check browser console for errors
4. Verify internet connection
5. Try a known-working location (e.g., Toronto)

### Performance Issues

1. Check if many availability checks are running
2. Clear cache: `clearStreetViewCache()`
3. Reduce search radius in config
4. Check browser dev tools for memory leaks

### Fullscreen Not Working

1. Verify browser supports Fullscreen API
2. Check if user gesture triggered (can't auto-fullscreen)
3. Try different browser
4. Check for conflicting browser extensions

## License

This feature uses the Google Maps Platform, which requires compliance with Google's Terms of Service.

## Support

For issues specific to this feature, check:
- Google Maps Platform [Status Dashboard](https://status.cloud.google.com/)
- Google Maps Platform [Documentation](https://developers.google.com/maps/documentation/javascript/streetview)
- Feature implementation: `/src/features/mapTimeline/components/streetview/`

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0
**Author**: Claude Code
