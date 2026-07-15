import React from 'react';
import { Save, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface StudioHeaderProps {
  name: string;
  category: string;
  width: number;
  height: number;
  error: string | null;
  onBack: () => void;
  onNameChange: (name: string) => void;
  onCategoryChange: (category: string) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSave: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  name,
  category,
  width,
  height,
  error,
  onBack,
  onNameChange,
  onCategoryChange,
  onWidthChange,
  onHeightChange,
  onSave,
}) => {
  const language = useAppStore((state) => state.language);
  const t = translations[language];

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 z-20 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t.componentStudioTitle}
          </span>
          <input
            type="text"
            placeholder={t.componentNamePlaceholder}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="px-3 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-bold"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-550 dark:text-slate-400">
          <span>{t.categoryLabel}</span>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-xl text-xs focus:outline-none text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
          >
            <option value="Client">{t.clientCat}</option>
            <option value="Server">{t.serverCat}</option>
            <option value="Database">{t.databaseCat}</option>
            <option value="Gateway">API Gateway</option>
            <option value="Cache">{t.cacheCat}</option>
            <option value="Queue">{t.queueCat}</option>
            <option value="Custom">{t.otherCat}</option>
          </select>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-550 dark:text-slate-400">
          <span>W:</span>
          <input
            type="number"
            value={width}
            onChange={(e) => onWidthChange(Math.max(50, Number(e.target.value)))}
            className="w-14 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg text-center focus:outline-none font-bold"
          />
          <span className="ml-1">H:</span>
          <input
            type="number"
            value={height}
            onChange={(e) => onHeightChange(Math.max(50, Number(e.target.value)))}
            className="w-14 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg text-center focus:outline-none font-bold"
          />
        </div>

        {error && <span className="text-xs text-rose-500 font-semibold">{error}</span>}

        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{t.save}</span>
        </button>
      </div>
    </header>
  );
};
