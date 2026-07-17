import React from 'react';
import { AlertCircle } from 'lucide-react';
import { WorkspaceMeta } from '../../../types';
import { translations } from '../../../i18n/translations';

interface DeleteConfirmationModalProps {
  workspace: WorkspaceMeta | null;
  onClose: () => void;
  onConfirm: () => void;
  language: 'tr' | 'en';
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  workspace,
  onClose,
  onConfirm,
  language,
}) => {
  if (!workspace) return null;

  const t = translations[language];

  return (
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          {t.deleteWorkspace}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          {"\"" + workspace.name + "\" " + t.deleteWorkspaceConfirm}
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            {t.deletePermanently}
          </button>
        </div>
      </div>
    </div>
  );
};
