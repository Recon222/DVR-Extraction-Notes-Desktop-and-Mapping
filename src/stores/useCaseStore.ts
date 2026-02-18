/**
 * STUB: Lightweight placeholder for Tauri v1.5 app's case management store.
 * Will be replaced when the case management feature is fully implemented.
 * Created to unblock mapTimeline feature compilation.
 *
 * Consumed by:
 * - mapTimeline/components/MapTimelineView.tsx (selector: state.currentCase)
 * - viewer/contexts/MediaPathContext.tsx (selector: state.currentCase)
 */

import { create } from 'zustand';

/**
 * Represents a loaded case with its name and filesystem path.
 */
export interface CaseInfo {
  /** Display name of the case */
  case_name: string;

  /** Filesystem path to the case directory */
  case_path: string;
}

interface CaseState {
  /** Currently loaded case, or null if no case is open */
  currentCase: CaseInfo | null;

  /** Set the current case */
  setCurrentCase: (caseInfo: CaseInfo | null) => void;
}

export const useCaseStore = create<CaseState>()((set) => ({
  currentCase: null,

  setCurrentCase: (caseInfo) => set({ currentCase: caseInfo }),
}));
