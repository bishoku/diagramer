import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DiagramCanvas } from '../canvas/DiagramCanvas';
import { TimelinePanel } from './TimelinePanel';
import { X, Save, Activity } from 'lucide-react';
import { availableAdapters } from '../../adapters';
import { translations } from '../../i18n/translations';
import { WorkspacePickerModal } from './WorkspacePickerModal';

import { FilterAST, AttributeMetadata, NodeTypeMappingRule } from '../../adapters/types';
import { ActiveFiltersBar } from '../filters/ActiveFiltersBar';
import { AttributeSidebar } from '../filters/AttributeSidebar';
import { NodeTypeMapper } from '../filters/NodeTypeMapper';

export const ImportPreviewLayout: React.FC = () => {
  const setWorkspace = useAppStore(s => s.setWorkspace);
  const importRawData = useAppStore(s => s.importRawData);
  const importAdapterId = useAppStore(s => s.importAdapterId);
  const loadImportPreview = useAppStore(s => s.loadImportPreview);
  const setViewMode = useAppStore(s => s.setViewMode);
  const setImportState = useAppStore(s => s.setImportState);
  const timelineHeight = useAppStore((s) => s.timelineHeight);
  const timelineOpen = useAppStore((s: any) => s.timelineOpen);
  const setTimelineHeight = useAppStore((s) => s.setTimelineHeight);

  const loadWorkspace = useAppStore(s => s.loadWorkspace);
  const openConfirm = useAppStore(s => s.openConfirm);
  const language = useAppStore(s => s.language);
  const fetchRecentWorkspaces = useAppStore(s => s.fetchRecentWorkspaces);
  const importPreviewToWorkspace = useAppStore(s => s.importPreviewToWorkspace);
  const importPreviewToNewWorkspace = useAppStore(s => s.importPreviewToNewWorkspace);

  const [filterAst, setFilterAst] = useState<FilterAST | null>(null);
  const [attributes, setAttributes] = useState<AttributeMetadata[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [nodeTypeMappings, setNodeTypeMappings] = useState<NodeTypeMappingRule[]>([]);
  const [activeTab, setActiveTab] = useState<'filters' | 'mapping'>('filters');
  const [simulationMultiplier, setSimulationMultiplier] = useState<number>(1);
  
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [isResizing, setIsResizing] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);

  const t = translations[language];

  useEffect(() => {
    fetchRecentWorkspaces();
  }, [fetchRecentWorkspaces]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newHeight = window.innerHeight - e.clientY;
    const clampedHeight = Math.min(Math.max(140, newHeight), window.innerHeight * 0.7);
    setTimelineHeight(clampedHeight);
  }, [isResizing, setTimelineHeight]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Extract metadata when data loads
  useEffect(() => {
    if (!importRawData || !importAdapterId) return;
    
    const adapter = availableAdapters.find(a => a.id === importAdapterId);
    if (!adapter) return;

    const extract = async () => {
      if (adapter.extractMetadata) {
        try {
          const meta = await adapter.extractMetadata(importRawData);
          setAttributes(meta.attributes);
        } catch (err) {
          console.error("Failed to extract metadata", err);
        }
      }
    };

    extract();
  }, [importRawData, importAdapterId]);

  // Handle re-parsing when filters change
  useEffect(() => {
    if (!importRawData || !importAdapterId) return;
    
    const adapter = availableAdapters.find(a => a.id === importAdapterId);
    if (!adapter) return;

    const reParse = async () => {
      setLoading(true);
      try {
        const result = await adapter.parse(importRawData, { 
          ast: filterAst || undefined,
          nodeTypeMappings: nodeTypeMappings.length > 0 ? nodeTypeMappings : undefined,
          simulationMultiplier
        });
        loadImportPreview(result.logicalData, result.visualData);
      } catch (err) {
        console.error("Failed to parse trace with filters", err);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      reParse();
    }, 300);

    return () => clearTimeout(timeout);
  }, [filterAst, nodeTypeMappings, simulationMultiplier, importRawData, importAdapterId]); // intentionally omitting loadImportPreview

  const handleCancel = () => {
    setViewMode('freeform');
    setImportState(null, null);

    setWorkspace(null);
  };

  const handleSaveConfirm = async (
    targetWorkspacePath: string | null,
    _targetWorkspaceName: string,
    isNew: boolean,
    newWorkspaceName?: string,
    targetDiagramName?: string
  ) => {
    const finalDiagName = targetDiagramName || 'Imported Diagram';
    let path = targetWorkspacePath;
    let diagramId = '';

    setLoading(true);
    try {
      if (isNew && newWorkspaceName) {
        const result = await importPreviewToNewWorkspace(newWorkspaceName, finalDiagName);
        path = result.ws.path;
        diagramId = result.diagramId;
      } else if (targetWorkspacePath) {
        diagramId = await importPreviewToWorkspace(targetWorkspacePath, finalDiagName);
      }

      setPickerOpen(false);

      const confirmed = await openConfirm({
        title: t.goToWorkspace || 'Go to Workspace',
        message: t.goToWorkspaceQuestion || 'Would you like to go to the workspace?',
        type: 'info',
        confirmText: t.yes || 'Yes',
        cancelText: t.no || 'No'
      });

      if (confirmed && path && diagramId) {
        await loadWorkspace(path);
        const switchDiagram = useAppStore.getState().switchDiagram;
        await switchDiagram(diagramId);
        setViewMode('freeform');
        setImportState(null, null);
      } else {
        handleCancel();
      }
    } catch (err) {
      console.error("Failed to import preview to workspace", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300">
      
      {/* Top Bar */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h1 className="font-bold text-slate-800 dark:text-slate-100">Trace Import Preview</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={() => setPickerOpen(true)}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Add to Workspace
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('filters')}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'filters' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Filters
            </button>
            <button
              onClick={() => setActiveTab('mapping')}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'mapping' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Node Types
            </button>
          </div>
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'filters' ? (
              <AttributeSidebar
                attributes={attributes}
                selectedAttributes={selectedAttributes}
                onToggleAttribute={(key) => {
                  setSelectedAttributes(prev => 
                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                  );
                }}
              />
            ) : (
              <NodeTypeMapper
                attributes={attributes}
                mappings={nodeTypeMappings}
                onChange={setNodeTypeMappings}
              />
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Filter Bar */}
          <ActiveFiltersBar
            attributes={attributes}
            selectedAttributes={selectedAttributes}
            onChange={setFilterAst}
            onRemoveAttribute={(key) => setSelectedAttributes(prev => prev.filter(k => k !== key))}
            simulationMultiplier={simulationMultiplier}
            onMultiplierChange={setSimulationMultiplier}
          />

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Canvas — needs flex-1 + min-h-0 so React Flow fills remaining space */}
          <div className="flex-1 min-h-0 relative" style={{ overflow: 'hidden' }}>
            {loading && (
              <div className="absolute inset-0 z-50 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            )}
            <DiagramCanvas />
          </div>

          {/* Resizer splitter bar */}
          {timelineOpen && (
            <div
              ref={resizerRef}
              onMouseDown={handleMouseDown}
              className="h-1 bg-slate-200/60 hover:h-1.5 hover:bg-indigo-500 dark:bg-slate-800 dark:hover:bg-indigo-500 cursor-ns-resize transition-all duration-150 relative z-30 flex-shrink-0"
              title="Resize timeline"
            />
          )}

          {/* Timeline panel — constrained height, does NOT grow */}
          <div
            style={{ height: timelineOpen ? timelineHeight : 'auto' }}
            className="border-t border-slate-200 dark:border-slate-800 z-10 shrink-0 select-none overflow-hidden"
          >
            <TimelinePanel />
          </div>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <WorkspacePickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          mode="add"
          diagramName={importAdapterId ? `${availableAdapters.find(a => a.id === importAdapterId)?.name || 'Imported'} Diagram` : 'Imported Diagram'}
          onConfirm={handleSaveConfirm}
        />
      )}

    </div>
  );
};
