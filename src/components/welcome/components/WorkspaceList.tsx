import React from 'react';
import { 
  ChevronDown, Upload, FolderOpen, HardDrive, Edit, Download, Trash2, Info, Activity 
} from 'lucide-react';
import { WorkspaceMeta } from '../../../types';
import { DiagramAdapter } from '../../../adapters/types';
import { translations } from '../../../i18n/translations';

interface WorkspaceListProps {
  recentWorkspaces: WorkspaceMeta[];
  loading: boolean;
  language: 'tr' | 'en';
  showImportMenu: boolean;
  setShowImportMenu: (show: boolean) => void;
  availableAdapters: DiagramAdapter[];
  onLoadRecent: (path: string) => void;
  onRenameWorkspace: (ws: WorkspaceMeta) => void;
  onExport: (ws: WorkspaceMeta) => void;
  onDelete: (ws: WorkspaceMeta) => void;
  onImportDproj: () => void;
  onSelectAdapter: (adapter: DiagramAdapter) => void;
}

export const WorkspaceList: React.FC<WorkspaceListProps> = ({
  recentWorkspaces,
  loading,
  language,
  showImportMenu,
  setShowImportMenu,
  availableAdapters,
  onLoadRecent,
  onRenameWorkspace,
  onExport,
  onDelete,
  onImportDproj,
  onSelectAdapter,
}) => {
  const t = translations[language];

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
    <div className="w-full md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <img src="pwa-icon.png" className="h-12" alt="YADA Icon" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-650 to-indigo-500 dark:from-indigo-200 dark:via-indigo-100 dark:to-slate-200 bg-clip-text text-transparent">
            {t.welcomeTitle}
          </h1>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium text-sm">
            <span>{t.recentWorkspaces}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowImportMenu(!showImportMenu)}
                disabled={loading}
                className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors duration-200 font-semibold"
              >
                <Upload className="w-3.5 h-3.5" />
                {t.importDproj}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showImportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowImportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => {
                        setShowImportMenu(false);
                        onImportDproj();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import Workspace (.dproj)
                    </button>
                    {availableAdapters.map((adapter) => (
                      <button
                        key={adapter.id}
                        onClick={() => {
                          setShowImportMenu(false);
                          onSelectAdapter(adapter);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                      >
                        <Activity className="w-3.5 h-3.5 text-orange-500" />
                        Import {adapter.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
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
                  onClick={() => onLoadRecent(ws.path)}
                  className="flex-1 min-w-0 pr-2 cursor-pointer"
                >
                  <div className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-300 transition-colors text-sm truncate">
                    {ws.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <HardDrive className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate" title={ws.path}>
                      {formatPath(ws.path)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-[10px] text-slate-550 hidden sm:block">
                    <div className="font-medium">{t.lastAccess}</div>
                    <div className="mt-0.5 text-slate-400 dark:text-slate-500">
                      {formatDate(ws.lastAccessed)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onRenameWorkspace(ws)}
                      title={t.rename}
                      disabled={loading}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onExport(ws)}
                      title={t.exportDproj}
                      disabled={loading}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(ws)}
                      title={t.delete}
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
  );
};
