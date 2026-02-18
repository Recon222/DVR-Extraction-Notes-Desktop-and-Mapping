/**
 * Media Service Layer Tests (TDD RED Phase)
 *
 * These tests define the CONTRACT for mediaService.ts before implementation.
 * They validate that the service layer correctly wraps typed Tauri commands
 * from @/lib/tauri-bindings, following the template's service layer pattern.
 *
 * Mock strategy: Mock `commands.*` from `@/lib/tauri-bindings` (tauri-specta).
 * This is the correct layer to mock for service tests per AGENTS.md:
 *   Component -> Hook -> Service -> Command -> Rust
 *   Service tests mock Command (the layer directly below).
 *
 * Expected state after writing: ALL tests RED (service is a stub).
 * Expected state after implementation: ALL tests GREEN.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the typed commands from tauri-specta bindings
// This mock overrides the global mock in setup.ts with media-specific commands
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    readFileAsBase64: vi.fn(),
    getStreamingMediaUrl: vi.fn(),
    resolveMediaPath: vi.fn(),
  },
  unwrapResult: vi.fn((result: { status: string; data?: unknown; error?: unknown }) => {
    if (result.status === 'ok') return result.data
    throw result.error
  }),
}))

// Import AFTER mock declaration (vi.mock is hoisted)
import { commands } from '@/lib/tauri-bindings'
import {
  readFileAsBase64,
  getStreamingMediaUrl,
  resolveMediaPath,
} from '../mediaService'

describe('mediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // readFileAsBase64
  // =========================================================================
  describe('readFileAsBase64', () => {
    const mockFilePath = 'C:\\Cases\\case-001\\images\\photo.jpg'
    const mockBase64Result = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'

    it('should call commands.readFileAsBase64 with the file path', async () => {
      vi.mocked(commands.readFileAsBase64).mockResolvedValue({
        status: 'ok',
        data: mockBase64Result,
      } as never)

      await readFileAsBase64(mockFilePath)

      expect(commands.readFileAsBase64).toHaveBeenCalledTimes(1)
      expect(commands.readFileAsBase64).toHaveBeenCalledWith(mockFilePath)
    })

    it('should return the base64 data string on success', async () => {
      vi.mocked(commands.readFileAsBase64).mockResolvedValue({
        status: 'ok',
        data: mockBase64Result,
      } as never)

      const result = await readFileAsBase64(mockFilePath)

      expect(result).toBe(mockBase64Result)
    })

    it('should throw an error when the command returns an error result', async () => {
      vi.mocked(commands.readFileAsBase64).mockResolvedValue({
        status: 'error',
        error: 'File not found: photo.jpg',
      } as never)

      await expect(readFileAsBase64(mockFilePath)).rejects.toThrow()
    })

    it('should propagate the error message from the command', async () => {
      const errorMessage = 'Permission denied: cannot read file'
      vi.mocked(commands.readFileAsBase64).mockResolvedValue({
        status: 'error',
        error: errorMessage,
      } as never)

      await expect(readFileAsBase64(mockFilePath)).rejects.toThrow(errorMessage)
    })

    it('should handle empty file path gracefully', async () => {
      vi.mocked(commands.readFileAsBase64).mockResolvedValue({
        status: 'error',
        error: 'File path cannot be empty',
      } as never)

      await expect(readFileAsBase64('')).rejects.toThrow()
    })

    it('should forward paths with special characters correctly', async () => {
      const specialPath = 'C:\\Cases\\case 001\\images\\photo (1).jpg'
      vi.mocked(commands.readFileAsBase64).mockResolvedValue({
        status: 'ok',
        data: mockBase64Result,
      } as never)

      await readFileAsBase64(specialPath)

      expect(commands.readFileAsBase64).toHaveBeenCalledWith(specialPath)
    })
  })

  // =========================================================================
  // getStreamingMediaUrl
  // =========================================================================
  describe('getStreamingMediaUrl', () => {
    const mockStreamingUrl = 'http://localhost:12345/media/videos/clip.mp4'

    it('should call commands.getStreamingMediaUrl with mediaType and filename', async () => {
      vi.mocked(commands.getStreamingMediaUrl).mockResolvedValue({
        status: 'ok',
        data: mockStreamingUrl,
      } as never)

      await getStreamingMediaUrl('videos', 'clip.mp4')

      expect(commands.getStreamingMediaUrl).toHaveBeenCalledTimes(1)
      expect(commands.getStreamingMediaUrl).toHaveBeenCalledWith('videos', 'clip.mp4')
    })

    it('should return the streaming URL on success', async () => {
      vi.mocked(commands.getStreamingMediaUrl).mockResolvedValue({
        status: 'ok',
        data: mockStreamingUrl,
      } as never)

      const result = await getStreamingMediaUrl('videos', 'clip.mp4')

      expect(result).toBe(mockStreamingUrl)
    })

    it('should work with image media type', async () => {
      const imageUrl = 'http://localhost:12345/media/images/photo.jpg'
      vi.mocked(commands.getStreamingMediaUrl).mockResolvedValue({
        status: 'ok',
        data: imageUrl,
      } as never)

      const result = await getStreamingMediaUrl('images', 'photo.jpg')

      expect(result).toBe(imageUrl)
      expect(commands.getStreamingMediaUrl).toHaveBeenCalledWith('images', 'photo.jpg')
    })

    it('should throw an error when the command returns an error result', async () => {
      vi.mocked(commands.getStreamingMediaUrl).mockResolvedValue({
        status: 'error',
        error: 'Media not found in archive',
      } as never)

      await expect(getStreamingMediaUrl('videos', 'missing.mp4')).rejects.toThrow()
    })

    it('should propagate the error message from the command', async () => {
      const errorMessage = 'Archive is corrupted'
      vi.mocked(commands.getStreamingMediaUrl).mockResolvedValue({
        status: 'error',
        error: errorMessage,
      } as never)

      await expect(
        getStreamingMediaUrl('videos', 'clip.mp4'),
      ).rejects.toThrow(errorMessage)
    })

    it('should handle filenames with spaces and special characters', async () => {
      const filename = 'CCTV Camera 01 - 2024-08-29.mp4'
      vi.mocked(commands.getStreamingMediaUrl).mockResolvedValue({
        status: 'ok',
        data: `http://localhost:12345/media/videos/${encodeURIComponent(filename)}`,
      } as never)

      await getStreamingMediaUrl('videos', filename)

      expect(commands.getStreamingMediaUrl).toHaveBeenCalledWith('videos', filename)
    })
  })

  // =========================================================================
  // resolveMediaPath
  // =========================================================================
  describe('resolveMediaPath', () => {
    // A small byte array representing image data
    const mockBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]

    it('should call commands.resolveMediaPath with mediaType and filename', async () => {
      vi.mocked(commands.resolveMediaPath).mockResolvedValue({
        status: 'ok',
        data: mockBytes,
      } as never)

      await resolveMediaPath('images', 'photo.jpg')

      expect(commands.resolveMediaPath).toHaveBeenCalledTimes(1)
      expect(commands.resolveMediaPath).toHaveBeenCalledWith('images', 'photo.jpg')
    })

    it('should return the byte array on success', async () => {
      vi.mocked(commands.resolveMediaPath).mockResolvedValue({
        status: 'ok',
        data: mockBytes,
      } as never)

      const result = await resolveMediaPath('images', 'photo.jpg')

      expect(result).toEqual(mockBytes)
    })

    it('should return an array of numbers representing bytes', async () => {
      vi.mocked(commands.resolveMediaPath).mockResolvedValue({
        status: 'ok',
        data: mockBytes,
      } as never)

      const result = await resolveMediaPath('images', 'photo.jpg')

      expect(Array.isArray(result)).toBe(true)
      result.forEach(byte => {
        expect(typeof byte).toBe('number')
        expect(byte).toBeGreaterThanOrEqual(0)
        expect(byte).toBeLessThanOrEqual(255)
      })
    })

    it('should handle large byte arrays (image data)', async () => {
      // Simulate a small 1KB image
      const largeBytes = Array.from({ length: 1024 }, (_, i) => i % 256)
      vi.mocked(commands.resolveMediaPath).mockResolvedValue({
        status: 'ok',
        data: largeBytes,
      } as never)

      const result = await resolveMediaPath('images', 'large-photo.png')

      expect(result).toHaveLength(1024)
      expect(result).toEqual(largeBytes)
    })

    it('should throw an error when the command returns an error result', async () => {
      vi.mocked(commands.resolveMediaPath).mockResolvedValue({
        status: 'error',
        error: 'File not found in archive: photo.jpg',
      } as never)

      await expect(resolveMediaPath('images', 'photo.jpg')).rejects.toThrow()
    })

    it('should propagate the error message from the command', async () => {
      const errorMessage = 'Failed to extract media from archive'
      vi.mocked(commands.resolveMediaPath).mockResolvedValue({
        status: 'error',
        error: errorMessage,
      } as never)

      await expect(
        resolveMediaPath('images', 'photo.jpg'),
      ).rejects.toThrow(errorMessage)
    })

    it('should handle empty filename', async () => {
      vi.mocked(commands.resolveMediaPath).mockResolvedValue({
        status: 'error',
        error: 'Filename cannot be empty',
      } as never)

      await expect(resolveMediaPath('images', '')).rejects.toThrow()
    })

    it('should work with video media type', async () => {
      const videoBytes = [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]
      vi.mocked(commands.resolveMediaPath).mockResolvedValue({
        status: 'ok',
        data: videoBytes,
      } as never)

      const result = await resolveMediaPath('videos', 'clip.mp4')

      expect(result).toEqual(videoBytes)
      expect(commands.resolveMediaPath).toHaveBeenCalledWith('videos', 'clip.mp4')
    })
  })

  // =========================================================================
  // Cross-cutting concerns
  // =========================================================================
  describe('service contract', () => {
    it('should export readFileAsBase64 as a plain async function', () => {
      expect(typeof readFileAsBase64).toBe('function')
    })

    it('should export getStreamingMediaUrl as a plain async function', () => {
      expect(typeof getStreamingMediaUrl).toBe('function')
    })

    it('should export resolveMediaPath as a plain async function', () => {
      expect(typeof resolveMediaPath).toBe('function')
    })

    it('should return promises from all service functions', () => {
      // Mock all commands to return ok results so we can check return types
      vi.mocked(commands.readFileAsBase64).mockResolvedValue({
        status: 'ok',
        data: 'data:image/jpeg;base64,...',
      } as never)
      vi.mocked(commands.getStreamingMediaUrl).mockResolvedValue({
        status: 'ok',
        data: 'http://localhost/media/test.mp4',
      } as never)
      vi.mocked(commands.resolveMediaPath).mockResolvedValue({
        status: 'ok',
        data: [0xFF],
      } as never)

      // All service functions should return thenables (promises)
      const p1 = readFileAsBase64('/test')
      const p2 = getStreamingMediaUrl('images', 'test.jpg')
      const p3 = resolveMediaPath('images', 'test.jpg')

      expect(p1).toBeInstanceOf(Promise)
      expect(p2).toBeInstanceOf(Promise)
      expect(p3).toBeInstanceOf(Promise)

      // Suppress unhandled rejection from stub throwing
      p1.catch(() => {})
      p2.catch(() => {})
      p3.catch(() => {})
    })
  })
})
