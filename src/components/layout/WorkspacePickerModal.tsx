import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Folder, Plus, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface WorkspacePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'copy' | 'move' | 'add';
  diagramName: string;
  currentWorkspacePath?: string;
  onConfirm: (
    targetWorkspacePath: string | null,
    targetWorkspaceName: string,
    isNew: boolean,
    newWorkspaceName?: string,
    targetDiagramName?: string
  ) => Promise<void>;
}

export const WorkspacePickerModal: React.FC<WorkspacePickerModalProps> = ({
  isOpen,
  onClose,
  mode,
  diagramName,
  currentWorkspacePath,
  onConfirm,
}) => {
  const language = useAppStore((s) => s.language);
  const recentWorkspaces = useAppStore((s) => s.recentWorkspaces);
  const t = translations[language];

  // Exclude current workspace from copy/move options
  const selectableWorkspaces = currentWorkspacePath 
    ? recentWorkspaces.filter(ws => ws.path !== currentWorkspacePath)
    : recentWorkspaces;

  const [isNewWorkspace, setIsNewWorkspace] = useState(selectableWorkspaces.length === 0);
  const [selectedWorkspacePath, setSelectedWorkspacePath] = useState<string>(
    selectableWorkspaces[0]?.path || ''
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [targetDiagName, setTargetDiagName] = useState(diagramName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getTitle = () => {
    if (mode === 'copy') return t.copyDiagram || 'Copy Diagram';
    if (mode === 'move') return t.moveDiagram || 'Move Diagram';
    return t.addDiagramToWorkspace || 'Add to Workspace';
  };

  const getConfirmText = () => {
    if (loading) return language === 'tr' ? 'İşleniyor...' : 'Processing...';
    if (mode === 'copy') return t.copyDiagram || 'Copy';
    if (mode === 'move') return t.moveDiagram || 'Move';
    return t.addDiagramToWorkspace || 'Add';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedDiagName = targetDiagName.trim();
    if (!trimmedDiagName) {
      setError(language === 'tr' ? 'Lütfen diyagram adı girin.' : 'Please enter a diagram name.');
      return;
    }

    if (isNewWorkspace) {
      const trimmedWsName = newWorkspaceName.trim();
      if (!trimmedWsName) {
        setError(language === 'tr' ? 'Lütfen yeni çalışma alanı adı girin.' : 'Please enter a new workspace name.');
        return;
      }
      setLoading(true);
      try {
        await onConfirm(null, trimmedWsName, true, trimmedWsName, trimmedDiagName);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Error occurred');
      } finally {
        setLoading(false);
      }
    } else {
      if (!selectedWorkspacePath) {
        setError(language === 'tr' ? 'Lütfen bir çalışma alanı seçin.' : 'Please select a workspace.');
        return;
      }
      const selectedWs = selectableWorkspaces.find(ws => ws.path === selectedWorkspacePath);
      if (!selectedWs) {
        setError(language === 'tr' ? 'Çalışma alanı bulunamadı.' : 'Workspace not found.');
        return;
      }
      setLoading(true);
      try {
        await onConfirm(selectedWorkspacePath, selectedWs.name, false, undefined, trimmedDiagName);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Error occurred');
      } finally {
        setLoading(false);
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-500" />
            {getTitle()}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Diagram Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {language === 'tr' ? 'Diyagram Adı' : 'Diagram Name'}
            </label>
            <input
              type="text"
              value={targetDiagName}
              onChange={(e) => setTargetDiagName(e.target.value)}
              disabled={loading}
              maxLength={100}
              placeholder="e.g. System Architecture Plan"
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
              required
            />
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />

          {/* Destination Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.selectTargetWorkspace || 'Select Target Workspace'}
            </label>

            {selectableWorkspaces.length > 0 && (
              <div className="flex gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => setIsNewWorkspace(false)}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !isNewWorkspace
                      ? 'bg-indigo-550 border-indigo-550 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  {language === 'tr' ? 'Mevcut Workspace' : 'Existing Workspace'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewWorkspace(true)}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isNewWorkspace
                      ? 'bg-indigo-550 border-indigo-550 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.newWorkspace || 'New Workspace'}
                </button>
              </div>
            )}

            {!isNewWorkspace && selectableWorkspaces.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950/20">
                {selectableWorkspaces.map((ws) => (
                  <label
                    key={ws.path}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                      selectedWorkspacePath === ws.path
                        ? 'bg-white dark:bg-slate-900 border-indigo-500 text-slate-850 dark:text-slate-100 shadow-sm border-indigo-550'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="radio"
                        name="destinationWorkspace"
                        value={ws.path}
                        checked={selectedWorkspacePath === ws.path}
                        onChange={() => setSelectedWorkspacePath(ws.path)}
                        className="sr-only"
                      />
                      <Folder className={`w-4 h-4 shrink-0 ${selectedWorkspacePath === ws.path ? 'text-indigo-500' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{ws.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{ws.path}</p>
                      </div>
                    </div>
                    {selectedWorkspacePath === ws.path && (
                      <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            ) : null}

            {isNewWorkspace && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-150">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  disabled={loading}
                  maxLength={50}
                  placeholder={t.workspaceNamePlaceholder || "e.g. Production Plan"}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
                  required
                />
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-450">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {getConfirmText()}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
