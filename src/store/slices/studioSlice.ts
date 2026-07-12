import { StateCreator } from 'zustand';
import { AppState, CustomComponentTemplate, ShapeLayer } from '../../types';
import { StorageService } from '../../services/storage';

export interface StudioSlice {
  currentView: 'diagram' | 'studio';
  activeComponent: CustomComponentTemplate | null;
  selectedLayerId: string | null;
  libraryComponents: CustomComponentTemplate[];

  setView: (view: 'diagram' | 'studio') => void;
  setActiveComponent: (comp: CustomComponentTemplate | null) => void;
  setSelectedLayerId: (id: string | null) => void;
  addLayer: (layer: ShapeLayer) => void;
  updateLayer: (id: string, updates: Partial<ShapeLayer>) => void;
  deleteLayer: (id: string) => void;
  reorderLayers: (sourceIndex: number, destinationIndex: number) => void;
  saveComponentToLibrary: () => Promise<void>;
  loadLibrary: () => Promise<void>;
  deleteComponentFromLibrary: (componentId: string) => Promise<void>;
}

export const createStudioSlice: StateCreator<AppState, [], [], StudioSlice> = (set, get) => ({
  currentView: 'diagram',
  activeComponent: null,
  selectedLayerId: null,
  libraryComponents: [],

  setView: (view) => set({ currentView: view }),
  setActiveComponent: (comp) => set({ activeComponent: comp, selectedLayerId: null }),
  setSelectedLayerId: (id) => set({ selectedLayerId: id }),

  addLayer: (layer) => set((state) => {
    if (!state.activeComponent) return {};
    const layers = [...state.activeComponent.layers, { ...layer, zIndex: state.activeComponent.layers.length }];
    return {
      activeComponent: { ...state.activeComponent, layers }
    };
  }),

  updateLayer: (id, updates) => set((state) => {
    if (!state.activeComponent) return {};
    const layers = state.activeComponent.layers.map((layer) =>
      layer.id === id ? { 
        ...layer, 
        ...updates, 
        style: { 
          ...layer.style, 
          ...(updates.style || {}) 
        } 
      } : layer
    );
    return {
      activeComponent: { ...state.activeComponent, layers }
    };
  }),

  deleteLayer: (id) => set((state) => {
    if (!state.activeComponent) return {};
    const remaining = state.activeComponent.layers.filter((layer) => layer.id !== id);
    remaining.sort((a, b) => a.zIndex - b.zIndex);
    const layers = remaining.map((layer, idx) => ({ ...layer, zIndex: idx }));
    return {
      activeComponent: { ...state.activeComponent, layers },
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId
    };
  }),

  reorderLayers: (sourceIndex, destinationIndex) => set((state) => {
    if (!state.activeComponent) return {};
    const layers = [...state.activeComponent.layers].sort((a, b) => a.zIndex - b.zIndex);
    const [removed] = layers.splice(sourceIndex, 1);
    layers.splice(destinationIndex, 0, removed);
    layers.forEach((layer, idx) => {
      layer.zIndex = idx;
    });
    return {
      activeComponent: { ...state.activeComponent, layers }
    };
  }),

  saveComponentToLibrary: async () => {
    const state = get();
    if (!state.activeComponent) return;
    try {
      const componentsDir = await StorageService.get_global_components_dir();
      const path = `${componentsDir}/${state.activeComponent.componentId}.json`;
      await StorageService.save_text_file(
        path,
        JSON.stringify(state.activeComponent, null, 2)
      );
      await get().loadLibrary();
    } catch (err: any) {
      console.error('Error saving component to library:', err);
      alert(`Save component failed: ${err.message || JSON.stringify(err) || err.toString()}`);
    }
  },

  loadLibrary: async () => {
    try {
      const dirPath = await StorageService.get_global_components_dir();
      const files: string[] = await StorageService.list_json_files_in_dir(dirPath);
      const libraryComponents = files.map((f) => JSON.parse(f));
      set({ libraryComponents });
    } catch (err: any) {
      console.error('Error loading library:', err);
    }
  },

  deleteComponentFromLibrary: async (componentId) => {
    try {
      const componentsDir = await StorageService.get_global_components_dir();
      const path = `${componentsDir}/${componentId}.json`;
      await StorageService.delete_file(path);
      await get().loadLibrary();
    } catch (err) {
      console.error('Error deleting component from library:', err);
    }
  }
});
