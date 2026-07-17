import React from 'react';
import { Settings } from 'lucide-react';
import { useWelcome } from './hooks/useWelcome';
import { WorkspaceList } from './components/WorkspaceList';
import { CreateWorkspaceForm } from './components/CreateWorkspaceForm';
import { PreferencesModal } from './components/PreferencesModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { RenameWorkspaceModal } from './components/RenameWorkspaceModal';
import { ImportConflictsModal } from './components/ImportConflictsModal';
import { TextImportModal } from './TextImportModal';
import { availableAdapters } from '../../adapters';

export const WelcomeScreen: React.FC = () => {
  const {
    recentWorkspaces,
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
    handleExport,
    handleImport,
    confirmDelete,
    handleRenameWorkspace,
    handleCreate,
    handleLoadRecent,
    onGoogleSignIn,
    handleResolveConflicts,
    handleCancelConflicts,
  } = useWelcome();

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
        <WorkspaceList
          recentWorkspaces={recentWorkspaces}
          loading={loading}
          language={language}
          showImportMenu={showImportMenu}
          setShowImportMenu={setShowImportMenu}
          availableAdapters={availableAdapters}
          onLoadRecent={handleLoadRecent}
          onRenameWorkspace={(ws) => {
            setWorkspaceToRename(ws);
            setRenameName(ws.name);
          }}
          onExport={handleExport}
          onDelete={setWorkspaceToDelete}
          onImportDproj={handleImport}
          onSelectAdapter={(adapter) => {
            if (adapter.importMethod === 'text-modal') {
              setActiveTextModalAdapter(adapter);
            } else {
              setActiveTextModalAdapter(adapter);
            }
          }}
        />

        {/* Right Side: Create Workspace Form */}
        <CreateWorkspaceForm
          name={name}
          setName={(val) => {
            setName(val);
            setError(null);
          }}
          description={description}
          setDescription={setDescription}
          loading={loading}
          error={error}
          language={language}
          onSubmit={handleCreate}
          onGoogleSignIn={onGoogleSignIn}
          googleUser={googleUser}
        />
      </div>

      {/* Global Preferences Modal */}
      <PreferencesModal
        isOpen={showPrefModal}
        onClose={() => setShowPrefModal(false)}
        language={language}
        theme={theme}
        onChangeLanguage={changeLanguage}
        onChangeTheme={changeTheme}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        workspace={workspaceToDelete}
        onClose={() => setWorkspaceToDelete(null)}
        onConfirm={confirmDelete}
        language={language}
      />

      {/* Rename Workspace Modal */}
      <RenameWorkspaceModal
        workspace={workspaceToRename}
        renameName={renameName}
        setRenameName={setRenameName}
        loading={loading}
        onClose={() => {
          setWorkspaceToRename(null);
          setRenameName('');
        }}
        onSubmit={handleRenameWorkspace}
        language={language}
      />

      {/* Import Conflict Resolution Modal */}
      <ImportConflictsModal
        importConflicts={importConflicts}
        onResolve={handleResolveConflicts}
        onCancel={handleCancelConflicts}
        language={language}
      />

      {/* Adapter Text Paste Import Modal */}
      {activeTextModalAdapter && (
        <TextImportModal
          adapterId={activeTextModalAdapter.id}
          adapterName={activeTextModalAdapter.name}
          onClose={() => setActiveTextModalAdapter(null)}
          onSubmit={(adapterId, data) => {
            setActiveTextModalAdapter(null);
            setImportState(adapterId, data);
            setViewMode('import-preview');
          }}
        />
      )}
    </div>
  );
};
