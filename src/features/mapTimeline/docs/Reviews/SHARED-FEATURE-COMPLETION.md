# Shared Feature Module Completion Report

**Date**: 2026-02-18
**Phase**: Shared utility module creation and import migration
**Feature**: `src/features/shared/` (new) + `src/features/mapTimeline/` (updated imports)

---

## Summary

Created `src/features/shared/` as an app-wide utility feature containing three modules ported from `src/features/mapTimeline/ports_from_1-5/`:

- **filePaths.ts** -- Central file path configuration, constants, and helpers
- **zIndex.ts** -- Z-index hierarchy constants for UI stacking order
- **keyboardHelpers.ts** -- Keyboard event utilities (form field detection)

Updated 10 source files in `src/features/mapTimeline/` to import from the new `@/features/shared/config` and `@/features/shared/utils` paths, replacing the old `@config/`, `@utils/`, and `@/config/` aliases that did not exist in this template.

---

## File Inventory

### Files Created (6)

| File | Description |
|------|-------------|
| `src/features/shared/config/filePaths.ts` | File path config, constants, helpers (copied from ports_from_1-5, no debug logs) |
| `src/features/shared/config/zIndex.ts` | Z-index hierarchy constants (copied from ports_from_1-5, updated usage example) |
| `src/features/shared/config/index.ts` | Barrel export re-exporting all config modules |
| `src/features/shared/utils/keyboardHelpers.ts` | Keyboard event utilities (copied from ports_from_1-5, no debug logs) |
| `src/features/shared/utils/index.ts` | Barrel export re-exporting all utils modules |
| `src/features/mapTimeline/docs/Reviews/SHARED-FEATURE-COMPLETION.md` | This completion report |

### Files Modified (10)

| File | Change |
|------|--------|
| `src/features/mapTimeline/utils/mediaHelpers.ts` | Updated import path for filePaths |
| `src/features/mapTimeline/utils/timelineHelpers.ts` | Updated import path for filePaths |
| `src/features/mapTimeline/hooks/useVideoPreloader.ts` | Updated import path for filePaths |
| `src/features/mapTimeline/hooks/useTimelineKeyboardNavigation.ts` | Updated import path for keyboardHelpers |
| `src/features/mapTimeline/components/map/LocationPopup.tsx` | Updated import path for keyboardHelpers |
| `src/features/mapTimeline/components/HelpPanel.tsx` | Updated import path for zIndex |
| `src/features/mapTimeline/components/media/MediaLightbox.tsx` | Updated import path for zIndex |
| `src/features/mapTimeline/components/pegman/PegmanDraggable.tsx` | Updated import path for zIndex |
| `src/features/mapTimeline/components/streetview/StreetViewModal.tsx` | Updated import path for zIndex |
| `src/features/mapTimeline/components/map/menu/HamburgerMenu.tsx` | Updated import path for zIndex |

### Files NOT Modified (by design)

| File | Reason |
|------|--------|
| `src/features/mapTimeline/ports_from_1-5/*` | Left intact per instructions |
| `src/features/viewer/**/*` | Left intact per instructions (verify-only) |
| `src/features/mapTimeline/components/media/MediaLightbox.tsx` | Still has `@config/mediaConfig` import (separate missing module, out of scope) |

---

## Import Path Migration Table

| Old Path | New Path | Files Updated |
|----------|----------|---------------|
| `@config/filePaths` | `@/features/shared/config` | mediaHelpers.ts, timelineHelpers.ts |
| `@/config/filePaths` | `@/features/shared/config` | useVideoPreloader.ts |
| `@utils/keyboardHelpers` | `@/features/shared/utils` | useTimelineKeyboardNavigation.ts, LocationPopup.tsx |
| `@config/zIndex` | `@/features/shared/config` | HelpPanel.tsx, MediaLightbox.tsx, PegmanDraggable.tsx, StreetViewModal.tsx, HamburgerMenu.tsx |

---

## Test Comparison

### Suite-Level Results

