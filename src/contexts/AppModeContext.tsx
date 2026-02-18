/**
 * AppModeContext
 *
 * Provides app mode switching between editor and viewer modes.
 * Viewer mode is read-only and supports:
 * - Temp extraction (.casedata files)
 * - Portable viewer (exe directory)
 */

import { createContext, useContext, ReactNode } from 'react';

/**
 * Viewer configuration type
 *
 * Minimal definition for app mode context. Will be replaced
 * during the Supabase migration when export types are finalized.
 */
export interface ViewerConfig {
  mode: 'editor' | 'viewer';
  readonly: boolean;
  exportData?: unknown;
  tempDirectory?: string;
  exeDirectory?: string;
}

/**
 * Default editor mode configuration
 */
const DEFAULT_CONFIG: ViewerConfig = {
  mode: 'editor',
  readonly: false,
};

/**
 * App Mode Context
 */
export const AppModeContext = createContext<ViewerConfig>(DEFAULT_CONFIG);

/**
 * AppModeProvider Props
 */
interface AppModeProviderProps {
  children: ReactNode;
  value?: ViewerConfig;
}

/**
 * AppModeProvider Component
 *
 * Wraps the app or route to provide mode configuration.
 */
export function AppModeProvider({ children, value = DEFAULT_CONFIG }: AppModeProviderProps) {
  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

/**
 * Hook to access app mode
 *
 * @returns Current ViewerConfig (mode, readonly, exportData, tempDirectory, exeDirectory)
 */
export function useAppMode(): ViewerConfig {
  const context = useContext(AppModeContext);

  if (!context) {
    // Fallback to default if used outside provider
    return DEFAULT_CONFIG;
  }

  return context;
}

/**
 * Hook to check if in viewer mode
 *
 * @returns true if app is in viewer mode
 */
export function useIsViewerMode(): boolean {
  const { mode } = useAppMode();
  return mode === 'viewer';
}

/**
 * Hook to check if readonly
 *
 * @returns true if app is in readonly mode
 */
export function useIsReadonly(): boolean {
  const { readonly } = useAppMode();
  return readonly;
}

/**
 * Hook to check if in portable viewer mode
 * (viewer without case file context, loads from exe directory)
 *
 * @returns true if in portable viewer mode
 */
export function useIsPortableViewer(): boolean {
  const { mode, tempDirectory, exeDirectory } = useAppMode();
  // Portable viewer: mode is 'viewer' AND has exeDirectory (not tempDirectory)
  return mode === 'viewer' && !!exeDirectory && !tempDirectory;
}
