import { useEffect, RefObject } from 'react';
import { Node } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';
import { toRfNode } from './utils';

export const useCanvasDrop = (
  wrapperRef: RefObject<HTMLDivElement | null>,
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number },
  setRfNodes: React.Dispatch<React.SetStateAction<Node[]>>
) => {
  const addNode = useAppStore((s) => s.addNode);
  const addStickyNote = useAppStore((s) => s.addStickyNote);
  const cancelDrag = useAppStore((s) => s.cancelDrag);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleMouseUp = (e: MouseEvent) => {
      const current = useAppStore.getState().pendingDrop;
      if (!current) return;

      const { type, name } = current;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const nodeId = `node-${type}-${Date.now()}`;

      const isSection = type === 'section';
      const isStickyNote = type === 'sticky_note';
      const width = isSection ? 400 : isStickyNote ? 220 : 224;
      const height = isSection ? 300 : isStickyNote ? 160 : 52;

      const x = position.x - width / 2;
      const y = position.y - height / 2;

      console.log(`[Canvas] Placing "${name}" at flow (${x.toFixed(0)}, ${y.toFixed(0)})`);

      const visualNode = { id: nodeId, x, y, width, height, ...(isSection ? { zIndex: -1 } : {}) };
      
      // Calculate unique name with index
      const existingNames = useAppStore.getState().logicalData.nodes.map(n => n.name);
      let index = 1;
      let uniqueName = `${name} ${index}`;
      while (existingNames.includes(uniqueName)) {
        index++;
        uniqueName = `${name} ${index}`;
      }

      const newNode: Node = toRfNode({ id: nodeId, type, name: uniqueName }, visualNode);

      setRfNodes((nds) => isSection ? [newNode, ...nds] : [...nds, newNode]);
      
      const logicalNode = { id: nodeId, type, name: uniqueName, properties: { _visualOnly: isStickyNote } };
      
      if (isStickyNote) {
        // Find a safe start time (currentTime or 0)
        const currentTime = useAppStore.getState().currentTime;
        const startTime = currentTime;
        const endTime = startTime + 5000; // Default 5 seconds duration
        
        const annotation = {
          id: nodeId,
          header: uniqueName,
          body: 'Double click to edit note...',
          style: {
            backgroundColor: '#fef08a', // yellow-200
            borderColor: '#eab308', // yellow-500
            textColor: '#422006', // yellow-950
            fontFamily: 'Inter',
            fontSize: 14,
            borderRadius: 8,
            opacity: 1,
            shadow: true
          },
          startTime,
          endTime,
          alwaysVisible: false
        };
        addStickyNote(logicalNode, visualNode, annotation);
      } else {
        addNode(logicalNode, visualNode);
      }
      
      cancelDrag();
    };

    el.addEventListener('mouseup', handleMouseUp);
    return () => el.removeEventListener('mouseup', handleMouseUp);
  }, [screenToFlowPosition, setRfNodes, addNode, cancelDrag, wrapperRef]);
};
