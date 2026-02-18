# mapTimeline Feature — Comprehensive Compatibility Review

**Reviewed**: 2026-02-17
**Reviewer**: Claude Opus 4.6 (Automated Architecture Review)
**Feature**: `src/features/mapTimeline/`
**Template Target**: Tauri v2 React Template (AGENTS.md patterns)

---

## TL;DR Executive Summary

The mapTimeline feature is a large, well-structured feature (~60 files) ported from a Tauri v1.5 application. It has **3 CRITICAL issues**, **6 HIGH issues**, and **11 MEDIUM issues** that need attention before it is fully integrated.

**Verdict: BLOCK** — Must resolve CRITICAL and HIGH issues before merging.

### Top 3 Blockers

1. **Tauri v1 API Imports** (CRITICAL) — Three files use `@tauri-apps/api/tauri` which is v1 syntax. In Tauri v2, `invoke` moved to `@tauri-apps/api/core` and `convertFileSrc` moved to `@tauri-apps/api`.
2. **Zustand Destructuring Throughout** (CRITICAL) — 15+ locations use `const { x, y } = useMapTimelineStore()` instead of selector syntax, causing render cascades across the entire feature.
3. **Missing npm Dependencies** (CRITICAL) — At least 7 npm packages required by this feature are not listed in `package.json`.

### What Works Well

- Clean feature-based directory structure with proper separation of concerns
- Well-documented `MapTimeline-CLAUDE.md` with comprehensive architecture notes
- Solid keyboard management system with priority-based context gating
- Good test coverage for core logic (store, helpers, hooks, integration)
- Progressive reveal system is well-designed and tested
- Service layer pattern for Google Maps and Street View is clean
- Proper cleanup of side effects (blob URLs, event listeners, timers, video elements)

---

## 1. Tauri v1.5 to v2 Compatibility

### [CRITICAL] Tauri v1 API Imports

Three source files import from `@tauri-apps/api/tauri`, which is the **Tauri v1.x** module path. In Tauri v2, these APIs have been reorganized.

| File | Line | v1 Import | v2 Equivalent |
|------|------|-----------|---------------|
| `components/media/MediaThumbnail.tsx` | 2-3 | `import { convertFileSrc } from '@tauri-apps/api/tauri'` and `import { invoke } from '@tauri-apps/api/tauri'` | `import { convertFileSrc } from '@tauri-apps/api'` and `import { invoke } from '@tauri-apps/api/core'` |
| `components/media/MediaLightbox.tsx` | 5 | `import { convertFileSrc, invoke } from '@tauri-apps/api/tauri'` | Same split as above |
| `hooks/useVideoPreloader.ts` | 21 | `import { invoke } from '@tauri-apps/api/tauri'` | `import { invoke } from '@tauri-apps/api/core'` |

**Fix**: Update all imports. `invoke` comes from `@tauri-apps/api/core`, and `convertFileSrc` comes from `@tauri-apps/api` in Tauri v2.

### [CRITICAL] Raw invoke() Instead of Typed Commands

Per the template's architecture (AGENTS.md), all Tauri IPC calls must use typed `commands.*` from `@/lib/tauri-bindings` (tauri-specta), never raw string-based `invoke()`. The feature uses raw `invoke()` in 3 files with 7 call sites:

| File | Line | Raw invoke Call |
|------|------|-----------------|
| `components/media/MediaLightbox.tsx` | 305 | `invoke<string>('get_streaming_media_url', {...})` |
| `components/media/MediaLightbox.tsx` | 323 | `invoke<number[]>('resolve_media_path', {...})` |
| `components/media/MediaLightbox.tsx` | 366 | `invoke<string>('read_file_as_base64', { filePath: slide.src })` |
| `components/media/MediaThumbnail.tsx` | 64 | `invoke<string>('get_streaming_media_url', {...})` |
| `components/media/MediaThumbnail.tsx` | 82 | `invoke<number[]>('resolve_media_path', {...})` |
| `components/media/MediaThumbnail.tsx` | 139 | `invoke<string>('read_file_as_base64', { filePath: src })` |
| `hooks/useVideoPreloader.ts` | 64 | `invoke<string>('get_streaming_media_url', {...})` |

