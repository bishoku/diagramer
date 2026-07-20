import { StateCreator } from 'zustand';
import { AppState, WorkspaceMeta } from '../../types';
import { Language, Theme } from '../../i18n/translations';
import { StorageService } from '../../services/storage';
import { migratePortFormat } from '../../utils/portMigration';

const applyTheme = (theme: Theme) => {
  // Remove custom theme classes first
  document.documentElement.classList.remove('theme-nord', 'theme-dracula', 'theme-synthwave');
  
  if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
    if (theme !== 'dark') {
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }
};

export interface WorkspaceSlice {
  currentWorkspace: WorkspaceMeta | null;
  recentWorkspaces: WorkspaceMeta[];
  diagrams: import('../../types').DiagramMeta[];
  activeDiagramId: string | null;
  openDiagramIds: string[];
  isDirty: boolean;
  isCreateDiagramModalOpen: boolean;
  language: Language;
  theme: Theme;
  maxSteps: number;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  isSaving: boolean;
  isReadOnly: boolean;

  setWorkspace: (ws: WorkspaceMeta | null) => void;
  setDiagrams: (diagrams: import('../../types').DiagramMeta[]) => void;
  setActiveDiagramId: (id: string | null) => void;
  setOpenDiagramIds: (ids: string[]) => void;
  createDiagram: (name: string) => Promise<import('../../types').DiagramMeta>;
  renameDiagram: (id: string, name: string) => Promise<void>;
  deleteDiagram: (id: string) => Promise<void>;
  switchDiagram: (id: string) => Promise<void>;
  closeDiagram: (id: string) => void;
  setDirty: (status: boolean) => void;
  setRecentWorkspaces: (workspaces: WorkspaceMeta[]) => void;
  setCreateDiagramModalOpen: (open: boolean) => void;
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
  viewMode: 'freeform' | 'sequence' | 'import-preview';
  toggleViewMode: () => void;
  setViewMode: (mode: 'freeform' | 'sequence' | 'import-preview') => void;
  importRawData: string | null;
  importAdapterId: string | null;
  setImportState: (adapterId: string | null, data: string | null) => void;

  setReadOnly: (isReadOnly: boolean) => void;
  loadSharedDiagram: (logicalData: import('../../types').LogicalDiagram, visualData: import('../../types').VisualDiagram) => void;
  loadImportPreview: (logicalData: import('../../types').LogicalDiagram, visualData: import('../../types').VisualDiagram) => void;
  cloneSharedToWorkspace: (name: string) => Promise<import('../../types').WorkspaceMeta>;
  copyDiagramToWorkspace: (diagramId: string, targetWorkspacePath: string, newName?: string) => Promise<string>;
  moveDiagramToWorkspace: (diagramId: string, targetWorkspacePath: string, newName?: string) => Promise<string>;
  importPreviewToWorkspace: (targetWorkspacePath: string, diagramName: string) => Promise<string>;
  importPreviewToNewWorkspace: (workspaceName: string, diagramName: string) => Promise<{ ws: WorkspaceMeta; diagramId: string }>;
  manualSave: () => Promise<void>;
  deleteWorkspace: (path: string) => Promise<void>;
}

