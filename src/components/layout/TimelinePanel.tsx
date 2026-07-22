import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Settings, ArrowRightLeft, Trash2, Clock, X, Save,
  Play, Pause, Square, Repeat
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';
import { usePlayheadScrub } from '../timeline/usePlayheadScrub';
import { useTimingBarDrag } from '../timeline/useTimingBarDrag';
import { TimelineRuler } from '../timeline/TimelineRuler';
import { TimelineGrid } from '../timeline/TimelineGrid';
import { ScrubLine } from '../timeline/ScrubLine';
import { useAnnotationBarDrag } from '../timeline/useAnnotationBarDrag';

const TimeReadout: React.FC<{ maxTime: number }> = ({ maxTime }) => {
  const currentTime = useAppStore((state) => state.currentTime);
  return <>{currentTime.toFixed(0)}ms / {maxTime}ms</>;
};

const CollapsedPlaybackSlider: React.FC<{ maxTime: number }> = ({ maxTime }) => {
  const currentTime = useAppStore((state) => state.currentTime);
  const setCurrentTime = useAppStore((state) => state.setCurrentTime);
  return (
    <div className="px-4 py-1.5 flex items-center gap-3 bg-slate-50/30 dark:bg-slate-900/40 border-t border-slate-150 dark:border-slate-850">
      <span className="text-[10px] font-mono text-slate-550 dark:text-slate-400">
        {currentTime.toFixed(0)}ms
      </span>
      <input
        type="range"
        min={0}
        max={maxTime}
        value={currentTime}
        onChange={(e) => setCurrentTime(Number(e.target.value))}
        className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
      />
      <span className="text-[10px] font-mono text-slate-550 dark:text-slate-400">
        {maxTime}ms
      </span>
    </div>
  );
};

