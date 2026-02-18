/**
 * Media Path Context for Viewer Mode (ENHANCED FOR PORTABLE VIEWER)
 *
 * Resolves media paths differently based on context:
 * - Editor: case directory (synchronous filesystem paths)
 * - Temp Viewer: temp extraction directory (synchronous filesystem paths)
 * - Portable Viewer: .cadx ZIP container (async - images use blob URLs, videos use streaming URLs)
 */

import { createContext, useContext, type ReactNode } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useAppMode } from '@/contexts/AppModeContext';
import { useCaseStore } from '@/stores/useCaseStore';
import { useViewerStore } from '@/features/viewer/stores/useViewerStore';
import { getImagesPath, getVideoPath } from '@/features/shared/config';
import { isSafeFilename } from '@/types/export.types';
import { resolveImagePath, resolveVideoPath } from '@/features/viewer/services/mediaPathResolver';

/**
 * Media path resolver interface
 *
 * NOTE: Methods are async to support .cadx ZIP reading in portable viewer mode.
 * Editor and temp viewer modes return immediately with synchronous filesystem paths.
 */
export interface MediaPathResolver {
  getImagePath: (filename: string) => Promise<string | null>;
  getVideoPath: (filename: string) => Promise<string | null>;
}

/**
 * Media Path Context
 */
export const MediaPathContext = createContext<MediaPathResolver | null>(null);

/**
 * Hook to access media path resolver
 */
export function useMediaPath(): MediaPathResolver {
  const context = useContext(MediaPathContext);
  if (!context) {
    throw new Error('useMediaPath must be used within MediaPathProvider');
  }
  return context;
}

/**
 * Provider component
 */
interface MediaPathProviderProps {
  children: ReactNode;
}

export function MediaPathProvider({ children }: MediaPathProviderProps) {
  const { mode } = useAppMode();
  const currentCase = useCaseStore((state) => state.currentCase);
  const { tempDirectory, exeDirectory } = useViewerStore();

  const resolver: MediaPathResolver = {
    getImagePath: async (filename: string): Promise<string | null> => {
      // Validate filename for security
      if (!isSafeFilename(filename)) {
        console.error('Invalid filename:', filename);
        return null;
      }

      if (mode === 'editor') {
        // Editor mode: case directory (synchronous filesystem)
        if (!currentCase) {
          console.error('No current case in editor mode');
          return null;
        }
        const imagePath = `${getImagesPath(currentCase.case_path)}\\${filename}`;
        return convertFileSrc(imagePath);
      } else if (exeDirectory) {
        // Portable viewer mode: .cadx ZIP container (async blob URL for images)
        return await resolveImagePath(filename);
      } else if (tempDirectory) {
        // Temp viewer mode (old .casedata flow - synchronous filesystem)
        const imagePath = `${tempDirectory}\\media\\images\\${filename}`;
        return convertFileSrc(imagePath);
      }

      console.error('No valid directory for media resolution');
      return null;
    },

    getVideoPath: async (filename: string): Promise<string | null> => {
      // Validate filename for security
      if (!isSafeFilename(filename)) {
        console.error('Invalid filename:', filename);
        return null;
      }

      if (mode === 'editor') {
        // Editor mode: case directory (synchronous filesystem)
        if (!currentCase) {
          console.error('No current case in editor mode');
          return null;
        }
        const videoPath = `${getVideoPath(currentCase.case_path)}\\${filename}`;
        return convertFileSrc(videoPath);
      } else if (exeDirectory) {
        // Portable viewer mode: .cadx ZIP container (async streaming URL for videos)
        return await resolveVideoPath(filename);
      } else if (tempDirectory) {
        // Temp viewer mode (old .casedata flow - synchronous filesystem)
        const videoPath = `${tempDirectory}\\media\\videos\\${filename}`;
        return convertFileSrc(videoPath);
      }

      console.error('No valid directory for media resolution');
      return null;
    },
  };

  return (
    <MediaPathContext.Provider value={resolver}>
      {children}
    </MediaPathContext.Provider>
  );
}
