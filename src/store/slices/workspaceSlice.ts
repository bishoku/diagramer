import { StateCreator } from 'zustand';
import { AppState, WorkspaceMeta } from '../../types';
import { Language, Theme } from '../../i18n/translations';
import { StorageService } from '../../services/storage';
import { migratePortFormat } from '../../utils/portMigration';

const applyTheme = (theme: Theme) => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export interface WorkspaceSlice {
  currentWorkspace: WorkspaceMeta | null;
  recentWorkspaces: WorkspaceMeta[];
  currentDiagram: any | null;
  isDirty: boolean;
  language: Language;
  theme: Theme;
  maxSteps: number;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  isSaving: boolean;

  setWorkspace: (ws: WorkspaceMeta | null) => void;
  setDiagram: (diagram: any | null) => void;
  setDirty: (status: boolean) => void;
  setRecentWorkspaces: (workspaces: WorkspaceMeta[]) => void;
  createWorkspace: (name: string, description: string) => Promise<WorkspaceMeta>;
  loadWorkspace: (path: string) => Promise<WorkspaceMeta>;
  fetchRecentWorkspaces: () => Promise<void>;
  saveWorkspaceDetails: (name: string, description: string) => Promise<void>;
  changeLanguage: (lang: Language) => Promise<void>;
  changeTheme: (theme: Theme) => Promise<void>;
  changeMaxSteps: (max: number) => Promise<void>;
  loadAppPreferences: () => Promise<void>;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  openRightSidebar: () => void;
  manualSave: () => Promise<void>;
  deleteWorkspace: (path: string) => Promise<void>;
}

