import { Trash2, X, Info, Clock, Copy } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ContextMenuProps {
  menu: {
    id: string;
    type: 'node' | 'edge';
    x: number;
    y: number;
    label: string;
  } | null;
  onClose: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onClone: (e: React.MouseEvent) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ menu, onClose, onDelete, onClone }) => {
  const logicalData = useAppStore((state) => state.logicalData);
  const theme = useAppStore((state) => state.theme);
  const language = useAppStore((state) => state.language);
  const maxSteps = useAppStore((state) => state.maxSteps);
  const setSequenceStepOrder = useAppStore((state) => state.setSequenceStepOrder);
  const addSequenceStep = useAppStore((state) => state.addSequenceStep);

  if (!menu) return null;

  return (
    <div
      className="fixed z-[1000] min-w-[200px] bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-2xl p-2 select-none flex flex-col gap-1 transition-all duration-150 animate-in fade-in zoom-in-95 font-sans"
      style={{
        left: menu.x,
        top: menu.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header/Info */}
      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200/40 dark:border-slate-800/40 mb-1">
        <Info className="w-3.5 h-3.5" />
        <span className="truncate max-w-[150px]">{menu.label}</span>
      </div>

      {/* Change Step Order Option (Only for Edges) */}
      {menu.type === 'edge' && (
        <>
          {logicalData.sequences
            .filter((s) => s.edgeId === menu.id)
            .map((seq, idx, arr) => (
              <div 
                key={seq.id} 
                className={`px-3 py-1.5 flex items-center justify-between gap-3 ${
                  idx === arr.length - 1 ? 'border-b border-slate-200/40 dark:border-slate-800/40 mb-1' : ''
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-550 dark:text-slate-400">
                  {theme === 'dark' ? 'Adım Sırası:' : 'Step Order:'}
                </span>
                <select
                  value={seq.stepNumber}
                  onChange={(e) => {
                    setSequenceStepOrder(seq.id, Number(e.target.value));
                    onClose();
                  }}
                  className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-bold cursor-pointer outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                >
                  {Array.from({ length: maxSteps }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Step {n}</option>
                  ))}
                </select>
              </div>
            ))}
          
          {/* If connection has no steps, allow adding it to flow */}
          {logicalData.sequences.filter((s) => s.edgeId === menu.id).length === 0 && (
            <button
              onClick={() => {
                const nextStepNum = logicalData.sequences.length > 0 
                  ? Math.max(...logicalData.sequences.map(s => s.stepNumber)) + 1 
                  : 1;
                const seqId = `seq-${Date.now()}`;
                addSequenceStep(
                  { id: seqId, stepNumber: nextStepNum, edgeId: menu.id, isAsync: false },
                  { sequenceId: seqId, duration: 1000, delay: 0 }
                );
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border-b border-slate-200/40 dark:border-slate-800/40 rounded-xl transition-all duration-200 w-full text-left cursor-pointer"
            >
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>{theme === 'dark' ? 'Akışa Ekle' : 'Add to Sequence'}</span>
            </button>
          )}
        </>
      )}

      {/* Clone Action (Only for Nodes) */}
      {menu.type === 'node' && (
        <button
          onClick={onClone}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 w-full text-left cursor-pointer"
        >
          <Copy className="w-4 h-4 text-indigo-500" />
          <span>{language === 'tr' ? 'Klonla' : 'Clone'}</span>
        </button>
      )}

      {/* Delete Action */}
      <button
        onClick={onDelete}
        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:bg-rose-100 dark:active:bg-rose-500/20 rounded-xl transition-all duration-200 w-full text-left cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
        <span>{theme === 'dark' ? 'Sil' : 'Delete'}</span>
      </button>

      {/* Close Action */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-200 w-full text-left cursor-pointer"
      >
        <X className="w-4 h-4" />
        <span>{theme === 'dark' ? 'Kapat' : 'Cancel'}</span>
      </button>
    </div>
  );
};
