import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ImportConflict, ConflictResolution } from '../../../utils/workspaceZip';
import { translations } from '../../../i18n/translations';

interface ImportConflictsModalProps {
  importConflicts: ImportConflict[];
  onResolve: (resolutions: Record<string, ConflictResolution>) => void;
  onCancel: () => void;
  language: 'tr' | 'en';
}

export const ImportConflictsModal: React.FC<ImportConflictsModalProps> = ({
  importConflicts,
  onResolve,
  onCancel,
  language,
}) => {
  if (importConflicts.length === 0) return null;

  const t = translations[language];

  const handleResolve = (action: ConflictResolution) => {
    const resolutions: Record<string, ConflictResolution> = {};
    importConflicts.forEach((c) => (resolutions[c.compId] = action));
    onResolve(resolutions);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
          {t.conflictTitle}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          {t.conflictSub}
        </p>

        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3 max-h-40 overflow-y-auto mb-4 border border-slate-200 dark:border-slate-850">
          {importConflicts.map((c) => (
            <div key={c.compId} className="text-xs font-semibold py-1 text-slate-700 dark:text-slate-350">
              • {c.name}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleResolve('overwrite')}
            className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            {t.conflictOverwrite}
          </button>
          <button
            type="button"
            onClick={() => handleResolve('copy')}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            {t.conflictKeepBoth}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
