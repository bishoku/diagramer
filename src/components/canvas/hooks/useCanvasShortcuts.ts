import { useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';

export const useCanvasShortcuts = (
  closeMenu: () => void,
  closePopover: () => void
) => {
  const cancelDrag = useAppStore((s) => s.cancelDrag);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useAppStore.getState().pendingDrop) {
        cancelDrag();
      }
      if (e.key === 'Escape') {
        closeMenu();
        closePopover();
      }

      // Undo hotkey
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      // Redo hotkey
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDrag, closeMenu, undo, redo, closePopover]);
};