**Fix**: These invoke calls should go through the service layer pattern:
1. Create a `services/mediaService.ts` with plain async functions wrapping `commands.*` from tauri-specta
2. Components should call the service functions, not invoke directly
3. This also fixes the architecture violation of components calling IPC directly (skipping the service layer)

### [INFO] No Other Tauri v1 APIs Detected

No usage of v1-specific patterns like `@tauri-apps/api/window`, `@tauri-apps/api/event`, `@tauri-apps/api/path`, or `appWindow` was found. The feature is otherwise pure frontend with the exception of the media loading code.

---

## 2. Template Architecture Compliance

### [CRITICAL] Zustand Destructuring (Render Cascade Risk)

The template **strictly prohibits** Zustand store destructuring (`const { x } = useStore()`) because it causes every component to re-render on ANY store change. The project uses ast-grep to enforce this rule. **15+ locations** violate this pattern in production code:

| File | Line | Violation |
|------|------|-----------|
| `hooks/useMapTimeline.ts` | 21 | `const { revealedCount, selectedLocationId, currentIndex } = useMapTimelineStore()` |
| `hooks/useTimelineKeyboardNavigation.ts` | 33 | `const { currentIndex, isPlaying, pausePlayback } = useMapTimelineStore()` |
| `hooks/useMapControls.ts` | 10 | `const { selectLocation, revealUpTo, setCurrentIndex, setFlyingToLocationId } = useMapTimelineStore()` |
| `hooks/useTimelinePlayback.ts` | 11 | `const { isPlaying, currentIndex, pausePlayback, stepForward, revealUpTo } = useMapTimelineStore()` |
| `components/MapTimelineView.tsx` | 50 | `const { filters, filtersOpen, lightbox, streetView, setFilters, ... } = useMapTimelineStore()` |
| `components/map/MapContainer.tsx` | 23 | `const { viewport, setViewport, selectedLocationId, selectLocation, ... } = useMapTimelineStore()` |
| `components/map/LocationPopup.tsx` | 35 | `const { openLightbox, openStreetView, closeStreetView } = useMapTimelineStore()` |
| `components/pegman/PegmanControl.tsx` | 27 | `const { openStreetView, closeStreetView, streetView } = useMapTimelineStore()` |
| `components/media/MediaLightbox.tsx` | 109 | `const { lightbox, closeLightbox, setLightboxIndex, ... } = useMapTimelineStore()` |
| `components/media/MediaGrid.tsx` | 13 | `const { openLightbox } = useMapTimelineStore()` |
| `components/timeline/PlaybackControls.tsx` | 24-33 | `const { currentIndex, isPlaying, startPlayback, pausePlayback, ... } = useMapTimelineStore()` |
| `components/timeline/TimelinePanel.tsx` | 33 | `const { isPanelCollapsed, panelPosition, setPanelPosition, ... } = useMapTimelineStore()` |
| `components/timeline/TimelinePanel.tsx` | 34 | `const mapTimelineStore = useMapTimelineStore()` (subscribes to entire store) |

Only **2 locations** use the correct selector pattern:
- `hooks/useVideoPreloader.ts:28` — `useMapTimelineStore(state => state.flyingToLocationId)`
- `hooks/useVideoPreloader.ts:29` — `useMapTimelineStore(state => state.lightbox.isOpen)`

**Fix**: Convert all destructuring to selector syntax:
```typescript
// BEFORE (BAD)
const { currentIndex, isPlaying } = useMapTimelineStore();

// AFTER (GOOD) - state selectors
const currentIndex = useMapTimelineStore(state => state.currentIndex);
const isPlaying = useMapTimelineStore(state => state.isPlaying);

// AFTER (GOOD) - actions in event handlers
const handleClick = () => {
  const { selectLocation, revealUpTo } = useMapTimelineStore.getState();
  selectLocation(id);
};
```

### [HIGH] Direct IPC Calls in Components (Skipped Service Layer)

The template requires: Component -> Hook -> Service -> Command. Three files call Tauri `invoke()` directly, bypassing both the hook and service layers:

