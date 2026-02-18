/**
 * Reusable Icon Components for Map Timeline Feature
 *
 * Extracted from inline SVGs to reduce code duplication and improve maintainability.
 */

import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/**
 * Close/X Icon - Used in modals and buttons
 */
export const CloseIcon = ({ className = 'w-5 h-5', ...props }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

/**
 * Camera/Image Icon - Used for CCTV markers and image placeholders
 */
export const CameraIcon = ({ className = 'w-5 h-5', ...props }: IconProps) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    {...props}
  >
    <path d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2 0v10h8V5H6z"/>
    <path d="M14 8l4-2v8l-4-2V8z"/>
  </svg>
);

/**
 * Image/Photo Icon - Used for image thumbnails and placeholders
 */
export const ImageIcon = ({ className = 'w-8 h-8', ...props }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

/**
 * Video Icon - Used for video thumbnails and markers
 */
export const VideoIcon = ({ className = 'w-8 h-8', ...props }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

/**
 * Play Icon - Used for video playback controls
 */
export const PlayIcon = ({ className = 'w-5 h-5', ...props }: IconProps) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Pause Icon - Used for playback controls
 */
export const PauseIcon = ({ className = 'w-5 h-5', ...props }: IconProps) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Chevron Left Icon - Used for navigation
 */
export const ChevronLeftIcon = ({ className = 'w-5 h-5', ...props }: IconProps) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Chevron Right Icon - Used for navigation
 */
export const ChevronRightIcon = ({ className = 'w-5 h-5', ...props }: IconProps) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Chevron Up Icon - Used for collapse/expand
 */
export const ChevronUpIcon = ({ className = 'w-5 h-5', ...props }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 15l7-7 7 7"
    />
  </svg>
);

/**
 * Menu/List Icon - Used for filter button
 */
export const MenuIcon = ({ className = 'w-5 h-5', ...props }: IconProps) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Location/Map Pin Icon - Used for location markers
 */
export const LocationIcon = ({ className = 'w-5 h-5', ...props }: IconProps) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Fullscreen Icon - Used for fullscreen toggle
 */
export const FullscreenIcon = ({ className = 'w-5 h-5', ...props }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
    />
  </svg>
);

/**
 * Error/Alert Circle Icon - Used for error states
 */
export const ErrorIcon = ({ className = 'w-16 h-16', ...props }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
