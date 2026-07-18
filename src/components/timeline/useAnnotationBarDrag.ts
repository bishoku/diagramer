import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const useAnnotationBarDrag = (
  pxPerMs: number
) => {
  const dragState = useRef<{
    isDragging: boolean;
    isResizing: boolean;
    resizeSide: 'left' | 'right' | null;
    noteId: string;
    startX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const updateStickyNote = useAppStore.getState().updateStickyNote;

  const handleBarMouseDown = useCallback((e: React.MouseEvent, noteId: string, start: number, end: number) => {
    e.stopPropagation();
    e.preventDefault();
    dragState.current = {
      isDragging: true,
      isResizing: false,
      resizeSide: null,
      noteId,
      startX: e.clientX,
      initialStart: start,
      initialEnd: end
    };
  }, []);

  const handleResizeLeftMouseDown = useCallback((e: React.MouseEvent, noteId: string, start: number, end: number) => {
    e.stopPropagation();
    e.preventDefault();
    dragState.current = {
      isDragging: false,
      isResizing: true,
      resizeSide: 'left',
      noteId,
      startX: e.clientX,
      initialStart: start,
      initialEnd: end
    };
  }, []);

  const handleResizeRightMouseDown = useCallback((e: React.MouseEvent, noteId: string, start: number, end: number) => {
    e.stopPropagation();
    e.preventDefault();
    dragState.current = {
      isDragging: false,
      isResizing: true,
      resizeSide: 'right',
      noteId,
      startX: e.clientX,
      initialStart: start,
      initialEnd: end
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragState.current;
      if (!state) return;

      const deltaX = e.clientX - state.startX;
      const deltaMs = Math.round((deltaX / pxPerMs) / 50) * 50; // Snap to 50ms grid

      if (state.isDragging) {
        let newStart = state.initialStart + deltaMs;
        if (newStart < 0) newStart = 0;
        const newEnd = newStart + (state.initialEnd - state.initialStart);
        
        updateStickyNote(state.noteId, {
          startTime: newStart,
          endTime: newEnd
        });
      } else if (state.isResizing) {
        if (state.resizeSide === 'left') {
          let newStart = state.initialStart + deltaMs;
          if (newStart < 0) newStart = 0;
          if (newStart >= state.initialEnd - 100) newStart = state.initialEnd - 100; // Min 100ms
          
          updateStickyNote(state.noteId, {
            startTime: newStart
          });
        } else if (state.resizeSide === 'right') {
          let newEnd = state.initialEnd + deltaMs;
          if (newEnd <= state.initialStart + 100) newEnd = state.initialStart + 100; // Min 100ms
          
          updateStickyNote(state.noteId, {
            endTime: newEnd
          });
        }
      }
    };

    const handleMouseUp = () => {
      dragState.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pxPerMs]);

  return { handleBarMouseDown, handleResizeLeftMouseDown, handleResizeRightMouseDown };
};
