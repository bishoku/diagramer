import React, { lazy, Suspense } from 'react';
import { SharedTopBar } from './SharedTopBar';
import { SharedPlaybackPanel } from './SharedPlaybackPanel';
import { useAppStore } from '../../store/useAppStore';
import { DiagramCanvas } from '../canvas/DiagramCanvas';

const SequenceDiagramCanvas = lazy(() => import('../sequence/SequenceDiagramCanvas').then(m => ({ default: m.SequenceDiagramCanvas })));

export const SharedDiagramLayout: React.FC = () => {
  const viewMode = useAppStore((s) => s.viewMode);

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300">
      
      {/* Top Bar */}
      <SharedTopBar />

      {/* Main Work Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Center Section: Canvas only */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950">
          
          {/* Canvas Workspace Area — explicit size required by React Flow */}
          <div className="flex-1 min-h-0 relative" style={{ overflow: 'hidden' }}>
            {viewMode === 'freeform' ? (
              <DiagramCanvas />
            ) : (
              <Suspense fallback={
                <div className="flex items-center justify-center w-full h-full text-slate-400 dark:text-slate-650">
                  <div className="animate-pulse text-sm font-medium">Loading Sequence Diagram...</div>
                </div>
              }>
                <SequenceDiagramCanvas />
              </Suspense>
            )}
          </div>

          {/* Simple bottom Playback Panel */}
          <SharedPlaybackPanel />
          
        </main>

      </div>
    </div>
  );
};
export default SharedDiagramLayout;
