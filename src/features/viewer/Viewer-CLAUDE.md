# Viewer-CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Portable Viewer feature.

## Feature Overview

Read-only viewer for .cadx evidence packages. Separate application from the editor with its own build, entry point, and Tauri config. Displays exported CCTV case data with HTTP streaming for video playback.

## Commands

```bash
# Development
npm run dev:viewer              # Start viewer dev server (port 1421)

# Building
npm run build:viewer            # Build viewer frontend to dist-viewer/
npm run tauri:build:viewer      # Full viewer build (frontend + Rust)

# Testing - Backend
cd src-tauri && cargo test --features viewer
cd src-tauri && cargo test viewer  # Just viewer tests
```

## Architecture

### Separate Application Build

| Aspect | Editor | Viewer |
|--------|--------|--------|
| Entry | `src/main.tsx` | `src/viewer-main.tsx` |
| Root | `src/App.tsx` | `src/ViewerApp.tsx` |
| HTML | `index.html` | `index-viewer.html` |
| Routes | `routes/routes.tsx` | `routes/viewer-routes.tsx` |
| Output | `dist/` | `dist-viewer/` |
| Tauri Config | `tauri.conf.json` | `tauri.viewer.json` |
| Cargo Features | `--features editor` | `--features viewer` |

### Data Flow

```
User double-clicks viewer.exe
         ↓
discover_evidence_file() → Find .cadx (CLI arg or adjacent)
         ↓
validate_binding() → UUID check (binding.json vs case_metadata.json)
         ↓
load_viewer_data() → Read GeoJSON from ZIP, return ViewerData struct
         ↓
Frontend receives ViewerData (parsed object, NOT string)
         ↓
viewerDataLoader.ts → Transform to ExportedCaseData
         ↓
useViewerStore → Load locations into useLocationStore
         ↓
MapTimelineView renders (same component as editor, mode='viewer')
```

### Media Streaming

```
Frontend needs image/video
         ↓
Image: invoke('resolve_media_path') → bytes → Blob URL
Video: invoke('get_streaming_media_url') → HTTP URL (no memory load)
         ↓
HTTP Server (streaming.rs) @ localhost:21574
  - GET /media/images/:filename
  - GET /media/videos/:filename (Range support for seeking)
  - GET /health
         ↓
Server reads directly from .cadx ZIP (no extraction)
```

## .cadx Package Format

**ZIP64 archive with STORE compression** (no extraction, instant streaming):

```
MyCase.cadx
├── CCTV_Chronology.geojson      # Case data (FeatureCollection)
├── case_metadata.json           # UUID, case_name, timestamps
├── CCTV_Chronology.xlsx         # Optional: original Excel
└── media/
    ├── images/                  # Image files
    │   └── screenshot.jpg
    └── videos/                  # Video files
        └── footage.mp4
```

**External files (packaged together):**

```
MyCase_CCTV_Chronology/
├── CCTV Chronology Viewer.exe   # User double-clicks this
├── MyCase.cadx                  # Evidence container
├── binding.json                 # UUID binding (security)
├── manifest.json                # Package manifest
└── README.txt                   # User instructions
```

## Key Types

### Rust (viewer.rs)

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]  // Frontend receives camelCase
pub struct ViewerData {
    pub case_name: String,
    pub geojson: serde_json::Value,  // Parsed JSON, NOT String
    pub media_path: String,          // Path to .cadx file
}
```

### TypeScript (viewerDataLoader.ts)

```typescript
interface ViewerData {
  case_name: string;
  geojson: unknown;     // Parsed GeoJSON object (not string!)
  media_path: string;
}
```

## Tauri Commands

| Command | Purpose | Returns |
|---------|---------|---------|
| `get_exe_directory` | Viewer exe location | `Result<String>` |
| `load_viewer_data` | Load GeoJSON from .cadx | `Result<ViewerData>` |
| `resolve_media_path` | Extract media bytes | `Result<Vec<u8>>` |
| `get_streaming_media_url` | Get HTTP URL for media | `Result<String>` |
| `get_streaming_server_url` | Get server base URL | `Result<String>` |

## Security Model

### Binding Validation

Prevents .cadx swapping after package creation:

```
binding.json (external)     case_metadata.json (inside .cadx)
{                           {
  "uuid": "550e8400..."  ←→   "uuid": "550e8400..."
}                           }

