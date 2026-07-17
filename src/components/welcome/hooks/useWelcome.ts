import { useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { isTauri, StorageService } from '../../../services/storage';
import { exportWorkspace, importWorkspace, ImportConflict, ConflictResolution } from '../../../utils/workspaceZip';
import { translations } from '../../../i18n/translations';
import { DiagramAdapter } from '../../../adapters/types';
import { WorkspaceMeta } from '../../../types';

export const useWelcome = () => {
  const recentWorkspaces = useAppStore((s) => s.recentWorkspaces);
  const createWorkspace = useAppStore((s) => s.createWorkspace);
  const loadWorkspace = useAppStore((s) => s.loadWorkspace);
  const deleteWorkspace = useAppStore((s) => s.deleteWorkspace);
  const fetchRecentWorkspaces = useAppStore((s) => s.fetchRecentWorkspaces);
  const language = useAppStore((s) => s.language);
  const theme = useAppStore((s) => s.theme);
  const changeLanguage = useAppStore((s) => s.changeLanguage);
  const changeTheme = useAppStore((s) => s.changeTheme);
  const googleUser = useAppStore((s) => s.googleUser);

  const t = translations[language];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [activeTextModalAdapter, setActiveTextModalAdapter] = useState<DiagramAdapter | null>(null);

  const setImportState = useAppStore((s) => s.setImportState);
  const setViewMode = useAppStore((s) => s.setViewMode);

  // Workspace Deletion/Import/Rename States
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceMeta | null>(null);
  const [workspaceToRename, setWorkspaceToRename] = useState<WorkspaceMeta | null>(null);
  const [renameName, setRenameName] = useState('');
  const [importConflicts, setImportConflicts] = useState<ImportConflict[]>([]);
  const [conflictResolver, setConflictResolver] = useState<{
    resolve: (resolutions: Record<string, ConflictResolution>) => void;
    reject: (err: any) => void;
  } | null>(null);

  const handleExport = async (ws: WorkspaceMeta) => {
    try {
      setLoading(true);
      await exportWorkspace(ws, language);
    } catch (err: any) {
      setError(t.exportFailedMsg + err);
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
          title: t.selectProjectFile,
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
              zipData = event.target.result as ArrayBuffer;
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

  const handleResolveConflicts = (resolutions: Record<string, ConflictResolution>) => {
    if (conflictResolver) {
      conflictResolver.resolve(resolutions);
      setImportConflicts([]);
      setConflictResolver(null);
    }
  };

  const handleCancelConflicts = () => {
    if (conflictResolver) {
      conflictResolver.reject(new Error(t.importCancelled));
      setImportConflicts([]);
      setConflictResolver(null);
    }
  };

  const confirmDelete = async () => {
    if (!workspaceToDelete) return;
    setLoading(true);
    try {
      await deleteWorkspace(workspaceToDelete.path);
      setWorkspaceToDelete(null);
    } catch (err: any) {
      setError(t.deletionFailed + err);
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
      setError(t.renameFailed + err);
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

  const onGoogleSignIn = async () => {
    const { GoogleDriveService } = await import('../../../services/googleDriveAPI');
    await GoogleDriveService.signIn();
  };

  return {
    recentWorkspaces,
    createWorkspace,
    loadWorkspace,
    deleteWorkspace,
    fetchRecentWorkspaces,
    language,
    theme,
    changeLanguage,
    changeTheme,
    googleUser,
    t,
    name,
    setName,
    description,
    setDescription,
    error,
    setError,
    loading,
    setLoading,
    showPrefModal,
    setShowPrefModal,
    showImportMenu,
    setShowImportMenu,
    activeTextModalAdapter,
    setActiveTextModalAdapter,
    setImportState,
    setViewMode,
    workspaceToDelete,
    setWorkspaceToDelete,
    workspaceToRename,
    setWorkspaceToRename,
    renameName,
    setRenameName,
    importConflicts,
    setImportConflicts,
    handleExport,
    handleImport,
    confirmDelete,
    handleRenameWorkspace,
    handleCreate,
    handleLoadRecent,
    onGoogleSignIn,
    handleResolveConflicts,
    handleCancelConflicts,
  };
};
