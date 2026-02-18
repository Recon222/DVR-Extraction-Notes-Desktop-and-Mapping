import { MediaThumbnail } from './MediaThumbnail';
import { getThumbnails, getMediaSlidesByType } from '../../utils/mediaHelpers';
import { useMapTimelineStore } from '../../stores/mapTimelineStore';
import type { CCTVLocation } from '@/types/cctv.types';

interface MediaGridProps {
  location: CCTVLocation;
  caseDir: string;
  mediaType: 'images' | 'videos';
}

export const MediaGrid = ({ location, caseDir, mediaType }: MediaGridProps) => {
  const thumbnails = getThumbnails(location, caseDir, mediaType === 'images' ? 'image' : 'video');

  const handleThumbnailClick = () => {
    // Get slides filtered by the current media type only
    const slides = getMediaSlidesByType(location, caseDir, mediaType);

    // Open lightbox at the first item (index 0) since we're only showing one type
    useMapTimelineStore.getState().openLightbox(slides, 0);
  };

  if (thumbnails.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {mediaType === 'images' ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          )}
        </svg>
        <p className="text-sm">No {mediaType} available</p>
      </div>
    );
  }

  // Always show only the first thumbnail, with count badge if multiple
  return (
    <MediaThumbnail
      src={thumbnails[0]}
      type={mediaType === 'images' ? 'image' : 'video'}
      onClick={handleThumbnailClick}
      size="large"
      count={thumbnails.length > 1 ? thumbnails.length : undefined}
    />
  );
};