Match → Load proceeds
Mismatch → Error: "UUID mismatch"
```

### Path Traversal Protection

Three layers of defense:

1. **Frontend** (`mediaPathResolver.ts`): `isSafeFilename()` rejects `..`, `/`, `\`, `\0`
2. **Backend commands** (`viewer.rs`): Same validation before ZIP access
3. **HTTP server** (`streaming.rs`): Double-check before serving

### Localhost-Only Server

```rust
let addr = std::net::SocketAddr::from(([127, 0, 0, 1], STREAMING_PORT));
// Only accessible from same machine
```

## Frontend Components

```
ViewerApp.tsx                    # Root - loads data, provides context
├── AppModeProvider              # mode='viewer', readonly=true
├── MediaPathProvider            # Media resolution functions
└── ViewerRouter
    └── MapTimelineView          # Same as editor (reads mode from context)
```

### Mode Detection Pattern

```typescript
const { mode, exportData } = useAppMode();
const isViewerMode = mode === 'viewer';

// Viewer-specific behavior:
// - No edit buttons
// - Media from HTTP streaming (not file paths)
// - No case save/export operations
```

## Media Resolution

### Images → Blob URLs

```typescript
// Small files - OK to load into memory
const bytes = await invoke<number[]>('resolve_media_path', {
  mediaType: 'images',
  filename: 'screenshot.jpg'
});
const blob = new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });
const url = URL.createObjectURL(blob);
// MUST call URL.revokeObjectURL() on cleanup
```

### Videos → Streaming URLs

```typescript
// Large files - use HTTP streaming (no memory load, instant playback)
const url = await invoke<string>('get_streaming_media_url', {
  mediaType: 'videos',
  filename: 'footage.mp4'
});
// Returns: "http://localhost:21574/media/videos/footage.mp4"
// Browser handles Range requests automatically for seeking
```

### Why Different Approaches?

| | Images | Videos |
|---|--------|--------|
| Size | < 5 MB | 10-500 MB |
| Memory | OK to load | UI freeze if loaded |
| Method | Blob URL | HTTP streaming |
| Cleanup | `URL.revokeObjectURL()` | None needed |

## HTTP Streaming Server

**File:** `src-tauri/src/streaming.rs`

**Port:** 21574 (arbitrary high port)

**Routes:**

| Route | Response |
|-------|----------|
| `GET /health` | `200 OK` |
| `GET /media/images/:filename` | Image bytes |
| `GET /media/videos/:filename` | Video bytes (Range-aware) |

**Range Request Flow:**

```
Browser: GET /media/videos/footage.mp4
         Range: bytes=500-999

Server:  HTTP/1.1 206 Partial Content
         Content-Range: bytes 500-999/50000000
         [500 bytes of video]
```

## State Management

### useViewerStore

```typescript
interface ViewerState {
  exportData: ExportedCaseData | null;
  exeDirectory: string | null;       // Portable mode
  tempDirectory: string | null;      // .casedata mode (legacy)
  isLoading: boolean;
  loadError: string | null;
}

