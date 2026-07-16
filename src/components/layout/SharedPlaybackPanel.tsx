import React from 'react';
import { 
  Play, Pause, Square, Repeat, Clock
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

export const SharedPlaybackPanel: React.FC = () => {
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  
  const schedules = useAppStore((s) => s.schedules);
  const loopPlayback = useAppStore((s) => s.loopPlayback);
  const toggleLoopPlayback = useAppStore((s) => s.toggleLoopPlayback);

  const currentTime = useAppStore((s) => s.currentTime);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);

  const startPlayback = useAppStore((s) => s.startPlayback);
  const pausePlayback = useAppStore((s) => s.pausePlayback);
  const stopPlayback = useAppStore((s) => s.stopPlayback);
  const setPlaybackRate = useAppStore((s) => s.setPlaybackRate);
  const playbackRate = useAppStore((s) => s.playbackRate);

  // Find max simulation time
  const maxTime = Math.max(
    2000,
    ...Object.values(schedules).map((s) => {
      const seqId = Object.keys(schedules).find(k => schedules[k] === s);
      const timing = seqId ? visualData.timelines?.[seqId] : null;
      const tooltipDur = timing?.internalProcess?.duration ?? 0;
      return s.end + tooltipDur;
    })
  );

  // Playback Animation Loop (Updates playhead directly in the store)
  const requestRef = React.useRef<number | null>(null);

  React.useEffect(() => {
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

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 select-none font-sans flex flex-col gap-2.5 shrink-0 transition-colors duration-300">
      
      {/* Upper row: Playback Buttons and Readouts */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Playback Actions */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button 
              onClick={pausePlayback}
              className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
              title={t.pauseTooltip}
            >
              <Pause className="w-4 h-4 fill-indigo-600 dark:fill-indigo-400" />
            </button>
          ) : (
            <button 
              onClick={startPlayback}
              disabled={logicalData.sequences.length === 0}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer shadow-md shadow-indigo-500/10"
              title={t.playTooltip}
            >
              <Play className="w-4 h-4 fill-white" />
            </button>
          )}
          
          <button 
            onClick={stopPlayback}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 transition-colors cursor-pointer"
            title={t.stopTooltip}
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          <button 
            onClick={toggleLoopPlayback}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              loopPlayback 
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-400'
            }`}
            title={t.loopPlaybackTooltip}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Timer and Playback Rate */}
        <div className="flex items-center gap-3">
          
          {/* Readout */}
          <span 
            className="text-[11px] font-semibold font-mono text-slate-650 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-150 dark:border-slate-850 flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            {currentTime.toFixed(0)}ms / {maxTime}ms
          </span>

          {/* Playback Rate Speed */}
          <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-150 dark:border-slate-850">
            {[0.5, 1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer transition-all ${
                  playbackRate === rate 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-550 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: scrubbing slider */}
      <div className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-950/20 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800/40">
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">0ms</span>
        <input
          type="range"
          min={0}
          max={maxTime}
          value={currentTime}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-650 dark:accent-indigo-500 outline-none"
        />
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{maxTime}ms</span>
      </div>

    </div>
  );
};