export const TimelinePanel: React.FC<{ forceCollapsed?: boolean }> = ({ forceCollapsed }) => {
  // Selective Zustand selectors to completely eliminate playback re-renders
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const _timelineOpen = useAppStore((s: any) => s.timelineOpen);
  const timelineOpen = forceCollapsed ? false : _timelineOpen;
  const schedules = useAppStore((s) => s.schedules);
  const maxSteps = useAppStore((s) => s.maxSteps);
  const loopPlayback = useAppStore((s) => s.loopPlayback);
  const toggleLoopPlayback = useAppStore((s) => s.toggleLoopPlayback);

  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const updateSequenceTiming = useAppStore((s) => s.updateSequenceTiming);
  const updateSequenceProcess = useAppStore((s) => s.updateSequenceProcess);
  const deleteSequenceStep = useAppStore((s) => s.deleteSequenceStep);
  const setSequenceStepOrder = useAppStore((s) => s.setSequenceStepOrder);
  const toggleSequenceAsync = useAppStore((s) => s.toggleSequenceAsync);

  const startPlayback = useAppStore((s) => s.startPlayback);
  const pausePlayback = useAppStore((s) => s.pausePlayback);
  const stopPlayback = useAppStore((s) => s.stopPlayback);
  const setPlaybackRate = useAppStore((s) => s.setPlaybackRate);
  const playbackRate = useAppStore((s) => s.playbackRate);

  const [showTooltipModal, setShowTooltipModal] = useState<string | null>(null);
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipDuration, setTooltipDuration] = useState(1000);

  const trackAreaRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const [rightPanelWidth, setRightPanelWidth] = useState(600);

  // ResizeObserver to dynamically track the available width for scaling
  useEffect(() => {
    if (!rightPanelRef.current || !timelineOpen) return;

    if (rightPanelRef.current.clientWidth > 0) {
      setRightPanelWidth(rightPanelRef.current.clientWidth);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setRightPanelWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(rightPanelRef.current);
    return () => observer.disconnect();
  }, [timelineOpen]);

  // Find max simulation time
  const maxTime = Math.max(
    2000,
    ...Object.values(schedules).map((s) => {
      const seqId = Object.keys(schedules).find(k => schedules[k] === s);
      const seq = seqId ? logicalData.sequences.find(q => q.id === seqId) : null;
      const timing = seqId ? visualData.timelines[seqId] : null;
      const tooltipDur = (!seq?.isRoundTrip && timing?.internalProcess) ? (timing.internalProcess.duration ?? 0) : 0;
      return s.end + tooltipDur;
    })
  );

  // Calculate dynamic scale (px per ms) based on available panel width (with 24px right padding)
  const pxPerMs = Math.max(0.0001, (rightPanelWidth - 24) / maxTime);

  // Custom Hooks mapping layout interactions
  const { isScrubbing, handleTrackMouseDown } = usePlayheadScrub(
    rightPanelRef,
    playheadRef,
    maxTime,
    pxPerMs,
    setCurrentTime
  );

  const { handleBarMouseDown, handleResizeMouseDown } = useTimingBarDrag(
    updateSequenceTiming,
    pxPerMs
  );

  const { 
    handleBarMouseDown: handleAnnotationBarMouseDown, 
    handleResizeLeftMouseDown, 
    handleResizeRightMouseDown 
  } = useAnnotationBarDrag(pxPerMs);

  // Playback Animation Loop (Updates playhead directly in the store)
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    let previousTime: number | null = null;

    const tick = (timestamp: number) => {
      if (previousTime !== null) {
        const delta = timestamp - previousTime;
        const state = useAppStore.getState();
        const nextTime = state.currentTime + delta * state.playbackRate;

        if (nextTime >= maxTime) {
          if (state.loopPlayback) {
            state.setCurrentTime(0);
            previousTime = timestamp;
          } else {
            state.stopPlayback();
          }
        } else {
          state.setCurrentTime(nextTime);
        }
      }

      previousTime = timestamp;
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isPlaying, maxTime]);

  // Open the tooltip configuration modal
  const openTooltipModal = (seqId: string) => {
    const timing = visualData.timelines[seqId];
    setTooltipText(timing?.internalProcess?.text ?? '');
    setTooltipDuration(timing?.internalProcess?.duration ?? 1000);
    setShowTooltipModal(seqId);
  };

  // Save tooltip settings
  const handleSaveTooltip = () => {
    if (showTooltipModal) {
      updateSequenceProcess(showTooltipModal, tooltipText, tooltipDuration);
      setShowTooltipModal(null);
    }
  };

  // Sort sequences by stepNumber and id
  const sortedSequences = [...logicalData.sequences].sort((a, b) => {
    if (a.stepNumber !== b.stepNumber) {
      return a.stepNumber - b.stepNumber;
    }
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 transition-colors duration-300 text-slate-800 dark:text-slate-100 select-none font-sans">
      {/* Playback Controls & Top bar */}
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/60 backdrop-blur-md shrink-0">
        
        {/* Left: Section Label & Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t.timelineTitle}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* PLAYBACK ACTIONS */}
          <div className="flex items-center gap-1.5">
            {isPlaying ? (
              <button 
                onClick={pausePlayback}
                className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                title={t.pauseTooltip}
              >
                <Pause className="w-3.5 h-3.5 fill-indigo-600 dark:fill-indigo-400" />
              </button>
            ) : (
              <button 
                onClick={startPlayback}
                disabled={logicalData.sequences.length === 0}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                title={t.playTooltip}
              >
                <Play className="w-3.5 h-3.5 fill-white" />
              </button>
            )}
            
            <button 
              onClick={stopPlayback}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              title={t.stopTooltip}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>

            <button 
              onClick={toggleLoopPlayback}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                loopPlayback 
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20' 
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-805 text-slate-400'
              }`}
              title={t.loopPlaybackTooltip}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <span 
              className="text-[10px] font-mono text-slate-550 dark:text-slate-400 min-w-[85px] text-center bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800/50"
            >
              <TimeReadout maxTime={maxTime} />
            </span>

            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-200/50 dark:border-slate-800/50">
              {[0.5, 1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all duration-155 ${
                    playbackRate === rate 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-550 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Unified Scrollable Timeline Workspace */}
      {timelineOpen && (
        <div 
          ref={trackAreaRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative bg-slate-50/20 dark:bg-slate-900/10"
        >
          <div className="flex min-h-full w-full relative">
            
            {/* Left Side: Step labels column - Fixed Width, no horizontal scroll */}
            <div 
              className="w-[340px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-850 flex flex-col shrink-0"
              onMouseDown={(e) => e.stopPropagation()} // Prevent setting playhead when clicking left panel
            >
              {/* Header Spacer Row */}
              <div className="h-6 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center px-3 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest sticky top-0 z-30">
                {t.flowSteps}
              </div>

              {sortedSequences.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                  <Clock className="w-8 h-8 text-slate-350 dark:text-slate-650 stroke-[1.5] mb-2" />
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-450">
                    {t.noAnimationSteps}
                  </span>
                  <p className="text-[9px] text-slate-400 dark:text-slate-550 max-w-[200px] mt-1 leading-normal">
                    {t.drawConnectionPrompt}
                  </p>
                </div>
              ) : (
                sortedSequences.map((seq) => {
                  const edge = logicalData.edges.find((e) => e.id === seq.edgeId);
                  const src = edge ? logicalData.nodes.find((n) => n.id === edge.sourceId)?.name ?? edge.sourceId : '?';
                  const dst = edge ? logicalData.nodes.find((n) => n.id === edge.targetId)?.name ?? edge.targetId : '?';
                  
                  const isSelected = selectedSequenceId === seq.id;
                  const timing = visualData.timelines[seq.id];
                  const hasProcess = !!timing?.internalProcess;

                  return (
                    <div
                      key={seq.id}
                      onClick={() => {
                        if (isPlaying) return;
                        setSelectedSequenceId(seq.id);
                      }}
                      className={`h-16 overflow-hidden py-1.5 px-3 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between transition-colors duration-150 group ${
                        isPlaying ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      } ${
                        isSelected 
                          ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-l-4 border-l-indigo-600' 
                          : isPlaying ? '' : 'hover:bg-slate-100/50 dark:hover:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold bg-indigo-500/10 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded">
                            S{seq.stepNumber}
                          </span>
                          <span className="text-xs font-bold truncate text-slate-700 dark:text-slate-200">
                            {src} → {dst}
                          </span>
                        </div>
                        {hasProcess && (
                          <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-500 truncate pl-1">
                            ↳ Process: {timing?.internalProcess?.text}
                          </span>
                        )}
                        {edge?.description && (
                          <span className="text-[9px] font-medium text-slate-550 dark:text-slate-400 pl-1 leading-normal break-words">
                            ↳ {edge.description}
                          </span>
                        )}
                      </div>
                      
                      {/* Row Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <select
                          value={seq.stepNumber}
                          onChange={(e) => setSequenceStepOrder(seq.id, Number(e.target.value))}
                          className="text-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.5 font-bold cursor-pointer focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {Array.from({ length: maxSteps }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>Step {n}</option>
                          ))}
                        </select>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSequenceAsync(seq.id);
                          }}
                          title={seq.isAsync ? "Asynchronous flow" : "Synchronous flow"}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer animate-none ${
                            seq.isAsync ? 'text-emerald-500' : 'text-slate-400'
                          }`}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTooltipModal(seq.id);
                          }}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer animate-none"
                          title="Configure tooltip"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSequenceStep(seq.id);
                          }}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-505 transition-colors cursor-pointer animate-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Annotations List */}
              {Object.entries(visualData.annotations || {}).map(([id, note]) => (
                <div key={`left-ann-${id}`} className="h-16 border-b border-slate-200/50 dark:border-slate-800/20 px-3 flex items-center justify-between group bg-amber-50/10 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: note.style.backgroundColor }} />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {note.header || 'Sticky Note'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Right Side: Track Grid area - Dynamic auto-scale width */}
            <div 
              ref={rightPanelRef}
              className="flex-1 flex flex-col relative h-full min-w-0"
              onMouseDown={handleTrackMouseDown}
            >
              {/* Ruler Header Spacer Row */}
              <TimelineRuler maxTime={maxTime} pxPerMs={pxPerMs} />

              {/* Tracks Container */}
              <div className="flex-1 relative w-full">
                {/* Timeline Grid Background */}
                <TimelineGrid maxTime={maxTime} pxPerMs={pxPerMs} />

                {/* Row Timing Tracks */}
                <div className="flex flex-col relative z-20 w-full">
                  {sortedSequences.map((seq) => {
                    const timing = visualData.timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
                    const sched = schedules[seq.id];
                    if (!sched) return null;

                    const left = sched.start * pxPerMs;
                    const width = (timing.duration ?? 1000) * pxPerMs;
                    const isSelected = selectedSequenceId === seq.id;

                    return (
                      <div 
                        key={seq.id} 
                        className="h-16 border-b border-slate-200/50 dark:border-slate-800/20 relative flex items-center w-full"
                      >
                        {/* Interactive Drag Bar */}
                        <div
                          onMouseDown={(e) => {
                            setSelectedSequenceId(seq.id);
                            handleBarMouseDown(e, seq.id, timing.delay ?? 0, timing.duration ?? 1000);
                          }}
                          onDoubleClick={() => openTooltipModal(seq.id)}
                          className={`h-6 rounded-lg absolute cursor-grab active:cursor-grabbing transition-shadow flex items-center justify-between px-2 text-[10px] font-bold text-white group border ${
                            isSelected 
                              ? 'ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-655/10' 
                              : 'shadow-sm'
                          } ${
                            seq.isAsync 
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400/30' 
                              : 'bg-gradient-to-r from-indigo-500 to-indigo-600 border-indigo-400/30'
                          }`}
                          style={{
                            left,
                            width,
                          }}
                        >
                          <span className="truncate pr-4 pointer-events-none select-none">
                            {timing.duration}ms
                          </span>

                          {/* Resize handle on right */}
                          {!seq.isAsync && (
                            <div 
                              className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30 rounded-r transition-colors"
                              onMouseDown={(e) => {
                                setSelectedSequenceId(seq.id);
                                handleResizeMouseDown(e, seq.id, timing.delay ?? 0, timing.duration ?? 1000);
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Annotation Tracks */}
                  {Object.entries(visualData.annotations || {}).map(([id, note]) => {
                    const left = note.startTime * pxPerMs;
                    const width = (note.endTime - note.startTime) * pxPerMs;

                    return (
                      <div 
                        key={`track-ann-${id}`} 
                        className="h-16 border-b border-slate-200/50 dark:border-slate-800/20 relative flex items-center w-full"
                      >
                        <div
                          onMouseDown={(e) => handleAnnotationBarMouseDown(e, id, note.startTime, note.endTime)}
                          className="h-6 rounded-lg absolute cursor-grab active:cursor-grabbing transition-shadow flex items-center px-2 group border shadow-sm"
                          style={{
                            left,
                            width,
                            backgroundColor: note.style.backgroundColor,
                            borderColor: note.style.borderColor,
                            color: note.style.textColor,
                            opacity: note.alwaysVisible ? 0.5 : 1
                          }}
                        >
                          {!note.alwaysVisible && (
                            <>
                              <div 
                                className="absolute -left-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 rounded-l transition-colors"
                                onMouseDown={(e) => handleResizeLeftMouseDown(e, id, note.startTime, note.endTime)}
                              />
                              <div 
                                className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 rounded-r transition-colors"
                                onMouseDown={(e) => handleResizeRightMouseDown(e, id, note.startTime, note.endTime)}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vertical Playhead Scrub Line Indicator */}
                <ScrubLine 
                  pxPerMs={pxPerMs} 
                  isPlaying={isPlaying} 
                  isScrubbing={isScrubbing} 
                  playheadRef={playheadRef} 
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Video Slider when timeline tracks are closed */}
      {!timelineOpen && (
        <CollapsedPlaybackSlider maxTime={maxTime} />
      )}

      {/* Tooltip Internal Process Modal */}
      {showTooltipModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
          <div className="w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {t.configureNodeTooltip}
              </span>
              <button 
                onClick={() => setShowTooltipModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t.tooltipText}
                </label>
                <input
                  type="text"
                  placeholder={language === 'tr' ? 'örn: Veri Kaydediliyor...' : 'e.g., Saving Data...'}
                  value={tooltipText}
                  onChange={(e) => setTooltipText(e.target.value)}
                  className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-650 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t.displayDurationMs}
                </label>
                <input
                  type="number"
                  value={tooltipDuration}
                  onChange={(e) => setTooltipDuration(Number(e.target.value))}
                  className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-650 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => setShowTooltipModal(null)}
                className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSaveTooltip}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t.save}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
