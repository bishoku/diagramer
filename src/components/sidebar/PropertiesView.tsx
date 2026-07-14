import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Settings, ChevronLeft, Save, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { HandleConfig, LogicalDiagram, VisualDiagram } from '../../types';
import { ParticleType } from '../../config/particles';
import { NodePropertiesForm, NodePropertiesFormRef } from './properties/NodePropertiesForm';
import { EdgePropertiesForm, EdgePropertiesFormRef } from './properties/EdgePropertiesForm';

interface PropertiesViewProps {
  /** Returns to SimulationPanel */
  onBack: () => void;
  onApplyNode: (
    id: string, name: string, type: string, theme: string,
    handles?: HandleConfig[], displayMode?: 'default' | 'icon-only',
    rotation?: number, customStyles?: any
  ) => void;
  onApplyEdge: (
    id: string, protocol: string, isAsync: boolean, duration: number, delay: number,
    tooltipText: string, tooltipDuration: number, description: string,
    particleType: ParticleType | undefined, showArrow: boolean, color: string,
    stepNumber: number, direction: 'forward' | 'reverse', isRoundTrip: boolean
  ) => void;
  onCancelEdge: () => void;
}

/**
 * PropertiesView — orchestration shell with live-preview support
 *
 * Responsibilities:
 *  - Mounts NodePropertiesForm or EdgePropertiesForm based on selection
 *  - Forwards every field change to the store immediately (live preview)
 *  - Shows "Cancel" button when the user has made unsaved changes (isDirty)
 *  - On Apply: records the pre-preview state to history, then commits
 *  - On Cancel: reverts the store to the original snapshot
 */
