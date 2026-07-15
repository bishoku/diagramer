import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface ClearCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ClearCanvasModal: React.FC<ClearCanvasModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const language = useAppStore((state) => state.language);
  const t = translations[language];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="w-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-500" />
            {t.clearCanvasTitle}
          </span>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-sans">
          {t.clearCanvasConfirm}
        </p>

        <div className="flex gap-2 justify-end mt-2 font-sans">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer transition-colors"
          >
            {t.clearEverything}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
