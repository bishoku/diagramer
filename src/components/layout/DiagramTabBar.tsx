import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Plus } from 'lucide-react';
import { translations } from '../../i18n/translations';

export const DiagramTabBar: React.FC = () => {
  const diagrams = useAppStore((s) => s.diagrams);
  const activeDiagramId = useAppStore((s) => s.activeDiagramId);
  const openDiagramIds = useAppStore((s) => s.openDiagramIds);
  const switchDiagram = useAppStore((s) => s.switchDiagram);
  const closeDiagram = useAppStore((s) => s.closeDiagram);
  const setCreateDiagramModalOpen = useAppStore((s) => s.setCreateDiagramModalOpen);
  const language = useAppStore((s) => s.language);
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);

  const t = translations[language];

  const handleCreateNew = () => {
    setCreateDiagramModalOpen(true);
  };

  if (!currentWorkspace || openDiagramIds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center w-full h-9 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-x-auto select-none shrink-0">
      {openDiagramIds.map((id) => {
        const diag = diagrams.find(d => d.id === id);
        if (!diag) return null;
        
        const isActive = id === activeDiagramId;

        return (
          <div
            key={id}
            onClick={() => switchDiagram(id)}
            className={`flex items-center min-w-[120px] max-w-[200px] h-full px-3 border-r border-slate-200 dark:border-slate-800 cursor-pointer text-sm transition-colors group ${
              isActive 
                ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-medium' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span className="truncate flex-1" title={diag.name}>{diag.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeDiagram(id);
              }}
              className={`ml-2 p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                isActive 
                  ? 'hover:bg-indigo-100 dark:hover:bg-indigo-900/50' 
                  : 'hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
              title={t.close || 'Close'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      {/* Quick Create Diagram Button */}
      <button
        onClick={handleCreateNew}
        className="p-1.5 ml-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
        title={language === 'tr' ? 'Yeni Diyagram' : 'New Diagram'}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
