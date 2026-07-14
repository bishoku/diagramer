import { useEffect, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';
import { toRfNode } from './utils';

export const useCanvasSync = (
  setRfNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setRfEdges: React.Dispatch<React.SetStateAction<Edge[]>>
) => {
  const layoutVersion = useAppStore((s) => s.layoutVersion);
  const visualDataRef = useRef(useAppStore.getState().visualData);
  const logicalDataRef = useRef(useAppStore.getState().logicalData);

  // Sync refs with store to avoid unnecessary dependency triggers
  // Also reactively sync ReactFlow state when logical nodes/edges change
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      visualDataRef.current = state.visualData;
      logicalDataRef.current = state.logicalData;

      // Sync nodes/edges if they actually changed
      if (
        state.logicalData.nodes !== prevState.logicalData.nodes ||
        state.logicalData.edges !== prevState.logicalData.edges
      ) {
        setRfNodes((currentNodes) => {
          // 1. Filter out deleted nodes
          const remainingNodes = currentNodes.filter((cn) =>
            state.logicalData.nodes.some((ln) => ln.id === cn.id)
          );

          // 2. Update existing nodes (parentId, data changes)
          const updatedRemaining = remainingNodes.map((cn) => {
            const ln = state.logicalData.nodes.find((l) => l.id === cn.id);
            if (!ln) return cn;
            const vn = state.visualData.layoutNodes[ln.id] ?? { x: 0, y: 0 };
            return toRfNode(ln, vn);
          });

          // 3. Add newly created nodes (sections first for parentId resolution)
          const newLogical = state.logicalData.nodes
            .filter((ln) => !currentNodes.some((cn) => cn.id === ln.id))
            .sort((a, b) => {
              const aS = a.type === 'section' ? 0 : 1;
              const bS = b.type === 'section' ? 0 : 1;
              return aS - bS;
            });
            
          const newNodes = newLogical.map((ln) => {
            const vn = state.visualData.layoutNodes[ln.id] ?? { x: 0, y: 0 };
            return toRfNode(ln, vn);
          });

          // Sort: sections first in the final array
          const all = [...updatedRemaining, ...newNodes];
          all.sort((a, b) => {
            const aS = a.type === 'sectionNode' ? 0 : 1;
            const bS = b.type === 'sectionNode' ? 0 : 1;
            return aS - bS;
          });
          return all;
        });

        if (state.logicalData.edges !== prevState.logicalData.edges ||
            state.visualData.layoutEdges !== prevState.visualData.layoutEdges) {
          setRfEdges(() =>
            state.logicalData.edges.map((le) => {
              const ve = state.visualData.layoutEdges[le.id];
              return {
                id: le.id,
                type: 'customEdge',
                source: le.sourceId,
                target: le.targetId,
                sourceHandle: ve?.sourceHandle ? `${ve.sourceHandle}-source` : undefined,
                targetHandle: ve?.targetHandle ? `${ve.targetHandle}-target` : undefined,
                reconnectable: true,
              };
            })
          );
        }
      }
    });
    return unsub;
  }, [setRfNodes, setRfEdges]);

  const initialised = useRef(false);

  // ── One-time init from store ───────────────────────────────────────────────
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    
    const state = useAppStore.getState();
    const logicalData = state.logicalData;

    // Sort: sections first so ReactFlow can resolve parentId references
    const sortedLogical = [...logicalData.nodes].sort((a, b) => {
      const aS = a.type === 'section' ? 0 : 1;
      const bS = b.type === 'section' ? 0 : 1;
      return aS - bS;
    });
    
    const nodes: Node[] = sortedLogical.map((ln) => {
      const vn = state.visualData.layoutNodes[ln.id] ?? { x: 0, y: 0 };
      return toRfNode(ln, vn);
    });
    
    const edges: Edge[] = logicalData.edges.map((le) => {
      const ve = state.visualData.layoutEdges[le.id];
      return {
        id: le.id,
        type: 'customEdge',
        source: le.sourceId,
        target: le.targetId,
        sourceHandle: ve?.sourceHandle ? `${ve.sourceHandle}-source` : undefined,
        targetHandle: ve?.targetHandle ? `${ve.targetHandle}-target` : undefined,
        reconnectable: true,
      };
    });
    
    setRfNodes(nodes);
    setRfEdges(edges);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync node positions on Layout Recalculation / Undo / Redo ──────────────
  useEffect(() => {
    if (layoutVersion === 0) return;
    const state = useAppStore.getState();
    const sortedLogical = [...state.logicalData.nodes].sort((a, b) => {
      const aS = a.type === 'section' ? 0 : 1;
      const bS = b.type === 'section' ? 0 : 1;
      return aS - bS;
    });
    
    setRfNodes(() =>
      sortedLogical.map((ln) => {
        const vn = visualDataRef.current.layoutNodes[ln.id] ?? { x: 0, y: 0 };
        return toRfNode(ln, vn);
      })
    );
  }, [layoutVersion, setRfNodes]);

  return { visualDataRef };
};
