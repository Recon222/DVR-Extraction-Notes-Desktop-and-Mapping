import { splitFileString, getImagesPath, getVideoPath, PATH_SEP } from '@config/filePaths';
import type { CCTVLocation } from '@/types/cctv.types';
import type { LightboxSlide } from '../types';

/**
 * Build full file path with proper path separator
 */
function buildFilePath(directory: string, filename: string): string {
  return `${directory}${PATH_SEP}${filename}`;
}

export function getMediaSlides(location: CCTVLocation, caseDir: string): LightboxSlide[] {
  const slides: LightboxSlide[] = [];
  const imageDir = getImagesPath(caseDir);
  const videoDir = getVideoPath(caseDir);

  // Add images
  const imageFiles = splitFileString(location.image);
  imageFiles.forEach(filename => {
    if (filename) {
      slides.push({
        src: buildFilePath(imageDir, filename),
        type: 'image',
        title: filename
      });
    }
  });

  // Add videos
  const videoFiles = splitFileString(location.video);
  videoFiles.forEach(filename => {
    if (filename) {
      slides.push({
        src: buildFilePath(videoDir, filename),
        type: 'video',
        title: filename
      });
    }
  });

  return slides;
}

/**
 * Get media slides filtered by type (images OR videos only)
 */
export function getMediaSlidesByType(
  location: CCTVLocation,
  caseDir: string,
  mediaType: 'images' | 'videos'
): LightboxSlide[] {
  const slides: LightboxSlide[] = [];

  if (mediaType === 'images') {
    const imageDir = getImagesPath(caseDir);
    const imageFiles = splitFileString(location.image);
    imageFiles.forEach(filename => {
      if (filename) {
        slides.push({
          src: buildFilePath(imageDir, filename),
          type: 'image',
          title: filename
        });
      }
    });
  } else {
    const videoDir = getVideoPath(caseDir);
    const videoFiles = splitFileString(location.video);
    videoFiles.forEach(filename => {
      if (filename) {
        slides.push({
          src: buildFilePath(videoDir, filename),
          type: 'video',
          title: filename
        });
      }
    });
  }

  return slides;
}

export function getMediaCounts(location: CCTVLocation): { images: number; videos: number } {
  return {
    images: splitFileString(location.image).filter(Boolean).length,
    videos: splitFileString(location.video).filter(Boolean).length
  };
}

export function getThumbnails(location: CCTVLocation, caseDir: string, type: 'image' | 'video'): string[] {
  const dir = type === 'image' ? getImagesPath(caseDir) : getVideoPath(caseDir);
  const files = splitFileString(type === 'image' ? location.image : location.video);
  return files.filter(Boolean).map(f => buildFilePath(dir, f));
}
