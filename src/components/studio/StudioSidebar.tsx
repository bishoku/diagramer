import React from 'react';
import { Square, Circle, Type, Image as ImageIcon } from 'lucide-react';
import { ShapeType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface StudioSidebarProps {
  onAddShape: (type: ShapeType) => void;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({ onAddShape }) => {
  const language = useAppStore((state) => state.language);
  const t = translations[language];

  return (
    <aside className="w-60 border-r border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex flex-col p-4 shrink-0 gap-3">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
        {t.shapeLibrary}
      </span>

      <button
        onClick={() => onAddShape('rectangle')}
        className="flex items-center gap-2.5 w-full text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
      >
        <Square className="w-4 h-4 text-indigo-500" />
        <span>{t.rectangleCard}</span>
      </button>

      <button
        onClick={() => onAddShape('circle')}
        className="flex items-center gap-2.5 w-full text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
      >
        <Circle className="w-4 h-4 text-emerald-500" />
        <span>{t.circleEllipse}</span>
      </button>

      <button
        onClick={() => onAddShape('text')}
        className="flex items-center gap-2.5 w-full text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
      >
        <Type className="w-4 h-4 text-violet-500" />
        <span>{t.textBox}</span>
      </button>

      <button
        onClick={() => onAddShape('image')}
        className="flex items-center gap-2.5 w-full text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
      >
        <ImageIcon className="w-4 h-4 text-amber-500" />
        <span>{t.imageAsset}</span>
      </button>
    </aside>
  );
};