export const createWorkspaceSlice: StateCreator<AppState, [], [], WorkspaceSlice> = (set, get) => ({
  currentWorkspace: null,
  recentWorkspaces: [],
  currentDiagram: null,
  isDirty: false,
  language: 'en',
  theme: 'light',
  maxSteps: 30,
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  isSaving: false,

  setWorkspace: (ws) => set({ currentWorkspace: ws }),
  setDiagram: (diagram) => set({ currentDiagram: diagram }),
  setDirty: (status) => set({ isDirty: status }),
  setRecentWorkspaces: (workspaces) => set({ recentWorkspaces: workspaces }),

  createWorkspace: async (name: string, description: string) => {
    try {
      const resJson = await StorageService.create_workspace(name, description);
      const ws: WorkspaceMeta = JSON.parse(resJson);
      
      set({ 
        currentWorkspace: ws, 
        logicalData: { schemaVersion: 1, nodes: [], edges: [], sequences: [] },
        visualData: { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} },
        isDirty: false,
        isPlaying: false,
        currentTime: 0,
        activeSequenceIds: [],
        selectedSequenceId: null
      });
      await get().fetchRecentWorkspaces();
      await get().loadLibrary();
      return ws;
    } catch (err) {
      console.error('Error creating workspace:', err);
      throw err;
    }
  },

  loadWorkspace: async (path: string) => {
    try {
      const resJson = await StorageService.load_workspace(path);
      const ws: WorkspaceMeta = JSON.parse(resJson);
      
      let logicalData: import('../../types').LogicalDiagram = { schemaVersion: 1, nodes: [], edges: [], sequences: [] };
      let visualData: import('../../types').VisualDiagram = { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} };
      try {
        const diagJson = await StorageService.load_diagram(path);
        const diag = JSON.parse(diagJson);
        if (diag.logicalData && Array.isArray(diag.logicalData.nodes) && Array.isArray(diag.logicalData.edges)) {
          logicalData = {
            schemaVersion: diag.logicalData.schemaVersion ?? 1,
            nodes: diag.logicalData.nodes,
            edges: diag.logicalData.edges,
            sequences: Array.isArray(diag.logicalData.sequences) ? diag.logicalData.sequences : []
          };
        } else if (diag.logical) {
          // Backward compatibility for old Tauri JSON format
          logicalData = {
            schemaVersion: diag.schemaVersion ?? 1,
            nodes: diag.logical.nodes || [],
            edges: diag.logical.edges || [],
            sequences: diag.logical.sequences || []
          };
        }
        
        if (diag.visualData) {
          visualData = { layoutEdges: {}, ...diag.visualData };
        } else if (diag.visual) {
           // Backward compatibility
           visualData = {
            canvas: {
              zoom: diag.visual.canvas?.zoom ?? 1,
              pan: {
                x: diag.visual.canvas?.pan?.x ?? 0,
                y: diag.visual.canvas?.pan?.y ?? 0
              }
            },
            layoutNodes: diag.visual.layoutNodes || {},
            layoutEdges: diag.visual.layoutEdges || {},
            timelines: diag.visual.timelines || {}
          };
        }
      } catch (diagErr) {
        console.error('Error loading diagram data from disk, using empty defaults:', diagErr);
      }
      
      const migrated = migratePortFormat(logicalData, visualData);
      set({ 
        currentWorkspace: ws, 
        logicalData: migrated.logicalData,
        visualData: migrated.visualData,
        isDirty: false,
        isPlaying: false,
        currentTime: 0,
        activeSequenceIds: [],
        selectedSequenceId: null
      });
      await get().fetchRecentWorkspaces();
      await get().loadLibrary();
      return ws;
    } catch (err) {
      console.error('Error loading workspace:', err);
      throw err;
    }
  },

  fetchRecentWorkspaces: async () => {
    try {
      const resJson = await StorageService.get_recent_workspaces();
      const list: WorkspaceMeta[] = JSON.parse(resJson);
      set({ recentWorkspaces: list });
    } catch (err) {
      console.error('Error fetching recent workspaces:', err);
    }
  },

  saveWorkspaceDetails: async (name: string, description: string) => {
    const ws = get().currentWorkspace;
    if (!ws) return;
    const updatedWs = { ...ws, name, description, lastAccessed: new Date().toISOString() };
    set({ currentWorkspace: updatedWs, isDirty: true });
  },

  changeLanguage: async (lang: Language) => {
    try {
      set({ language: lang });
      const prefObj = { language: lang, theme: get().theme, maxSteps: get().maxSteps };
      await StorageService.save_preferences(JSON.stringify(prefObj));
    } catch (err) {
      console.error('Error saving language preference:', err);
    }
  },

  changeTheme: async (theme: Theme) => {
    try {
      set({ theme });
      applyTheme(theme);
      const prefObj = { language: get().language, theme, maxSteps: get().maxSteps };
      await StorageService.save_preferences(JSON.stringify(prefObj));
    } catch (err) {
      console.error('Error saving theme preference:', err);
    }
  },

  changeMaxSteps: async (max: number) => {
    try {
      set({ maxSteps: max });
      const prefObj = { language: get().language, theme: get().theme, maxSteps: max };
      await StorageService.save_preferences(JSON.stringify(prefObj));
    } catch (err) {
      console.error('Error saving maxSteps preference:', err);
    }
  },

  loadAppPreferences: async () => {
    try {
      const resJson = await StorageService.load_preferences();
      const prefObj = JSON.parse(resJson);
      
      let finalLang: Language = 'en';
      if (prefObj.language === 'system') {
        const sysLang = navigator.language || 'en';
        finalLang = sysLang.toLowerCase().startsWith('tr') ? 'tr' : 'en';
      } else if (prefObj.language === 'tr' || prefObj.language === 'en') {
        finalLang = prefObj.language;
      }
      
      const finalTheme: Theme = prefObj.theme === 'dark' ? 'dark' : 'light';
      const finalMaxSteps: number = typeof prefObj.maxSteps === 'number' ? prefObj.maxSteps : 30;
      
      set({ language: finalLang, theme: finalTheme, maxSteps: finalMaxSteps });
      applyTheme(finalTheme);
      
      await get().loadLibrary();
    } catch (err) {
      console.error('Error loading app preferences:', err);
      const sysLang = navigator.language || 'en';
      const finalLang: Language = sysLang.toLowerCase().startsWith('tr') ? 'tr' : 'en';
      set({ language: finalLang, theme: 'light', maxSteps: 30 });
      applyTheme('light');
      
      try {
        await get().loadLibrary();
      } catch (_) {}
    }
  },

  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
  openRightSidebar: () => set({ rightSidebarOpen: true }),

  manualSave: async () => {
    const state = get();
    if (!state.currentWorkspace || !state.isDirty || state.isSaving) return;
    
    set({ isSaving: true });
    try {
      const logicalJson = JSON.stringify(state.logicalData);
      const visualJson = JSON.stringify(state.visualData);
      
      await StorageService.save_diagram(state.currentWorkspace.path, logicalJson, visualJson);
      
      set({ isDirty: false });
    } catch (err) {
      console.error('Error saving diagram manually:', err);
    } finally {
      set({ isSaving: false });
    }
  },

  deleteWorkspace: async (path: string) => {
    try {
      await StorageService.delete_workspace(path);
      await get().fetchRecentWorkspaces();
      if (get().currentWorkspace?.path === path) {
        set({ currentWorkspace: null, currentDiagram: null });
      }
    } catch (err) {
      console.error('Error deleting workspace:', err);
      throw err;
    }
  }
});
