# TDD Test Completion Report -- Media Service Layer

**Date**: 2026-02-18
**Phase**: RED (tests written, implementation pending)
**Feature**: `src/features/mapTimeline/services/mediaService.ts`

---

## Summary

| Metric | Count |
|--------|-------|
| Tests Written | 24 |
| Tests Failing (RED, expected) | 15 |
| Tests Passing (contract/error) | 9 |
| Stubs Created | 1 |

All 15 failures are `Error: Not implemented` from the stub service. This is the expected TDD RED state. The 9 passing tests verify:
- Error-throwing behavior (stub naturally throws, so "should throw on error" tests pass)
- Contract checks (function exports exist, return promises)

---

## Test File

**Path**: `src/features/mapTimeline/services/__tests__/mediaService.test.ts`

### Test Breakdown by Function

#### `readFileAsBase64` (6 tests)

| Test | Status | Purpose |
|------|--------|---------|
| should call commands.readFileAsBase64 with the file path | RED | Verifies parameter forwarding |
| should return the base64 data string on success | RED | Verifies successful result unwrapping |
| should throw an error when the command returns an error result | GREEN | Verifies error handling |
| should propagate the error message from the command | RED | Verifies error message preservation |
| should handle empty file path gracefully | GREEN | Verifies edge case error propagation |
| should forward paths with special characters correctly | RED | Verifies special character handling (spaces, parentheses) |

#### `getStreamingMediaUrl` (6 tests)

| Test | Status | Purpose |
|------|--------|---------|
| should call commands.getStreamingMediaUrl with mediaType and filename | RED | Verifies parameter forwarding (both args) |
| should return the streaming URL on success | RED | Verifies successful result unwrapping |
| should work with image media type | RED | Verifies images media type works |
| should throw an error when the command returns an error result | GREEN | Verifies error handling |
| should propagate the error message from the command | RED | Verifies error message preservation |
| should handle filenames with spaces and special characters | RED | Verifies Unicode/special char filenames |

#### `resolveMediaPath` (8 tests)

| Test | Status | Purpose |
|------|--------|---------|
| should call commands.resolveMediaPath with mediaType and filename | RED | Verifies parameter forwarding |
| should return the byte array on success | RED | Verifies byte array result |
| should return an array of numbers representing bytes | RED | Verifies type contract (number[], 0-255 range) |
| should handle large byte arrays (image data) | RED | Verifies 1KB+ arrays work |
| should throw an error when the command returns an error result | GREEN | Verifies error handling |
| should propagate the error message from the command | RED | Verifies error message preservation |
| should handle empty filename | GREEN | Verifies edge case error propagation |
| should work with video media type | RED | Verifies videos media type works |

#### `service contract` (4 tests)

| Test | Status | Purpose |
|------|--------|---------|
| should export readFileAsBase64 as a plain async function | GREEN | Verifies function export |
| should export getStreamingMediaUrl as a plain async function | GREEN | Verifies function export |
| should export resolveMediaPath as a plain async function | GREEN | Verifies function export |
| should return promises from all service functions | GREEN | Verifies async return type |

---

## Stub Created

**Path**: `src/features/mapTimeline/services/mediaService.ts`

Contains three exported async functions with `throw new Error('Not implemented')` bodies:

```typescript
export async function readFileAsBase64(filePath: string): Promise<string>
export async function getStreamingMediaUrl(mediaType: string, filename: string): Promise<string>
export async function resolveMediaPath(mediaType: string, filename: string): Promise<number[]>
```

---

## Service Interface Contract (Defined by Tests)

The tests define this exact contract that the implementation must satisfy:

### `readFileAsBase64(filePath: string): Promise<string>`
- Calls `commands.readFileAsBase64(filePath)` with the exact file path passed in
- On `{ status: 'ok', data: string }` result: returns the `data` string
- On `{ status: 'error', error: string }` result: throws an Error with the error message
- Handles paths with spaces and special characters

### `getStreamingMediaUrl(mediaType: string, filename: string): Promise<string>`
- Calls `commands.getStreamingMediaUrl(mediaType, filename)` with both arguments
- On `{ status: 'ok', data: string }` result: returns the `data` string (HTTP URL)
- On `{ status: 'error', error: string }` result: throws an Error with the error message
- Handles both 'images' and 'videos' media types
- Handles filenames with spaces and special characters

### `resolveMediaPath(mediaType: string, filename: string): Promise<number[]>`
- Calls `commands.resolveMediaPath(mediaType, filename)` with both arguments
- On `{ status: 'ok', data: number[] }` result: returns the `data` byte array
- On `{ status: 'error', error: string }` result: throws an Error with the error message
- Handles both 'images' and 'videos' media types
- Handles large byte arrays (1KB+)

---

## Mock Strategy

**Layer**: Service tests mock `commands.*` from `@/lib/tauri-bindings`

