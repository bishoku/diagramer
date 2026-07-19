import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';
import { Plus, Edit2, Trash2, FileJson, Check, X } from 'lucide-react';

export const SidebarDiagrams: React.FC = () => {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const diagrams = useAppStore((s) => s.diagrams);
  const activeDiagramId = useAppStore((s) => s.activeDiagramId);
  const switchDiagram = useAppStore((s) => s.switchDiagram);
  const setCreateDiagramModalOpen = useAppStore((s) => s.setCreateDiagramModalOpen);
  const deleteDiagram = useAppStore((s) => s.deleteDiagram);
  const renameDiagram = useAppStore((s) => s.renameDiagram);
  const language = useAppStore((s) => s.language);
  const openConfirm = useAppStore((s) => s.openConfirm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const t = translations[language];

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
    const confirmMsg = language === 'tr' 
      ? `"${name}" diyagramını silmek istediğinize emin misiniz?` 
      : `Are you sure you want to delete "${name}" diagram?`;
      
    const confirmed = await openConfirm({
      title: language === 'tr' ? 'Diyagramı Sil' : 'Delete Diagram',
      message: confirmMsg,
      type: 'danger',
      confirmText: language === 'tr' ? 'Sil' : 'Delete',
      cancelText: language === 'tr' ? 'İptal' : 'Cancel'
    });
    if (confirmed) {
      await deleteDiagram(id);
    }
  };

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center justify-between pl-1">
        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {language === 'tr' ? 'Diyagramlar' : 'Diagrams'}
        </span>
        <button
          onClick={handleCreate}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
          title={language === 'tr' ? 'Yeni Diyagram' : 'New Diagram'}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="space-y-1">
        {diagrams.map((diag) => {
          const isActive = diag.id === activeDiagramId;
          const isEditing = editingId === diag.id;

          return (
            <div
              key={diag.id}
              onClick={() => !isEditing && switchDiagram(diag.id)}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg border border-transparent cursor-pointer transition-colors group ${
                isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isEditing ? (
                <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 bg-white dark:bg-slate-950 border border-indigo-300 dark:border-indigo-600 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                  <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileJson className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <span className={`text-xs truncate ${isActive ? 'font-medium' : ''}`}>
                      {diag.name}
                    </span>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleStartEdit(diag.id, diag.name)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      title={t.rename || 'Rename'}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {diagrams.length > 1 && (
                      <button
                        onClick={() => handleDelete(diag.id, diag.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title={t.delete || 'Delete'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="h-px bg-slate-200/60 dark:bg-slate-800 mt-4" />
    </div>
  );
};