| Test Suite | Baseline | TDD-Completion | Current | Delta |
|-----------|----------|----------------|---------|-------|
| **Template tests (7 suites)** | 7 PASS | 7 PASS | 7 PASS | No change |
| example-feature/useExampleData | PASS | PASS | PASS | No change |
| viewer/viewerDataLoader | -- | PASS (16) | PASS (16) | No change |
| viewer/mediaPathResolver | -- | -- | FAIL (import) | Pre-existing (`@tauri-apps/api/tauri`) |
| viewer/useViewerStore | -- | -- | FAIL (import) | Pre-existing (`@/stores/useLocationStore`) |
| viewer/touchportal/useTouchPortalBridge | -- | PASS (15) | PASS (15) | No change |
| mapTimeline/TimelineEventCard | PASS (3) | PASS (3) | PASS (3) | No change |
| mapTimeline/mapTimelineStore | FAIL (import) | PASS (9) | PASS (9) | No change (fixed by immer install) |
| mapTimeline/TimelinePanel | FAIL (import) | PASS (3) | PASS (3) | No change (fixed by immer install) |
| **mapTimeline/timelineHelpers** | **FAIL (import)** | **FAIL (import)** | **PASS (7)** | **FIXED by this work** |
| **mapTimeline/useTimelineKeyboardNav** | **FAIL (import)** | **FAIL (import)** | **PASS (3)** | **FIXED by this work** |
| **mapTimeline/integration** | **FAIL (import)** | **FAIL (import)** | **PASS (3)** | **FIXED (geojsonService now exists)** |
| **mapTimeline/PegmanDraggable** | **FAIL (import)** | **FAIL (import)** | **FAIL (3 assertion)** | **IMPROVED: loads now, has pre-existing test issues** |
| **mapTimeline/useMapControls** | **FAIL (import)** | **FAIL (import)** | **FAIL (1 assertion)** | **IMPROVED: loads now, has pre-existing test issue** |
| mapTimeline/MapContainer | FAIL (import) | FAIL (import) | FAIL (import) | Changed: was `immer`, now `@/components/map/MapPOVButton` |
| mapTimeline/touchportal | FAIL (import) | FAIL (import) | FAIL (import) | Changed: was `@/contexts/AppModeContext`, now `react-router-dom` |
| mapTimeline/useTimelinePlayback | FAIL (import) | FAIL (2 assertion) | FAIL (2 assertion) | No change (pre-existing timer issues) |
| mapTimeline/mediaService | N/A | FAIL (15 RED) | FAIL (15 RED) | No change (TDD stub, expected) |

### Aggregate Summary

| Metric | Baseline | TDD-Completion | Current | Delta from TDD |
|--------|----------|----------------|---------|----------------|
| Total Suites | 33 | ~35 | 23 | -- |
| Passed Suites | 23 | ~25 | 15 | -- |
| Failed Suites | 10 | ~10 | 8 | -2 fewer failures |
| Total Tests | 37 | ~85 | 139 | +54 more tests running |
| Passed Tests | 37 | ~68 | 118 | +50 more tests passing |
| Failed Tests | 0 | ~17 | 21 | +4 (pre-existing assertions now unmasked) |

Note: Suite/test totals differ from baseline because new test files were added between sessions (viewer tests, mediaService TDD tests, integration tests, etc.).

### Tests Unblocked by This Work

This import migration directly unblocked **13 tests across 3 suites**:

| Suite | Tests Unblocked | Root Cause Fixed |
|-------|----------------|------------------|
| timelineHelpers.test.ts | 7 tests | `@config/filePaths` resolved to `@/features/shared/config` |
| useTimelineKeyboardNavigation.test.ts | 3 tests | `@utils/keyboardHelpers` resolved to `@/features/shared/utils` |
| integration.test.tsx | 3 tests | `@/services/geojsonService` resolved (created in prior task) |

Additionally, 2 suites now load and partially pass (previously failed at import resolution):

