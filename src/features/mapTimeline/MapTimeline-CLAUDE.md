# MapTimeline-CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Map Timeline feature.

## Feature Overview

Interactive map visualization with progressive timeline playback for CCTV locations. Shows markers on Mapbox map, allows stepping through events chronologically, and includes Street View integration via Pegman drag-and-drop.

## Commands

```bash
# Run feature tests
npm test mapTimeline
npm test useMapTimeline
npm test useTimelinePlayback

# Type check
npm run type-check
```

## Architecture

### Data Flow

```
useLocationStore (CCTVLocation[])
       ↓
useMapTimeline hook
  ├── sortLocationsByTime()
  ├── applyLocationFilters()
  ├── transformLocationsToEvents() → TimelineEvent[]
  └── transformToMarkerData() → MarkerData[]
       ↓
MapTimelineView
  ├── MapContainer (Mapbox map + markers)
  ├── TimelinePanel (draggable event list)
  ├── MediaLightbox (fullscreen media viewer)
  └── HelpPanel (F12 overlay)
```

### Component Hierarchy

```
MapTimelineView.tsx              # Main orchestrator
├── MapContainer.tsx             # Mapbox map wrapper
│   ├── TimelineMarker.tsx       # Location markers (camera icons)
│   ├── LocationPopup.tsx        # Popup with media tabs + Street View
│   ├── PegmanControl.tsx        # Draggable Street View launcher
│   └── HamburgerMenuControl.tsx # Map menu (search, help, POV edit)
├── TimelinePanel.tsx            # Draggable sidebar (react-rnd)
│   ├── TimelineHeader.tsx       # Case name, date range
│   ├── PlaybackControls.tsx     # Play/pause/step buttons
│   ├── TimelineFilters.tsx      # Date/phase/location filters
│   └── TimelineEventCard.tsx    # Individual event cards
├── MediaLightbox.tsx            # yet-another-react-lightbox
└── StreetViewModal.tsx          # Google Street View (80% viewport)
```

### State Management

**Zustand Store** (`stores/mapTimelineStore.ts`):

| State | Purpose |
|-------|---------|
| `currentIndex` | Current event position in timeline |
| `revealedCount` | Number of markers visible (progressive reveal) |
| `isPlaying` | Auto-playback active |
| `selectedLocationId` | UUID of selected location (shows popup) |
| `filters` | Active filter criteria |
| `lightbox` | Lightbox open state + slides |
| `streetView` | Street View modal state |
| `viewport` | Map center + zoom |

**Keyboard Manager** (`stores/keyboardManager.ts`):

Priority-based event gating prevents shortcut conflicts between overlays.

```typescript
// Priority (1 = highest): help-panel > lightbox > street-view > popup > filters > timeline > playback

// Usage pattern:
const { setActiveContext, removeContext, isActiveContext } = useKeyboardManager();

useEffect(() => {
  if (isOpen) {
    setActiveContext('lightbox');
    return () => removeContext('lightbox');
  }
}, [isOpen]);

// In event handler:
if (!isActiveContext('lightbox')) return;  // Gate - don't process if not active
```

## Key Types

```typescript
interface TimelineEvent {
  location: CCTVLocation;      // Original data
  displayTime: string;         // "HH:mm:ss"
  displayDate: string;         // "MMM dd, yyyy"
  isRevealed: boolean;         // Visible on map?
  isActive: boolean;           // Currently selected?
  hasImages: boolean;
  hasVideos: boolean;
}

interface MarkerData {
  locationId: string;          // UUID
  coordinates: [number, number]; // [lng, lat]
  timing: 'pre' | 'incident' | 'post';
  isRevealed: boolean;
  isActive: boolean;
}

interface TimelineFilters {
  dateFrom: string;            // ISO 8601 or empty
  dateTo: string;
  phase: 'all' | 'pre' | 'incident' | 'post';
  location: string;            // 'all' or exact address
}
```

## Progressive Reveal System

Markers appear one at a time as user steps through timeline:

```typescript
// revealedCount controls which markers are visible
// Events [0..revealedCount-1] show markers, rest are hidden

// Step forward: reveal next marker
stepForward();
revealUpTo(currentIndex + 1);

// Step backward: HIDE markers (go back in time)
stepBackward();
revealUpTo(currentIndex - 1);  // This hides the previous marker
```

## Configuration

`constants/mapConfig.ts`:

