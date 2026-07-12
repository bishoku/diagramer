import React, { useCallback, useState } from 'react';
import { 
  Boxes, Plus, Download, Upload, Edit, Trash2, Search, X
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { open, save } from '@tauri-apps/plugin-dialog';
import { StorageService, isTauri } from '../../services/storage';
import { CustomComponentTemplate } from '../../types';
import { CustomSvgRenderer } from '../canvas/CustomSvgRenderer';
import { NodeRegistry } from '../../registry/NodeRegistry';

export const SidebarLeft: React.FC = () => {
  const language = useAppStore((s) => s.language);
  const startDrag = useAppStore((s) => s.startDrag);
  const pendingDrop = useAppStore((s) => s.pendingDrop);
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen);
  
  const libraryComponentsList = useAppStore((s: any) => s.libraryComponents);
  const setView = useAppStore((s: any) => s.setView);
  const setActiveComponent = useAppStore((s: any) => s.setActiveComponent);
  const deleteComponentFromLibrary = useAppStore((s: any) => s.deleteComponentFromLibrary);

  const [searchQuery, setSearchQuery] = useState('');

  const libraryComponents = Object.values(NodeRegistry)
    .filter(def => def.category !== 'custom')
    .map(def => ({
      type: def.type,
      name: language === 'tr' ? def.name.tr : def.name.en,
      defaultName: def.defaultName,
      icon: React.cloneElement(def.icon as React.ReactElement, { className: `w-4 h-4 ${def.colorClass}` } as any)
    }));

  const handleMouseDown = useCallback((type: string, defaultName: string) => {
    console.log('[SidebarLeft] mouseDown → startDrag:', type, defaultName);
    startDrag(type, defaultName);
  }, [startDrag]);

  const handleCreateNewCustomComponent = () => {
    const compId = `custom-comp-${Date.now()}`;
    const newComp: CustomComponentTemplate = {
      componentId: compId,
      name: language === 'tr' ? 'Özel Bileşen' : 'Custom Component',
      category: 'Custom',
      dimensions: { width: 200, height: 200 },
      layers: [],
      createdAt: new Date().toISOString()
    };
    setActiveComponent(newComp);
    setView('studio');
  };

  const processImportedContent = async (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.componentId && parsed.name && Array.isArray(parsed.layers)) {
        const dirPath = await StorageService.get_global_components_dir();
        const targetPath = `${dirPath}/${parsed.componentId}.json`;
        await StorageService.save_text_file(targetPath, content);
        const state = useAppStore.getState() as any;
        await state.loadLibrary();
      } else {
        alert('Invalid component file structure.');
      }
    } catch (err) {
      console.error('Import parse error:', err);
      alert('Failed to parse component file.');
    }
  };

  const handleImportComponent = async () => {
    try {
      if (isTauri()) {
        const selected = await open({
          directory: false,
          multiple: false,
          filters: [{ name: 'JSON Component', extensions: ['json'] }],
          title: language === 'tr' ? 'Bileşen Dosyası Seç' : 'Choose Component File'
        });
        if (selected && typeof selected === 'string') {
          const content = await StorageService.read_text_file(selected);
          await processImportedContent(content);
        }
      } else {
        // Web Implementation: hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (re) => {
            if (re.target?.result) {
              await processImportedContent(re.target.result as string);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (err) {
      console.error('Import error:', err);
    }
  };

  const handleExportComponent = async (comp: CustomComponentTemplate) => {
    try {
      const content = JSON.stringify(comp, null, 2);
      if (isTauri()) {
        const savePath = await save({
          defaultPath: `${comp.name}.json`,
          filters: [{ name: 'JSON Component', extensions: ['json'] }],
          title: language === 'tr' ? 'Bileşeni Kaydet' : 'Save Component File'
        });
        if (savePath) {
          await StorageService.save_text_file(savePath, content);
        }
      } else {
        // Web Implementation: download via blob
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${comp.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleEditComponent = (comp: CustomComponentTemplate) => {
    setActiveComponent(comp);
    setView('studio');
  };

  const handleDeleteComponent = async (compId: string) => {
    const confirmMsg = language === 'tr' 
      ? 'Bu özel bileşeni silmek istediğinize emin misiniz?' 
      : 'Are you sure you want to delete this custom component?';
    if (window.confirm(confirmMsg)) {
      await deleteComponentFromLibrary(compId);
    }
  };

  const filteredStandard = libraryComponents.filter(comp =>
    comp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustom = libraryComponentsList.filter((comp: CustomComponentTemplate) =>
    comp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className={`border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md flex flex-col h-full select-none shrink-0 z-20 transition-all duration-300 ease-in-out overflow-hidden ${
      leftSidebarOpen ? 'w-[260px]' : 'w-0 border-r-0'
    }`}>
      <div className="p-3 border-b border-slate-200 dark:border-slate-850 flex flex-col gap-2 shrink-0 bg-slate-50/20 dark:bg-slate-900/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
            {language === 'tr' ? 'Bileşen Kütüphanesi' : 'Component Library'}
          </span>
          <Boxes className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </div>
        
        <div className="relative flex items-center mt-0.5">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder={language === 'tr' ? 'Bileşen ara...' : 'Search components...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-950 dark:hover:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-medium transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-2">
          <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
            {language === 'tr' ? 'Varsayılan Bileşenler' : 'Standard Components'}
          </div>
          
          <div className="space-y-2">
            {filteredStandard.length === 0 ? (
              <div className="p-3 text-[10px] text-slate-400 dark:text-slate-500 italic text-center">
                {language === 'tr' ? 'Eşleşen standart bileşen yok.' : 'No matching standard components.'}
              </div>
            ) : (
              filteredStandard.map((comp) => (
                <div
                  key={comp.type}
                  onMouseDown={() => handleMouseDown(comp.type, comp.defaultName)}
                  className={`p-2.5 border rounded-xl flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all group
                    ${pendingDrop?.type === comp.type 
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-500/40 shadow-md ring-2 ring-indigo-500/30' 
                      : 'bg-white dark:bg-slate-955 border-slate-200/60 dark:border-slate-850 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 hover:shadow-sm hover:scale-[0.99]'
                    }`}
                >
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform">
                    {comp.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {comp.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="h-px bg-slate-200/60 dark:bg-slate-800" />

        <div className="space-y-2">
          <div className="flex items-center justify-between pl-1">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {language === 'tr' ? 'Özel Tasarımlar' : 'Custom Components'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleImportComponent}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-650 cursor-pointer"
                title={language === 'tr' ? 'Bileşen İçe Aktar (.json)' : 'Import Component (.json)'}
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCreateNewCustomComponent}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                title={language === 'tr' ? 'Yeni Tasarla' : 'Design New'}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredCustom.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl text-center text-[10px] text-slate-400 dark:text-slate-500 italic leading-relaxed">
                {searchQuery 
                  ? (language === 'tr' ? 'Eşleşen özel tasarım bulunamadı.' : 'No matching custom components found.')
                  : (language === 'tr' 
                      ? 'Henüz özel bileşen yok. Tasarlamak için "+" ikonuna tıklayın.' 
                      : 'No custom components yet. Click "+" to design.')}
              </div>
            ) : (
              filteredCustom.map((comp: CustomComponentTemplate) => (
                <div
                  key={comp.componentId}
                  onMouseDown={() => startDrag(comp.componentId, comp.name)}
                  className={`p-2.5 border rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing transition-all group
                    ${pendingDrop?.type === comp.componentId 
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-500/40 shadow-md ring-2 ring-indigo-500/30' 
                      : 'bg-white dark:bg-slate-955 border-slate-200/60 dark:border-slate-850 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 hover:shadow-sm hover:scale-[0.99]'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 group-hover:scale-105 transition-all overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <CustomSvgRenderer 
                        layers={comp.layers} 
                        width={comp.dimensions.width} 
                        height={comp.dimensions.height} 
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-350 truncate">
                      {comp.name}
                    </span>
                  </div>

                  <div 
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleEditComponent(comp)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 cursor-pointer"
                      title="Düzenle"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleExportComponent(comp)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 cursor-pointer"
                      title="Dışa Aktar"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteComponent(comp.componentId)}
                      className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