| File | Violation |
|------|-----------|
| `components/media/MediaLightbox.tsx` | Calls `invoke('read_file_as_base64')`, `invoke('resolve_media_path')`, `invoke('get_streaming_media_url')` directly |
| `components/media/MediaThumbnail.tsx` | Same invoke calls directly in component |
| `hooks/useVideoPreloader.ts` | Calls `invoke('get_streaming_media_url')` in a hook (should use service) |

**Fix**: Create `services/mediaService.ts` to wrap all media-related IPC calls, then call the service from hooks/components.

### [OK] Feature Directory Structure

The feature's directory structure largely follows the template pattern with reasonable extensions:

```
src/features/mapTimeline/
  components/    # UI components (well-organized into subdirectories)
  hooks/         # Custom hooks
  services/      # Google Maps loader, Street View service
  stores/        # Zustand stores (template convention: "store/" singular)
  types/         # Type definitions
  utils/         # Utility/helper functions (not in template spec, but reasonable)
  constants/     # Configuration constants (not in template spec, but reasonable)
  __tests__/     # Integration tests
  MapTimeline-CLAUDE.md
  index.ts       # Barrel export
```

**Minor deviation**: Template uses `store/` (singular), feature uses `stores/` (plural). Should be normalized.

### [OK] Barrel Export Pattern

The `index.ts` barrel export properly exposes the public API. Exports the main view component, store hook, types, and reusable sub-components. Does not expose internal implementation details.

---

## 3. Component Patterns

### [MEDIUM] No shadcn/ui Usage — Custom UI Throughout

The template uses shadcn/ui v4 for UI primitives. The mapTimeline feature uses entirely custom UI: custom modal/overlay patterns (HelpPanel, StreetViewModal), custom button styles (inline Tailwind classes), custom tab component (LocationPopup tabs), custom progress bar (PlaybackControls), and custom error boundary fallback UI.

**Impact**: Inconsistent look-and-feel with the rest of the application. Not a blocker since the map view is a specialized visualization, but new modals/dialogs should migrate to shadcn/ui components (Dialog, Button, Tabs, etc.).

### [MEDIUM] Manual useMemo/useCallback (React Compiler Handles This)

The template uses React Compiler which auto-memoizes. Manual `useMemo`/`useCallback` calls are unnecessary. Found in **20+ locations** across hooks and components.

Key files with heavy manual memoization:
- `hooks/useMapTimeline.ts` — 6 useMemo calls
- `components/pegman/usePegmanDrag.ts` — 10+ useCallback calls
- `components/pegman/useHighlightLayer.ts` — 4 useCallback calls
- `hooks/useFullscreen.ts` — 3 useCallback calls

**Fix**: These are not harmful (React Compiler handles them gracefully by skipping over them), but they add visual noise. Low priority cleanup.

### [MEDIUM] Hardcoded User-Facing Strings (No i18n)

The template requires all user-facing strings to use `useTranslation()` from react-i18next. Zero i18n usage was found. All strings are hardcoded in English:

- "No Case Loaded", "No Locations Found", "No events match the selected filters"
- "Images", "Videos", "Street View"
- "Map Failed to Load", "Loading map...", "Loading media viewer..."
- "Keyboard Shortcuts", "Global", "Timeline Navigation"
- Button labels: "Filter", "Try Again", "Reload Application"
- All HelpPanel shortcut descriptions (~30+ strings)
- Phase labels: "Pre Incident", "Post Incident", "Incident"

**Fix**: Extract all user-facing strings to `/locales/en.json` under a `mapTimeline` namespace and use `useTranslation()`.

### [MEDIUM] CSS Directional Properties Instead of Logical Properties

The template requires CSS logical properties for RTL support. Several directional properties were found:

| File | Line | Directional | Logical Equivalent |
|------|------|-------------|-------------------|
| `components/MapErrorBoundary.tsx` | 57 | `text-left` | `text-start` |
| `components/timeline/TimelineEventCard.tsx` | 19 | `text-left` | `text-start` |
| `components/media/MediaThumbnail.tsx` | 330 | `ml-1` | `ms-1` |
| `components/map/LocationPopup.tsx` | 361 | `pr-8` | `pe-8` |
| `components/map/LocationPopup.tsx` | 471 | `border-l-4`, `pl-3` | `border-s-4`, `ps-3` |
| `components/timeline/TimelineFilters.tsx` | 225 | `-ml-1`, `mr-2` | `-ms-1`, `me-2` |
| `components/map/menu/EditPOVToggleMenuItem.tsx` | 16 | `text-left` | `text-start` |
| `components/map/menu/MenuItem.tsx` | 31 | `text-left` | `text-start` |

