import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { FolderPlus, FolderOpen, History, Info, AlertCircle, HardDrive, Settings, Globe, Moon, Sun, Check, Download, Trash2, Upload, Edit } from 'lucide-react';
import { translations } from '../../i18n/translations';
import { isTauri, StorageService } from '../../services/storage';
import { exportWorkspace, importWorkspace, ImportConflict, ConflictResolution } from '../../utils/workspaceZip';

export const WelcomeScreen: React.FC = () => {
  const recentWorkspaces = useAppStore((s) => s.recentWorkspaces);
  const createWorkspace = useAppStore((s) => s.createWorkspace);
  const loadWorkspace = useAppStore((s) => s.loadWorkspace);
  const deleteWorkspace = useAppStore((s) => s.deleteWorkspace);
  const fetchRecentWorkspaces = useAppStore((s) => s.fetchRecentWorkspaces);
  const language = useAppStore((s) => s.language);
  const theme = useAppStore((s) => s.theme);
  const changeLanguage = useAppStore((s) => s.changeLanguage);
  const changeTheme = useAppStore((s) => s.changeTheme);

  const t = translations[language];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrefModal, setShowPrefModal] = useState(false);

  // Workspace Deletion/Import/Rename States
  const [workspaceToDelete, setWorkspaceToDelete] = useState<any | null>(null);
  const [workspaceToRename, setWorkspaceToRename] = useState<any | null>(null);
  const [renameName, setRenameName] = useState('');
  const [importConflicts, setImportConflicts] = useState<ImportConflict[]>([]);
  const [conflictResolver, setConflictResolver] = useState<{
    resolve: (resolutions: Record<string, ConflictResolution>) => void;
    reject: (err: any) => void;
  } | null>(null);

  const handleExport = async (ws: any) => {
    try {
      setLoading(true);
      await exportWorkspace(ws, language);
    } catch (err: any) {
      setError(language === 'tr' ? `Dışa aktarım başarısız: ${err}` : `Export failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      let zipData: ArrayBuffer | Uint8Array;

      if (isTauri()) {
        const selected = await open({
          multiple: false,
          filters: [{ name: 'YADA Project', extensions: ['dproj'] }],
          title: language === 'tr' ? 'Proje Dosyası Seç' : 'Select Project File',
        });
        if (!selected || typeof selected !== 'string') return;
        setLoading(true);
        zipData = await readFile(selected);
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.dproj';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setLoading(true);
          const reader = new FileReader();
          reader.onload = async (event: any) => {
            try {
              zipData = event.target.result;
              await runImport(zipData);
            } catch (err: any) {
              setError(err.message || err.toString());
              setLoading(false);
            }
          };
          reader.readAsArrayBuffer(file);
        };
        input.click();
        return;
      }

      await runImport(zipData);
    } catch (err: any) {
      setError(err.message || err.toString());
      setLoading(false);
    }
  };

  const runImport = async (zipData: ArrayBuffer | Uint8Array) => {
    try {
      const saveDiagramFn = async (path: string, logicalJson: string, visualJson: string) => {
        await StorageService.save_diagram(path, logicalJson, visualJson);
      };

      const resolveConflictsFn = (conflictsList: ImportConflict[]) => {
        return new Promise<Record<string, ConflictResolution>>((resolve, reject) => {
          setImportConflicts(conflictsList);
          setConflictResolver({ resolve, reject });
        });
      };

      const ws = await importWorkspace(
        zipData,
        createWorkspace,
        saveDiagramFn,
        resolveConflictsFn,
        language
      );

      await loadWorkspace(ws.path);
    } catch (err: any) {
      setError(err.message || err.toString());
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!workspaceToDelete) return;
    setLoading(true);
    try {
      await deleteWorkspace(workspaceToDelete.path);
      setWorkspaceToDelete(null);
    } catch (err: any) {
      setError(language === 'tr' ? `Silme başarısız: ${err}` : `Deletion failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceToRename || !renameName.trim()) return;
    setLoading(true);
    try {
      const updatedWs = {
        ...workspaceToRename,
        name: renameName.trim(),
        lastAccessed: new Date().toISOString()
      };
      await StorageService.save_workspace(JSON.stringify(updatedWs));
      await fetchRecentWorkspaces();
      setWorkspaceToRename(null);
      setRenameName('');
    } catch (err: any) {
      setError(language === 'tr' ? `Yeniden adlandırma başarısız: ${err}` : `Rename failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentWorkspaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t.workspaceNamePlaceholder);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createWorkspace(name.trim(), description.trim());
    } catch (err: any) {
      setError(`${t.workspaceCreateError} ${err?.toString() || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRecent = async (wsPath: string) => {
    setLoading(true);
    setError(null);
    try {
      await loadWorkspace(wsPath);
    } catch (err: any) {
      setError(`${t.workspaceLoadError} ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const formatPath = (fullPath: string) => {
    if (fullPath.length > 40) {
      return '...' + fullPath.substring(fullPath.length - 37);
    }
    return fullPath;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6 relative overflow-hidden select-none transition-colors duration-300">

      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Preferences Toggle Button */}
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={() => setShowPrefModal(true)}
          className="p-2.5 bg-white/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800/80 rounded-xl cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
          title={t.appPrefTitle}
        >
          <Settings className="w-4 h-4" />
          <span className="text-xs font-semibold">{t.appPrefTitle}</span>
        </button>
      </div>

      <div className="w-full max-w-5xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-250 dark:border-slate-800/80 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 min-h-[550px] transition-all">

        {/* Left Side: Recent Workspaces */}
        <div className="w-full md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <img src="pwa-icon.png" className={"h-12"} />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-200 dark:via-indigo-100 dark:to-slate-200 bg-clip-text text-transparent">
                {t.welcomeTitle}
              </h1>

            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium text-sm">
                <History className="w-4 h-4" />
                <span>{t.recentWorkspaces}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors duration-200 hover:underline font-semibold"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {language === 'tr' ? 'İçeri Aktar (.dproj)' : 'Import (.dproj)'}
                </button>
              </div>
            </div>

            {recentWorkspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-100/50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <FolderOpen className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
                <p className="text-slate-700 dark:text-slate-400 text-sm font-medium">{t.noWorkspaces}</p>
                <p className="text-slate-500 dark:text-slate-500 text-xs mt-1 max-w-[280px]">
                  {t.noWorkspacesSub}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {recentWorkspaces.map((ws) => (
                  <div
                    key={ws.path}
                    className="w-full p-3 bg-slate-100/30 dark:bg-slate-950/30 hover:border-indigo-500/30 border border-slate-200/60 dark:border-slate-800/60 rounded-xl transition-all duration-200 group flex items-center justify-between"
                  >
                    <div
                      onClick={() => handleLoadRecent(ws.path)}
                      className="flex-1 min-w-0 pr-2 cursor-pointer"
                    >
                      <div className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-300 transition-colors text-sm truncate">
                        {ws.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <HardDrive className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate" title={ws.path}>{formatPath(ws.path)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-[10px] text-slate-550 hidden sm:block">
                        <div className="font-medium">{language === 'tr' ? 'Son erişim' : 'Last access'}</div>
                        <div className="mt-0.5 text-slate-400 dark:text-slate-500">{formatDate(ws.lastAccessed)}</div>
                      </div>

                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setWorkspaceToRename(ws);
                            setRenameName(ws.name);
                          }}
                          title={language === 'tr' ? 'Yeniden Adlandır' : 'Rename'}
                          disabled={loading}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExport(ws)}
                          title={language === 'tr' ? 'Dışa Aktar (.dproj)' : 'Export (.dproj)'}
                          disabled={loading}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setWorkspaceToDelete(ws)}
                          title={language === 'tr' ? 'Sil' : 'Delete'}
                          disabled={loading}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/45 text-slate-555 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/50 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 flex-shrink-0" />
            <span>{t.physicalStoreNote}</span>
          </div>
        </div>

        {/* Right Side: Create Workspace Form */}
        <div className="w-full md:w-1/2 p-8 bg-slate-100/10 dark:bg-slate-950/20 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              {t.createWorkspace}
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {t.workspaceName} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  disabled={loading}
                  placeholder={t.workspaceNamePlaceholder}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {t.description}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  placeholder={t.descriptionPlaceholder}
                  rows={4}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200 resize-none"
                  maxLength={200}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/45 text-slate-100 font-bold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-indigo-600/10 dark:shadow-indigo-600/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4" />
                    <span>{t.createButton}</span>
                  </>
                )}
              </button>
            </form>
          </div>


        </div>

      </div>

      {/* Global Preferences Modal */}
      {showPrefModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl transition-all">

            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                {t.appPrefTitle}
              </h3>
            </div>

            <div className="space-y-5">
              {/* Language Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {t.language}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => changeLanguage('tr')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${language === 'tr'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    {language === 'tr' && <Check className="w-3.5 h-3.5" />}
                    {t.langTr}
                  </button>
                  <button
                    onClick={() => changeLanguage('en')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${language === 'en'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    {language === 'en' && <Check className="w-3.5 h-3.5" />}
                    {t.langEn}
                  </button>
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  {t.theme}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => changeTheme('dark')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${theme === 'dark'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{t.themeDark}</span>
                  </button>
                  <button
                    onClick={() => changeTheme('light')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${theme === 'light'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{t.themeLight}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5 mt-5 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowPrefModal(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                {t.close}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {workspaceToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl transition-all">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              {language === 'tr' ? 'Çalışma Alanını Sil' : 'Delete Workspace'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              {language === 'tr'
                ? `"${workspaceToDelete.name}" isimli çalışma alanını silmek istediğinize emin misiniz? Bu işlem dosyaları diskten kalıcı olarak silecektir ve geri alınamaz.`
                : `Are you sure you want to delete the workspace "${workspaceToDelete.name}"? This will permanently delete the files from disk and cannot be undone.`}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWorkspaceToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                {language === 'tr' ? 'Kalıcı Olarak Sil' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Workspace Modal */}
      {workspaceToRename && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl transition-all">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-500" />
              {language === 'tr' ? 'Çalışma Alanını Yeniden Adlandır' : 'Rename Workspace'}
            </h3>
            <form onSubmit={handleRenameWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'tr' ? 'Yeni İsim' : 'New Name'}
                </label>
                <input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  disabled={loading}
                  maxLength={50}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceToRename(null);
                    setRenameName('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading || !renameName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  {language === 'tr' ? 'Kaydet' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Conflict Resolution Modal */}
      {importConflicts.length > 0 && conflictResolver && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
              {language === 'tr' ? 'Özel Bileşen Çakışması Algılandı' : 'Custom Component Conflict'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              {language === 'tr'
                ? 'İçeri aktarılan projede yer alan aşağıdaki özel bileşenler şablon kütüphanenizde zaten mevcut. Nasıl devam etmek istersiniz?'
                : 'The following custom components in the imported project already exist in your component library. How would you like to proceed?'}
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
                onClick={() => {
                  const resolutions: Record<string, ConflictResolution> = {};
                  importConflicts.forEach((c) => (resolutions[c.compId] = 'overwrite'));
                  conflictResolver.resolve(resolutions);
                  setImportConflicts([]);
                  setConflictResolver(null);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                {language === 'tr' ? 'Mevcut Olanların Üzerine Yaz (Önerilen)' : 'Overwrite Existing (Recommended)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const resolutions: Record<string, ConflictResolution> = {};
                  importConflicts.forEach((c) => (resolutions[c.compId] = 'copy'));
                  conflictResolver.resolve(resolutions);
                  setImportConflicts([]);
                  setConflictResolver(null);
                }}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                {language === 'tr' ? 'İkisini de Koru (Yeni kopya olarak kaydet)' : 'Keep Both (Save as new copies)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  conflictResolver.reject(new Error(language === 'tr' ? 'İçe aktarma iptal edildi.' : 'Import cancelled.'));
                  setImportConflicts([]);
                  setConflictResolver(null);
                }}
                className="w-full py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
