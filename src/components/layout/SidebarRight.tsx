import React, { useEffect, useRef } from 'react';
import { Terminal, Activity, ArrowRight, ArrowLeft, ArrowRightLeft, CornerDownRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const SidebarRight: React.FC = () => {
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const language = useAppStore((s) => s.language);
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen);
  const activeSequenceIds = useAppStore((s) => s.activeSequenceIds);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);
  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const schedules = useAppStore((s) => s.schedules);

  const activeRowRef = useRef<HTMLDivElement>(null);

  // Sort sequences by stepNumber and ID
  const sortedSequences = [...logicalData.sequences].sort((a, b) => {
    if (a.stepNumber !== b.stepNumber) {
      return a.stepNumber - b.stepNumber;
    }
    return a.id.localeCompare(b.id);
  });

  // Auto-scroll active sequence into view
  const activeIdsString = activeSequenceIds.join(',');
  useEffect(() => {
    if (activeSequenceIds.length > 0 && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeIdsString]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className={`border-l border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md flex flex-col h-full select-none shrink-0 z-20 transition-all duration-300 ease-in-out overflow-hidden ${
      rightSidebarOpen ? 'w-[300px]' : 'w-0 border-l-0'
    }`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between shrink-0">
        <span className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
          {language === 'tr' ? 'Simülasyon Akış Logu' : 'Simulation Flow Log'}
        </span>
        <Terminal className="w-4 h-4 text-slate-400 dark:text-slate-500" />
      </div>

      {/* Log list container */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-slate-50/20 dark:bg-slate-950/20 min-h-0">
        {sortedSequences.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <Activity className="w-8 h-8 text-slate-350 dark:text-slate-500 stroke-[1.5] mb-2 animate-pulse" />
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-sans">
              {language === 'tr' ? 'Log Akışı Bekleniyor' : 'Awaiting Flow Logs'}
            </span>
            <p className="text-[10px] text-slate-400 dark:text-slate-550 max-w-[200px] mt-1 leading-normal font-sans">
              {language === 'tr' 
                ? 'Canvas üzerinde bağlantılar oluşturun ve simülasyonu başlatın.' 
                : 'Create connections on canvas and start playback to see logs.'}
            </p>
          </div>
        ) : (
          sortedSequences.map((seq) => {
            const edge = logicalData.edges.find((e) => e.id === seq.edgeId);
            if (!edge) return null;

            const src = logicalData.nodes.find((n) => n.id === edge.from)?.name ?? edge.from;
            const dst = logicalData.nodes.find((n) => n.id === edge.to)?.name ?? edge.to;
            const protocol = edge.protocol ?? 'Call';
            
            const isRowActive = activeSequenceIds.includes(seq.id);
            const isRowSelected = selectedSequenceId === seq.id;
            const timing = visualData.timelines[seq.id];
            const hasProcess = !!timing?.internalProcess;
            
            const sched = schedules[seq.id];

            return (
              <div
                key={seq.id}
                ref={isRowActive ? activeRowRef : null}
                onClick={() => setSelectedSequenceId(seq.id)}
                className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 ${
                  isRowActive
                    ? 'bg-emerald-500/10 border-emerald-500/35 dark:bg-emerald-500/5 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                    : isRowSelected
                    ? 'bg-indigo-500/10 border-indigo-500/35 dark:bg-indigo-500/5 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                }`}
              >
                {/* Meta details */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                      isRowActive 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400'
                    }`}>
                      S{seq.stepNumber}
                    </span>
                    <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                      {seq.isAsync ? 'Asenkron' : 'Senkron'}
                    </span>
                  </div>
                  {sched && (
                    <span className="text-[9px] font-mono text-slate-400 dark:text-slate-550">
                      {sched.start}-{sched.end}ms
                    </span>
                  )}
                </div>

                {/* Main edge mapping text */}
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  <span className="truncate max-w-[90px]">{seq.direction === 'reverse' ? dst : src}</span>
                  <div className="flex flex-col items-center flex-1 min-w-[30px]">
                    <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 leading-none">({protocol})</span>
                    {seq.isRoundTrip ? (
                      <ArrowRightLeft className={`w-3.5 h-3.5 ${isRowActive ? 'text-emerald-500' : 'text-slate-450'}`} />
                    ) : seq.direction === 'reverse' ? (
                      <ArrowLeft className={`w-3.5 h-3.5 ${isRowActive ? 'text-emerald-500' : 'text-slate-450'}`} />
                    ) : (
                      <ArrowRight className={`w-3.5 h-3.5 ${isRowActive ? 'text-emerald-500' : 'text-slate-450'}`} />
                    )}
                  </div>
                  <span className="truncate max-w-[90px] text-right">{seq.direction === 'reverse' ? src : dst}</span>
                </div>

                {/* Sub-process bubble detail if exists */}
                {hasProcess && (
                  <div className="flex items-start gap-1 text-[9px] text-slate-500 dark:text-slate-450 font-medium pl-1 border-l border-slate-200 dark:border-slate-850 mt-0.5">
                    <CornerDownRight className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                    <span className="truncate">
                      Process: {timing.internalProcess?.text} ({timing.internalProcess?.duration}ms)
                    </span>
                  </div>
                )}

                {/* Edge Description if exists */}
                {edge.description && (
                  <div className="text-[10px] text-slate-550 dark:text-slate-400 pl-1 border-l border-slate-250 dark:border-slate-800 mt-1 leading-normal font-sans break-words whitespace-pre-wrap">
                    {edge.description}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
