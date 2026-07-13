import { invoke } from '@tauri-apps/api/core';

/**
 * Checks if the application is running inside a Tauri environment.
 */
export const isTauri = () => {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
};

// --- Web Environment (LocalStorage) Helpers ---
const WEB_WORKSPACES_KEY = 'diagrammer_workspaces';
const WEB_PREFS_KEY = 'diagrammer_preferences';
const WEB_DIAGRAM_PREFIX = 'diagrammer_data_';
const WEB_GLOBAL_COMPONENTS_DIR = 'virtual://global_components';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const StorageService = {
  // ---------------------------------------------------------
  // WORKSPACE METADATA
  // ---------------------------------------------------------
  create_workspace: async (name: string, description: string): Promise<string> => {
    if (isTauri()) {
      return await invoke<string>('create_workspace', { name, description });
    }
    // Web Implementation
    const workspacesStr = localStorage.getItem(WEB_WORKSPACES_KEY) || '[]';
    const workspaces = JSON.parse(workspacesStr);
    
    const id = generateId();
    const virtualPath = `virtual://workspace/${id}`;
    
    const ws = {
      name,
      description,
      path: virtualPath,
      lastModified: new Date().toISOString(),
      dataDir: `${virtualPath}/data`
    };
    
    workspaces.push(ws);
    localStorage.setItem(WEB_WORKSPACES_KEY, JSON.stringify(workspaces));
    return JSON.stringify(ws);
  },

  load_workspace: async (path: string): Promise<string> => {
    if (isTauri()) {
      return await invoke<string>('load_workspace', { path });
    }
    // Web Implementation
    const workspacesStr = localStorage.getItem(WEB_WORKSPACES_KEY) || '[]';
    const workspaces = JSON.parse(workspacesStr);
    const ws = workspaces.find((w: any) => w.path === path);
    if (!ws) throw new Error('Workspace not found');
    return JSON.stringify(ws);
  },

  save_workspace: async (metaJson: string): Promise<void> => {
    if (isTauri()) {
      await invoke('save_workspace', { metaJson });
      return;
    }
    // Web Implementation
    const ws = JSON.parse(metaJson);
    const workspacesStr = localStorage.getItem(WEB_WORKSPACES_KEY) || '[]';
    let workspaces = JSON.parse(workspacesStr);
    const index = workspaces.findIndex((w: any) => w.path === ws.path);
    
    if (index >= 0) {
      workspaces[index] = { ...workspaces[index], ...ws, lastModified: new Date().toISOString() };
    } else {
      workspaces.push(ws);
    }
    localStorage.setItem(WEB_WORKSPACES_KEY, JSON.stringify(workspaces));
  },

  get_recent_workspaces: async (): Promise<string> => {
    if (isTauri()) {
      return await invoke<string>('get_recent_workspaces');
    }
    // Web Implementation
    const workspacesStr = localStorage.getItem(WEB_WORKSPACES_KEY) || '[]';
    const workspaces = JSON.parse(workspacesStr);
    // Sort by lastModified descending
    workspaces.sort((a: any, b: any) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    return JSON.stringify(workspaces);
  },

  // ---------------------------------------------------------
  // DIAGRAM DATA
  // ---------------------------------------------------------
  save_diagram: async (path: string, logicalJson: string, visualJson: string): Promise<void> => {
    if (isTauri()) {
      await invoke('save_diagram', { path, logicalJson, visualJson });
      return;
    }
    // Web Implementation
    const dataKey = `${WEB_DIAGRAM_PREFIX}${path}`;
    const payload = { logicalData: JSON.parse(logicalJson), visualData: JSON.parse(visualJson) };
    localStorage.setItem(dataKey, JSON.stringify(payload));
  },

  load_diagram: async (path: string): Promise<string> => {
    if (isTauri()) {
      return await invoke<string>('load_diagram', { path });
    }
    // Web Implementation
    const dataKey = `${WEB_DIAGRAM_PREFIX}${path}`;
    const dataStr = localStorage.getItem(dataKey);
    if (!dataStr) throw new Error('Diagram data not found');
    return dataStr; // Returns { logicalData: ..., visualData: ... } as string
  },

  // ---------------------------------------------------------
  // PREFERENCES
  // ---------------------------------------------------------
  save_preferences: async (preferencesJson: string): Promise<void> => {
    if (isTauri()) {
      await invoke('save_preferences', { preferencesJson });
      return;
    }
    // Web Implementation
    localStorage.setItem(WEB_PREFS_KEY, preferencesJson);
  },

  load_preferences: async (): Promise<string> => {
    if (isTauri()) {
      try {
        return await invoke<string>('load_preferences');
      } catch (err) {
        // If file doesn't exist, return empty JSON object
        return "{}";
      }
    }
    // Web Implementation
    return localStorage.getItem(WEB_PREFS_KEY) || "{}";
  },

  // ---------------------------------------------------------
  // GENERIC FILE OPERATIONS (Used for Components / Studio)
  // ---------------------------------------------------------
  get_global_components_dir: async (): Promise<string> => {
    if (isTauri()) {
      return await invoke<string>('get_global_components_dir');
    }
    // Web Implementation
    return WEB_GLOBAL_COMPONENTS_DIR;
  },

  save_text_file: async (path: string, content: string): Promise<void> => {
    if (isTauri()) {
      await invoke('save_text_file', { path, content });
      return;
    }
    // Web Implementation
    localStorage.setItem(`file://${path}`, content);
  },

  read_text_file: async (path: string): Promise<string> => {
    if (isTauri()) {
      return await invoke<string>('read_text_file', { path });
    }
    // Web Implementation
    const content = localStorage.getItem(`file://${path}`);
    if (content === null) throw new Error(`File not found: ${path}`);
    return content;
  },

  list_json_files_in_dir: async (dirPath: string): Promise<string[]> => {
    if (isTauri()) {
      return await invoke<string[]>('list_json_files_in_dir', { dirPath });
    }
    // Web Implementation
    const files: string[] = [];
    const prefix = `file://${dirPath}/`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix) && key.endsWith('.json')) {
        const content = localStorage.getItem(key);
        if (content) {
          files.push(content);
        }
      }
    }
    return files;
  },

  delete_file: async (path: string): Promise<void> => {
    if (isTauri()) {
      await invoke('delete_file', { path });
      return;
    }
    // Web Implementation
    localStorage.removeItem(`file://${path}`);
  },

  delete_workspace: async (path: string): Promise<void> => {
    if (isTauri()) {
      // Delete directory on disk
      await invoke('delete_file', { path });
      
      // Load recent, filter out this workspace, and save it back
      const recentJson = await invoke<string>('get_recent_workspaces');
      const recent = JSON.parse(recentJson);
      const filtered = recent.filter((w: any) => w.path !== path);
      await invoke('save_recent_workspaces', { workspacesJson: JSON.stringify(filtered) });
      return;
    }
    // Web Implementation
    const workspacesStr = localStorage.getItem(WEB_WORKSPACES_KEY) || '[]';
    const workspaces = JSON.parse(workspacesStr);
    const filtered = workspaces.filter((w: any) => w.path !== path);
    localStorage.setItem(WEB_WORKSPACES_KEY, JSON.stringify(filtered));
    
    const dataKey = `${WEB_DIAGRAM_PREFIX}${path}`;
    localStorage.removeItem(dataKey);
  }
};
