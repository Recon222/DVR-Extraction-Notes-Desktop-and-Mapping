/**
 * STUB: Lightweight placeholder for Tauri v1.5 app's POV editing context.
 * Will be replaced when the POV editing feature is fully implemented.
 * Created to unblock mapTimeline feature compilation.
 *
 * Consumed by:
 * - mapTimeline/components/MapTimelineView.tsx (EditPOVProvider)
 * - mapTimeline/components/map/menu/EditPOVToggleMenuItem.tsx (useEditPOVContext)
 *
 * Defaults to editing disabled since there is no POV data yet.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

interface EditPOVContextValue {
  /** Whether POV edit mode is currently active */
  isEditMode: boolean;

  /** Toggle POV edit mode on/off */
  toggleEditMode: () => void;

  /** Explicitly set POV edit mode */
  setEditMode: (enabled: boolean) => void;
}

const EditPOVContext = createContext<EditPOVContextValue>({
  isEditMode: false,
  toggleEditMode: () => {},
  setEditMode: () => {},
});

/**
 * Hook to access POV editing context.
 */
export function useEditPOVContext(): EditPOVContextValue {
  return useContext(EditPOVContext);
}

/**
 * Provider component that manages POV editing state.
 */
interface EditPOVProviderProps {
  children: ReactNode;
}

export function EditPOVProvider({ children }: EditPOVProviderProps) {
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleEditMode = () => setIsEditMode((prev) => !prev);
  const setEditMode = (enabled: boolean) => setIsEditMode(enabled);

  return (
    <EditPOVContext.Provider value={{ isEditMode, toggleEditMode, setEditMode }}>
      {children}
    </EditPOVContext.Provider>
  );
}