export const createWorkspaceSlice: StateCreator<AppState, [], [], WorkspaceSlice> = (set, get) => ({
  currentWorkspace: null,
  recentWorkspaces: [],
  diagrams: [],
  activeDiagramId: null,
  openDiagramIds: [],
  isDirty: false,
  isCreateDiagramModalOpen: false,
  language: 'en',
  theme: 'light',
  maxSteps: 30,
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  isSaving: false,
  isReadOnly: false,

  setWorkspace: (ws) => set({ currentWorkspace: ws }),
  setDiagrams: (diagrams) => set({ diagrams }),
  setActiveDiagramId: (id) => set({ activeDiagramId: id }),
  setOpenDiagramIds: (ids) => set({ openDiagramIds: ids }),
  setCreateDiagramModalOpen: (open) => set({ isCreateDiagramModalOpen: open }),
  setDirty: (status) => set({ isDirty: status }),
  setRecentWorkspaces: (workspaces) => set({ recentWorkspaces: workspaces }),

  createDiagram: async (name: string) => {
    const state = get();
    if (!state.currentWorkspace) throw new Error("No active workspace");

    const newId = `diagram_${Date.now()}`;
    const newDiagram: import('../../types').DiagramMeta = {
      id: newId,
      name,
      updatedAt: new Date().toISOString()
    };
    
    // Save new diagram
    const logicalJson = JSON.stringify({ schemaVersion: 1, nodes: [], edges: [], sequences: [] });
    const visualJson = JSON.stringify({ canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} });
    await StorageService.save_diagram(state.currentWorkspace.path, newId, logicalJson, visualJson);
    
    // Update index
    const updatedDiagrams = [...state.diagrams, newDiagram];
    await StorageService.save_text_file(`${state.currentWorkspace.path}/diagrams/index.json`, JSON.stringify({ diagrams: updatedDiagrams }));
    
    set({ diagrams: updatedDiagrams });
    return newDiagram;
  },

  renameDiagram: async (id: string, name: string) => {
    const state = get();
    if (!state.currentWorkspace) throw new Error("No active workspace");
    
    const updatedDiagrams = state.diagrams.map(d => d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d);
    await StorageService.save_text_file(`${state.currentWorkspace.path}/diagrams/index.json`, JSON.stringify({ diagrams: updatedDiagrams }));
    
    set({ diagrams: updatedDiagrams });
  },

  deleteDiagram: async (id: string) => {
    const state = get();
    if (!state.currentWorkspace) throw new Error("No active workspace");
    
    const updatedDiagrams = state.diagrams.filter(d => d.id !== id);
    await StorageService.save_text_file(`${state.currentWorkspace.path}/diagrams/index.json`, JSON.stringify({ diagrams: updatedDiagrams }));
    
    set({ diagrams: updatedDiagrams });
    
    // If the active diagram is deleted, close it
    if (state.activeDiagramId === id) {
      const remainingIds = state.openDiagramIds.filter(did => did !== id);
      set({ 
        activeDiagramId: remainingIds.length > 0 ? remainingIds[0] : null,
        openDiagramIds: remainingIds
      });
      if (remainingIds.length > 0) {
        await get().switchDiagram(remainingIds[0]);
      } else {
        set({
          logicalData: { schemaVersion: 1, nodes: [], edges: [], sequences: [] },
          visualData: { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} }
        });
      }
    } else {
      set({ openDiagramIds: state.openDiagramIds.filter(did => did !== id) });
    }
  },

  switchDiagram: async (id: string) => {
    const state = get();
    if (!state.currentWorkspace || state.activeDiagramId === id) return;
    
    // 1. Wait if currently saving to avoid race conditions
    if (get().isSaving) {
      while (get().isSaving) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // 2. Save current if still dirty
    if (get().isDirty) {
      await get().manualSave();
    }
    
    const ws = state.currentWorkspace;
    try {
      const diagJson = await StorageService.load_diagram(ws.path, id);
      const diag = JSON.parse(diagJson);
      
      let logicalData: import('../../types').LogicalDiagram = { schemaVersion: 1, nodes: [], edges: [], sequences: [] };
      let visualData: import('../../types').VisualDiagram = { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} };
      
      if (diag.logicalData && Array.isArray(diag.logicalData.nodes) && Array.isArray(diag.logicalData.edges)) {
        logicalData = {
          schemaVersion: diag.logicalData.schemaVersion ?? 1,
          nodes: diag.logicalData.nodes,
          edges: diag.logicalData.edges,
          sequences: Array.isArray(diag.logicalData.sequences) ? diag.logicalData.sequences : []
        };
      } else if (diag.logical) {
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
      
      const migrated = migratePortFormat(logicalData, visualData);
      
      const openIds = new Set(state.openDiagramIds);
      openIds.add(id);
      
      set({ 
        activeDiagramId: id,
        openDiagramIds: Array.from(openIds),
        logicalData: migrated.logicalData,
        visualData: migrated.visualData,
        isDirty: false,
        pastStates: [],
        futureStates: [],
        rightSidebarOpen: true,
        timelineOpen: true,
      });
    } catch (err) {
      console.error('Error switching diagram:', err);
    }
  },

  closeDiagram: (id: string) => {
    const state = get();
    const remainingIds = state.openDiagramIds.filter(did => did !== id);
    if (state.activeDiagramId === id) {
      if (remainingIds.length > 0) {
        get().switchDiagram(remainingIds[remainingIds.length - 1]);
        set({ openDiagramIds: remainingIds }); // switchDiagram will set activeDiagramId
      } else {
        set({ 
          activeDiagramId: null,
          openDiagramIds: [],
          logicalData: { schemaVersion: 1, nodes: [], edges: [], sequences: [] },
          visualData: { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} },
          rightSidebarOpen: false,
          timelineOpen: false,
        });
      }
    } else {
      set({ openDiagramIds: remainingIds });
    }
  },


  createWorkspace: async (name: string, description: string) => {
    try {
      const resJson = await StorageService.create_workspace(name, description);
      const ws: WorkspaceMeta = JSON.parse(resJson);
      
      const logicalJson = JSON.stringify({ schemaVersion: 1, nodes: [], edges: [], sequences: [] });
      const visualJson = JSON.stringify({ canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} });
      
      // Create default diagram and diagrams directory
      await StorageService.save_diagram(ws.path, 'default', logicalJson, visualJson);
      
      const defaultDiagram = { id: 'default', name: 'Default Diagram', updatedAt: new Date().toISOString() };
      try {
        await StorageService.save_text_file(`${ws.path}/diagrams/index.json`, JSON.stringify({ diagrams: [defaultDiagram] }));
      } catch (e) {}
      
      set({ 
        currentWorkspace: ws,
        diagrams: [defaultDiagram],
        activeDiagramId: 'default',
        openDiagramIds: ['default'],
        logicalData: { schemaVersion: 1, nodes: [], edges: [], sequences: [] },
        visualData: { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} },
        isDirty: false,
        isPlaying: false,
        currentTime: 0,
        activeSequenceIds: [],
        selectedSequenceId: null,
        rightSidebarOpen: true,
        timelineOpen: true
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
      
      let diagrams: import('../../types').DiagramMeta[] = [];
      try {
        const indexStr = await StorageService.read_text_file(`${path}/diagrams/index.json`);
        diagrams = JSON.parse(indexStr).diagrams || [];
      } catch (e) {
        // Fallback for old workspaces
        diagrams = [{ id: 'default', name: 'Default Diagram', updatedAt: ws.createdAt || new Date().toISOString() }];
        try {
           await StorageService.save_text_file(`${path}/diagrams/index.json`, JSON.stringify({ diagrams }));
        } catch (_) {}
      }
      
      set({ 
        currentWorkspace: ws,
        diagrams,
        activeDiagramId: null,
        openDiagramIds: [],
        logicalData: { schemaVersion: 1, nodes: [], edges: [], sequences: [] },
        visualData: { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} },
        isDirty: false,
        isPlaying: false,
        currentTime: 0,
        activeSequenceIds: [],
        selectedSequenceId: null,
        rightSidebarOpen: false,
        timelineOpen: false
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
      
      const finalTheme: Theme = ['dark', 'light', 'nord', 'dracula', 'synthwave'].includes(prefObj.theme)
        ? prefObj.theme
        : 'light';
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
  viewMode: 'freeform' as const,
  toggleViewMode: () => set((state) => ({ 
    viewMode: state.viewMode === 'freeform' ? 'sequence' as const : 'freeform' as const 
  })),
  setViewMode: (mode) => set({ viewMode: mode }),
  importRawData: null,
  importAdapterId: null,
  setImportState: (adapterId, data) => set({ importAdapterId: adapterId, importRawData: data }),

  setReadOnly: (isReadOnly: boolean) => set({ isReadOnly }),

  loadSharedDiagram: (logicalData: import('../../types').LogicalDiagram, visualData: import('../../types').VisualDiagram) => {
    // Shared diagrams are loaded without a workspace context, in read-only mode
    set({
      currentWorkspace: {
        id: 'shared-diagram',
        name: 'Shared Diagram',
        path: 'memory://shared',
        description: 'A read-only shared diagram',
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      },
      logicalData,
      visualData,
      isReadOnly: true,
      isDirty: false,
      leftSidebarOpen: false, // hide toolbox
      rightSidebarOpen: false, // hide properties by default
      activeNodeProperties: null,
      activeEdgeProperties: null,
      pastStates: [],
      futureStates: []
    });
  },

  loadImportPreview: (logicalData: import('../../types').LogicalDiagram, visualData: import('../../types').VisualDiagram) => {
    set({
      currentWorkspace: {
        id: 'import-preview',
        name: 'Import Preview',
        path: 'memory://preview',
        description: 'Temporary diagram preview',
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      },
      logicalData,
      visualData,
      isReadOnly: false, // Allow playback/simulation in preview
      isDirty: false,
      isPlaying: false,
      currentTime: 0,
      activeSequenceIds: [],
      selectedSequenceId: null,
      leftSidebarOpen: true, // Show filter sidebar
      rightSidebarOpen: false,
      activeNodeProperties: null,
      activeEdgeProperties: null,
      pastStates: [],
      futureStates: []
    });
  },


  cloneSharedToWorkspace: async (name: string) => {
    try {
      const state = get();
      
      // 1. Create a new workspace metadata record
      const resJson = await StorageService.create_workspace(name, state.currentWorkspace?.description || '');
      const ws: WorkspaceMeta = JSON.parse(resJson);
      
      // 2. Save the current diagram under the new workspace path
      const logicalJson = JSON.stringify(state.logicalData);
      const visualJson = JSON.stringify(state.visualData);
      await StorageService.save_diagram(ws.path, 'default', logicalJson, visualJson);
      
      const defaultDiagram = { id: 'default', name: 'Default Diagram', updatedAt: new Date().toISOString() };
      try {
        await StorageService.save_text_file(`${ws.path}/diagrams/index.json`, JSON.stringify({ diagrams: [defaultDiagram] }));
      } catch (e) {}
      
      // 3. Set the new workspace as active and disable read-only mode
      set({
        currentWorkspace: ws,
        diagrams: [defaultDiagram],
        activeDiagramId: 'default',
        openDiagramIds: ['default'],
        isReadOnly: false,
        isDirty: false,
        leftSidebarOpen: true,
        rightSidebarOpen: true,
        pastStates: [],
        futureStates: []
      });
      
      // 4. Refresh workspace list and library
      await get().fetchRecentWorkspaces();
      await get().loadLibrary();
      
      return ws;
    } catch (err) {
      console.error('Error cloning shared diagram:', err);
      throw err;
    }
  },

  manualSave: async () => {
    const state = get();
    if (!state.currentWorkspace || !state.isDirty || state.isSaving) return;
    if (!state.activeDiagramId) return;
    
    set({ isSaving: true });
    try {
      const logicalJson = JSON.stringify(state.logicalData);
      const visualJson = JSON.stringify(state.visualData);
      
      await StorageService.save_diagram(state.currentWorkspace.path, state.activeDiagramId, logicalJson, visualJson);
      
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
        set({ 
          currentWorkspace: null, 
          diagrams: [], 
          activeDiagramId: null, 
          openDiagramIds: [] 
        });
      }
    } catch (err) {
      console.error('Error deleting workspace:', err);
      throw err;
    }
  },

  copyDiagramToWorkspace: async (diagramId: string, targetWorkspacePath: string, newName?: string) => {
    const state = get();
    if (!state.currentWorkspace) throw new Error("No active workspace");
    const sourceWorkspacePath = state.currentWorkspace.path;

    let logicalData: any;
    let visualData: any;

    if (state.activeDiagramId === diagramId) {
      logicalData = state.logicalData;
      visualData = state.visualData;
    } else {
      const diagJson = await StorageService.load_diagram(sourceWorkspacePath, diagramId);
      const diag = JSON.parse(diagJson);
      if (diag.logicalData) {
        logicalData = diag.logicalData;
        visualData = diag.visualData;
      } else if (diag.logical) {
        logicalData = diag.logical;
        visualData = diag.visual;
      } else {
        logicalData = diag;
        visualData = {};
      }
    }

    const sourceDiagMeta = state.diagrams.find(d => d.id === diagramId);
    const baseName = newName || sourceDiagMeta?.name || "Copied Diagram";

    let targetDiagrams: import('../../types').DiagramMeta[] = [];
    try {
      const targetIndexStr = await StorageService.read_text_file(`${targetWorkspacePath}/diagrams/index.json`);
      targetDiagrams = JSON.parse(targetIndexStr).diagrams || [];
    } catch (e) {
      // Fallback
    }

    let finalName = baseName;
    let counter = 1;
    const existingNames = new Set(targetDiagrams.map(d => d.name));
    while (existingNames.has(finalName)) {
      finalName = `${baseName} (copy ${counter})`;
      counter++;
    }

    const newId = `diagram_${Date.now()}`;
    const newDiagramMeta: import('../../types').DiagramMeta = {
      id: newId,
      name: finalName,
      updatedAt: new Date().toISOString()
    };

    await StorageService.save_diagram(
      targetWorkspacePath,
      newId,
      JSON.stringify(logicalData),
      JSON.stringify(visualData)
    );

    targetDiagrams.push(newDiagramMeta);
    await StorageService.save_text_file(
      `${targetWorkspacePath}/diagrams/index.json`,
      JSON.stringify({ diagrams: targetDiagrams })
    );

    if (state.currentWorkspace.path === targetWorkspacePath) {
      set({ diagrams: targetDiagrams });
    }
    return newId;
  },

  moveDiagramToWorkspace: async (diagramId: string, targetWorkspacePath: string, newName?: string) => {
    const state = get();
    if (!state.currentWorkspace) throw new Error("No active workspace");
    const sourceWorkspacePath = state.currentWorkspace.path;

    const newId = await get().copyDiagramToWorkspace(diagramId, targetWorkspacePath, newName);

    if (state.currentWorkspace.path === sourceWorkspacePath) {
      await get().deleteDiagram(diagramId);
    } else {
      try {
        const sourceIndexStr = await StorageService.read_text_file(`${sourceWorkspacePath}/diagrams/index.json`);
        const sourceDiagrams = JSON.parse(sourceIndexStr).diagrams || [];
        const updatedSourceDiagrams = sourceDiagrams.filter((d: any) => d.id !== diagramId);
        await StorageService.save_text_file(`${sourceWorkspacePath}/diagrams/index.json`, JSON.stringify({ diagrams: updatedSourceDiagrams }));
      } catch (e) {
        console.error("Failed to clean up source workspace diagrams index:", e);
      }
    }
    return newId;
  },

  importPreviewToWorkspace: async (targetWorkspacePath: string, diagramName: string) => {
    const state = get();
    const logicalJson = JSON.stringify(state.logicalData);
    const visualJson = JSON.stringify(state.visualData);

    let targetDiagrams: import('../../types').DiagramMeta[] = [];
    try {
      const targetIndexStr = await StorageService.read_text_file(`${targetWorkspacePath}/diagrams/index.json`);
      targetDiagrams = JSON.parse(targetIndexStr).diagrams || [];
    } catch (e) {
      // Fallback
    }

    const baseName = diagramName || "Imported Diagram";
    let finalName = baseName;
    let counter = 1;
    const existingNames = new Set(targetDiagrams.map(d => d.name));
    while (existingNames.has(finalName)) {
      finalName = `${baseName} (copy ${counter})`;
      counter++;
    }

    const newId = `diagram_${Date.now()}`;
    const newDiagramMeta: import('../../types').DiagramMeta = {
      id: newId,
      name: finalName,
      updatedAt: new Date().toISOString()
    };

    await StorageService.save_diagram(targetWorkspacePath, newId, logicalJson, visualJson);

    targetDiagrams.push(newDiagramMeta);
    await StorageService.save_text_file(
      `${targetWorkspacePath}/diagrams/index.json`,
      JSON.stringify({ diagrams: targetDiagrams })
    );

    return newId;
  },

  importPreviewToNewWorkspace: async (workspaceName: string, diagramName: string) => {
    const state = get();
    const resJson = await StorageService.create_workspace(workspaceName, state.currentWorkspace?.description || '');
    const ws: WorkspaceMeta = JSON.parse(resJson);

    const logicalJson = JSON.stringify(state.logicalData);
    const visualJson = JSON.stringify(state.visualData);

    const diagramId = 'default';
    await StorageService.save_diagram(ws.path, diagramId, logicalJson, visualJson);

    const defaultDiagram = { id: diagramId, name: diagramName || 'Default Diagram', updatedAt: new Date().toISOString() };
    await StorageService.save_text_file(`${ws.path}/diagrams/index.json`, JSON.stringify({ diagrams: [defaultDiagram] }));

    await get().fetchRecentWorkspaces();
    return { ws, diagramId };
  }
});
