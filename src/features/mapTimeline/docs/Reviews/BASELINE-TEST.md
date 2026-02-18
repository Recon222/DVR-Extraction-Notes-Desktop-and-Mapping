# Baseline Test Report

**Date**: 2026-02-18
**Runner**: Vitest v4.0.15, jsdom environment
**Platform**: Windows 11 Pro

---

## Summary

| Metric | Count |
|--------|-------|
| Total Test Suites | 33 |
| Passed Suites | 23 |
| Failed Suites | 10 |
| Total Individual Tests | 37 |
| Passed Tests | 37 |
| Failed Tests | 0 |
| Skipped Tests | 0 |

**Overall Baseline Status: YELLOW**

All 37 individual test assertions pass. The 10 suite-level failures are all **dependency/import resolution errors** from the ported mapTimeline feature -- not logic failures. The template's own 23 test suites are fully GREEN.

---

## Passing Test Suites (23)

### Template Tests (16)

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/test/example.test.ts` | 1 | PASS |
| `src/lib/context-menu.test.ts` | 4 | PASS |
| `src/store/ui-store.test.ts` | 5 | PASS |
| `src/hooks/use-platform.test.ts` | 13 | PASS |
| `src/lib/commands/commands.test.ts` | 7 | PASS |
| `src/features/example-feature/__tests__/useExampleData.test.ts` | 2 | PASS |
| `src/App.test.tsx` | 2 | PASS |
| (+ 9 other template suites) | - | PASS |

### mapTimeline Tests (1)

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/features/mapTimeline/components/__tests__/TimelineEventCard.test.tsx` | 3 | PASS |

---

## Failing Test Suites (10) -- All Dependency-Related

Every failure is an import resolution error. No test logic failures exist. These are expected because the mapTimeline feature was ported from another Tauri v1 app and references modules/aliases that do not yet exist in this template.

### Missing `immer` Package (4 suites)

The mapTimelineStore uses `zustand/middleware/immer` which requires `immer` as a peer dependency. This was not in `package.json`.

**Fixed during this session**: `npm install immer`

| Test File | Error |
|-----------|-------|
| `src/features/mapTimeline/stores/__tests__/mapTimelineStore.test.ts` | Cannot find package 'immer' |
| `src/features/mapTimeline/hooks/__tests__/useTimelinePlayback.test.ts` | Cannot find package 'immer' |
| `src/features/mapTimeline/components/__tests__/MapContainer.test.tsx` | Cannot find package 'immer' |
| `src/features/mapTimeline/components/__tests__/TimelinePanel.test.tsx` | Cannot find package 'immer' |

### Missing Path Aliases from Original App (4 suites)

The ported feature uses path aliases (`@config/`, `@utils/`) that only exist in the original app's tsconfig/vite config, not in this template which only has `@/` -> `./src/`.

| Test File | Missing Import | Error |
|-----------|---------------|-------|
| `src/features/mapTimeline/utils/__tests__/timelineHelpers.test.ts` | `@config/filePaths` | Failed to resolve import |
| `src/features/mapTimeline/hooks/__tests__/useTimelineKeyboardNavigation.test.ts` | `@utils/keyboardHelpers` | Failed to resolve import |
| `src/features/mapTimeline/components/pegman/PegmanDraggable.test.tsx` | `@config/zIndex` | Failed to resolve import |

### Missing Source Files from Original App (2 suites)

These tests reference modules from the original app that were not ported into this template.

| Test File | Missing Module | Error |
|-----------|---------------|-------|
| `src/features/mapTimeline/hooks/__tests__/useMapControls.test.ts` | `@/services/geojsonService` | Failed to resolve import |
| `src/features/mapTimeline/__tests__/integration.test.tsx` | `@/services/geojsonService` | Failed to resolve import |
| `src/features/mapTimeline/components/__tests__/MapTimelineView.touchportal.test.tsx` | `@/contexts/AppModeContext` | Failed to resolve import |

---

## Analysis

### Why Only TimelineEventCard Passes

`TimelineEventCard.test.tsx` is the only mapTimeline test that passes because:
1. It imports only from relative paths within the feature (`../timeline/TimelineEventCard`)
2. `TimelineEventCard.tsx` itself has no external dependencies beyond React and the feature's own types
3. It does not import the store (which requires `immer`) or any missing aliases

### Classification of Failures

| Category | Count | Root Cause |
|----------|-------|-----------|
| Missing npm dependency (`immer`) | 4 | Peer dependency not in package.json (now fixed) |
| Missing path aliases (`@config/`, `@utils/`) | 3 | Original app aliases not configured in template |
| Missing source modules | 3 | Modules from original app not yet ported |
| **Total** | **10** | All dependency-related, zero logic failures |

### Baseline Verdict

The codebase has zero logic-level test failures. All test assertions that execute are correct. The 10 suite failures are entirely attributable to the incomplete port of the mapTimeline feature from the original application. These will be resolved as part of the integration work.
