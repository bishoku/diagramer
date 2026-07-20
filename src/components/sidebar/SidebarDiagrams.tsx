import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';
import { Plus, Edit2, Trash2, FileJson, Check, X, ArrowRightLeft } from 'lucide-react';
import { WorkspacePickerModal } from '../layout/WorkspacePickerModal';
import { StorageService } from '../../services/storage';

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

  const copyDiagramToWorkspace = useAppStore((s) => s.copyDiagramToWorkspace);
  const moveDiagramToWorkspace = useAppStore((s) => s.moveDiagramToWorkspace);
  const loadWorkspace = useAppStore((s) => s.loadWorkspace);
  const createWorkspace = useAppStore((s) => s.createWorkspace);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Picker modal states
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDiagId, setPickerDiagId] = useState<string | null>(null);
  const [pickerDiagName, setPickerDiagName] = useState('');
  const [pickerMode, setPickerMode] = useState<'copy' | 'move'>('copy');

  // Notification states
  const [notification, setNotification] = useState<{
    message: string;
    actionText: string;
    targetWorkspacePath: string;
    targetDiagramId: string;
  } | null>(null);

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

  const handleOpenPicker = (id: string, name: string, mode: 'copy' | 'move') => {
    setPickerDiagId(id);
    setPickerDiagName(name);
    setPickerMode(mode);
    setPickerOpen(true);
  };

  const handlePickerConfirm = async (
    targetWorkspacePath: string | null,
    _targetWorkspaceName: string,
    isNew: boolean,
    newWorkspaceName?: string,
    targetDiagramName?: string
  ) => {
    if (!pickerDiagId) return;
    const finalDiagName = targetDiagramName || pickerDiagName;
    const sourcePath = currentWorkspace.path;

    // Load current diagram data to memory
    let logicalData: any;
    let visualData: any;

    if (activeDiagramId === pickerDiagId) {
      const state = useAppStore.getState();
      logicalData = state.logicalData;
      visualData = state.visualData;
    } else {
      const diagJson = await StorageService.load_diagram(sourcePath, pickerDiagId);
      const diag = JSON.parse(diagJson);
      logicalData = diag.logicalData || diag.logical || diag;
      visualData = diag.visualData || diag.visual || {};
    }

    if (isNew && newWorkspaceName) {
      const newWs = await createWorkspace(newWorkspaceName, '');
      
      // Save diagram into the new workspace as default
      await StorageService.save_diagram(
        newWs.path,
        'default',
        JSON.stringify(logicalData),
        JSON.stringify(visualData)
      );

      const defaultDiag = { id: 'default', name: finalDiagName, updatedAt: new Date().toISOString() };
      await StorageService.save_text_file(`${newWs.path}/diagrams/index.json`, JSON.stringify({ diagrams: [defaultDiag] }));

      // Refresh store state for diagrams list
      useAppStore.setState({
        diagrams: [defaultDiag],
        activeDiagramId: 'default',
        openDiagramIds: ['default'],
        logicalData: logicalData,
        visualData: visualData,
        isDirty: false
      });

      if (pickerMode === 'move') {
        try {
          const sourceIndexStr = await StorageService.read_text_file(`${sourcePath}/diagrams/index.json`);
          const sourceDiagrams = JSON.parse(sourceIndexStr).diagrams || [];
          const updatedSourceDiagrams = sourceDiagrams.filter((d: any) => d.id !== pickerDiagId);
          await StorageService.save_text_file(`${sourcePath}/diagrams/index.json`, JSON.stringify({ diagrams: updatedSourceDiagrams }));
        } catch (e) {
          console.error("Failed to clean up source workspace diagrams index:", e);
        }
      }
    } else if (targetWorkspacePath) {
      let targetDiagId = '';
      if (pickerMode === 'copy') {
        targetDiagId = await copyDiagramToWorkspace(pickerDiagId, targetWorkspacePath, finalDiagName);
      } else {
        targetDiagId = await moveDiagramToWorkspace(pickerDiagId, targetWorkspacePath, finalDiagName);
      }

      setNotification({
        message: pickerMode === 'copy'
          ? (language === 'tr' ? `"${finalDiagName}" kopyalandı.` : `"${finalDiagName}" copied.`)
          : (language === 'tr' ? `"${finalDiagName}" taşındı.` : `"${finalDiagName}" moved.`),
        actionText: t.goToWorkspace || 'Go to Workspace',
        targetWorkspacePath,
        targetDiagramId: targetDiagId
      });
    }
  };

  const handleGoToWorkspace = async (path: string, diagId: string) => {
    setNotification(null);
    try {
      await loadWorkspace(path);
      await switchDiagram(diagId);
    } catch (e) {
      console.error("Failed to switch to workspace/diagram:", e);
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
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg border border-transparent cursor-pointer transition-colors group relative ${
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
                    
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === diag.id ? null : diag.id);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        title={language === 'tr' ? 'Taşı / Kopyala' : 'Move / Copy'}
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                      </button>
                      {activeMenuId === diag.id && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                          <div className="absolute right-0 mt-1 w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-30 py-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                handleOpenPicker(diag.id, diag.name, 'copy');
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {t.copyDiagram || 'Copy'}
                            </button>
                            <button
                              onClick={() => {
                                handleOpenPicker(diag.id, diag.name, 'move');
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {t.moveDiagram || 'Move'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

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

      {notification && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-850 rounded-xl text-xs space-y-2 mt-2 animate-in slide-in-from-bottom-2 duration-200">
          <p className="text-slate-700 dark:text-slate-300 font-semibold">{notification.message}</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleGoToWorkspace(notification.targetWorkspacePath, notification.targetDiagramId)}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white dark:bg-indigo-600 dark:hover:bg-indigo-550 rounded-lg font-bold text-[10px] cursor-pointer shadow-sm transition-colors"
            >
              {notification.actionText}
            </button>
            <button
              onClick={() => setNotification(null)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 rounded-lg font-bold text-[10px] cursor-pointer transition-colors"
            >
              {t.close || 'Close'}
            </button>
          </div>
        </div>
      )}

      {pickerOpen && pickerDiagId && (
        <WorkspacePickerModal
          isOpen={pickerOpen}
          onClose={() => {
            setPickerOpen(false);
            setPickerDiagId(null);
          }}
          mode={pickerMode}
          diagramName={pickerDiagName}
          currentWorkspacePath={currentWorkspace.path}
          onConfirm={handlePickerConfirm}
        />
      )}

      <div className="h-px bg-slate-200/60 dark:bg-slate-800 mt-4" />
    </div>
  );
};
