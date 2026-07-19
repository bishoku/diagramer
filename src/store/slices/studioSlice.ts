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
  duplicateLayer: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
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
  setActiveComponent: (comp) => {
    // When loading a saved component for editing, restore editDimensions if available
    if (comp && comp.editDimensions) {
      set({
        activeComponent: {
          ...comp,
          dimensions: { ...comp.editDimensions },
        },
        selectedLayerId: null,
      });
    } else {
      set({ activeComponent: comp, selectedLayerId: null });
    }
  },
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

  duplicateLayer: (id) => set((state) => {
    if (!state.activeComponent) return {};
    const source = state.activeComponent.layers.find((l) => l.id === id);
    if (!source) return {};
    const newLayer: ShapeLayer = {
      ...source,
      id: `layer-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: `${source.name} (kopya)`,
      x: source.x + 10,
      y: source.y + 10,
      zIndex: state.activeComponent.layers.length,
      style: { ...source.style },
    };
    const layers = [...state.activeComponent.layers, newLayer];
    return {
      activeComponent: { ...state.activeComponent, layers },
      selectedLayerId: newLayer.id,
    };
  }),

  toggleLayerLock: (id) => set((state) => {
    if (!state.activeComponent) return {};
    const layers = state.activeComponent.layers.map((layer) =>
      layer.id === id ? { ...layer, locked: !layer.locked } : layer
    );
    return {
      activeComponent: { ...state.activeComponent, layers }
    };
  }),

  toggleLayerVisibility: (id) => set((state) => {
    if (!state.activeComponent) return {};
    const layers = state.activeComponent.layers.map((layer) =>
      layer.id === id ? { ...layer, visible: layer.visible === false ? true : false } : layer
    );
    return {
      activeComponent: { ...state.activeComponent, layers }
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
      // Fit-to-content optimization: compute bounding box of all visible layers
      const visibleLayers = state.activeComponent.layers.filter(l => l.visible !== false);
      
      let optimizedComponent: CustomComponentTemplate;
      
      if (visibleLayers.length > 0) {
        const padding = 2;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const layer of visibleLayers) {
          // Account for rotation by using a simple bounding box (exact rotated bbox is complex)
          minX = Math.min(minX, layer.x);
          minY = Math.min(minY, layer.y);
          maxX = Math.max(maxX, layer.x + layer.width);
          maxY = Math.max(maxY, layer.y + layer.height);
        }
        
        const offsetX = minX - padding;
        const offsetY = minY - padding;
        const fitWidth = Math.ceil(maxX - minX + padding * 2);
        const fitHeight = Math.ceil(maxY - minY + padding * 2);
        
        // Shift all layers and set optimized dimensions
        const shiftedLayers = state.activeComponent.layers.map(l => ({
          ...l,
          x: l.x - offsetX,
          y: l.y - offsetY,
          style: { ...l.style },
        }));
        
        optimizedComponent = {
          ...state.activeComponent,
          editDimensions: { ...state.activeComponent.dimensions },
          dimensions: { width: fitWidth, height: fitHeight },
          layers: shiftedLayers,
        };
      } else {
        optimizedComponent = {
          ...state.activeComponent,
          editDimensions: { ...state.activeComponent.dimensions },
        };
      }

      const componentsDir = await StorageService.get_global_components_dir();
      const path = `${componentsDir}/${optimizedComponent.componentId}.json`;
      await StorageService.save_text_file(
        path,
        JSON.stringify(optimizedComponent, null, 2)
      );
      await get().loadLibrary();
    } catch (err: any) {
      console.error('Error saving component to library:', err);
      get().openAlert({
        title: 'Error',
        message: `Save component failed: ${err.message || JSON.stringify(err) || err.toString()}`
      });
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
