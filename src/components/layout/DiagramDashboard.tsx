import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  Plus, Edit2, Trash2, Calendar, FileJson, 
  ArrowUpRight, Check, X, LayoutGrid 
} from 'lucide-react';

export const DiagramDashboard: React.FC = () => {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const diagrams = useAppStore((s) => s.diagrams);
  const switchDiagram = useAppStore((s) => s.switchDiagram);
  const setCreateDiagramModalOpen = useAppStore((s) => s.setCreateDiagramModalOpen);
  const deleteDiagram = useAppStore((s) => s.deleteDiagram);
  const renameDiagram = useAppStore((s) => s.renameDiagram);
  const language = useAppStore((s) => s.language);
  const openConfirm = useAppStore((s) => s.openConfirm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Local translations for dashboard elements
  const localT = {
    tr: {
      dashboardTitle: "Diyagram Kontrol Paneli",
      dashboardSubtitle: "Bu çalışma alanı altındaki diyagramları yönetin ve düzenleyin.",
      newDiagram: "Yeni Diyagram Oluştur",
      newDiagramSub: "Boş bir tuvalle yeni tasarıma başlayın",
      lastUpdated: "Son güncelleme",
      open: "Aç",
      rename: "Yeniden Adlandır",
      delete: "Sil",
      confirmDelete: (name: string) => `"${name}" diyagramını silmek istediğinize emin misiniz?`
    },
    en: {
      dashboardTitle: "Diagram Dashboard",
      dashboardSubtitle: "Manage and edit diagrams under this workspace.",
      newDiagram: "Create New Diagram",
      newDiagramSub: "Start a new design with a clean canvas",
      lastUpdated: "Last updated",
      open: "Open",
      rename: "Rename",
      delete: "Delete",
      confirmDelete: (name: string) => `Are you sure you want to delete "${name}" diagram?`
    }
  }[language];

  if (!currentWorkspace) return null;

  const handleCreate = () => {
    setCreateDiagramModalOpen(true);
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveEdit = async () => {
    if (editingId && editName.trim()) {
      await renameDiagram(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await openConfirm({
      title: language === 'tr' ? 'Diyagramı Sil' : 'Delete Diagram',
      message: localT.confirmDelete(name),
      type: 'danger',
      confirmText: language === 'tr' ? 'Sil' : 'Delete',
      cancelText: language === 'tr' ? 'İptal' : 'Cancel'
    });
    if (confirmed) {
      await deleteDiagram(id);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <LayoutGrid className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              {localT.dashboardTitle}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {localT.dashboardSubtitle}
            </p>
          </div>
        </div>

        {/* Diagrams Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Create New Diagram Card */}
          <div
            onClick={handleCreate}
            className="border-2 border-dashed border-slate-250 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400/50 hover:bg-white dark:hover:bg-slate-900/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[180px] group shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 flex items-center justify-center mb-4 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 group-hover:border-indigo-200 dark:group-hover:border-indigo-900 transition-colors">
              <Plus className="w-6 h-6 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 mb-1">
              {localT.newDiagram}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 px-4">
              {localT.newDiagramSub}
            </p>
          </div>

          {/* Existing Diagram Cards */}
          {diagrams.map((diag) => {
            const isEditing = editingId === diag.id;

            return (
              <div
                key={diag.id}
                onClick={() => !isEditing && switchDiagram(diag.id)}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.01] hover:border-indigo-500/30 dark:hover:border-indigo-500/20 group min-h-[180px] relative overflow-hidden"
              >
                
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-indigo-500/10 via-indigo-500/30 to-indigo-500/10 dark:from-indigo-500/5 dark:via-indigo-500/20 dark:to-indigo-500/5" />

                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                      <FileJson className="w-5 h-5 text-indigo-500/80" />
                    </div>
                    
                    {/* Action buttons on card hover */}
                    <div 
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleStartEdit(diag.id, diag.name)}
                        className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title={localT.rename}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {diagrams.length > 1 && (
                        <button
                          onClick={() => handleDelete(diag.id, diag.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                          title={localT.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div 
                      className="flex items-center gap-1.5 pt-1" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-indigo-450 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                      <button 
                        onClick={handleSaveEdit} 
                        className="p-1 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)} 
                        className="p-1 bg-slate-50 dark:bg-slate-950 text-slate-450 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-4 text-base">
                      {diag.name}
                    </h3>
                  )}
                </div>

                {/* Footer with date & quick enter button */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-3 mt-4">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">
                      {formatDate(diag.updatedAt)}
                    </span>
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                      <span>{localT.open}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  )}
                </div>

              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
};