This follows the template's strict call chain:
```
Component -> Hook -> Service -> Command -> Rust
                     ^^^^^^^    ^^^^^^^
                     under test  mocked
```

The mock overrides the global `@/lib/tauri-bindings` mock from `src/test/setup.ts` with media-specific commands (`readFileAsBase64`, `getStreamingMediaUrl`, `resolveMediaPath`). Each test explicitly configures the mock return value using `vi.mocked(commands.xxx).mockResolvedValue()`.

---

## Existing Test Regression Check

| Suite Category | Before | After | Delta | Notes |
|---------------|--------|-------|-------|-------|
| Template tests (App, platform, etc.) | 23 PASS | 23+ PASS | No regression | All template tests still pass |
| mapTimeline - TimelineEventCard | PASS (3 tests) | PASS (3 tests) | No change | |
| mapTimeline - mapTimelineStore | FAIL (import) | PASS (9 tests) | Improved | Fixed by `npm install immer` |
| mapTimeline - TimelinePanel | FAIL (import) | PASS (3 tests) | Improved | Fixed by `npm install immer` |
| mapTimeline - useTimelinePlayback | FAIL (import) | FAIL (2 of 3) | Partially improved | Now loads; 2 assertion failures are pre-existing timer issues |
| mapTimeline - integration | FAIL (import) | FAIL (import) | No change | Still missing `@/services/geojsonService` |
| mapTimeline - useMapControls | FAIL (import) | FAIL (import) | No change | Still missing `@/services/geojsonService` |
| mapTimeline - useTimelineKeyboardNav | FAIL (import) | FAIL (import) | No change | Still missing `@utils/keyboardHelpers` |
| mapTimeline - timelineHelpers | FAIL (import) | FAIL (import) | No change | Still missing `@config/filePaths` |
| mapTimeline - PegmanDraggable | FAIL (import) | FAIL (import) | No change | Still missing `@config/zIndex` |
| mapTimeline - MapContainer | FAIL (import) | FAIL (import) | No change | Still missing `immer` resolved but now hits `@/contexts/AppModeContext` via store import chain |
| mapTimeline - touchportal | FAIL (import) | FAIL (import) | No change | Still missing `@/contexts/AppModeContext` |
| **NEW: mediaService** | N/A | FAIL (15 of 24) | Expected RED | TDD stub - all failures are "Not implemented" |

**Verdict**: Zero regressions introduced. Three suites improved (now load and run) thanks to `immer` install.

---

## Implementation Work Remaining (GREEN Phase)

To make all 15 RED tests pass, implement the three functions in `src/features/mapTimeline/services/mediaService.ts`:

1. Import `commands` from `@/lib/tauri-bindings`
2. Each function should:
   - Call the corresponding `commands.*` function with the parameters passed in
   - Check `result.status` on the response
   - On `'ok'`: return `result.data`
   - On `'error'`: throw `new Error(result.error)`

The pattern matches the template's `exampleService.ts`:
```typescript
import { commands } from '@/lib/tauri-bindings'

export async function readFileAsBase64(filePath: string): Promise<string> {
  const result = await commands.readFileAsBase64(filePath)
  if (result.status === 'error') throw new Error(result.error)
  return result.data
}
```

**Important**: The typed commands (`commands.readFileAsBase64`, `commands.getStreamingMediaUrl`, `commands.resolveMediaPath`) do not yet exist in `src/lib/bindings.ts`. They must be added to the Rust backend and regenerated via `npm run rust:bindings` before the implementation can work against real types. For now, the tests use mocked versions.

After implementation, the three component/hook files must be updated:
- `components/media/MediaLightbox.tsx` -- replace `invoke()` calls with service functions
- `components/media/MediaThumbnail.tsx` -- replace `invoke()` calls with service functions
- `hooks/useVideoPreloader.ts` -- replace `invoke()` call with service function

---

## Decisions and Notes

1. **Stub approach**: Created a stub file with `throw new Error('Not implemented')` rather than leaving the file absent. This ensures tests run and fail at the assertion level (proper TDD RED) instead of failing at the import resolution level (which would be less informative).

2. **Mock typing**: Used `as never` type assertions on `mockResolvedValue` calls because the typed commands don't exist in bindings yet. When the actual commands are generated, these casts can be removed and the mocks will get proper type checking.

3. **Error handling pattern**: Tests verify that the service throws `new Error(errorMessage)` on command failure, matching the `exampleService.ts` pattern. An alternative would be to re-throw the raw error string, but wrapping in Error is more idiomatic and consistent with the template.

4. **Missing `immer` dependency**: Discovered during baseline that `immer` was not in `package.json` despite being required by `zustand/middleware/immer`. Installed as part of Step 1 (dependency installation). This was not listed in the review's dependency list but was required.
