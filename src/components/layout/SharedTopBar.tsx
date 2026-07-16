import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FolderHeart, Database, ShieldAlert, Sparkles, X, ChevronRight, LayoutDashboard, ListOrdered } from 'lucide-react';
import { translations } from '../../i18n/translations';

export const SharedTopBar: React.FC = () => {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const language = useAppStore((s) => s.language);
  const cloneSharedToWorkspace = useAppStore((s) => s.cloneSharedToWorkspace);
  const viewMode = useAppStore((s) => s.viewMode);
  const toggleViewMode = useAppStore((s) => s.toggleViewMode);

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneName, setCloneName] = useState(currentWorkspace?.name ? `${currentWorkspace.name} - Kopya` : 'Yeni Diyagram');
  const [isCloning, setIsCloning] = useState(false);

  const t = translations[language];
  const isTr = language === 'tr';

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneName.trim()) return;

    setIsCloning(true);
    try {
      await cloneSharedToWorkspace(cloneName.trim());
      setShowCloneModal(false);
    } catch (err) {
      console.error(err);
      alert(isTr ? 'Klonlama başarısız oldu' : 'Cloning failed');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <>
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-4 justify-between z-25 select-none shrink-0 transition-colors duration-300 font-sans">
        
        {/* Left: App Logo & Workspace Name Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <img src="pwa-icon.png" className="h-6 w-6" alt="Yada logo" />
            <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-200 bg-clip-text text-transparent hidden sm:inline">
              {t.welcomeTitle || 'YADA'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Workspace display */}
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[150px] truncate">
              {currentWorkspace?.name}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3 h-3" />
              {isTr ? 'Sadece Okuma' : 'Read-Only'}
            </span>
          </div>
        </div>

        {/* Center: View Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg select-none">
          <button
            onClick={() => viewMode !== 'freeform' && toggleViewMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
              viewMode === 'freeform'
                ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350'
            }`}
            title={isTr ? 'Serbest Stil Görünümü' : 'Free Style View'}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">{isTr ? 'Serbest Stil' : 'Free Style'}</span>
          </button>
          <button
            onClick={() => viewMode !== 'sequence' && toggleViewMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
              viewMode === 'sequence'
                ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350'
            }`}
            title={isTr ? 'Sequence Diagram Görünümü' : 'Sequence Diagram View'}
          >
            <ListOrdered className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">{isTr ? 'Sequence' : 'Sequence'}</span>
          </button>
        </div>

        {/* Right: Clone to Workspace Button */}
        <div>
          <button
            onClick={() => {
              setCloneName(currentWorkspace?.name ? `${currentWorkspace.name} - Kopya` : 'Yeni Diyagram');
              setShowCloneModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <FolderHeart className="w-3.5 h-3.5" />
            <span>{isTr ? 'Çalışma Alanıma Kaydet' : 'Save to Workspace'}</span>
          </button>
        </div>
      </header>

      {/* Premium Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-850 dark:text-white">
                    {isTr ? 'Çalışma Alanını Kopyala' : 'Save to Workspace'}
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-450 mt-0.5">
                    {isTr ? 'Diyagramı kendi yerel alanınızda düzenleyin' : 'Edit the diagram in your local workspace'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCloneModal(false)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloneSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  {isTr ? 'Çalışma Alanı Adı' : 'Workspace Name'}
                </label>
                <input
                  type="text"
                  required
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder={isTr ? 'örn: Benim Mimarim' : 'e.g. My Architecture'}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-750 rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  autoFocus
                  disabled={isCloning}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCloneModal(false)}
                  disabled={isCloning}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-905 transition-all cursor-pointer"
                >
                  {t.cancel || 'İptal'}
                </button>
                <button
                  type="submit"
                  disabled={isCloning || !cloneName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                >
                  {isCloning ? (
                    <span>{isTr ? 'Kaydediliyor...' : 'Saving...'}</span>
                  ) : (
                    <>
                      <span>{isTr ? 'Oluştur ve Başlat' : 'Create & Open'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