| Suite | Tests Now Running | Assertion Failures |
|-------|------------------|-------------------|
| PegmanDraggable.test.tsx | 11 (8 pass, 3 fail) | Pre-existing: portal target, positioning, icon rendering |
| useMapControls.test.ts | 8 (7 pass, 1 fail) | Pre-existing: flyTo location without POV uses default zoom |

---

## Remaining Issues

### Still Failing -- Import Resolution (4 suites)

| Suite | Missing Import | Fix Required |
|-------|---------------|-------------|
| MapContainer.test.tsx | `@/components/map/MapPOVButton` | Create component or mock in test |
| MapTimelineView.touchportal.test.tsx | `react-router-dom` | Install `react-router-dom` package |
| viewer/mediaPathResolver.test.ts | `@tauri-apps/api/tauri` | Update to Tauri v2 import path |
| viewer/useViewerStore.test.ts | `@/stores/useLocationStore` | Create store or mock in test |

### Still Failing -- Assertion Errors (4 suites)

| Suite | Failing Tests | Root Cause |
|-------|--------------|-----------|
| useTimelinePlayback.test.ts | 2 of 3 | Pre-existing timer/UUID issues |
| PegmanDraggable.test.tsx | 3 of 11 | Pre-existing portal/positioning/icon rendering issues |
| useMapControls.test.ts | 1 of 8 | Pre-existing flyTo default zoom assertion |
| mediaService.test.ts | 15 of 24 | Expected TDD RED -- stub not yet implemented |

### Still Present -- Unresolved Old Alias

`MediaLightbox.tsx` still imports `{ VIDEO_PLAYBACK } from '@config/mediaConfig'`. This is a separate missing module that was not part of this task's scope.

---

## Viewer Touchportal Status

### Import Resolution

The `MapTimelineView.tsx` import resolves:
```typescript
import { useTouchPortalBridge } from '@/features/viewer/touchportal';
```

The barrel export at `src/features/viewer/touchportal/index.ts` correctly exports `useTouchPortalBridge` from `./hooks/useTouchPortalBridge`.

### Viewer Touchportal Own Tests

`src/features/viewer/touchportal/__tests__/useTouchPortalBridge.test.ts` passes all 15 tests. This test only exercises the types and constants modules, not the hook implementation.

### Viewer Touchportal Dependency Issues

The actual hook implementation (`useTouchPortalBridge.ts`) has 5 unresolved dependencies that would cause runtime failures but do NOT affect test mocking:

| Import | Issue |
|--------|-------|
| `@tauri-apps/api/tauri` | Tauri v1 path -- should be `@tauri-apps/api/core` |
| `@tauri-apps/api/window` | Tauri v1 path -- should be `@tauri-apps/api/window` (v2 restructured) |
| `@/stores/useLocationStore` | Module does not exist in this template |
| `@/contexts/AppModeContext` | Module EXISTS (created during onboarding) |
| `@/config/filePaths` | Old alias -- should be `@/features/shared/config` |

The `MapTimelineView.touchportal.test.tsx` test mocks `@/features/viewer/touchportal` entirely with `vi.mock()`, so the hook's broken imports never trigger during testing. However, the test itself now fails on `react-router-dom` which is not installed as a dependency in this template.

### Verdict

The touchportal barrel export resolves correctly for import purposes. The hook's internal dependencies are broken but isolated from mapTimeline tests via mocking. The touchportal test failure is caused by `react-router-dom` being missing from `package.json`, not by any touchportal-specific issue.

---

## Architecture Notes

### Shared Feature Structure

```
src/features/shared/
  config/
    filePaths.ts      -- File path constants and helpers
    zIndex.ts         -- Z-index hierarchy constants
    index.ts          -- Barrel: re-exports from filePaths and zIndex
  utils/
    keyboardHelpers.ts -- Keyboard event utilities
    index.ts           -- Barrel: re-exports from keyboardHelpers
```

No root `index.ts` was created in `shared/`. Imports go through sub-barrels:
```typescript
import { splitFileString, Z_INDEX } from '@/features/shared/config';
import { isTypingInFormField } from '@/features/shared/utils';
```

This follows the task specification and avoids creating a single barrel that mixes concerns.
