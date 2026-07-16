import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  LogOut, Settings, Database,
  PanelLeft, PanelRight, PanelBottom,
  Undo, Redo, FileDown, Copy, ChevronDown, Save, Loader2,
  ListOrdered, LayoutDashboard, Grid,
  Cloud, CloudUpload, CheckCircle2, AlertCircle
} from 'lucide-react';
import { translations } from '../../i18n/translations';
import { generateStandaloneHtml } from '../../utils/exportTemplate';
import { generateSequenceHtml } from '../../utils/exportSequenceTemplate';
import { exportToPng, exportToGif } from '../../utils/exportMedia';
import { save } from '@tauri-apps/plugin-dialog';
import { StorageService, isTauri } from '../../services/storage';
import { GoogleDriveService } from '../../services/googleDriveAPI';

// SOLID Subcomponents
import { SettingsModal } from './topbar/SettingsModal';
import { GifExportModal } from './topbar/GifExportModal';
import { AiCopyModal } from './topbar/AiCopyModal';
import { CanvasBgSelector } from './topbar/CanvasBgSelector';
import { ShareModal } from './topbar/ShareModal';
import { Share2 } from 'lucide-react';

export const TopBar: React.FC = () => {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const isDirty = useAppStore((s) => s.isDirty);
  const isSaving = useAppStore((s: any) => s.isSaving);
  const manualSave = useAppStore((s: any) => s.manualSave);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const language = useAppStore((s) => s.language);
  const theme = useAppStore((s) => s.theme);
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen);
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen);
  const toggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar);
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const currentView = useAppStore((s) => s.currentView);
  const libraryComponents = useAppStore((s) => s.libraryComponents);
  const applyAutoLayout = useAppStore((s) => s.applyAutoLayout);
  const pastStates = useAppStore((s) => s.pastStates);
  const futureStates = useAppStore((s) => s.futureStates);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const toggleTimeline = useAppStore((s) => s.toggleTimeline);
  const viewMode = useAppStore((s) => s.viewMode);
  const toggleViewMode = useAppStore((s) => s.toggleViewMode);
  const isReadOnly = useAppStore((s) => s.isReadOnly);

  // Google Sync State
  const googleUser = useAppStore((s) => s.googleUser);
  const syncState = useAppStore((s) => s.syncState);
  const hasUnsyncedChanges = useAppStore((s) => s.hasUnsyncedChanges);

  const t = translations[language];

  const [showSettings, setShowSettings] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // GIF Config State
  const [showGifConfig, setShowGifConfig] = useState(false);

  // AI Copy Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiText, setAiText] = useState('');

  const handleBackToWelcome = () => {
    setWorkspace(null);
  };

  const handleExportHtml = async () => {
    try {
      const defaultName = `${currentWorkspace?.name || 'diagram'}_simulation.html`;
      
      const htmlContent = viewMode === 'sequence'
        ? generateSequenceHtml(logicalData, useAppStore.getState().schedules, visualData.timelines, theme === 'light' ? 'light' : 'dark')
        : generateStandaloneHtml(logicalData, visualData, libraryComponents);

      if (isTauri()) {
        const selectedPath = await save({
          title: language === 'tr' ? 'HTML Simülasyonunu Kaydet' : 'Save Standalone HTML Simulation',
          defaultPath: defaultName,
          filters: [{ name: 'HTML', extensions: ['html'] }],
        });

        if (!selectedPath) return;
        await StorageService.save_text_file(selectedPath, htmlContent);
      } else {
        // Web Implementation: Download via Blob
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
      }
      alert(language === 'tr' ? 'HTML Simülasyonu başarıyla dışa aktarıldı!' : 'HTML Simulation exported successfully!');
    } catch (err) {
      console.error('Error exporting HTML:', err);
      alert(language === 'tr' ? `Dışa aktarma hatası: ${err}` : `Export error: ${err}`);
    }
  };

  const handleExportPng = async () => {
    try {
      const defaultName = `${currentWorkspace?.name || 'diagram'}.png`;
      window.dispatchEvent(new CustomEvent('export:fitview'));
      await new Promise(r => setTimeout(r, 150)); // Wait for React Flow to fit the view
      await exportToPng('.react-flow', defaultName, language);
    } catch (err) {
      console.error('Error exporting PNG:', err);
      alert(language === 'tr' ? `PNG dışa aktarma hatası: ${err}` : `PNG Export error: ${err}`);
    }
  };

  const handleExportGif = async (fps: number, quality: number) => {
    try {
      setExportProgress(0);
      const defaultName = `${currentWorkspace?.name || 'diagram'}.gif`;
      const schedules = useAppStore.getState().schedules as Record<string, { start: number, end: number }>;
      const schedValues = Object.values(schedules);
      const maxDuration = schedValues.length > 0 ? Math.max(...schedValues.map(s => s.end)) + 500 : 2000;

      // Map 1-100 to 30-1 for gif.js (1 is best quality, 30 is worst)
      const mappedQuality = Math.max(1, 31 - Math.round(quality * 0.3));

      window.dispatchEvent(new CustomEvent('export:fitview'));
      await new Promise(r => setTimeout(r, 150)); // Wait for React Flow to fit the view

      await exportToGif('.react-flow', maxDuration, defaultName, language, fps, mappedQuality, (progress) => {
        setExportProgress(progress);
      });
    } catch (err) {
      console.error('Error exporting GIF:', err);
      alert(language === 'tr' ? `GIF dışa aktarma hatası: ${err}` : `GIF Export error: ${err}`);
    } finally {
      setExportProgress(null);
    }
  };

  const handleCopyForAi = async () => {
    let text = `${language === 'tr'
      ? 'Aşağıdaki sistem mimarisini incele ve analiz et:'
      : 'Analyze and explain the following system architecture:'}\n\n`;

    text += `**${language === 'tr' ? 'Bileşenler' : 'Components'}:**\n`;
    logicalData.nodes.forEach(node => {
      const customTemplate = libraryComponents.find(c => c.componentId === node.type);
      const category = customTemplate ? customTemplate.category : node.type;
      text += `- \`${node.name}\` (Type: ${category})\n`;
      if (node.properties && Object.keys(node.properties).length > 0) {
        text += `  - Metadata: ${JSON.stringify(node.properties)}\n`;
      }
    });

    if (logicalData.edges.length > 0) {
      text += `\n**${language === 'tr' ? 'Bağlantılar' : 'Connections'}:**\n`;
      logicalData.edges.forEach(edge => {
        const sourceNode = logicalData.nodes.find(n => n.id === edge.sourceId);
        const targetNode = logicalData.nodes.find(n => n.id === edge.targetId);
        const sourceName = sourceNode ? sourceNode.name : edge.sourceId;
        const targetName = targetNode ? targetNode.name : edge.targetId;

        text += `- \`${sourceName}\` → \`${targetName}\` (Protocol: ${edge.protocol || 'Call'})\n`;
        if (edge.description) {
          text += `  - Description: ${edge.description}\n`;
        }
        if (edge.properties && Object.keys(edge.properties).length > 0) {
          text += `  - Metadata: ${JSON.stringify(edge.properties)}\n`;
        }
      });
    }

    if (logicalData.sequences.length > 0) {
      text += `\n**${language === 'tr' ? 'Etkileşim Akışı' : 'Interaction Flow'}:**\n`;

      const sortedSeqs = [...logicalData.sequences].sort((a, b) => a.stepNumber - b.stepNumber);

      sortedSeqs.forEach(seq => {
        const edge = logicalData.edges.find(e => e.id === seq.edgeId);
        if (!edge) return;

        const sourceNode = logicalData.nodes.find(n => n.id === edge.sourceId);
        const targetNode = logicalData.nodes.find(n => n.id === edge.targetId);
        const sourceName = sourceNode ? sourceNode.name : edge.sourceId;
        const targetName = targetNode ? targetNode.name : edge.targetId;

        const syncType = seq.isAsync ? (language === 'tr' ? 'Asenkron' : 'Asynchronous') : (language === 'tr' ? 'Senkron' : 'Synchronous');
        const directionStr = `\`${sourceName}\` → \`${targetName}\`` + (seq.isRoundTrip ? ' ↔' : '');

        text += `${seq.stepNumber}. [${syncType}] ${directionStr} (Protocol: ${edge.protocol || 'Call'})\n`;
        
        if (edge.description) {
          text += `   - Description: ${edge.description}\n`;
        }

        const timing = visualData.timelines?.[seq.id];
        if (timing?.internalProcess?.text) {
          text += `   - Node \`${targetName}\` internal process: "${timing.internalProcess.text}"\n`;
        }
      });
    }

    setAiText(text);
    setShowAiModal(true);
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-3 z-25 select-none shrink-0 transition-colors duration-300 font-sans gap-2">

      {/* ── Left Section ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Logo */}
        <div
          onClick={handleBackToWelcome}
          className="flex items-center gap-1.5 cursor-pointer group shrink-0"
          title={language === 'tr' ? 'Giriş ekranına dön' : 'Go back to welcome screen'}
        >
          <img src="pwa-icon.png" className="h-6 w-6 transition-transform group-hover:scale-105" />
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-200 bg-clip-text text-transparent hidden lg:inline">
            {t.welcomeTitle}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Workspace pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group cursor-pointer"
          title={currentWorkspace?.path}
          onClick={() => setShowSettings(true)}
        >
          <Database className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 max-w-[80px] truncate hidden md:inline">
            {currentWorkspace?.name}
          </span>
          <Settings className="w-3 h-3 text-slate-400 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
        </div>

        {/* Save status – tiny dot only on small, full pill on md+ */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isSaving ? (
            <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
          ) : isDirty ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold hidden md:inline">
                {language === 'tr' ? 'Kaydedilmedi' : 'Unsaved'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); manualSave(); }}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                title={language === 'tr' ? 'Şimdi kaydet' : 'Save now'}
              >
                <Save className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold hidden md:inline">
                {language === 'tr' ? 'Kaydedildi' : 'Saved'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Center Section: View Switcher ── */}
      <div className="flex-1 flex justify-center min-w-0">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg select-none">
          <button
            onClick={() => viewMode !== 'freeform' && toggleViewMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
              viewMode === 'freeform'
                ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
            title={language === 'tr' ? 'Serbest Stil Görünümü' : 'Free Style View'}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">{language === 'tr' ? 'Serbest Stil' : 'Free Style'}</span>
          </button>
          <button
            onClick={() => viewMode !== 'sequence' && toggleViewMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
              viewMode === 'sequence'
                ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
            title={language === 'tr' ? 'Sequence Diagram Görünümü' : 'Sequence Diagram View'}
          >
            <ListOrdered className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">{language === 'tr' ? 'Sequence' : 'Sequence'}</span>
          </button>
        </div>
      </div>

      {/* ── Right Section ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Panel toggles */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded-md cursor-pointer transition-colors ${leftSidebarOpen
              ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
            title={language === 'tr' ? 'Sol panel' : 'Left panel'}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleTimeline}
            className={`p-1.5 rounded-md cursor-pointer transition-colors ${timelineOpen
              ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
            title={language === 'tr' ? 'Zaman çizelgesi' : 'Timeline'}
          >
            <PanelBottom className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded-md cursor-pointer transition-colors ${rightSidebarOpen
              ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
            title={language === 'tr' ? 'Sağ panel' : 'Right panel'}
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Freeform-only controls */}
        {currentView === 'diagram' && !isReadOnly && (
          <>
            <CanvasBgSelector />

            {/* Undo / Redo */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
              <button
                onClick={undo}
                disabled={pastStates.length === 0}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={language === 'tr' ? 'Geri Al (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={redo}
                disabled={futureStates.length === 0}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={language === 'tr' ? 'İleri Al (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Layout dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
                title={language === 'tr' ? 'Otomatik Düzenle' : 'Auto-Layout'}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              {showLayoutMenu && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                  <button
                    onClick={() => { applyAutoLayout('TB'); setShowLayoutMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {language === 'tr' ? 'Yukarıdan Aşağıya' : 'Top to Bottom'}
                  </button>
                  <button
                    onClick={() => { applyAutoLayout('LR'); setShowLayoutMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {language === 'tr' ? 'Soldan Sağa' : 'Left to Right'}
                  </button>
                </div>
              )}
            </div>

            {/* Copy for AI */}
            <button
              onClick={handleCopyForAi}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
              title={language === 'tr' ? 'AI İçin Kopyala' : 'Copy for AI'}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            {/* Export & Share */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs cursor-pointer font-semibold transition-all"
                title={language === 'tr' ? 'Dışa Aktar / Paylaş' : 'Export / Share'}
              >
                <FileDown className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{language === 'tr' ? 'Dışa Aktar' : 'Export'}</span>
                <ChevronDown className="w-3 h-3 opacity-80" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                  <button
                    onClick={() => { handleExportPng(); setShowExportMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {language === 'tr' ? 'Görüntü (PNG)' : 'Image (PNG)'}
                  </button>
                  <button
                    onClick={() => { setShowGifConfig(true); setShowExportMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center justify-between"
                  >
                    {language === 'tr' ? 'Animasyon (GIF)' : 'Animation (GIF)'}
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-bold">New</span>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                  <button
                    onClick={() => { handleExportHtml(); setShowExportMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {language === 'tr' ? 'Etkileşimli Oynatıcı (HTML)' : 'Interactive Player (HTML)'}
                  </button>

                  {!isReadOnly && (
                    <>
                      <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                      <button
                        onClick={() => { setShowShareModal(true); setShowExportMenu(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-2"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        {language === 'tr' ? 'Diyagramı Paylaş (URL)' : 'Share Diagram (URL)'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Google Drive */}
        {import.meta.env.VITE_ENABLE_GOOGLE_SYNC === 'true' && (
          !googleUser ? (
            <button
              onClick={() => GoogleDriveService.signIn()}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
              title={language === 'tr' ? 'Google ile giriş yap' : 'Login with Google'}
            >
              <Cloud className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => GoogleDriveService.uploadToDrive()}
              disabled={syncState === 'syncing' || (!hasUnsyncedChanges && syncState !== 'error')}
              className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs cursor-pointer font-semibold transition-colors border ${
                syncState === 'syncing'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                  : syncState === 'error'
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50'
                  : hasUnsyncedChanges
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800/50'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 cursor-default opacity-80'
              }`}
              title={
                syncState === 'syncing' ? 'Syncing...' :
                syncState === 'error' ? 'Click to retry' :
                hasUnsyncedChanges ? 'Push to Drive' :
                'Synced to Drive'
              }
            >
              {syncState === 'syncing' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : syncState === 'error' ? (
                <AlertCircle className="w-3 h-3" />
              ) : hasUnsyncedChanges ? (
                <CloudUpload className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              <span className="hidden xl:inline">
                {syncState === 'syncing' ? 'Syncing...' :
                 syncState === 'error' ? 'Retry' :
                 hasUnsyncedChanges ? 'Push' :
                 'Synced'}
              </span>
            </button>
          )
        )}

        {/* Close */}
        <button
          onClick={handleBackToWelcome}
          className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition-colors"
          title={t.close}
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Export Progress Modal */}
      {exportProgress !== null && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[99999]">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 text-center">
              {language === 'tr' ? 'GIF Oluşturuluyor...' : 'Generating GIF...'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
              {language === 'tr'
                ? 'Lütfen bekleyin, kareler oluşturulup birleştiriliyor. Bu işlem bilgisayarınızın performansına göre birkaç saniye sürebilir.'
                : 'Please wait, frames are being rendered and encoded. This may take a few seconds depending on your computer performance.'}
            </p>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-2 overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className="bg-indigo-500 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {exportProgress}%
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* GIF Export Settings Modal */}
      <GifExportModal
        isOpen={showGifConfig}
        onClose={() => setShowGifConfig(false)}
        onExport={handleExportGif}
      />

      {/* AI Copy Modal */}
      <AiCopyModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        aiText={aiText}
        setAiText={setAiText}
      />

      {showShareModal && (
        <ShareModal onClose={() => setShowShareModal(false)} />
      )}
    </header>
  );
};
