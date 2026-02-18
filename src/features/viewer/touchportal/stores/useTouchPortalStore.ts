/**
 * Touch Portal Connection Store
 *
 * Manages ONLY connection state for Touch Portal.
 * Does NOT duplicate or modify mapTimelineStore state.
 */

import { create } from 'zustand';
import type { TPConnectionState, TPAction } from '../types/touchportal.types';

interface TouchPortalStore extends TPConnectionState {
  // Actions
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  setLastCommand: (action: TPAction) => void;
  setClientCount: (count: number) => void;
  reset: () => void;
}

const initialState: TPConnectionState = {
  isConnected: false,
  connectionError: null,
  lastCommand: null,
  lastCommandTime: null,
  clientCount: 0,
};

export const useTouchPortalStore = create<TouchPortalStore>()((set) => ({
  ...initialState,

  setConnected: (connected) =>
    set({
      isConnected: connected,
      connectionError: null,  // Always clear error on connection state change
    }),

  setError: (error) =>
    set({
      connectionError: error,
      isConnected: false,
    }),

  setLastCommand: (action) =>
    set({
      lastCommand: action,
      lastCommandTime: Date.now(),
    }),

  setClientCount: (count) =>
    set({ clientCount: count }),

  reset: () => set(initialState),
}));
