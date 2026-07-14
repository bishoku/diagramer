import { create } from 'zustand';
import { AppState } from '../types';
import { StorageService } from '../services/storage';

import { createWorkspaceSlice } from './slices/workspaceSlice';
import { createCanvasSlice } from './slices/canvasSlice';
import { createTimelineSlice } from './slices/timelineSlice';
import { createStudioSlice } from './slices/studioSlice';
import { createHistorySlice } from './slices/historySlice';

import { calculateSchedules } from './scheduler';

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
    schedules: {}
  };
});

// ── Shared Save Logic ─────────────────────────────────────────────────────
let isSavingLock = false;

const performSave = async (): Promise<boolean> => {
  if (isSavingLock) return false;
  
  const state = useAppStore.getState();
  if (!state.currentWorkspace) return false;

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
    if (state.isDirty && state.currentWorkspace && !isSavingLock) {
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
