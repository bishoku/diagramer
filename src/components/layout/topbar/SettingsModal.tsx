import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Globe, Moon, Sun, Grid, Check } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../i18n/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const maxSteps = useAppStore((s) => s.maxSteps);
  const language = useAppStore((s) => s.language);
  const theme = useAppStore((s) => s.theme);
  
  const saveWorkspaceDetails = useAppStore((s) => s.saveWorkspaceDetails);
  const changeLanguage = useAppStore((s) => s.changeLanguage);
  const changeTheme = useAppStore((s) => s.changeTheme);
  const changeMaxSteps = useAppStore((s: any) => s.changeMaxSteps);

  const t = translations[language];

  const [editName, setEditName] = useState(currentWorkspace?.name || '');
  const [editDesc, setEditDesc] = useState(currentWorkspace?.description || '');
  const [editMaxSteps, setEditMaxSteps] = useState(maxSteps);

  useEffect(() => {
    if (isOpen) {
      setEditName(currentWorkspace?.name || '');
      setEditDesc(currentWorkspace?.description || '');
      setEditMaxSteps(maxSteps);
    }
  }, [isOpen, currentWorkspace, maxSteps]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveWorkspaceDetails(editName, editDesc);
    changeMaxSteps(editMaxSteps);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          {t.editWorkspaceDetails}
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t.workspaceName}
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500/80"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t.description}
            </label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500/80 resize-none"
              maxLength={200}
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.appPrefTitle}
            </h4>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {t.language}:
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => changeLanguage('tr')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                    language === 'tr'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.langTr}
                </button>
                <button
                  type="button"
                  onClick={() => changeLanguage('en')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                    language === 'en'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.langEn}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                {theme === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {t.theme}:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { key: 'light', label: t.themeLight },
                  { key: 'dark', label: t.themeDark },
                  { key: 'nord', label: t.themeNord },
                  { key: 'dracula', label: t.themeDracula },
                  { key: 'synthwave', label: t.themeSynthwave },
                  { key: 'retro', label: t.themeRetro }
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeTheme(key)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                      theme === key
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Grid className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                {t.maxStepsSetting}:
              </span>
              <input
                type="number"
                min={5}
                max={100}
                value={editMaxSteps}
                onChange={(e) => setEditMaxSteps(Math.max(5, Math.min(100, Number(e.target.value) || 5)))}
                className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 text-xs font-bold text-center focus:outline-none focus:border-indigo-500/80"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