// Actions
loadPortableExport(exportData, exeDir)  // For viewer.exe
loadExport(exportData, tempDir)          // For .casedata files
clearExport()
```

### GeoJSON → CCTVLocation Transform

```typescript
function featureToLocation(feature): CCTVLocation {
  return {
    uuid: feature.properties.uuid,
    latitude: feature.geometry.coordinates[1],  // [lng, lat] → lat
    longitude: feature.geometry.coordinates[0], // [lng, lat] → lng
    address: feature.properties.address,
    // ... other properties
    image: Array.isArray(props.images)
      ? props.images.join('; ')  // Array → "; " separated string
      : props.images || '',
  };
}
```

## Testing

### Backend Tests

```bash
cd src-tauri
cargo test --features viewer                    # All viewer tests
cargo test viewer_data_has_correct_fields       # Single test
cargo test resolve_media_path_rejects           # Security tests
```

### Test Categories

| Test | Purpose |
|------|---------|
| `test_viewer_data_has_correct_fields` | Struct serialization |
| `test_geojson_is_parsed_value` | Not string |
| `test_case_name_extracted_from_metadata` | Metadata parsing |
| `test_binding_validation_*` | UUID matching |
| `test_resolve_media_path_rejects_*` | Path traversal |
| `test_discover_*` | .cadx file discovery |
| `test_parse_range_header_*` | HTTP Range parsing |

## Common Issues

### "Invalid GeoJSON structure"

**Cause:** Backend returned string instead of parsed object

**Fix:** Ensure `load_viewer_data()` returns `ViewerData` struct:

```rust
pub fn load_viewer_data() -> Result<ViewerData, String> {
    let geojson: serde_json::Value = serde_json::from_str(&content)?;
    Ok(ViewerData { case_name, geojson, media_path })  // Parsed, not string
}
```

### "Binding validation failed"

**Cause:** UUID mismatch between binding.json and .cadx

**Fix:** Re-export package from main application

### UI Freezes on Video Load

**Cause:** Using `resolve_media_path` instead of `get_streaming_media_url` for videos

**Fix:**

```typescript
// WRONG - loads entire video into memory
const bytes = await invoke('resolve_media_path', { ... });

// RIGHT - uses HTTP streaming
const url = await invoke('get_streaming_media_url', { ... });
```

### Memory Leak (Images)

**Cause:** Blob URLs not revoked

**Fix:**

```typescript
useEffect(() => {
  return () => {
    if (displaySrc?.startsWith('blob:')) {
      URL.revokeObjectURL(displaySrc);
    }
  };
}, [displaySrc]);
```

## Development Tasks

### Add New Viewer Command

1. **Define in viewer.rs:**
   ```rust
   #[cfg(feature = "viewer")]
   #[tauri::command]
   pub fn my_command() -> Result<String, String> { ... }
   ```

2. **Register in main.rs:**
   ```rust
   #[cfg(feature = "viewer")]
   {
       builder = builder.invoke_handler(tauri::generate_handler![
           commands::viewer::my_command,  // Add here
       ]);
   }
   ```

3. **Call from frontend:**
   ```typescript
   const result = await invoke<string>('my_command');
   ```

### Modify Media Streaming

1. **streaming.rs:** Modify `serve_media()` function
2. **Test:** `cargo test --features viewer`
3. **Rebuild:** `npm run tauri:build:viewer`

### Debug Loading Issues

Check console for `[VIEWER-DEBUG]` logs:

```
[VIEWER-DEBUG] load_viewer_data: Command called
[VIEWER-DEBUG] Found .cadx at "D:/Package/MyCase.cadx"
[VIEWER-DEBUG] Binding validation passed
[VIEWER-DEBUG] GeoJSON read, 12345 bytes
[VIEWER-DEBUG] Extracted case_name = 'MyCase'
```

## File Index

### Backend (Rust)

| File | Purpose |
|------|---------|
| `src-tauri/src/commands/viewer.rs` | Viewer commands |
| `src-tauri/src/streaming.rs` | HTTP streaming server |
| `src-tauri/tauri.viewer.json` | Viewer Tauri config |

### Frontend (TypeScript)

| File | Purpose |
|------|---------|
| `src/ViewerApp.tsx` | Root component |
| `src/viewer-main.tsx` | Entry point |
| `src/routes/viewer-routes.tsx` | Viewer routing |
| `src/features/viewer/stores/useViewerStore.ts` | State management |
| `src/features/viewer/services/viewerDataLoader.ts` | Data loading |
| `src/features/viewer/services/mediaPathResolver.ts` | Media resolution |
| `src/features/viewer/contexts/MediaPathContext.tsx` | Media context |

### Build Config

| File | Purpose |
|------|---------|
| `vite.config.viewer.ts` | Viewer Vite config |
| `index-viewer.html` | Viewer HTML entry |

## Critical Rules

| Rule | Rationale |
|------|-----------|
| **Build with `npm run tauri:build:viewer`** | Uses correct config |
| **Return ViewerData struct, not string** | Type safety across IPC |
| **Videos use streaming URLs** | Prevent UI freeze |
| **Revoke blob URLs on cleanup** | Prevent memory leaks |
| **Validate all filenames** | Security: path traversal |
| **Never modify data in viewer** | Read-only mode |
