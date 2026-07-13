import { StateCreator } from 'zustand';
import { AppState, LogicalNode, VisualNode, LogicalEdge, HandleConfig } from '../../types';
import { getLayoutedElements } from '../../utils/layout';

export interface CanvasSlice {
  pendingDrop: { type: string; name: string } | null;
  addNode: (logical: LogicalNode, visual: VisualNode) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeDimensions: (id: string, width: number, height: number) => void;
  addEdge: (edge: LogicalEdge) => void;
  reconnectEdge: (edgeId: string, from: string, to: string, fromPort: string, toPort: string) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateCanvasViewport: (zoom: number, pan: { x: number; y: number }) => void;
  startDrag: (type: string, name: string) => void;
  cancelDrag: () => void;
  clearCanvas: () => void;
  updateNodeDetails: (id: string, name: string, type: string, theme?: string, handles?: HandleConfig[]) => void;
  updateNodeHandles: (nodeId: string, handles: HandleConfig[]) => void;
  updateEdgeDetails: (edgeId: string, protocol: string, isAsync: boolean, duration: number, delay: number, tooltipText?: string, tooltipDuration?: number, description?: string) => void;
  setNodeParent: (nodeId: string, parentId: string | null) => void;
  autoResizeSection: (sectionId: string) => void;
  deleteSectionWithChoice: (sectionId: string, deleteChildren: boolean) => void;
  applyAutoLayout: (direction: 'TB' | 'LR') => void;
}