### [OK] Accessibility Patterns

Good accessibility practices found:
- ARIA attributes on tabs (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`) in `LocationPopup.tsx`
- Progress bar has `role="progressbar"` with proper `aria-valuenow`/`aria-valuemin`/`aria-valuemax` in `PlaybackControls.tsx`
- Buttons have `aria-label` attributes throughout
- Timeline panel has `role="region"` with label
- Keyboard navigation is well-implemented with proper event gating

---

## 4. Store Review

### [HIGH] Store is Excessively Large (587 Lines, 43 State + 43 Actions)

File: `store/mapTimelineStore.ts`

The store defines 43 state fields and 43 action methods in a single file. This is a "god store" anti-pattern. Recommended split:

| Proposed Sub-Store | Responsibility |
|-------------------|----------------|
| `timelineStore` | currentIndex, revealedCount, isPlaying, selectedLocationId, flyingToLocationId, panel state, filters |
| `lightboxStore` | lightbox open/close/index, slides, zoom getter, video getter |
| `streetViewStore` | street view open/close, coordinates, panorama getter |
| `mapControlStore` | viewport, search marker, map zoom getter, pitch/bearing/pan |

### [HIGH] Massive Code Duplication in Store Actions

The store has approximately 20 nearly identical "getter proxy" actions (mapZoomIn, mapZoomOut, mapPitchUp, mapPitchDown, mapBearingLeft, mapBearingRight, mapPanUp, mapPanDown, mapPanLeft, mapPanRight, streetViewMoveForward, streetViewMoveBackward, etc.) that all follow the exact same pattern:

```typescript
someAction: () => {
  const getter = useMapTimelineStore.getState().someGetter;
  const control = getter?.();
  if (control) {
    console.log('[MapTimelineStore] someAction called, control available');
    control.someMethod();
  } else {
    console.warn('[MapTimelineStore] someAction called but control is null');
  }
}
```

This accounts for roughly 200+ lines of duplicated code. A generic helper function could eliminate most of it.

### [MEDIUM] Excessive Console Logging in Store

The store has `console.log` and `console.warn` calls in nearly every action method (30+ log statements). These should be removed for production or gated behind `import.meta.env.DEV`.

### [OK] Zustand v5 Compatibility

The store uses `create` from `zustand` and `immer` from `zustand/middleware/immer`, both compatible with Zustand v5.x. The `keyboardManager.ts` store also uses the correct Zustand v5 `create` pattern.

### [OK] Immer Middleware Usage

Good use of Immer for immutable state updates, which simplifies deeply nested state mutations in the `resetPlaybackState` batch action and other multi-field updates.

---

## 5. Hooks Review

### [OK] Hook Composition and Single Responsibility

Hooks are well-composed and follow single-responsibility:

| Hook | Responsibility |
|------|---------------|
| `useMapTimeline` | Data transformation (sort, filter, transform) |
| `useMapControls` | Map interaction handlers (flyTo, click) |
| `useTimelinePlayback` | Auto-advance timer with safety bounds |
| `useTimelineKeyboardNavigation` | Keyboard event handling with context awareness |
| `useKeyboardContext` | Context registration lifecycle management |
| `useVideoPreloader` | Background video buffering during flyTo |
| `useFullscreen` | Element-specific fullscreen management |
| `usePortalTarget` | Fullscreen-aware portal targeting |
| `useDevicePixelRatio` | DPI detection and responsive helpers |
| `useStreetViewPanorama` | Google Street View initialization with retry |

### [MEDIUM] useMapTimeline Will Need Restructuring for Supabase

When data migrates to Supabase, the `useMapTimeline` hook's `useMemo` chains (sort, filter, transform) should become TanStack Query derived queries or `select` transforms. The current architecture with local memoization will need restructuring. The separation of concerns is good though — the transformation logic in `utils/` is pure and reusable.

### [OK] Side Effect Cleanup

All hooks properly clean up side effects:
- Event listeners removed in `useEffect` return functions
- Intervals cleared in `useTimelinePlayback`
- Animation frames cancelled in `usePegmanDrag`
- Abort controllers used where appropriate in `LocationPopup`
- Mounted flags prevent state updates after unmount
- Processing ID pattern prevents race conditions in `MediaLightbox`

---

## 6. Services Review

### [OK] Existing Service Abstraction Quality

Two well-designed services exist:
- `services/googleMapsLoader.ts` — Singleton pattern with retry on error, API key validation, and test reset capability
- `services/streetViewService.ts` — LRU cache with configurable max size, retry with exponential backoff, fallback search radii, cache statistics

### [HIGH] Missing Media Service

Media-related IPC calls are made directly from components without a service layer. A `services/mediaService.ts` should be created:

```typescript
// services/mediaService.ts
import { commands } from '@/lib/tauri-bindings';

export async function readFileAsBase64(filePath: string): Promise<string> { ... }
export async function getStreamingMediaUrl(mediaType: string, filename: string): Promise<string> { ... }
export async function resolveMediaPath(mediaType: string, filename: string): Promise<number[]> { ... }
```

### [INFO] Supabase Migration Readiness

The service layer is thin but well-positioned for migration:
- `googleMapsLoader.ts` — No change needed (external API, no data dependency)
- `streetViewService.ts` — No change needed (external API, no data dependency)
- A new `dataService.ts` or TanStack Query hooks will be needed for Supabase data fetching
- Media services will need rework for Supabase Storage vs local filesystem

---

## 7. Types Review

### [MEDIUM] `any` Type Usage

Three locations use `any`:

| File | Line | Usage | Fix |
|------|------|-------|-----|
| `types/index.ts` | 67 | `existingPOV?: any \| null` | Use `StreetViewPOV` type |
| `components/map/LocationPopup.tsx` | 31 | `useState<{ mapboxPOV: any; streetViewPOV: any } \| null>` | Use proper POV types |
| `components/media/MediaLightbox.tsx` | 22 | `type Plugin = any` | Use plugin type from yet-another-react-lightbox |

### [OK] Type Organization

Types are well-organized with good documentation:
- `types/index.ts` — Core feature types with JSDoc comments
- `types/filters.ts` — Filter-specific types with utility functions (`hasActiveFilters`, `DEFAULT_FILTERS`)
- Types are re-exported through the barrel export
- Proper use of TypeScript interfaces and type aliases
- No `@ts-ignore`, `@ts-nocheck`, or widespread `as any` casts

---

## 8. Test Coverage

### Test File Inventory

| Test File | What It Tests | Quality |
|-----------|--------------|---------|
| `stores/__tests__/mapTimelineStore.test.ts` | Store state init, selectLocation with UUID, batch reset | Good |
| `utils/__tests__/timelineHelpers.test.ts` | Transform functions, UUID preservation through chain | Good |
| `hooks/__tests__/useTimelinePlayback.test.ts` | Playback advancement with UUID, invalid UUID handling | Good |
| `hooks/__tests__/useTimelineKeyboardNavigation.test.ts` | Arrow key navigation with UUID lookup, lookup failure | Good |
| `hooks/__tests__/useMapControls.test.ts` | Event click, marker click, flyTo with/without POV | Good |
| `__tests__/integration.test.tsx` | Full flow: click -> store -> marker -> auto-scroll, playback transitions | Good |
| `components/__tests__/MapContainer.test.tsx` | Map container rendering | Exists |
| `components/__tests__/TimelineEventCard.test.tsx` | Event card rendering | Exists |
| `components/__tests__/TimelinePanel.test.tsx` | Timeline panel rendering | Exists |
| `components/__tests__/MapTimelineView.touchportal.test.tsx` | Touch Portal bridge integration | Exists |
| `components/pegman/PegmanDraggable.test.tsx` | Pegman drag behavior | Exists |

### [MEDIUM] Missing Test Coverage

No tests found for:
- `services/googleMapsLoader.ts` — Singleton loading, error handling, retry on failure
- `services/streetViewService.ts` — Cache operations, retry logic, fallback radii, LRU eviction
- `utils/filterHelpers.ts` — Filter application, date range validation, unique addresses
- `utils/mediaHelpers.ts` — Media slide generation, count functions
- `components/media/MediaLightbox.tsx` — Complex async processing, race condition handling
- `components/media/MediaThumbnail.tsx` — Loading states, retry logic, blob URL cleanup
- `hooks/useFullscreen.ts` — Fullscreen state management
- `hooks/useKeyboardContext.ts` — Context registration/cleanup lifecycle
- `store/keyboardManager.ts` — Priority-based context system

---

## 9. Dependencies & External Libraries

### [CRITICAL] Missing npm Dependencies

The following packages are imported by the feature but **NOT listed** in `package.json`:

| Package | Used In | Purpose |
|---------|---------|---------|
| `mapbox-gl` | `MapContainer.tsx` (CSS import) | Map rendering engine |
| `react-map-gl` | MapContainer, TimelineMarker, SearchMarker, LocationPopup, usePegmanDrag | React wrapper for Mapbox GL |
| `react-rnd` | TimelinePanel.tsx | Draggable/resizable panel |
| `yet-another-react-lightbox` | MediaLightbox.tsx (core + 3 plugins) | Image/video lightbox viewer |
| `@googlemaps/js-api-loader` | googleMapsLoader.ts | Google Maps API loading |
| `@heroicons/react` | PlaybackControls.tsx | Play/Pause icon components |
| `date-fns` | timelineHelpers.ts, filterHelpers.ts | Date formatting and parsing |

**Fix**:
```bash
npm install mapbox-gl react-map-gl react-rnd yet-another-react-lightbox @googlemaps/js-api-loader @heroicons/react date-fns
npm install --save-dev @types/mapbox-gl
```

### [INFO] React 19 Compatibility

Once installed, verify that these packages are compatible with React 19.x:
- `react-map-gl` — Check v7.x+ supports React 19
- `react-rnd` — Check latest version supports React 19
- `yet-another-react-lightbox` — Check latest version supports React 19
- `@heroicons/react` — v2.x should support React 19

---

## 10. Performance Considerations

### [HIGH] Zustand Destructuring Causes Render Cascades

As documented in Section 2, the pervasive use of destructured store access means every component subscribed to the store re-renders when ANY of the 43 state fields changes. This is particularly problematic for `MapContainer.tsx`, which wraps the expensive Mapbox GL map component.

### [MEDIUM] Conditional Rendering of Stateful Components

The feature uses conditional rendering in several places. For these particular cases (heavy modal components), conditional rendering is actually appropriate:

- `MapTimelineView.tsx:290` — `{lightbox.isOpen && <MediaLightbox />}` (acceptable)
- `LocationPopup.tsx:536` — `{isStreetViewModalOpen && <StreetViewModal ... />}` (acceptable)

The tab panels in LocationPopup correctly use CSS `hidden` class instead of conditional rendering for images/videos tabs.

### [OK] Map Performance Mitigations

Good performance patterns found:
- `usePegmanDrag` uses `requestAnimationFrame` throttling with a 5px movement threshold
- Video preloader uses debouncing (300ms) to prevent excessive preload requests
- Street View cache with LRU eviction (max 1000 entries, 1-hour TTL)
- Lightbox lazy-loads both the main component (`React.lazy`) and plugins (dynamic import)

### [OK] Memory Leak Prevention

Good cleanup patterns found:
- Blob URLs tracked via refs and revoked on cleanup
- Video preload elements paused, src cleared, and removed from DOM on cleanup
- Map event listeners cleaned up via `map.off()`
- Google Maps event listeners cleared via `google.maps.event.clearInstanceListeners`
- Processing ID pattern prevents stale async state updates

---

## 11. Security Review

### [HIGH] API Keys in Client Bundle

The feature uses two API keys via `import.meta.env`:

| File | Variable |
|------|----------|
| `components/map/MapContainer.tsx` | `import.meta.env.VITE_MAPBOX_API_KEY` |
| `services/googleMapsLoader.ts` | `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` |

`VITE_` prefixed variables are embedded in the client bundle at build time. For a desktop Tauri app, this is less risky than a web app, but API keys in the compiled binary can still be extracted.

**Recommendation**: For a desktop app distributed to trusted users, this is acceptable risk. Mitigate by:
1. Setting API restrictions on the keys (usage quotas, referrer restrictions)
2. Documenting in the security model that these are client-side keys
3. Considering moving key retrieval to a Rust backend command that loads from secure storage

### [MEDIUM] CSP Considerations for External Resources

The feature loads external resources that need CSP allowlisting in `tauri.conf.json`:
- Mapbox tile servers (`mapbox://`, `api.mapbox.com`, `*.tiles.mapbox.com`)
- Mapbox GL JS CSS (`mapbox-gl/dist/mapbox-gl.css`)
- Google Maps JavaScript API (`maps.googleapis.com`)
- Google Street View imagery
- yet-another-react-lightbox CSS

### [OK] Input Validation

Good validation found throughout:
- Coordinate validation in `usePegmanDrag` (latitude -90 to 90, longitude -180 to 180, NaN check)
- Date validation in filter helpers (NaN checks after `parseISO`, try-catch blocks)
- Data URL validation in `MediaLightbox` (`startsWith('data:image/')`)
- UUID presence validation in `useTimelinePlayback` before advancing
- Zoom level validation and clamping in `validateZoomLevel`

---

## 12. Integration Readiness Summary

### Drop-In Ready (No Changes Needed)

| Component/File | Notes |
|----------------|-------|
| `types/index.ts`, `types/filters.ts` | Clean type definitions, self-contained |
| `constants/mapConfig.ts`, `constants/hotkeys.ts`, `constants/domIds.ts`, `constants/animations.ts` | Pure configuration constants |
| `utils/timelineHelpers.ts`, `utils/filterHelpers.ts`, `utils/mediaHelpers.ts` | Pure utility functions, well-tested |
| `services/googleMapsLoader.ts`, `services/streetViewService.ts` | Standalone services with no Tauri dependency |
| `store/keyboardManager.ts` | Independent Zustand store, clean design |
| `components/icons/index.tsx` | Reusable SVG icon components |
| `components/MapErrorBoundary.tsx` | Standard error boundary |
| All `__tests__/` files | Tests will work after dependency install and minor mock updates |

### Minor Adjustments Needed

| Item | Effort | What to Change |
|------|--------|----------------|
| CSS logical properties | Low | Replace ~12 directional properties with logical equivalents |
| `any` types | Low | Replace 3 `any` usages with proper types |
| `stores/` to `store/` rename | Low | Rename directory to match template convention |
| Console logging cleanup | Low | Remove 30+ console.log/warn calls or gate behind `import.meta.env.DEV` |

### Significant Refactoring Needed

| Item | Effort | What to Change |
|------|--------|----------------|
| Install missing dependencies | Medium | Install 7 npm packages, verify React 19 compatibility |
| Tauri v1 to v2 imports | Medium | Update 3 files, change import paths |
| Zustand selectors | Medium | Update 15+ files, convert destructuring to selector pattern |
| Create media service | Medium | New `services/mediaService.ts`, update 3 component/hook files |
| i18n string extraction | High | Extract ~50+ hardcoded strings to translation files |
| Store splitting | High | Split 587-line store into 3-4 focused stores (optional, can defer) |
| shadcn/ui migration | High | Migrate custom UI to shadcn/ui equivalents (optional) |

### Recommended Migration Order

1. **Install missing dependencies** — unblocks everything else
2. **Fix Tauri v1 to v2 imports** — 3 files, straightforward path changes
3. **Fix Zustand destructuring** — 15+ files, systematic but mechanical
4. **Create media service layer** — 1 new file + 3 file updates
5. **Replace `any` types** — 3 locations
6. **CSS logical properties** — ~12 locations
7. **i18n extraction** — can be done incrementally per component
8. **Store splitting** — optional, can be deferred to reduce risk
9. **shadcn/ui migration** — optional, can be deferred

---

*Review generated by Claude Opus 4.6 on 2026-02-17. This review focused on architecture, patterns, and compatibility — NOT on data types or schema specifics, which will change during the Supabase migration.*
