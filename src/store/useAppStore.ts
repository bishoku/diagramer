import { create } from 'zustand';
import { AppState } from '../types';
import { StorageService } from '../services/storage';

import { createWorkspaceSlice } from './slices/workspaceSlice';
import { createCanvasSlice } from './slices/canvasSlice';
import { createTimelineSlice } from './slices/timelineSlice';
import { createStudioSlice } from './slices/studioSlice';
import { createHistorySlice } from './slices/historySlice';

import { calculateSchedules } from './scheduler';

// Try to load persisted Google User
const savedGoogleUserStr = localStorage.getItem('diagramer_google_user');
let savedGoogleUser = null;
if (savedGoogleUserStr) {
  try {
    const parsed = JSON.parse(savedGoogleUserStr);
    if (parsed.expiresAt > Date.now()) {
      savedGoogleUser = parsed;
    } else {
      localStorage.removeItem('diagramer_google_user');
    }
  } catch (e) {}
}

export const useAppStore = create<AppState>()((set, get, store) => {
  const wrappedSet: typeof set = (partial, replace) => {
    set((state) => {
      const nextState = typeof partial === 'function' ? (partial as Function)(state) : partial;
      
      const logicalChanged = nextState.logicalData !== undefined && nextState.logicalData !== state.logicalData;
      const timelinesChanged = nextState.visualData !== undefined && 
                               nextState.visualData.timelines !== undefined && 
                               nextState.visualData.timelines !== state.visualData.timelines;

      if (logicalChanged || timelinesChanged) {
        const mergedLogical = nextState.logicalData !== undefined ? nextState.logicalData : state.logicalData;
        const mergedVisual = nextState.visualData !== undefined ? nextState.visualData : state.visualData;
        nextState.schedules = calculateSchedules(
          mergedLogical.sequences || [],
          mergedVisual.timelines || {},
          mergedLogical.edges || [],
          mergedLogical.nodes || []
        );
      }
      return nextState;
    }, replace as any);
  };

  const a: [any, any, any] = [wrappedSet, get, store];

  return {
    ...createWorkspaceSlice(...a),
    ...createCanvasSlice(...a),
    ...createTimelineSlice(...a),
    ...createStudioSlice(...a),
    ...createHistorySlice(...a),

    // Phase 2 Canvas Initial State
    logicalData: { schemaVersion: 1, nodes: [], edges: [], sequences: [] },
    visualData: { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} },
    schedules: {},
    
    // Google Drive Sync Initial State
    googleUser: savedGoogleUser,
    syncState: 'idle',
    lastSyncedAt: null,
    hasUnsyncedChanges: false,
    
    setGoogleUser: (user) => {
      if (user) {
        localStorage.setItem('diagramer_google_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('diagramer_google_user');
      }
      wrappedSet({ googleUser: user });
    },
    setSyncState: (state) => wrappedSet({ syncState: state }),
    setLastSyncedAt: (timestamp) => wrappedSet({ lastSyncedAt: timestamp }),
    setHasUnsyncedChanges: (hasUnsynced) => wrappedSet({ hasUnsyncedChanges: hasUnsynced }),
  };
});

// ── Shared Save Logic ─────────────────────────────────────────────────────
let isSavingLock = false;

const performSave = async (): Promise<boolean> => {
  if (isSavingLock) return false;
  
  const state = useAppStore.getState();
  if (!state.currentWorkspace || state.isReadOnly) return false;

  isSavingLock = true;
  useAppStore.setState({ isSaving: true });

  try {
    const path = state.currentWorkspace.path;
    const freshState = useAppStore.getState();
    
    await StorageService.save_workspace(JSON.stringify(freshState.currentWorkspace));
    
    // Wrap with schemaVersion envelope for forward-compatible loading
    const diagramFile = {
      schemaVersion: freshState.logicalData.schemaVersion ?? 1,
      logical: freshState.logicalData,
      visual: freshState.visualData,
    };
    await StorageService.save_diagram( 
      path,
      JSON.stringify(freshState.logicalData),
      JSON.stringify(freshState.visualData),
      JSON.stringify(diagramFile)
    );
    
    const afterSaveState = useAppStore.getState();
    if (afterSaveState.logicalData === freshState.logicalData && 
        afterSaveState.visualData === freshState.visualData) {
      useAppStore.setState({ isDirty: false });
    }
    
    // Mark as unsynced if the user is logged in
    if (afterSaveState.googleUser) {
      useAppStore.setState({ hasUnsyncedChanges: true });
    }
    
    console.log('[Save] Saved successfully.');
    return true;
  } catch (err) {
    console.error('[Save] Save failed:', err);
    return false;
  } finally {
    isSavingLock = false;
    useAppStore.setState({ isSaving: false });
  }
};

// ── Auto-Save Loop ────────────────────────────────────────────────────────
let autoSaveInterval: any = null;

export const startAutoSave = () => {
  if (autoSaveInterval) return;
  autoSaveInterval = setInterval(async () => {
    const state = useAppStore.getState();
    if (state.isDirty && state.currentWorkspace && !state.isReadOnly && !isSavingLock) {
      console.log('[AutoSave] Triggering save...');
      await performSave();
    }
  }, 5000);
};

export const stopAutoSave = () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
};