```typescript
MAP_CONFIG = {
  defaultCenter: { lng: -79.7624, lat: 43.7315 },  // Brampton, ON
  defaultZoom: 13,
  flyToDuration: 3000,
  flyToZoom: 16,
  markerColors: {
    pre: '#22c55e',      // Green
    incident: '#ef4444', // Red
    post: '#3b82f6'      // Blue
  },
  playbackSpeeds: { slow: 3000, normal: 2000, fast: 1000 }
}

GOOGLE_MAPS_CONFIG = {
  defaultSearchRadius: 50,
  fallbackRadii: [50, 100, 200],  // Progressive search for Street View
  // ... panorama options for thumbnail vs modal
}
```

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useMapTimeline` | Transform locations → events/markers with filtering |
| `useMapControls` | Map interactions: flyTo, marker click handlers |
| `useTimelinePlayback` | Auto-advance timer for playback mode |
| `useTimelineKeyboardNavigation` | Arrow key navigation for timeline |
| `useKeyboardContext` | Register/check keyboard context priority |
| `usePegmanDrag` | Pegman drag state and map coordinate conversion |
| `useHighlightLayer` | Blue circle highlight during Pegman drag |
| `useStreetViewPanorama` | Initialize Google Street View panorama |
| `useVideoPreloader` | Preload videos when marker selected (viewer mode) |

## Media Loading

**Editor Mode**:
- Images: `invoke('read_file_as_base64')` → data URL
- Videos: `convertFileSrc(absolutePath)` → asset:// protocol (streaming)

**Viewer Mode**:
- Both: HTTP streaming from local server → blob URLs

## Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `↑/↓` | Timeline | Navigate events |
| `Space` | Playback | Play/pause |
| `Escape` | Global | Stop playback / close overlays |
| `J/L` | Lightbox | Frame step backward/forward (video) |
| `F12` | Global | Toggle help panel |

## Common Development Tasks

### Add a new filter type

1. Update `TimelineFilters` in `types/filters.ts`
2. Add UI control in `TimelineFilters.tsx`
3. Add logic in `applyLocationFilters()` in `filterHelpers.ts`

### Change marker appearance

1. Edit `TimelineMarker.tsx` for visual changes
2. Update `MAP_CONFIG.markerColors` for colors
3. Modify `transformToMarkerData()` if data shape changes

### Add new popup tab

1. Add tab type to `activeTab` state in `LocationPopup.tsx`
2. Add tab button and content section
3. Update tab visibility logic

### Add new keyboard shortcut

1. Add key to `constants/hotkeys.ts`
2. Choose appropriate keyboard context
3. Add handler that checks `isActiveContext()` before processing

## Testing Notes

- Mock `useLocationStore` and `useCaseStore` for unit tests
- Use `@testing-library/react` for component tests
- Test progressive reveal edge cases (start, end, empty list)
- Test filter combinations (date + phase + location)

## Important Patterns

### Viewer Mode Awareness

The feature works in both editor and viewer modes:

```typescript
const { mode, exportData } = useAppMode();
const isViewerMode = mode === 'viewer';

const casePath = isViewerMode ? '' : currentCase?.case_path || '';
```

### Fullscreen Container

All overlays render inside `#map-timeline-fullscreen-container` to stay visible during fullscreen:

```tsx
<div id={DOM_IDS.FULLSCREEN_CONTAINER} className="flex-1 relative">
  <MapContainer />
  <TimelinePanel />
  <MediaLightbox />  {/* Portal inside container */}
</div>
```

### Filter Reset Behavior

When filters change:
1. Reset `currentIndex` to 0
2. Reset `revealedCount` to 0 (hide all markers)
3. Clear `selectedLocationId`
4. Pause playback

Use `resetPlaybackState()` for batch updates.

## Environment Variables

```bash
VITE_MAPBOX_API_KEY=pk.your_mapbox_token
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## File Index

| File | Purpose |
|------|---------|
| `components/MapTimelineView.tsx` | Main orchestrator |
| `stores/mapTimelineStore.ts` | Zustand store |
| `stores/keyboardManager.ts` | Keyboard priority system |
| `hooks/useMapTimeline.ts` | Data transformation |
| `hooks/useMapControls.ts` | Map interactions |
| `hooks/useTimelinePlayback.ts` | Auto-playback |
| `utils/timelineHelpers.ts` | Event/marker transforms |
| `utils/filterHelpers.ts` | Filter application |
| `constants/mapConfig.ts` | Map + Street View config |
| `types/index.ts` | Type definitions |