export const PropertiesView: React.FC<PropertiesViewProps> = ({
  onBack,
  onApplyNode,
  onApplyEdge,
  onCancelEdge,
}) => {
  const language = useAppStore((s) => s.language);
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const maxSteps = useAppStore((s) => s.maxSteps);
  const activeNode = useAppStore((s) => s.activeNodeProperties);
  const activeEdge = useAppStore((s) => s.activeEdgeProperties);

  // Store write actions for live preview
  const updateNodeDetails = useAppStore((s) => s.updateNodeDetails);
  const updateEdgeDetails = useAppStore((s) => s.updateEdgeDetails);
  const setSequenceStepOrder = useAppStore((s) => s.setSequenceStepOrder);
  const setSequenceStepDirection = useAppStore((s) => s.setSequenceStepDirection);
  const setSequenceStepRoundTrip = useAppStore((s) => s.setSequenceStepRoundTrip);
  const pushStateToHistory = useAppStore((s) => s.pushStateToHistory);

  // ── Snapshot of pre-preview state for undo and Cancel ───────────────────
  const [previewSnapshot, setPreviewSnapshot] = useState<{
    logicalData: LogicalDiagram;
    visualData: VisualDiagram;
  } | null>(null);

  // Capture snapshot when a new node/edge is selected
  useEffect(() => {
    if (activeNode || activeEdge) {
      setPreviewSnapshot({
        logicalData: JSON.parse(JSON.stringify(logicalData)),
        visualData: JSON.parse(JSON.stringify(visualData)),
      });
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNode?.id, activeEdge?.id]);

  // ── Dirty tracking ───────────────────────────────────────────────────────
  const [isDirty, setIsDirty] = useState(false);

  // ── Derived data ─────────────────────────────────────────────────────────
  const connectedHandleIds = useMemo(() => {
    if (!activeNode) return new Set<string>();
    const connected = new Set<string>();
    logicalData.edges.forEach((e) => {
      if (e.from === activeNode.id) connected.add(e.fromPort);
      if (e.to === activeNode.id) connected.add(e.toPort);
    });
    return connected;
  }, [activeNode, logicalData.edges]);

  const activeEdgeSeq = useMemo(() => {
    if (!activeEdge) return null;
    return logicalData.sequences.find((s) => s.edgeId === activeEdge.id) ?? null;
  }, [activeEdge, logicalData.sequences]);

  // ── Refs to form imperative handles ─────────────────────────────────────
  const nodeFormRef = useRef<NodePropertiesFormRef>(null);
  const edgeFormRef = useRef<EdgePropertiesFormRef>(null);

  // ── Live preview callbacks ───────────────────────────────────────────────

  /** Node: called on every field change (handles excluded — only applied on submit) */
  const handlePreviewNode = useCallback((
    id: string, name: string, type: string, theme: string,
    displayMode: 'default' | 'icon-only', rotation: number, customStyles: any
  ) => {
    updateNodeDetails(id, name, type, theme, undefined, displayMode, rotation, customStyles);
    setIsDirty(true);
  }, [updateNodeDetails]);

  /** Edge: called on every field change */
  const handlePreviewEdge = useCallback((
    id: string, protocol: string, isAsync: boolean, duration: number, delay: number,
    tooltipText: string, tooltipDuration: number, description: string,
    particleType: ParticleType, showArrow: boolean, color: string,
    stepNumber: number, direction: 'forward' | 'reverse', isRoundTrip: boolean
  ) => {
    updateEdgeDetails(id, protocol, isAsync, duration, delay, tooltipText, tooltipDuration, description, particleType, showArrow, color);
    const seq = useAppStore.getState().logicalData.sequences.find((s) => s.edgeId === id);
    if (seq) {
      if (seq.stepNumber !== stepNumber) setSequenceStepOrder(seq.id, stepNumber);
      setSequenceStepDirection(seq.id, direction);
      setSequenceStepRoundTrip(seq.id, isRoundTrip);
    }
    setIsDirty(true);
  }, [updateEdgeDetails, setSequenceStepOrder, setSequenceStepDirection, setSequenceStepRoundTrip]);

  // ── Apply ─────────────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    // Save the PRE-preview state to history so undo goes back to before editing
    if (previewSnapshot) {
      pushStateToHistory(previewSnapshot.logicalData, previewSnapshot.visualData);
    }
    setIsDirty(false);

    if (activeNode) {
      // Trigger handle baking + store commit in DiagramCanvas (with skipHistory=true
      // since we already pushed history above)
      nodeFormRef.current?.submit();
    } else {
      edgeFormRef.current?.submit();
    }
  }, [previewSnapshot, pushStateToHistory, activeNode]);

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (previewSnapshot) {
      // Revert the entire logicalData to before the preview started
      useAppStore.setState({
        logicalData: previewSnapshot.logicalData,
        visualData: previewSnapshot.visualData,
      });
    }
    // Reset form to original values (which will also call onPreview with originals)
    if (activeNode) nodeFormRef.current?.cancel();
    else edgeFormRef.current?.cancel();
    setIsDirty(false);
  }, [previewSnapshot, activeNode]);

  if (!activeNode && !activeEdge) return null;

  const tr = (t: string, e: string) => language === 'tr' ? t : e;
  const isEdgeNew = activeEdge?.isNew ?? false;
  const panelTitle = activeNode
    ? tr('Bileşen Özellikleri', 'Component Properties')
    : tr('Bağlantı Özellikleri', 'Edge Properties');

  return (
    <div className="flex flex-col h-full min-h-0 select-none font-sans">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-2 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
        <button
          onClick={onBack}
          title={tr('Simülasyona dön', 'Back to simulation')}
          className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1 truncate flex-1">
          <Settings className="w-3 h-3 text-indigo-500 shrink-0" />
          {panelTitle}
        </span>
        {/* Live indicator dot */}
        {isDirty && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" title={tr('Kaydedilmemiş değişiklikler', 'Unsaved changes')} />
        )}
      </div>

      {/* ── Scrollable form body ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2.5">
        {activeNode && (
          <NodePropertiesForm
            ref={nodeFormRef}
            activeNode={activeNode}
            language={language}
            connectedHandleIds={connectedHandleIds}
            onPreview={handlePreviewNode}
            onSubmit={onApplyNode}
          />
        )}

        {activeEdge && (
          <EdgePropertiesForm
            ref={edgeFormRef}
            activeEdge={activeEdge}
            language={language}
            maxSteps={maxSteps}
            sequenceDirection={activeEdgeSeq?.direction ?? 'forward'}
            sequenceRoundTrip={activeEdgeSeq?.isRoundTrip ?? false}
            onPreview={handlePreviewEdge}
            onSubmit={onApplyEdge}
          />
        )}
      </div>

      {/* ── Footer actions ──────────────────────────────────────────────────── */}
      <div className="px-2.5 py-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/50 dark:bg-slate-900/30">

        {/* Cancel + Apply row */}
        <div className="flex gap-1.5">
          {/* Discard new edge */}
          {isEdgeNew && !isDirty && (
            <button
              onClick={onCancelEdge}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {tr('Sil', 'Discard')}
            </button>
          )}

          {/* Cancel preview — reverts changes */}
          {isDirty && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
            >
              <RotateCcw className="w-3 h-3" />
              {tr('Geri Al', 'Revert')}
            </button>
          )}

          {/* Apply — commits to history */}
          <button
            onClick={handleApply}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              isDirty
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/30'
                : 'bg-indigo-500/80 text-white/90 hover:bg-indigo-600'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{tr('Uygula', 'Apply')}</span>
          </button>
        </div>

        {/* Hint when dirty */}
        {isDirty && (
          <p className="text-[9px] text-amber-500 dark:text-amber-400 mt-1 text-center leading-none">
            {tr('Önizleme aktif — onaylamak için Uygula\'ya basın', 'Preview active — press Apply to confirm')}
          </p>
        )}
      </div>
    </div>
  );
};
