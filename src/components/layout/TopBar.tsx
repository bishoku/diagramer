import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { 
  LogOut, Settings, Database, Cpu, Check, Globe, Moon, Sun, 
  PanelLeft, PanelRight, PanelBottom, 
  Undo, Redo, FileDown, Copy, Grid, ChevronDown, Save, Loader2
} from 'lucide-react';
import { translations } from '../../i18n/translations';
import { calculateSchedules } from '../../store/scheduler';
import { generateStandaloneHtml } from '../../utils/exportTemplate';
import { exportToPng, exportToGif } from '../../utils/exportMedia';
import { save } from '@tauri-apps/plugin-dialog';
import { StorageService, isTauri } from '../../services/storage';

export const TopBar: React.FC = () => {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const isDirty = useAppStore((s) => s.isDirty);
  const isSaving = useAppStore((s: any) => s.isSaving);
  const manualSave = useAppStore((s: any) => s.manualSave);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const language = useAppStore((s) => s.language);
  const theme = useAppStore((s) => s.theme);
  const maxSteps = useAppStore((s) => s.maxSteps);
  const changeLanguage = useAppStore((s) => s.changeLanguage);
  const changeTheme = useAppStore((s) => s.changeTheme);
  const changeMaxSteps = useAppStore((s: any) => s.changeMaxSteps);
  const saveWorkspaceDetails = useAppStore((s) => s.saveWorkspaceDetails);
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

  const t = translations[language];

  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState(currentWorkspace?.name || '');
  const [editDesc, setEditDesc] = useState(currentWorkspace?.description || '');
  const [editMaxSteps, setEditMaxSteps] = useState(maxSteps);

  useEffect(() => {
    if (showSettings) {
      setEditName(currentWorkspace?.name || '');
      setEditDesc(currentWorkspace?.description || '');
      setEditMaxSteps(maxSteps);
    }
  }, [showSettings, currentWorkspace, maxSteps]);

  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  const handleBackToWelcome = () => {
    setWorkspace(null);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    saveWorkspaceDetails(editName.trim(), editDesc.trim());
    changeMaxSteps(Number(editMaxSteps) || 30);
    setShowSettings(false);
  };

  const handleExportHtml = async () => {
    try {
      const defaultName = `${currentWorkspace?.name || 'diagram'}_simulation.html`;
      const htmlContent = generateStandaloneHtml(logicalData, visualData, libraryComponents);

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
      await exportToPng('.react-flow__viewport', defaultName, language);
    } catch (err) {
      console.error('Error exporting PNG:', err);
      alert(language === 'tr' ? `PNG dışa aktarma hatası: ${err}` : `PNG Export error: ${err}`);
    }
  };

  const handleExportGif = async () => {
    try {
      setExportProgress(0);
      const defaultName = `${currentWorkspace?.name || 'diagram'}.gif`;
      const schedules = calculateSchedules(logicalData.sequences, visualData.timelines, logicalData.edges, logicalData.nodes) as Record<string, { start: number, end: number }>;
      const schedValues = Object.values(schedules);
      const maxDuration = schedValues.length > 0 ? Math.max(...schedValues.map(s => s.end)) + 500 : 2000;

      await exportToGif('.react-flow', maxDuration, defaultName, language, (progress) => {
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
      ? 'Aşağıdaki sistem mimarisi için altyapı kodlarını (Terraform/Pulumi/Docker Compose) üret veya mimariyi analiz et:' 
      : 'Generate infrastructure code (Terraform/Pulumi/Docker Compose) or analyze the following system architecture:'}\n\n`;

    text += `**${language === 'tr' ? 'Bileşenler' : 'Components'}:**\n`;
    logicalData.nodes.forEach(node => {
      const customTemplate = libraryComponents.find(c => c.componentId === node.type);
      const category = customTemplate ? customTemplate.category : node.type;
      text += `- \`${node.name}\` (Type: ${category})\n`;
    });

    if (logicalData.edges.length > 0) {
      text += `\n**${language === 'tr' ? 'Bağlantılar' : 'Connections'}:**\n`;
      logicalData.edges.forEach(edge => {
        text += `- \`${edge.from}\` → \`${edge.to}\` (Protocol: ${edge.protocol || 'Call'})\n`;
      });
    }

    if (logicalData.sequences.length > 0) {
      text += `\n**${language === 'tr' ? 'Etkileşim Akışı (Zaman Tüneli)' : 'Interaction Flow (Timeline)'}:**\n`;
      
      const schedules = calculateSchedules(logicalData.sequences, visualData.timelines, logicalData.edges, logicalData.nodes);
      const sortedSchedules = Object.entries(schedules)
        .map(([id, range]) => ({ id, start: range.start, end: range.end }))
        .sort((a, b) => a.start - b.start);
      
      sortedSchedules.forEach(s => {
        const seq = logicalData.sequences.find(q => q.id === s.id);
        const edge = logicalData.edges.find(e => e.id === seq?.edgeId);
        if (!seq || !edge) return;

        const syncType = seq.isAsync ? (language === 'tr' ? 'Asenkron' : 'Asynchronous') : (language === 'tr' ? 'Senkron' : 'Synchronous');
        const directionStr = seq.direction === 'reverse' 
          ? `\`${edge.to}\` → \`${edge.from}\`` 
          : `\`${edge.from}\` → \`${edge.to}\``;

        text += `${seq.stepNumber}. [${syncType}] ${directionStr} (Protocol: ${edge.protocol || 'Call'}, Timing: ${(s.start/1000).toFixed(2)}s - ${(s.end/1000).toFixed(2)}s)\n`;
        
        const timing = visualData.timelines[s.id];
        if (timing?.internalProcess?.text) {
          text += `   - Node \`${seq.direction === 'reverse' ? edge.from : edge.to}\` internal process: "${timing.internalProcess.text}" (${(timing.internalProcess.duration/1000).toFixed(2)}s)\n`;
        }
      });
    }

    try {
      await navigator.clipboard.writeText(text);
      alert(language === 'tr' ? 'Mimari verisi AI için kopyalandı!' : 'Architecture data copied to clipboard for AI!');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between px-4 z-25 select-none shrink-0 relative transition-colors duration-300">
      
      {/* Left Section: Branding & Workspace Name */}
      <div className="flex items-center gap-4">
        <div 
          onClick={handleBackToWelcome} 
          className="flex items-center gap-1.5 cursor-pointer" 
          title={language === 'tr' ? 'Giriş ekranına dön' : 'Go back to welcome screen'}
        >
          <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-200 dark:to-slate-200 bg-clip-text text-transparent">
            {t.welcomeTitle}
          </span>
        </div>
        
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">
            {currentWorkspace?.name}
          </span>
          
          <button
            onClick={() => {
              setEditName(currentWorkspace?.name || '');
              setEditDesc(currentWorkspace?.description || '');
              setShowSettings(true);
            }}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 rounded cursor-pointer transition-colors mr-1"
            title={t.settings}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Auto-Save Indicator Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100/80 dark:bg-slate-900/50 rounded-full border border-slate-200 dark:border-slate-800 select-none shrink-0">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
                  {language === 'tr' ? 'Kaydediliyor...' : 'Saving...'}
                </span>
              </>
            ) : isDirty ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">{t.unsavedChanges}</span>
                <button
                  onClick={() => manualSave()}
                  className="ml-0.5 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  title={language === 'tr' ? 'Şimdi kaydet' : 'Save now'}
                >
                  <Save className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-650 dark:text-slate-400 font-semibold">{t.saved}</span>
              </>
            )}
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-1">
          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded cursor-pointer transition-colors ${
              leftSidebarOpen 
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' 
                : 'text-slate-400 hover:bg-slate-100 dark:text-slate-550 dark:hover:bg-slate-800'
            }`}
            title={language === 'tr' ? 'Sol paneli gizle/göster' : 'Toggle left sidebar'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <button
            onClick={toggleTimeline}
            className={`p-1.5 rounded cursor-pointer transition-colors ${
              timelineOpen 
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' 
                : 'text-slate-400 hover:bg-slate-100 dark:text-slate-550 dark:hover:bg-slate-800'
            }`}
            title={language === 'tr' ? 'Zaman çizelgesini gizle/göster' : 'Toggle timeline'}
          >
            <PanelBottom className="w-4 h-4" />
          </button>
          
          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded cursor-pointer transition-colors ${
              rightSidebarOpen 
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' 
                : 'text-slate-400 hover:bg-slate-100 dark:text-slate-550 dark:hover:bg-slate-800'
            }`}
            title={language === 'tr' ? 'Sağ paneli gizle/göster' : 'Toggle right sidebar'}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </div>



      {/* Right Section: Actions */}
      <div className="flex items-center gap-3">
        {/* Phase 6 Actions (Only visible in Diagram view) */}
        {currentView === 'diagram' && (
          <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3 mr-2 relative">
            {/* Undo/Redo Buttons */}
            <button
              onClick={undo}
              disabled={pastStates.length === 0}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={language === 'tr' ? 'Geri Al (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={futureStates.length === 0}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={language === 'tr' ? 'İleri Al (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
            >
              <Redo className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800/80 mx-0.5" />

            {/* Auto-Layout Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-850 rounded-lg text-xs cursor-pointer font-semibold transition-all"
                title={language === 'tr' ? 'Otomatik Düzenle (Dagre)' : 'Auto-Layout (Dagre)'}
              >
                <Grid className="w-3.5 h-3.5 text-indigo-500" />
                <span>{language === 'tr' ? 'Düzenle' : 'Layout'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showLayoutMenu && (
                <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                  <button
                    onClick={() => {
                      applyAutoLayout('TB');
                      setShowLayoutMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {language === 'tr' ? 'Yukarıdan Aşağıya (TB)' : 'Top to Bottom (TB)'}
                  </button>
                  <button
                    onClick={() => {
                      applyAutoLayout('LR');
                      setShowLayoutMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {language === 'tr' ? 'Soldan Sağa (LR)' : 'Left to Right (LR)'}
                  </button>
                </div>
              )}
            </div>

            {/* Export Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-lg text-xs cursor-pointer font-semibold transition-colors"
                title={language === 'tr' ? 'Dışa Aktar' : 'Export'}
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Dışa Aktar' : 'Export'}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                  <button
                    onClick={() => {
                      handleExportPng();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {language === 'tr' ? 'Görüntü (PNG)' : 'Image (PNG)'}
                  </button>
                  <button
                    onClick={() => {
                      handleExportGif();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center justify-between"
                  >
                    {language === 'tr' ? 'Animasyon (GIF)' : 'Animation (GIF)'}
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded-md">New</span>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      handleExportHtml();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {language === 'tr' ? 'Etkileşimli Oynatıcı (HTML)' : 'Interactive Player (HTML)'}
                  </button>
                </div>
              )}
            </div>

            {/* Copy Logical data for AI */}
            <button
              onClick={handleCopyForAi}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-850 rounded-lg text-xs cursor-pointer font-semibold transition-colors"
              title={language === 'tr' ? 'Mantıksal Akışı AI İçin Kopyala' : 'Copy Logical for AI'}
            >
              <Copy className="w-3.5 h-3.5 text-indigo-500" />
              <span>{language === 'tr' ? 'AI Kopyala' : 'Copy for AI'}</span>
            </button>
          </div>
        )}

        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:block truncate max-w-[200px]" title={currentWorkspace?.path}>
          {currentWorkspace?.path}
        </div>
        
        <button
          onClick={handleBackToWelcome}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.close}</span>
        </button>
      </div>

      {/* Settings Modal (Includes Workspace and App Preferences) */}
      {showSettings && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all">
            
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              {t.editWorkspaceDetails}
            </h3>
            
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {t.workspaceName}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-55 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500/80"
                  maxLength={50}
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {t.description}
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500/80 resize-none"
                  maxLength={200}
                />
              </div>

              {/* Application Preferences Section inside Modal */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t.appPrefTitle}
                </h4>
                
                {/* Language Select */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    {t.language}:
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => changeLanguage('tr')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                        language === 'tr'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t.langTr}
                    </button>
                    <button
                      type="button"
                      onClick={() => changeLanguage('en')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                        language === 'en'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t.langEn}
                    </button>
                  </div>
                </div>

                {/* Theme Select */}
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    {t.theme}:
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => changeTheme('dark')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                        theme === 'dark'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t.themeDark}
                    </button>
                    <button
                      type="button"
                      onClick={() => changeTheme('light')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                        theme === 'light'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t.themeLight}
                    </button>
                  </div>
                </div>

                {/* Max Steps Config */}
                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Grid className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    {t.maxStepsSetting}:
                  </span>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={editMaxSteps}
                    onChange={(e) => setEditMaxSteps(Math.max(5, Math.min(100, Number(e.target.value) || 5)))}
                    className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 text-xs font-bold text-center focus:outline-none focus:border-indigo-500/80"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
    </header>
  );
};
