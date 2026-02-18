/**
 * useViewerStore Tests
 *
 * TDD tests for the viewer mode Zustand store.
 * Tests store initialization from export data, readonly enforcement, and media path resolution.
 *
 * Coverage Target: 95%+
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Import store to be implemented
import { useViewerStore } from '../stores/useViewerStore';

// Import types
import type { ExportedCaseData } from '@/types/export.types';
import type { CCTVLocation } from '@/types/cctv.types';

// Mock export data
const mockExportData: ExportedCaseData = {
  version: '1.0.0',
  exportedAt: '2025-12-01T10:30:00.000Z',
  geoJSON: {
    type: 'FeatureCollection',
    metadata: {
      caseName: 'Test Case',
      createdAt: '2025-11-01T00:00:00.000Z',
      lastModified: '2025-12-01T10:00:00.000Z',
      version: '1.0.0',
      sourceFile: 'CCTV_Chronology.xlsx',
    },
    features: [
      {
        type: 'Feature',
        id: 'uuid-123',
        geometry: {
          type: 'Point',
          coordinates: [-79.7624, 43.7315],
        },
        properties: {
          uuid: 'uuid-123',
          rowIndex: 1,
          realDateTime: '2025-12-01T10:00:00.000Z',
          dvrDateTime: '2025-12-01T10:02:00.000Z',
          dvrTimeOffset: '+00:02:00',
          address: '123 Main St',
          timing: 'incident',
          notes: 'Test note',
          personsInvolved: 'John Doe',
          images: ['img1.jpg'],
          videos: ['vid1.mp4'],
          mapboxPOV: null,
          streetViewPOV: null,
        },
      },
    ],
  },
  caseName: 'Test Case',
  initialViewport: {
    longitude: -79.7624,
    latitude: 43.7315,
    zoom: 15,
  },
  filters: {
    timing: ['incident'],
    hasMedia: true,
  },
  mediaManifest: {
    images: ['img1.jpg'],
    videos: ['vid1.mp4'],
  },
  manifest: {
    fileCount: 2,
    totalSize: 500000,
    checksum: 'abc123',
    generatedBy: 'CCTV Chronology Creator v0.1.0',
  },
};

describe('useViewerStore - Initialization', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useViewerStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should initialize with null state', () => {
    const { result } = renderHook(() => useViewerStore());

    expect(result.current.exportData).toBeNull();
    expect(result.current.tempDirectory).toBe('');
    expect(result.current.isViewerMode).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should have readonly flag set to true', () => {
    const { result } = renderHook(() => useViewerStore());

    expect(result.current.readonly).toBe(true);
  });
});

describe('useViewerStore - Load export data', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useViewerStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should load export data and set viewer mode', () => {
    const { result } = renderHook(() => useViewerStore());

    const tempDir = 'C:\\Users\\Admin\\AppData\\Local\\Temp\\casedata-abc123';

    act(() => {
      result.current.loadExport(mockExportData, tempDir);
    });

    expect(result.current.exportData).toEqual(mockExportData);
    expect(result.current.tempDirectory).toBe(tempDir);
    expect(result.current.isViewerMode).toBe(true);
  });

  it('should initialize locations from GeoJSON features', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    expect(result.current.locations).toBeDefined();
    expect(result.current.locations).toHaveLength(1);
    expect(result.current.locations[0].uuid).toBe('uuid-123');
    expect(result.current.locations[0].address).toBe('123 Main St');
  });

  it('should restore viewport from export data', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    expect(result.current.viewport).toEqual(mockExportData.initialViewport);
  });

  it('should restore filters from export data', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    expect(result.current.filters).toEqual(mockExportData.filters);
  });

  it('should handle export data with null filters', () => {
    const { result } = renderHook(() => useViewerStore());

    const dataWithoutFilters = {
      ...mockExportData,
      filters: null,
    };

    act(() => {
      result.current.loadExport(dataWithoutFilters, 'C:\\Temp\\abc123');
    });

    expect(result.current.filters).toBeNull();
  });

  it('should set loading state during load', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
      result.current.setLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe('useViewerStore - Readonly enforcement', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useViewerStore());
    act(() => {
      result.current.reset();
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });
  });

  it('should not allow adding locations in viewer mode', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    const newLocation: CCTVLocation = {
      rowIndex: 2,
      realDateTime: '2025-12-01T11:00:00.000Z',
      dvrDateTime: '2025-12-01T11:02:00.000Z',
      dvrTimeOffset: '+00:02:00',
      address: '456 Queen St',
      latitude: 43.7415,
      longitude: -79.7724,
      notes: '',
      personsInvolved: '',
      timing: 'pre',
      image: '',
      video: '',
      uuid: 'uuid-456',
    };

    // addLocation should be disabled or throw error
    expect(() => {
      act(() => {
        result.current.addLocation(newLocation);
      });
    }).toThrow(/readonly/i);
  });

  it('should not allow editing locations in viewer mode', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    const updatedLocation: CCTVLocation = {
      ...result.current.locations[0],
      notes: 'Updated note',
    };

    expect(() => {
      act(() => {
        result.current.updateLocation(updatedLocation);
      });
    }).toThrow(/readonly/i);
  });

  it('should not allow deleting locations in viewer mode', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    const locationId = result.current.locations[0].uuid;

    expect(() => {
      act(() => {
        result.current.deleteLocation(locationId);
      });
    }).toThrow(/readonly/i);
  });

  it('should allow read operations in viewer mode', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    // These should work
    const location = result.current.getLocationById('uuid-123');
    expect(location).toBeDefined();
    expect(location?.uuid).toBe('uuid-123');

    const allLocations = result.current.locations;
    expect(allLocations).toHaveLength(1);
  });
});

describe('useViewerStore - Media path resolution', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useViewerStore());
    act(() => {
      result.current.reset();
      result.current.loadExport(mockExportData, 'C:\\Temp\\casedata-abc123');
    });
  });

  it('should resolve image paths from temp directory', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\casedata-abc123');
    });

    const imagePath = result.current.getImagePath('img1.jpg');

    expect(imagePath).toContain('C:\\Temp\\casedata-abc123');
    expect(imagePath).toContain('media');
    expect(imagePath).toContain('images');
    expect(imagePath).toContain('img1.jpg');
  });

  it('should resolve video paths from temp directory', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\casedata-abc123');
    });

    const videoPath = result.current.getVideoPath('vid1.mp4');

    expect(videoPath).toContain('C:\\Temp\\casedata-abc123');
    expect(videoPath).toContain('media');
    expect(videoPath).toContain('videos');
    expect(videoPath).toContain('vid1.mp4');
  });

  it('should handle Windows path separators correctly', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\casedata-abc123');
    });

    const path = result.current.getImagePath('img1.jpg');

    // Should use backslashes on Windows
    expect(path.includes('\\')).toBe(true);
  });

  it('should validate filename before resolving path', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\casedata-abc123');
    });

    // Should reject directory traversal
    expect(() => {
      result.current.getImagePath('../../../etc/passwd');
    }).toThrow();

    // Should reject absolute paths
    expect(() => {
      result.current.getImagePath('C:\\Windows\\System32\\file.jpg');
    }).toThrow();
  });

  it('should return null for files not in manifest', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\casedata-abc123');
    });

    const path = result.current.getImagePath('not-in-manifest.jpg');

    expect(path).toBeNull();
  });
});

describe('useViewerStore - Timeline state', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useViewerStore());
    act(() => {
      result.current.reset();
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });
  });

  it('should initialize timeline with first location', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.revealedCount).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it('should allow playback controls in viewer mode', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    // Should allow playback
    act(() => {
      result.current.startPlayback();
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.pausePlayback();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('should allow navigation through timeline', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    act(() => {
      result.current.setCurrentIndex(0);
    });

    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.revealUpTo(0);
    });

    expect(result.current.revealedCount).toBe(1);
  });
});

describe('useViewerStore - Case metadata', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useViewerStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should expose case name from export data', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    expect(result.current.caseName).toBe('Test Case');
  });

  it('should expose export metadata', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    expect(result.current.exportVersion).toBe('1.0.0');
    expect(result.current.exportedAt).toBe('2025-12-01T10:30:00.000Z');
    expect(result.current.generatedBy).toBe('CCTV Chronology Creator v0.1.0');
  });

  it('should expose media counts', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    expect(result.current.imageCount).toBe(1);
    expect(result.current.videoCount).toBe(1);
  });
});

describe('useViewerStore - Cleanup', () => {
  it('should reset store state', () => {
    const { result } = renderHook(() => useViewerStore());

    act(() => {
      result.current.loadExport(mockExportData, 'C:\\Temp\\abc123');
    });

    expect(result.current.isViewerMode).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.exportData).toBeNull();
    expect(result.current.tempDirectory).toBe('');
    expect(result.current.isViewerMode).toBe(false);
    expect(result.current.locations).toHaveLength(0);
  });

  it('should trigger cleanup of temp directory on reset', async () => {
    const { result } = renderHook(() => useViewerStore());

    const tempDir = 'C:\\Temp\\casedata-abc123';

    act(() => {
      result.current.loadExport(mockExportData, tempDir);
    });

    // Reset should trigger cleanup
    let cleanupCalled = false;
    result.current.onCleanup = () => {
      cleanupCalled = true;
    };

    act(() => {
      result.current.reset();
    });

    expect(cleanupCalled).toBe(true);
  });
});

describe('useViewerStore - Error handling', () => {
  it('should handle invalid export data gracefully', () => {
    const { result } = renderHook(() => useViewerStore());

    const invalidData = {
      version: '1.0.0',
      // Missing required fields
    } as ExportedCaseData;

    expect(() => {
      act(() => {
        result.current.loadExport(invalidData, 'C:\\Temp\\abc123');
      });
    }).toThrow();
  });

  it('should handle empty features array', () => {
    const { result } = renderHook(() => useViewerStore());

    const emptyData = {
      ...mockExportData,
      geoJSON: {
        ...mockExportData.geoJSON,
        features: [],
      },
    };

    act(() => {
      result.current.loadExport(emptyData, 'C:\\Temp\\abc123');
    });

    expect(result.current.locations).toHaveLength(0);
  });

  it('should validate temp directory path', () => {
    const { result } = renderHook(() => useViewerStore());

    // Relative path should be rejected
    expect(() => {
      act(() => {
        result.current.loadExport(mockExportData, './temp/abc123');
      });
    }).toThrow(/absolute path/i);

    // Path with .. should be rejected
    expect(() => {
      act(() => {
        result.current.loadExport(mockExportData, 'C:\\Temp\\..\\abc123');
      });
    }).toThrow();
  });
});
