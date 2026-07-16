import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  Connection,
  NodeChange,
  EdgeChange,
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  reconnectEdge,
  useViewport,
} from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { AnimatedEdge } from './AnimatedEdge';
import { SectionNode } from './SectionNode';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';
import { Trash2 } from 'lucide-react';

import { ContextMenu } from './ContextMenu';
import { ClearCanvasModal } from './ClearCanvasModal';
import { DragGhost } from './DragGhost';
import { getDefaultHandles } from '../../utils/portUtils';

import {
  useCanvasSync,
  useCanvasDrop,
  useCanvasShortcuts,
  useSectionDrag,
} from './hooks';

const nodeTypes = { customNode: BaseNode, sectionNode: SectionNode };
const edgeTypes = { customEdge: AnimatedEdge };

function isColorDark(color: string): boolean {
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  } else if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return true;
}

const FlowWrapper: React.FC = () => {
  const updateNodePosition = useAppStore((s) => s.updateNodePosition);
  const zustandAddEdge = useAppStore((s) => s.addEdge);
  const zustandReconnectEdge = useAppStore((s) => s.reconnectEdge);
  const deleteNode = useAppStore((s) => s.deleteNode);
  const deleteEdge = useAppStore((s) => s.deleteEdge);
  const cloneNode = useAppStore((s) => s.cloneNode);
  const updateCanvasViewport = useAppStore((s) => s.updateCanvasViewport);
  const pendingDrop = useAppStore((s) => s.pendingDrop);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);
  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const addSequenceStep = useAppStore((s) => s.addSequenceStep);
  const theme = useAppStore((s) => s.theme);
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const clearCanvas = useAppStore((s) => s.clearCanvas);
  const updateNodeDetails = useAppStore((s) => s.updateNodeDetails);
  const pushToHistory = useAppStore((s) => s.pushToHistory);
  const focusedNodeId = useAppStore((s) => s.focusedNodeId);
  const setFocusedNodeId = useAppStore((s) => s.setFocusedNodeId);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const isReadOnly = useAppStore((s) => s.isReadOnly);
  const setActiveNodeProperties = useAppStore((s) => s.setActiveNodeProperties);
  const setActiveEdgeProperties = useAppStore((s) => s.setActiveEdgeProperties);
  const clearActiveProperties = useAppStore((s) => s.clearActiveProperties);
  const openRightSidebar = useAppStore((s) => s.openRightSidebar);
  const gridVisible = useAppStore((s) => s.visualData.canvas.gridVisible !== false);
  const bgColor = useAppStore((s) => s.visualData.canvas.bgColor);
  const isBgDark = bgColor ? isColorDark(bgColor) : theme === 'dark';
  const dotColor = isBgDark ? '#334155' : '#cbd5e1';

  const { screenToFlowPosition, setCenter, fitView } = useReactFlow();
  const { x: viewportX, y: viewportY, zoom } = useViewport();
  const wrapperRef = useRef<HTMLDivElement>(null);
  


  // ── Local React Flow state ─────────────────────────────────────────────────
  const [rfNodes, setRfNodes] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges] = useEdgesState<Edge>([]);
  const [alignmentLines, setAlignmentLines] = useState<{ type: 'horizontal' | 'vertical', pos: number, start: number, end: number }[]>([]);

  // ── Context Menu State ─────────────────────────────────────────────────────
  const [menu, setMenu] = useState<{
    id: string;
    type: 'node' | 'edge';
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // ── Pending Connection Modal State ─────────────────────────────────────────
  const dragStartRef = useRef<{ nodeId: string; handleId: string } | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleCancelActiveEdge = useCallback(() => {
    const current = useAppStore.getState().activeEdgeProperties;
    if (current?.isNew) {
      deleteEdge(current.id);
      setRfEdges((eds) => eds.filter((e) => e.id !== current.id));
    }
    clearActiveProperties();
  }, [deleteEdge, setRfEdges, clearActiveProperties]);

  // ── Custom Hooks ──────────────────────────────────────────────────────────
  const { visualDataRef } = useCanvasSync(setRfNodes, setRfEdges);
  useCanvasDrop(wrapperRef, screenToFlowPosition, setRfNodes);
  useCanvasShortcuts(closeMenu, handleCancelActiveEdge);
  
  // Focus on node from external triggers (e.g., SidebarRight)
  useEffect(() => {
    if (focusedNodeId) {
      const vn = useAppStore.getState().visualData.layoutNodes[focusedNodeId];
      if (vn) {
        const logicalNodes = useAppStore.getState().logicalData.nodes;
        const layoutNodes = useAppStore.getState().visualData.layoutNodes;

        // Recursive helper to resolve absolute position of nested children
        const getAbsolutePos = (id: string): { x: number; y: number } => {
          const v = layoutNodes[id];
          if (!v) return { x: 0, y: 0 };
          const l = logicalNodes.find((n) => n.id === id);
          if (l?.parentId) {
            const parentPos = getAbsolutePos(l.parentId);
            return { x: v.x + parentPos.x, y: v.y + parentPos.y };
          }
          return { x: v.x, y: v.y };
        };

        const absPos = getAbsolutePos(focusedNodeId);
        const x = absPos.x + (vn.width ?? 120) / 2;
        const y = absPos.y + (vn.height ?? 80) / 2;
        setCenter(x, y, { zoom: 1.2, duration: 800 });

        setSelectedSequenceId(null);
        clearActiveProperties();
        setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })));

        setRfNodes((nds) =>
          nds.map((n) => ({
            ...n,
            selected: n.id === focusedNodeId,
          }))
        );
      }
      setFocusedNodeId(null);
    }
  }, [focusedNodeId, setCenter, setRfNodes, setFocusedNodeId, setSelectedSequenceId, setRfEdges]);

  // Clear selected states and property panels when simulation starts playing
  useEffect(() => {
    if (isPlaying) {
      setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
      setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
      clearActiveProperties();
    }
  }, [isPlaying, setRfNodes, setRfEdges, clearActiveProperties]);

  const { onNodeDragStop } = useSectionDrag();

  // ── View Interactions ─────────────────────────────────────────────────────
  const handleNodeClick = useCallback((e: React.MouseEvent, node: Node) => {
    if (isPlaying) return;
    e.stopPropagation();
    closeMenu();
    setActiveEdgeProperties(null);

    const logicalData = useAppStore.getState().logicalData;
    const ln = logicalData.nodes.find(n => n.id === node.id);
    const vn = visualDataRef.current.layoutNodes[node.id];
    if (ln) {
      setActiveNodeProperties({
        id: node.id,
        name: ln.name,
        type: ln.type,
        theme: vn?.theme ?? 'indigo',
        handles: vn?.handles,
        displayMode: vn?.displayMode ?? 'default',
        rotation: vn?.rotation ?? 0,
        customStyles: vn?.customStyles ?? {},
      });
      setActiveEdgeProperties(null);
      openRightSidebar();
    }
  }, [closeMenu, visualDataRef, setActiveNodeProperties, setActiveEdgeProperties, openRightSidebar]);

  const handleEdgeClick = useCallback((e: React.MouseEvent, edge: Edge) => {
    if (isPlaying) return;
    e.stopPropagation();
    closeMenu();
    setActiveNodeProperties(null);

    const logicalData = useAppStore.getState().logicalData;
    const visualData = useAppStore.getState().visualData;
    const le = logicalData.edges.find(e => e.id === edge.id);
    const ve = visualData.layoutEdges[edge.id];
    const seq = logicalData.sequences.find(s => s.edgeId === edge.id);
    
    if (seq) {
      setSelectedSequenceId(seq.id);
    } else {
      setSelectedSequenceId(null);
    }

    if (le) {
      const timing = seq ? visualDataRef.current.timelines[seq.id] : null;
      setActiveEdgeProperties({
        id: edge.id,
        protocol: le.protocol ?? 'Call',
        isAsync: le.isAsync,
        stepNumber: seq?.stepNumber ?? 1,
        duration: timing?.duration ?? 1000,
        delay: timing?.delay ?? 0,
        tooltipText: timing?.internalProcess?.text ?? '',
        tooltipDuration: timing?.internalProcess?.duration ?? 1000,
        description: le.description ?? '',
        particleType: ve?.particleType ?? 'dot',
        showArrow: ve?.showArrow ?? false,
        color: ve?.color ?? '',
      });
      setActiveNodeProperties(null);
      openRightSidebar();
    }
  }, [closeMenu, visualDataRef, setSelectedSequenceId, setActiveEdgeProperties, setActiveNodeProperties, openRightSidebar]);

  // ── Listen for Export Trigger ───────────────
  useEffect(() => {
    const handleExportFitView = () => {
      // Saniyesinde tam sığdırma yapar ki export işlemi tam canvası çekebilsin
      fitView({ padding: 0.1, duration: 0 });
    };
    window.addEventListener('export:fitview', handleExportFitView);
    return () => window.removeEventListener('export:fitview', handleExportFitView);
  }, [fitView]);

  useEffect(() => {
    if (!selectedSequenceId) {
      setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
      return;
    }
    const logicalData = useAppStore.getState().logicalData;
    const seq = logicalData.sequences.find((s) => s.id === selectedSequenceId);
    if (!seq) return;

    const edge = logicalData.edges.find((e) => e.id === seq.edgeId);
    if (!edge) return;

    const sourceNode = visualDataRef.current.layoutNodes[edge.sourceId];
    const targetNode = visualDataRef.current.layoutNodes[edge.targetId];
    if (!sourceNode || !targetNode) return;

    const logicalNodes = logicalData.nodes;
    const layoutNodes = visualDataRef.current.layoutNodes;

    // Helper to calculate absolute node position recursively
    const getAbsolutePos = (id: string): { x: number; y: number } => {
      const v = layoutNodes[id];
      if (!v) return { x: 0, y: 0 };
      const l = logicalNodes.find((n) => n.id === id);
      if (l?.parentId) {
        const parentPos = getAbsolutePos(l.parentId);
        return { x: v.x + parentPos.x, y: v.y + parentPos.y };
      }
      return { x: v.x, y: v.y };
    };

    const sourcePos = getAbsolutePos(edge.sourceId);
    const targetPos = getAbsolutePos(edge.targetId);

    const sourceW = sourceNode.width ?? 120;
    const sourceH = sourceNode.height ?? 80;
    const targetW = targetNode.width ?? 120;
    const targetH = targetNode.height ?? 80;

    const sourceCenterX = sourcePos.x + sourceW / 2;
    const sourceCenterY = sourcePos.y + sourceH / 2;
    const targetCenterX = targetPos.x + targetW / 2;
    const targetCenterY = targetPos.y + targetH / 2;

    const centerX = (sourceCenterX + targetCenterX) / 2;
    const centerY = (sourceCenterY + targetCenterY) / 2;
    
    setCenter(centerX, centerY, { zoom: 1.3, duration: 800 });

    setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setActiveNodeProperties(null);

    setRfEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: e.id === edge.id,
      }))
    );
  }, [selectedSequenceId, setCenter, setRfEdges, setRfNodes, visualDataRef]);

  useEffect(() => {
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [closeMenu]);

  const onNodeDragStart = useCallback(() => {
    pushToHistory();
  }, [pushToHistory]);

  // ── Node changes ──────────────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (isPlaying) return;

      const hasNodeSelection = changes.some((c) => c.type === 'select' && c.selected);
      if (hasNodeSelection) {
        setSelectedSequenceId(null);
        setActiveEdgeProperties(null);
        setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
      }

      // Smart Alignment Snapping implementation
      const positionChanges = changes.filter(c => c.type === 'position' && c.position) as any[];
      if (positionChanges.length === 1 && positionChanges[0].dragging) {
        const change = positionChanges[0];
        const state = useAppStore.getState();
        const otherNodes = state.logicalData.nodes.filter(n => n.id !== change.id);
        
        const vnDrag = state.visualData.layoutNodes[change.id] ?? { x: 0, y: 0 };
        const dragW = vnDrag.width ?? 150;
        const dragH = vnDrag.height ?? 48;

        let snappedX = change.position.x;
        let snappedY = change.position.y;
        const threshold = 15;
        const lines: { type: 'horizontal' | 'vertical', pos: number, start: number, end: number }[] = [];
        
        otherNodes.forEach(n => {
           const vn = state.visualData.layoutNodes[n.id];
           if (!vn) return;
           const otherW = vn.width ?? 150;
           const otherH = vn.height ?? 48;

           // snap x (vertical alignment line)
           // 1. Left-to-Left
           if (Math.abs(vn.x - change.position.x) < threshold) {
             snappedX = vn.x;
             lines.push({ 
               type: 'vertical', 
               pos: vn.x, 
               start: Math.min(vn.y, change.position.y), 
               end: Math.max(vn.y + otherH, change.position.y + dragH) 
             });
           }
           // 2. Center-to-Center X
           else if (Math.abs((vn.x + otherW / 2) - (change.position.x + dragW / 2)) < threshold) {
             snappedX = vn.x + otherW / 2 - dragW / 2;
             lines.push({ 
               type: 'vertical', 
               pos: vn.x + otherW / 2, 
               start: Math.min(vn.y, change.position.y), 
               end: Math.max(vn.y + otherH, change.position.y + dragH) 
             });
           }
           // 3. Right-to-Right
           else if (Math.abs((vn.x + otherW) - (change.position.x + dragW)) < threshold) {
             snappedX = vn.x + otherW - dragW;
             lines.push({ 
               type: 'vertical', 
               pos: vn.x + otherW, 
               start: Math.min(vn.y, change.position.y), 
               end: Math.max(vn.y + otherH, change.position.y + dragH) 
             });
           }

           // snap y (horizontal alignment line)
           // 1. Top-to-Top
           if (Math.abs(vn.y - change.position.y) < threshold) {
             snappedY = vn.y;
             lines.push({ 
               type: 'horizontal', 
               pos: vn.y, 
               start: Math.min(vn.x, change.position.x), 
               end: Math.max(vn.x + otherW, change.position.x + dragW) 
             });
           }
           // 2. Center-to-Center Y
           else if (Math.abs((vn.y + otherH / 2) - (change.position.y + dragH / 2)) < threshold) {
             snappedY = vn.y + otherH / 2 - dragH / 2;
             lines.push({ 
               type: 'horizontal', 
               pos: vn.y + otherH / 2, 
               start: Math.min(vn.x, change.position.x), 
               end: Math.max(vn.x + otherW, change.position.x + dragW) 
             });
           }
           // 3. Bottom-to-Bottom
           else if (Math.abs((vn.y + otherH) - (change.position.y + dragH)) < threshold) {
             snappedY = vn.y + otherH - dragH;
             lines.push({ 
               type: 'horizontal', 
               pos: vn.y + otherH, 
               start: Math.min(vn.x, change.position.x), 
               end: Math.max(vn.x + otherW, change.position.x + dragW) 
             });
           }
        });
        
        change.position.x = snappedX;
        change.position.y = snappedY;
        if (change.positionAbsolute) {
          change.positionAbsolute.x = snappedX;
          change.positionAbsolute.y = snappedY;
        }
        setAlignmentLines(lines);
      } else if (!changes.some(c => c.type === 'position' && c.dragging)) {
        setAlignmentLines([]);
      }

      setRfNodes((nds) => applyNodeChanges(changes, nds));
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position.x, change.position.y);
        } else if (change.type === 'remove') {
          const state = useAppStore.getState();
          const node = state.logicalData.nodes.find(n => n.id === change.id);
          if (node?.type === 'section') {
            return;
          }
          deleteNode(change.id);
        }
      });
    },
    [setRfNodes, updateNodePosition, deleteNode, isPlaying, setSelectedSequenceId, setRfEdges]
  );

  // ── Edge changes ──────────────────────────────────────────────────────────
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (isPlaying) return;

      const hasEdgeSelection = changes.some((c) => c.type === 'select' && c.selected);
      if (hasEdgeSelection) {
        setActiveNodeProperties(null);
        setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
      }

      setRfEdges((eds) => applyEdgeChanges(changes, eds));
      changes.forEach((change) => {
        if (change.type === 'remove') deleteEdge(change.id);
      });
    },
    [setRfEdges, deleteEdge, isPlaying, setRfNodes]
  );

  // ── Handle Connection ──────────────────────────────────────────────────────
  const onConnectStart = useCallback(
    (_event: any, params: { nodeId: string | null; handleId: string | null }) => {
      if (isPlaying) return;
      // Dismiss open panels so they don't cover the new edge properties panel
      setActiveNodeProperties(null);
      setActiveEdgeProperties(null);
      // Signal to CSS that a connection is being dragged (reveals all handles)
      wrapperRef.current?.classList.add('react-flow--connecting');
      if (params.nodeId && params.handleId) {
        dragStartRef.current = { nodeId: params.nodeId, handleId: params.handleId };
      }
    },
    []
  );

  const onConnectEnd = useCallback(() => {
    // Remove the connecting class so handles go back to their default visibility
    wrapperRef.current?.classList.remove('react-flow--connecting');
    dragStartRef.current = null;
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      
      const logicalData = useAppStore.getState().logicalData;
      const nextStepNum = logicalData.sequences.length > 0 
        ? Math.max(...logicalData.sequences.map(s => s.stepNumber)) + 1 
        : 1;
        
      let logicalFrom = connection.source;
      let logicalTo = connection.target;
      let logicalFromPort = (connection.sourceHandle ?? 'right:50').split('-')[0];
      let logicalToPort = (connection.targetHandle ?? 'left:50').split('-')[0];

      if (dragStartRef.current) {
        if (dragStartRef.current.nodeId === connection.target) {
          logicalFrom = connection.target;
          logicalTo = connection.source;
          logicalFromPort = (connection.targetHandle ?? 'left:50').split('-')[0];
          logicalToPort = (connection.sourceHandle ?? 'right:50').split('-')[0];
        }
      }

      const edgeId = `edge-${logicalFrom}-${logicalTo}-${Date.now()}`;
      const newRfEdge: Edge = {
        id: edgeId,
        type: 'customEdge',
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      };
      
      setRfEdges((eds) => addEdge(newRfEdge, eds));
      
      // Create logical edge (topology only)
      const logicalEdge = {
        id: edgeId,
        sourceId: logicalFrom,
        targetId: logicalTo,
        isAsync: false,
      };

      // Create visual edge (ports + presentation)
      const sourceHandle = logicalFromPort;
      const targetHandle = logicalToPort;
      const visualEdge = {
        id: edgeId,
        sourceHandle,
        targetHandle,
      };

      zustandAddEdge(logicalEdge, visualEdge);

      const seqId = `seq-${Date.now()}`;
      addSequenceStep(
        {
          id: seqId,
          stepNumber: nextStepNum,
          edgeId: edgeId,
          isAsync: false,
        },
        {
          sequenceId: seqId,
          duration: 1000,
          delay: 0,
        }
      );

      // Open PropertiesView in the sidebar immediately for the new edge
      setActiveEdgeProperties({
        id: edgeId,
        protocol: '',
        isAsync: false,
        stepNumber: nextStepNum,
        duration: 1000,
        delay: 0,
        tooltipText: '',
        tooltipDuration: 1000,
        description: '',
        isNew: true
      });
      openRightSidebar();
    },
    [setRfEdges, zustandAddEdge, addSequenceStep]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (isPlaying) return;
      if (!newConnection.source || !newConnection.target) return;
      setRfEdges((els) => reconnectEdge(oldEdge, newConnection, els));
      const sourceHandle = (newConnection.sourceHandle ?? 'right:50').split('-')[0];
      const targetHandle = (newConnection.targetHandle ?? 'left:50').split('-')[0];
      zustandReconnectEdge(oldEdge.id, newConnection.source, newConnection.target, sourceHandle, targetHandle);
    },
    [setRfEdges, zustandReconnectEdge]
  );

  // ── Viewport ───────────────────────────────────────────────────────────────
  const onMoveEnd = useCallback(
    (_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
      updateCanvasViewport(viewport.zoom, { x: viewport.x, y: viewport.y });
    },
    [updateCanvasViewport]
  );

  // ── Context Menu Actions ───────────────────────────────────────────────────
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      event.stopPropagation();
      setMenu({
        id: node.id,
        type: 'node',
        x: event.clientX,
        y: event.clientY,
        label: (node.data as any)?.name ?? node.id,
      });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      
      const srcNode = rfNodes.find(n => n.id === edge.source);
      const dstNode = rfNodes.find(n => n.id === edge.target);
      const srcLabel = (srcNode?.data as any)?.name ?? edge.source;
      const dstLabel = (dstNode?.data as any)?.name ?? edge.target;

      setMenu({
        id: edge.id,
        type: 'edge',
        x: event.clientX,
        y: event.clientY,
        label: `${srcLabel} → ${dstLabel}`,
      });
    },
    [rfNodes]
  );

  const handleDeleteElement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menu) return;
    if (menu.type === 'node') {
      setRfNodes((nds) => nds.filter((n) => n.id !== menu.id));
      setRfEdges((eds) => eds.filter((e) => e.source !== menu.id && e.target !== menu.id));
      deleteNode(menu.id);
    } else {
      setRfEdges((eds) => eds.filter((e) => e.id !== menu.id));
      deleteEdge(menu.id);
    }
    closeMenu();
  }, [menu, setRfNodes, setRfEdges, deleteNode, deleteEdge, closeMenu]);

  const handleCloneElement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menu || menu.type !== 'node') return;
    cloneNode(menu.id);
    closeMenu();
  }, [menu, cloneNode, closeMenu]);



  const onPaneClick = useCallback(() => {
    closeMenu();
    setSelectedSequenceId(null);
    clearActiveProperties();
  }, [closeMenu, setSelectedSequenceId, clearActiveProperties]);



  // Callback from Node properties to update local React Flow view state immediately
  const handleApplyNodeProperties = useCallback((id: string, name: string, type: string, themeColor: string, handles?: any[], displayMode?: 'default' | 'icon-only', rotation?: number, customStyles?: any, skipHistory?: boolean) => {
    if (!skipHistory) pushToHistory();
    
    let handlesToSave: any[] | undefined = undefined;
    
    if (handles) {
      // 1. Bake final IDs into the handles config
      const bakedHandles = handles.map(h => ({
        id: `${h.side}:${h.offset}`,
        side: h.side,
        offset: h.offset
      }));
      
      const defaultHandles = getDefaultHandles();
      const isDefault = bakedHandles.length === defaultHandles.length &&
        bakedHandles.every((h, i) => h.id === defaultHandles[i]?.id && h.offset === defaultHandles[i]?.offset && h.side === defaultHandles[i]?.side);
      
      handlesToSave = isDefault ? undefined : bakedHandles;

      // 2. Create map from originalId/old ID to new ID
      const idMap = new Map<string, string>();
      handles.forEach(h => {
        const original = h.originalId || h.id;
        const finalId = `${h.side}:${h.offset}`;
        idMap.set(original, finalId);
      });

      // 3. Find edges to remove (connected to deleted handles)
      const { logicalData } = useAppStore.getState();
      const { visualData } = useAppStore.getState();
      const edgesToRemove = logicalData.edges.filter(e => {
        const ve = visualData.layoutEdges[e.id];
        const fromPortId = ve?.sourceHandle;
        const toPortId = ve?.targetHandle;
        if (e.sourceId === id && fromPortId && !idMap.has(fromPortId)) return true;
        if (e.targetId === id && toPortId && !idMap.has(toPortId)) return true;
        return false;
      });

      // Remove deleted edges
      edgesToRemove.forEach(e => {
        deleteEdge(e.id);
      });
      const removedIds = new Set(edgesToRemove.map(e => e.id));
      setRfEdges(eds => eds.filter(re => !removedIds.has(re.id)));

      // 4. Update ports of remaining edges in the visual layer (handles live in VisualEdge)
      const currentVisualEdges = { ...useAppStore.getState().visualData.layoutEdges };
      const remainingEdgeIds = useAppStore.getState().logicalData.edges.map(e => e.id);
      let visualEdgesChanged = false;

      remainingEdgeIds.forEach(eid => {
        const ve = currentVisualEdges[eid];
        if (!ve) return;
        const le = useAppStore.getState().logicalData.edges.find(e => e.id === eid);
        if (!le) return;

        let sourceHandle = ve.sourceHandle;
        let targetHandle = ve.targetHandle;
        let changed = false;

        if (le.sourceId === id && sourceHandle && idMap.has(sourceHandle)) {
          const newHandle = idMap.get(sourceHandle)!;
          if (sourceHandle !== newHandle) { sourceHandle = newHandle; changed = true; }
        }
        if (le.targetId === id && targetHandle && idMap.has(targetHandle)) {
          const newHandle = idMap.get(targetHandle)!;
          if (targetHandle !== newHandle) { targetHandle = newHandle; changed = true; }
        }
        if (changed) {
          currentVisualEdges[eid] = { ...ve, sourceHandle, targetHandle };
          visualEdgesChanged = true;
        }
      });

      if (visualEdgesChanged) {
        useAppStore.setState(state => ({
          visualData: { ...state.visualData, layoutEdges: currentVisualEdges }
        }));
      }

      // Update React Flow visual edges immediately to prevent flash
      setRfEdges(eds => eds.map(re => {
        let sourceHandle = re.sourceHandle;
        let targetHandle = re.targetHandle;
        let changed = false;

        if (re.source === id && re.sourceHandle) {
          const originalPort = re.sourceHandle.split('-')[0];
          if (idMap.has(originalPort)) {
            sourceHandle = `${idMap.get(originalPort)}-source`;
            changed = true;
          }
        }
        if (re.target === id && re.targetHandle) {
          const originalPort = re.targetHandle.split('-')[0];
          if (idMap.has(originalPort)) {
            targetHandle = `${idMap.get(originalPort)}-target`;
            changed = true;
          }
        }
        return changed ? { ...re, sourceHandle, targetHandle } : re;
      }));
    }
    
    updateNodeDetails(id, name, type, themeColor, handlesToSave, displayMode, rotation, customStyles);
    setRfNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                name,
                type,
              },
            }
          : n
      )
    );
    clearActiveProperties();
  }, [updateNodeDetails, setRfNodes, setRfEdges, deleteEdge, pushToHistory, clearActiveProperties]);

  // ── Listen for node property apply from RightSidebarShell ───────────────
  // RightSidebarShell dispatches this event because handleApplyNodeProperties
  // needs access to React Flow local state (setRfNodes, setRfEdges) which is
  // only available inside this FlowWrapper component.
  useEffect(() => {
    const handleApplyFromSidebar = (e: Event) => {
      const { id, name, type, theme, handles, displayMode, rotation, customStyles, skipHistory } = (e as CustomEvent).detail;
      handleApplyNodeProperties(id, name, type, theme, handles, displayMode, rotation, customStyles, skipHistory);
    };
    window.addEventListener('canvas:applyNodeProperties', handleApplyFromSidebar);
    return () => window.removeEventListener('canvas:applyNodeProperties', handleApplyFromSidebar);
  }, [handleApplyNodeProperties]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: pendingDrop ? 'crosshair' : undefined,
      }}
    >


      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodesDraggable={!isPlaying && !isReadOnly}
        nodesConnectable={!isPlaying && !isReadOnly}
        elementsSelectable={!isReadOnly}
        nodesFocusable={!isReadOnly}
        edgesFocusable={!isReadOnly}
        minZoom={0.05}
        maxZoom={3}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={isReadOnly ? undefined : onNodesChange}
        onEdgesChange={isReadOnly ? undefined : onEdgesChange}
        onConnect={isReadOnly ? undefined : onConnect}
        onConnectStart={isReadOnly ? undefined : onConnectStart}
        onConnectEnd={isReadOnly ? undefined : onConnectEnd}
        onReconnect={isReadOnly ? undefined : onReconnect}
        onMoveEnd={onMoveEnd}
        onNodeContextMenu={isReadOnly ? undefined : onNodeContextMenu}
        onEdgeContextMenu={isReadOnly ? undefined : onEdgeContextMenu}
        onEdgeClick={handleEdgeClick}
        onPaneClick={onPaneClick}
        onMoveStart={() => {
          closeMenu();
        }}
        onNodeClick={handleNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        className="w-full h-full"
        style={{ backgroundColor: bgColor || undefined }}
        proOptions={{ hideAttribution: true }}
      >
        {gridVisible && (
          <Background
            color={dotColor}
            gap={16}
          />
        )}
        <Controls className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md font-sans" />
      </ReactFlow>

      {/* Drag Ghost — shows drop position preview while dragging from sidebar */}
      <DragGhost canvasRef={wrapperRef} />

      {/* Alignment Guides Overlay */}
      {alignmentLines.length > 0 && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          {alignmentLines.map((line, idx) => {
            if (line.type === 'vertical') {
              return (
                <div 
                  key={idx} 
                  style={{ 
                    position: 'absolute', 
                    left: line.pos * zoom + viewportX, 
                    top: line.start * zoom + viewportY, 
                    height: (line.end - line.start) * zoom, 
                    width: 1, 
                    backgroundColor: '#ec4899' // pink-500
                  }} 
                />
              );
            } else {
              return (
                <div 
                  key={idx} 
                  style={{ 
                    position: 'absolute', 
                    left: line.start * zoom + viewportX, 
                    top: line.pos * zoom + viewportY, 
                    width: (line.end - line.start) * zoom, 
                    height: 1, 
                    backgroundColor: '#ec4899' 
                  }} 
                />
              );
            }
          })}
        </div>
      )}

      {/* Floating Clear Canvas Button (Bottom Right) */}
      <div className="absolute bottom-4 right-14 z-40 flex items-center">
        <button
          onClick={() => setShowClearModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 shadow-md transition-all active:scale-95 cursor-pointer font-sans"
          title={t.clearCanvasTooltip}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t.clearBtn}</span>
        </button>
      </div>

      {/* Clear Canvas Confirmation Modal */}
      <ClearCanvasModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => {
          clearCanvas();
          setRfNodes([]);
          setRfEdges([]);
          setShowClearModal(false);
        }}
      />

      {/* Context Menu Overlay */}
      <ContextMenu
        menu={menu}
        onClose={closeMenu}
        onDelete={handleDeleteElement}
        onClone={handleCloneElement}
      />
    </div>
  );
};

export const DiagramCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <FlowWrapper />
    </ReactFlowProvider>
  );
};
