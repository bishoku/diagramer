import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DiagramCanvas } from '../canvas/DiagramCanvas';
import { TimelinePanel } from './TimelinePanel';
import { X, Save, Filter, Activity, Server, Database, ArrowRightLeft } from 'lucide-react';
import { availableAdapters } from '../../adapters';

export const ImportPreviewLayout: React.FC = () => {
  const setWorkspace = useAppStore(s => s.setWorkspace);
  const importRawData = useAppStore(s => s.importRawData);
  const importAdapterId = useAppStore(s => s.importAdapterId);
  const loadImportPreview = useAppStore(s => s.loadImportPreview);
  const cloneSharedToWorkspace = useAppStore(s => s.cloneSharedToWorkspace);
  const leftSidebarOpen = useAppStore(s => s.leftSidebarOpen);
  const setViewMode = useAppStore(s => s.setViewMode);
  const setImportState = useAppStore(s => s.setImportState);
  const timelineHeight = useAppStore((s) => s.timelineHeight);
  const timelineOpen = useAppStore((s: any) => s.timelineOpen);

  const [filters, setFilters] = useState<string[]>(['http', 'sql', 'grpc']);
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  // Handle re-parsing when filters change
  useEffect(() => {
    if (!importRawData || !importAdapterId) return;
    
    const adapter = availableAdapters.find(a => a.id === importAdapterId);
    if (!adapter) {
      console.error(`Adapter not found: ${importAdapterId}`);
      return;
    }

    const reParse = async () => {
      setLoading(true);
      try {
        const result = await adapter.parse(importRawData, { types: filters });
        loadImportPreview(result.logicalData, result.visualData);
      } catch (err) {
        console.error("Failed to parse trace with filters", err);
      } finally {
        setLoading(false);
      }
    };

    reParse();
  }, [filters, importRawData, importAdapterId]); // intentionally omitting loadImportPreview

  const handleToggleFilter = (type: string) => {
    setFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

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

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Sidebar (Filters) */}
        {leftSidebarOpen && (
          <aside className="w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] dark:shadow-none z-10 transition-all duration-300 ease-in-out">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                Data Filters
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <label onClick={() => handleToggleFilter('http')} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${filters.includes('http') ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`}>
                  {filters.includes('http') && <Server className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">HTTP Spans</span>
              </label>

              <label onClick={() => handleToggleFilter('sql')} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${filters.includes('sql') ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`}>
                  {filters.includes('sql') && <Database className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">SQL Spans</span>
              </label>

              <label onClick={() => handleToggleFilter('grpc')} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${filters.includes('grpc') ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`}>
                  {filters.includes('grpc') && <ArrowRightLeft className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">gRPC Spans</span>
              </label>
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950" style={{ minHeight: 0 }}>
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
            <div className="h-1 bg-slate-200/60 hover:h-1.5 hover:bg-indigo-500 dark:bg-slate-800 dark:hover:bg-indigo-500 cursor-ns-resize transition-all duration-150 relative z-30 flex-shrink-0" />
          )}

          {/* Timeline panel — constrained height, does NOT grow */}
          <div
            style={{ height: timelineOpen ? timelineHeight : 'auto' }}
            className="border-t border-slate-200 dark:border-slate-800 z-10 shrink-0 select-none overflow-hidden"
          >
            <TimelinePanel />
          </div>
        </main>
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
