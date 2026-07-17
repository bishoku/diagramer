import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DiagramCanvas } from '../canvas/DiagramCanvas';
import { TimelinePanel } from './TimelinePanel';
import { X, Save, Activity } from 'lucide-react';
import { availableAdapters } from '../../adapters';

import { FilterAST, AttributeMetadata } from '../../adapters/types';
import { TraceFilterBuilder } from '../filters/TraceFilterBuilder';

export const ImportPreviewLayout: React.FC = () => {
  const setWorkspace = useAppStore(s => s.setWorkspace);
  const importRawData = useAppStore(s => s.importRawData);
  const importAdapterId = useAppStore(s => s.importAdapterId);
  const loadImportPreview = useAppStore(s => s.loadImportPreview);
  const cloneSharedToWorkspace = useAppStore(s => s.cloneSharedToWorkspace);
  const setViewMode = useAppStore(s => s.setViewMode);
  const setImportState = useAppStore(s => s.setImportState);
  const timelineHeight = useAppStore((s) => s.timelineHeight);
  const timelineOpen = useAppStore((s: any) => s.timelineOpen);
  const setTimelineHeight = useAppStore((s) => s.setTimelineHeight);

  const [filterAst, setFilterAst] = useState<FilterAST | null>(null);
  const [attributes, setAttributes] = useState<AttributeMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  const [isResizing, setIsResizing] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);

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
        const result = await adapter.parse(importRawData, { ast: filterAst || undefined });
        loadImportPreview(result.logicalData, result.visualData);
      } catch (err) {
        console.error("Failed to parse trace with filters", err);
      } finally {
        setLoading(false);
      }
    };

    // Add a tiny debounce to prevent rapid re-parsing when typing in code mode
    const timeout = setTimeout(() => {
      reParse();
    }, 300);

    return () => clearTimeout(timeout);
  }, [filterAst, importRawData, importAdapterId]); // intentionally omitting loadImportPreview

  const handleCancel = () => {
    setViewMode('freeform');
    setImportState(null, null);

    setWorkspace(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    
    setLoading(true);
    try {
      await cloneSharedToWorkspace(workspaceName.trim());
      setViewMode('freeform');
      setImportState(null, null);
    } catch (err) {
      console.error("Failed to save workspace", err);
    } finally {
      setLoading(false);
      setShowSaveModal(false);
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
            onClick={() => setShowSaveModal(true)}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Add to Workspace
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <TraceFilterBuilder 
        attributes={attributes} 
        onChange={(ast) => setFilterAst(ast)} 
        initialAst={filterAst}
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

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl transition-all animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Save className="w-5 h-5 text-indigo-500" />
              Add to Workspace
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={loading}
                  maxLength={50}
                  autoFocus
                  placeholder="e.g. Production Trace Analysis"
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-slate-100 font-semibold rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Create & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