export const createCanvasSlice: StateCreator<AppState, [], [], CanvasSlice> = (set, get) => ({
  pendingDrop: null,

  addNode: (logical, visual) => {
    get().pushToHistory();
    set((state) => {
      const nodes = [...state.logicalData.nodes, logical];
      const layoutNodes = { ...state.visualData.layoutNodes, [visual.id]: visual };
      return {
        logicalData: { ...state.logicalData, nodes },
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  updateNodePosition: (id, x, y) => {
    set((state) => {
      const layoutNode = state.visualData.layoutNodes[id];
      if (!layoutNode) return {};
      const updatedNode = { ...layoutNode, x, y };
      const layoutNodes = { ...state.visualData.layoutNodes, [id]: updatedNode };
      return {
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  updateNodeDimensions: (id, width, height) => {
    set((state) => {
      const layoutNode = state.visualData.layoutNodes[id];
      if (!layoutNode) return {};
      const updatedNode = { ...layoutNode, width, height };
      const layoutNodes = { ...state.visualData.layoutNodes, [id]: updatedNode };
      return {
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  addEdge: (edge) => {
    set((state) => {
      const edges = [...state.logicalData.edges, edge];
      return {
        logicalData: { ...state.logicalData, edges },
        isDirty: true
      };
    });
  },

  deleteNode: (id) => {
    get().pushToHistory();
    set((state) => {
      const nodes = state.logicalData.nodes.filter((n) => n.id !== id);
      const deletedEdgeIds = state.logicalData.edges
        .filter((e) => e.from === id || e.to === id)
        .map((e) => e.id);
      
      const edges = state.logicalData.edges.filter((e) => e.from !== id && e.to !== id);
      const sequences = state.logicalData.sequences.filter((s) => !deletedEdgeIds.includes(s.edgeId));
      
      const layoutNodes = { ...state.visualData.layoutNodes };
      delete layoutNodes[id];
      
      const timelines = { ...state.visualData.timelines };
      state.logicalData.sequences.forEach((s) => {
        if (deletedEdgeIds.includes(s.edgeId)) {
          delete timelines[s.id];
        }
      });

      return {
        logicalData: { nodes, edges, sequences },
        visualData: { ...state.visualData, layoutNodes, timelines },
        isDirty: true
      };
    });
  },

  reconnectEdge: (edgeId, from, to, fromPort, toPort) => {
    get().pushToHistory();
    const state = get();
    const edges = state.logicalData.edges.map((e) => {
      if (e.id === edgeId) {
        return { ...e, from, to, fromPort, toPort };
      }
      return e;
    });

    set({
      logicalData: { ...state.logicalData, edges },
      isDirty: true,
    });
  },

  deleteEdge: (id) => {
    get().pushToHistory();
    set((state) => {
      const edges = state.logicalData.edges.filter((e) => e.id !== id);
      const deletedSeqIds = state.logicalData.sequences
        .filter((s) => s.edgeId === id)
        .map((s) => s.id);
      
      const sequences = state.logicalData.sequences.filter((s) => s.edgeId !== id);
      
      const timelines = { ...state.visualData.timelines };
      deletedSeqIds.forEach((seqId) => {
        delete timelines[seqId];
      });

      return {
        logicalData: { ...state.logicalData, edges, sequences },
        visualData: { ...state.visualData, timelines },
        isDirty: true
      };
    });
  },

  updateCanvasViewport: (zoom, pan) => {
    set((state) => {
      return {
        visualData: {
          ...state.visualData,
          canvas: { zoom, pan }
        },
        isDirty: true
      };
    });
  },

  startDrag: (type, name) => set({ pendingDrop: { type, name } }),
  cancelDrag: () => set({ pendingDrop: null }),

  clearCanvas: () => set((state) => ({
    logicalData: { nodes: [], edges: [], sequences: [] },
    visualData: { 
      canvas: state.visualData.canvas, 
      layoutNodes: {}, 
      timelines: {} 
    },
    isDirty: true,
    isPlaying: false,
    currentTime: 0,
    activeSequenceIds: [],
    selectedSequenceId: null
  })),

  updateNodeDetails: (id, name, type, theme, handles) => {
    set((state) => {
      const nodes = state.logicalData.nodes.map((n) => 
        n.id === id ? { ...n, name, type, ...(handles !== undefined ? { handles } : {}) } : n
      );
      const existingVisual = state.visualData.layoutNodes[id] ?? { id, x: 0, y: 0 };
      const layoutNodes = {
        ...state.visualData.layoutNodes,
        [id]: { ...existingVisual, theme }
      };
      return {
        logicalData: { ...state.logicalData, nodes },
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  updateNodeHandles: (nodeId, handles) => {
    get().pushToHistory();
    set((state) => {
      const nodes = state.logicalData.nodes.map((n) =>
        n.id === nodeId ? { ...n, handles } : n
      );
      return {
        logicalData: { ...state.logicalData, nodes },
        isDirty: true
      };
    });
  },

  updateEdgeDetails: (edgeId, protocol, isAsync, duration, delay, tooltipText, tooltipDuration, description) => {
    set((state) => {
      const edges = state.logicalData.edges.map((e) => 
        e.id === edgeId ? { ...e, protocol, isAsync, description } : e
      );
      const sequences = state.logicalData.sequences.map((s) => 
        s.edgeId === edgeId ? { ...s, isAsync } : s
      );
      const timelines = { ...state.visualData.timelines };
      state.logicalData.sequences
        .filter((s) => s.edgeId === edgeId)
        .forEach((seq) => {
          const existing = timelines[seq.id] ?? { sequenceId: seq.id, duration: 1000, delay: 0 };
          timelines[seq.id] = {
            ...existing,
            duration,
            delay,
            internalProcess: tooltipText 
              ? { text: tooltipText, duration: tooltipDuration ?? 1000 }
              : undefined
          };
        });
      return {
        logicalData: { ...state.logicalData, edges, sequences },
        visualData: { ...state.visualData, timelines },
        isDirty: true
      };
    });
  },

  setNodeParent: (nodeId, parentId) => {
    get().pushToHistory();
    set((state) => {
      const nodes = state.logicalData.nodes.map((n) =>
        n.id === nodeId ? { ...n, parentId: parentId ?? undefined } : n
      );
      return {
        logicalData: { ...state.logicalData, nodes },
        isDirty: true
      };
    });
  },

  autoResizeSection: (sectionId) => {
    const state = get();
    const children = state.logicalData.nodes.filter(n => n.parentId === sectionId);
    if (children.length === 0) return;

    const sectionVisual = state.visualData.layoutNodes[sectionId];
    if (!sectionVisual) return;

    const PADDING = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    children.forEach(child => {
      const cv = state.visualData.layoutNodes[child.id];
      if (!cv) return;
      const cw = cv.width ?? 224;
      const ch = cv.height ?? 52;
      minX = Math.min(minX, cv.x);
      minY = Math.min(minY, cv.y);
      maxX = Math.max(maxX, cv.x + cw);
      maxY = Math.max(maxY, cv.y + ch);
    });

    if (minX === Infinity) return;

    const neededW = maxX + PADDING;
    const neededH = maxY + PADDING;
    const currentW = sectionVisual.width ?? 400;
    const currentH = sectionVisual.height ?? 300;

    const newW = Math.max(currentW, neededW);
    const newH = Math.max(currentH, neededH);

    if (newW !== currentW || newH !== currentH) {
      set((state) => ({
        visualData: {
          ...state.visualData,
          layoutNodes: {
            ...state.visualData.layoutNodes,
            [sectionId]: { ...state.visualData.layoutNodes[sectionId], width: newW, height: newH }
          }
        },
        isDirty: true
      }));
    }
  },

  deleteSectionWithChoice: (sectionId, deleteChildren) => {
    get().pushToHistory();
    set((state) => {
      const sectionVisual = state.visualData.layoutNodes[sectionId];

      let nodes: typeof state.logicalData.nodes;
      const layoutNodes = { ...state.visualData.layoutNodes };
      const timelines = { ...state.visualData.timelines };

      if (deleteChildren) {
        const childIds = state.logicalData.nodes.filter(n => n.parentId === sectionId).map(n => n.id);
        const allDeleteIds = new Set([sectionId, ...childIds]);
        nodes = state.logicalData.nodes.filter(n => !allDeleteIds.has(n.id));

        const deletedEdgeIds = state.logicalData.edges
          .filter(e => allDeleteIds.has(e.from) || allDeleteIds.has(e.to))
          .map(e => e.id);
          
        const edges = state.logicalData.edges.filter(e => !allDeleteIds.has(e.from) && !allDeleteIds.has(e.to));
        const sequences = state.logicalData.sequences.filter(s => !deletedEdgeIds.includes(s.edgeId));
        
        allDeleteIds.forEach(id => delete layoutNodes[id]);
        
        state.logicalData.sequences.forEach(s => {
          if (deletedEdgeIds.includes(s.edgeId)) {
            delete timelines[s.id];
          }
        });

        return {
          logicalData: { nodes, edges, sequences },
          visualData: { ...state.visualData, layoutNodes, timelines },
          isDirty: true
        };
      } else {
        nodes = state.logicalData.nodes.filter(n => n.id !== sectionId).map(n => {
          if (n.parentId === sectionId) {
            const childVisual = state.visualData.layoutNodes[n.id];
            if (childVisual && sectionVisual) {
              layoutNodes[n.id] = {
                ...childVisual,
                x: sectionVisual.x + childVisual.x,
                y: sectionVisual.y + childVisual.y
              };
            }
            return { ...n, parentId: undefined };
          }
          return n;
        });

        const deletedEdgeIds = state.logicalData.edges
          .filter(e => e.from === sectionId || e.to === sectionId)
          .map(e => e.id);
          
        const edges = state.logicalData.edges.filter(e => e.from !== sectionId && e.to !== sectionId);
        const sequences = state.logicalData.sequences.filter(s => !deletedEdgeIds.includes(s.edgeId));
        
        delete layoutNodes[sectionId];
        
        state.logicalData.sequences.forEach(s => {
          if (deletedEdgeIds.includes(s.edgeId)) {
            delete timelines[s.id];
          }
        });

        return {
          logicalData: { nodes, edges, sequences },
          visualData: { ...state.visualData, layoutNodes, timelines },
          isDirty: true
        };
      }
    });
  },

  applyAutoLayout: (direction) => {
    get().pushToHistory();
    const state = get();
    const { nodes, edges } = state.logicalData;

    // Helper map to find node parentIds
    const nodeParentMap = new Map<string, string | undefined>(
      nodes.map(n => [n.id, n.parentId])
    );

    // 1. Only include top-level nodes for Dagre (ignore children of sections)
    const topLevelNodes = nodes.filter(n => !n.parentId);

    const rfNodes = topLevelNodes.map((node) => {
      const visual = state.visualData.layoutNodes[node.id] || {};
      return {
        id: node.id,
        position: { x: visual.x ?? 0, y: visual.y ?? 0 },
        data: { name: node.name, type: node.type },
        width: visual.width ?? (node.type === 'section' ? 400 : 224),
        height: visual.height ?? (node.type === 'section' ? 300 : 52),
      };
    });

    // 2. Map edges so that if source/target is inside a section, it points to the section itself.
    // Discard edges where both source and target map to the same section.
    const mappedEdges: { id: string; source: string; target: string }[] = [];
    edges.forEach((edge) => {
      const parentSrc = nodeParentMap.get(edge.from);
      const parentTgt = nodeParentMap.get(edge.to);

      const actualSource = parentSrc || edge.from;
      const actualTarget = parentTgt || edge.to;

      if (actualSource !== actualTarget) {
        mappedEdges.push({
          id: edge.id,
          source: actualSource,
          target: actualTarget,
        });
      }
    });

    // 3. Calculate layout
    const layouted = getLayoutedElements(rfNodes, mappedEdges as any, direction);

    // 4. Update coordinates only for the top-level nodes that Dagre processed
    const layoutNodes = { ...state.visualData.layoutNodes };
    layouted.forEach((node) => {
      layoutNodes[node.id] = {
        ...layoutNodes[node.id],
        x: node.position.x,
        y: node.position.y,
      };
    });

    // Update edge connection ports based on layout direction (excluding internal section edges)
    const fromPort: string = direction === 'TB' ? 'bottom:50' : 'right:50';
    const toPort: string = direction === 'TB' ? 'top:50' : 'left:50';
    const updatedEdges = edges.map((edge) => {
      const parentSrc = nodeParentMap.get(edge.from);
      const parentTgt = nodeParentMap.get(edge.to);
      if (parentSrc && parentTgt && parentSrc === parentTgt) {
        // Internal to a section, keep original ports
        return edge;
      }
      return {
        ...edge,
        fromPort,
        toPort
      };
    });

    set({
      logicalData: { ...state.logicalData, edges: updatedEdges },
      visualData: { ...state.visualData, layoutNodes },
      layoutVersion: state.layoutVersion + 1,
      isDirty: true
    });
  }
});
