import React, { useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SimulationPanel } from './SimulationPanel';
import { PropertiesView } from './PropertiesView';
import { HandleConfig } from '../../types';
import { ParticleType } from '../../config/particles';

/**
 * RightSidebarShell
 *
 * Orchestrates which panel is visible inside the right sidebar:
 *   - When a node or edge is selected → PropertiesView (full height)
 *   - Otherwise                        → SimulationPanel (flow log + node list)
 *
 * Single Responsibility: layout chrome + panel switching.
 * It delegates all content rendering to SimulationPanel and PropertiesView.
 */
export const RightSidebarShell: React.FC = () => {
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen);
  const activeNode = useAppStore((s) => s.activeNodeProperties);
  const activeEdge = useAppStore((s) => s.activeEdgeProperties);
  const clearActiveProperties = useAppStore((s) => s.clearActiveProperties);

  const updateEdgeDetails = useAppStore((s) => s.updateEdgeDetails);
  const deleteEdge = useAppStore((s) => s.deleteEdge);
  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const setSequenceStepOrder = useAppStore((s) => s.setSequenceStepOrder);
  const setSequenceStepDirection = useAppStore((s) => s.setSequenceStepDirection);
  const setSequenceStepRoundTrip = useAppStore((s) => s.setSequenceStepRoundTrip);
  const logicalData = useAppStore((s) => s.logicalData);

  const hasSelection = !!(activeNode || activeEdge);
  const showProperties = hasSelection;

  // ── Callbacks passed down to PropertiesView ──────────────────────────────

  const handleApplyNode = useCallback((
    id: string, name: string, type: string, theme: string,
    handles?: HandleConfig[], displayMode?: 'default' | 'icon-only',
    rotation?: number, customStyles?: any,
  ) => {
    // skipHistory: true because PropertiesView already pushed the pre-preview
    // snapshot to history via pushStateToHistory before calling submit().
    window.dispatchEvent(new CustomEvent('canvas:applyNodeProperties', {
      detail: { id, name, type, theme, handles, displayMode, rotation, customStyles, skipHistory: true }
    }));
    clearActiveProperties();
  }, [clearActiveProperties]);

  const handleApplyEdge = useCallback((
    id: string, protocol: string, isAsync: boolean, duration: number, delay: number,
    tooltipText: string, tooltipDuration: number, description: string,
    particleType: ParticleType | undefined, showArrow: boolean, color: string,
    stepNumber: number, direction: 'forward' | 'reverse', isRoundTrip: boolean,
  ) => {
    updateEdgeDetails(id, protocol, isAsync, duration, delay, tooltipText, tooltipDuration, description, particleType, showArrow, color);

    const seq = logicalData.sequences.find((s) => s.edgeId === id);
    if (seq) {
      if (seq.stepNumber !== stepNumber) setSequenceStepOrder(seq.id, stepNumber);
      setSequenceStepDirection(seq.id, direction);
      setSequenceStepRoundTrip(seq.id, isRoundTrip);
    }

    // Clear isNew so that closing doesn't delete the edge
    clearActiveProperties();
  }, [updateEdgeDetails, logicalData.sequences, setSequenceStepOrder, setSequenceStepDirection, setSequenceStepRoundTrip, clearActiveProperties]);

  const handleCancelEdge = useCallback(() => {
    const current = useAppStore.getState().activeEdgeProperties;
    if (current?.isNew) {
      deleteEdge(current.id);
      setSelectedSequenceId(null);
    }
    clearActiveProperties();
  }, [deleteEdge, setSelectedSequenceId, clearActiveProperties]);

  const handleBack = useCallback(() => {
    clearActiveProperties();
  }, [clearActiveProperties]);

  return (
    <aside
      className={`border-l border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md flex flex-col h-full select-none shrink-0 z-20 transition-all duration-300 ease-in-out overflow-hidden ${
        rightSidebarOpen ? 'w-[300px]' : 'w-0 border-l-0'
      }`}
    >
      {/* Properties panel slides in over simulation when a selection is active */}
      <div className="relative flex-1 min-h-0 overflow-hidden">

        {/* SimulationPanel — always mounted, fades/slides out when properties visible */}
        <div
          className={`absolute inset-0 flex flex-col transition-all duration-300 ease-in-out ${
            showProperties
              ? 'opacity-0 pointer-events-none -translate-x-4'
              : 'opacity-100 pointer-events-auto translate-x-0'
          }`}
        >
          <SimulationPanel />
        </div>

        {/* PropertiesView — slides in from right when a node/edge is selected */}
        <div
          className={`absolute inset-0 flex flex-col transition-all duration-300 ease-in-out ${
            showProperties
              ? 'opacity-100 pointer-events-auto translate-x-0'
              : 'opacity-0 pointer-events-none translate-x-4'
          }`}
        >
          {hasSelection && (
            <PropertiesView
              onBack={handleBack}
              onApplyNode={handleApplyNode}
              onApplyEdge={handleApplyEdge}
              onCancelEdge={handleCancelEdge}
            />
          )}
        </div>
      </div>
    </aside>
  );
};
