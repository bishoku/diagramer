import React, { useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { HandleConfig, PortSide } from '../../../types';
import { MAX_HANDLES_PER_SIDE, MAX_HANDLES_PER_NODE } from '../../../utils/portUtils';
import { useAppStore } from '../../../store/useAppStore';

const SIDE_LABELS: Record<string, Record<PortSide, string>> = {
  tr: { top: 'Üst', right: 'Sağ', bottom: 'Alt', left: 'Sol' },
  en: { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' },
};

interface ConnectionPointsEditorProps {
  nodeId: string;
  nodeName: string;
  handles: HandleConfig[];
  connectedHandleIds: Set<string>;
  language: string;
  onChange: (handles: HandleConfig[]) => void;
}

/**
 * ConnectionPointsEditor
 *
 * Displays the port-placement preview canvas and per-side add/remove sliders.
 * Drag-to-reposition logic is fully self-contained here.
 */
export const ConnectionPointsEditor: React.FC<ConnectionPointsEditorProps> = ({
  nodeId: _nodeId,
  nodeName,
  handles,
  connectedHandleIds,
  language,
  onChange,
}) => {
  const openConfirm = useAppStore((s) => s.openConfirm);
  const previewRef = useRef<HTMLDivElement>(null);
  const activeDragRef = useRef<{ handleId: string; side: PortSide } | null>(null);
  // Keep a mutable copy of handles for drag calculations
  const handlesRef = useRef(handles);
  useEffect(() => { handlesRef.current = handles; }, [handles]);

  const labels = SIDE_LABELS[language] ?? SIDE_LABELS.en;
  const sides: PortSide[] = ['top', 'right', 'bottom', 'left'];

  // ── Drag logic ────────────────────────────────────────────────────────────
  const handleMove = (clientX: number, clientY: number) => {
    const drag = activeDragRef.current;
    if (!drag || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const { side, handleId } = drag;
    let percent = 50;
    if (side === 'top' || side === 'bottom') {
      percent = Math.round(((clientX - rect.left - 20) / (rect.width - 40)) * 100);
    } else {
      percent = Math.round(((clientY - rect.top - 20) / (rect.height - 40)) * 100);
    }
    const clamped = Math.max(5, Math.min(95, percent));
    onChange(handlesRef.current.map((h) => (h.id === handleId ? { ...h, offset: clamped } : h)));
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onEnd = () => { activeDragRef.current = null; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add handle ────────────────────────────────────────────────────────────
  const addHandle = (side: PortSide) => {
    const sideHandles = handles.filter((h) => h.side === side);
    const offsets = sideHandles.map((h) => h.offset).sort((a, b) => a - b);
    let newOffset = 50;
    if (offsets.length > 0) {
      const gaps = [
        { start: 0, end: offsets[0], size: offsets[0] },
        ...offsets.slice(0, -1).map((o, i) => ({ start: o, end: offsets[i + 1], size: offsets[i + 1] - o })),
        { start: offsets[offsets.length - 1], end: 100, size: 100 - offsets[offsets.length - 1] },
      ];
      const largest = [...gaps].sort((a, b) => b.size - a.size)[0];
      newOffset = Math.round((largest.start + largest.end) / 2);
    }
    const id = `${side}:${newOffset}`;
    const finalId = handles.some((h) => h.id === id) ? `${side}:${newOffset + 1}` : id;
    onChange([...handles, { id: finalId, side, offset: newOffset, originalId: finalId }]);
  };

  // ── Dot positions ─────────────────────────────────────────────────────────
  const getDotStyle = (h: HandleConfig): React.CSSProperties => {
    const pct = `${5 + (h.offset / 100) * 90}%`;
    switch (h.side) {
      case 'top':    return { left: pct, top: '20px', transform: 'translate(-50%, -50%)' };
      case 'bottom': return { left: pct, bottom: '20px', transform: 'translate(-50%, 50%)' };
      case 'left':   return { left: '20px', top: pct, transform: 'translate(-50%, -50%)' };
      case 'right':  return { right: '20px', top: pct, transform: 'translate(50%, -50%)' };
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {language === 'tr' ? 'Bağlantı Noktaları' : 'Connection Points'}
        </span>
        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
          {handles.length}/{MAX_HANDLES_PER_NODE}
        </span>
      </div>

      {/* ── Preview canvas ── */}
      <div
        ref={previewRef}
        className="relative w-full h-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
      >
        <div className="absolute inset-5 border border-dashed border-slate-300 dark:border-slate-700 rounded bg-white/60 dark:bg-slate-800/60 flex items-center justify-center">
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold truncate px-1">
            {nodeName || 'Node'}
          </span>
        </div>
        {handles.map((h) => {
          const isConnected = connectedHandleIds.has(h.originalId || h.id);
          return (
            <div
              key={h.originalId || h.id}
              onMouseDown={(e) => { e.stopPropagation(); activeDragRef.current = { handleId: h.id, side: h.side }; }}
              onTouchStart={(e) => { e.stopPropagation(); activeDragRef.current = { handleId: h.id, side: h.side }; }}
              className={`absolute w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm cursor-grab active:cursor-grabbing hover:scale-125 transition-transform ${
                isConnected ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={getDotStyle(h)}
              title={`${h.side}:${h.offset}%`}
            />
          );
        })}
      </div>

      {/* ── Per-side sliders ── */}
      <div className="flex flex-col gap-1">
        {sides.map((side) => {
          const sideHandles = handles.filter((h) => h.side === side).sort((a, b) => a.offset - b.offset);
          const canAdd = sideHandles.length < MAX_HANDLES_PER_SIDE && handles.length < MAX_HANDLES_PER_NODE;
          return (
            <div key={side}>
              {/* Side header */}
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {labels[side]}
                  <span className="font-normal opacity-60 ml-0.5">({sideHandles.length}/{MAX_HANDLES_PER_SIDE})</span>
                </span>
                <button
                  onClick={() => canAdd && addHandle(side)}
                  disabled={!canAdd}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                    canAdd
                      ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer'
                      : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-2.5 h-2.5" />
                  {language === 'tr' ? 'Ekle' : 'Add'}
                </button>
              </div>

              {/* Handle rows */}
              {sideHandles.map((h) => {
                const isConnected = connectedHandleIds.has(h.originalId || h.id);
                return (
                  <div key={h.originalId || h.id} className="flex items-center gap-1.5 mb-0.5 pl-1">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500' : 'bg-indigo-400'}`} />
                    <input
                      type="range" min={5} max={95} value={h.offset}
                      onChange={(e) => onChange(handles.map((nh) => nh.id === h.id ? { ...nh, offset: Number(e.target.value) } : nh))}
                      className="flex-1 h-1 accent-indigo-500 cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-slate-400 w-7 text-right shrink-0">{h.offset}%</span>
                    <button
                      onClick={async () => {
                        if (connectedHandleIds.has(h.id)) {
                          const msg = language === 'tr' ? "Bağlı edge'ler var, emin misiniz?" : 'Connected edges exist. Continue?';
                          const confirmed = await openConfirm({
                            title: language === 'tr' ? 'Bağlantıyı Kopar' : 'Disconnect Edge',
                            message: msg,
                            type: 'warning',
                            confirmText: language === 'tr' ? 'Evet, Sil' : 'Yes, Delete',
                            cancelText: language === 'tr' ? 'Vazgeç' : 'Cancel'
                          });
                          if (!confirmed) return;
                        }
                        onChange(handles.filter((nh) => nh.id !== h.id));
                      }}
                      className="p-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-300 hover:text-rose-500 cursor-pointer transition-colors shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
