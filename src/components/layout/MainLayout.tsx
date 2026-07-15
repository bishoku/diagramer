import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { TopBar } from './TopBar';
import { SidebarLeft } from './SidebarLeft';
import { RightSidebarShell } from '../sidebar/RightSidebarShell';
import { useAppStore } from '../../store/useAppStore';

import { DiagramCanvas } from '../canvas/DiagramCanvas';
import { TimelinePanel } from './TimelinePanel';

const SequenceDiagramCanvas = lazy(() => import('../sequence/SequenceDiagramCanvas').then(m => ({ default: m.SequenceDiagramCanvas })));

export const MainLayout: React.FC = () => {
  const timelineHeight = useAppStore((s) => s.timelineHeight);
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const setTimelineHeight = useAppStore((s) => s.setTimelineHeight);
  const language = useAppStore((s) => s.language);
  const viewMode = useAppStore((s) => s.viewMode);
  const [isResizing, setIsResizing] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newHeight = window.innerHeight - e.clientY;
    // Clamp height between 140px and 70% of screen height
    const clampedHeight = Math.min(Math.max(140, newHeight), window.innerHeight * 0.7);
    setTimelineHeight(clampedHeight);
  }, [isResizing, setTimelineHeight]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300">
      
      {/* Top Bar */}
      <TopBar />

      {/* Main Work Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Sidebar: Explorer & Library */}
        <SidebarLeft />

        {/* Center Section: Canvas & Timeline */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950">
          
          {/* Canvas Workspace Area — explicit size required by React Flow */}
          <div className="flex-1 min-h-0 relative" style={{ overflow: 'hidden' }}>
            {viewMode === 'freeform' ? (
              <DiagramCanvas />
            ) : (
              <Suspense fallback={
                <div className="flex items-center justify-center w-full h-full text-slate-400 dark:text-slate-600">
                  <div className="animate-pulse text-sm font-medium">Loading Sequence Diagram...</div>
                </div>
              }>
                <SequenceDiagramCanvas />
              </Suspense>
            )}
          </div>

          {/* Resizer Splitter Bar */}
          {timelineOpen && (
            <div
              ref={resizerRef}
              onMouseDown={handleMouseDown}
              className="h-1 bg-slate-200/60 hover:h-1.5 hover:bg-indigo-500 dark:bg-slate-800 dark:hover:bg-indigo-500 cursor-ns-resize transition-all duration-150 relative z-30 flex-shrink-0"
              title={language === 'tr' ? 'Zaman çizelgesini boyutlandır' : 'Resize timeline'}
            />
          )}

          {/* Timeline Animation Panel */}
          <div 
            style={{ height: timelineOpen ? timelineHeight : 'auto' }}
            className="border-t border-slate-200 dark:border-slate-800 z-10 shrink-0 select-none overflow-hidden"
          >
            <TimelinePanel />
          </div>
          
        </main>

        {/* Right Sidebar: Simulation Panel / Properties Panel */}
        <RightSidebarShell />

      </div>
    </div>
  );
};
