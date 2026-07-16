import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeResizer, useConnection } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '../../store/useAppStore';
import { CustomSvgRenderer } from './CustomSvgRenderer';
import { useNodeAnimation } from './hooks';
import { getNodeDefinition, getDefaultIcon } from '../../registry/NodeRegistry';
import { resolveHandles, getHandleStyle } from '../../utils/portUtils';
import { PortSide } from '../../types';

interface BaseNodeProps {
  id: string;
  data: { name: string; type: string };
  selected?: boolean;
}

const getIcon = (type: string, colorClass?: string, isIconOnly?: boolean) => {
  const def = getNodeDefinition(type);
  if (def) {
    const color = colorClass ?? def.colorClass;
    return React.cloneElement(def.icon as React.ReactElement, {
      className: `${isIconOnly ? 'w-[80%] h-[80%]' : 'w-5 h-5'} ${color} transition-all duration-300`,
    } as any);
  }
  return getDefaultIcon(colorClass ?? 'text-slate-500');
};

const sideToPosition = (side: PortSide): Position => {
  switch (side) {
    case 'top':    return Position.Top;
    case 'right':  return Position.Right;
    case 'bottom': return Position.Bottom;
    case 'left':   return Position.Left;
  }
};

const themeStyles: Record<string, { border: string; borderHover: string; ring: string; text: string; bg: string }> = {
  indigo:  { border: 'border-indigo-500 dark:border-indigo-500/80',  borderHover: 'hover:border-indigo-600 dark:hover:border-indigo-400',  ring: 'ring-indigo-500/10 dark:ring-indigo-500/20 shadow-indigo-100 dark:shadow-indigo-950/40',  text: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-500/5 dark:bg-indigo-500/10' },
  emerald: { border: 'border-emerald-500 dark:border-emerald-500/80', borderHover: 'hover:border-emerald-600 dark:hover:border-emerald-400', ring: 'ring-emerald-500/10 dark:ring-emerald-500/20 shadow-emerald-100 dark:shadow-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5 dark:bg-emerald-500/10' },
  rose:    { border: 'border-rose-500 dark:border-rose-500/80',    borderHover: 'hover:border-rose-600 dark:hover:border-rose-400',    ring: 'ring-rose-500/10 dark:ring-rose-500/20 shadow-rose-100 dark:shadow-rose-950/40',    text: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-500/5 dark:bg-rose-500/10' },
  amber:   { border: 'border-amber-500 dark:border-amber-500/80',   borderHover: 'hover:border-amber-600 dark:hover:border-amber-400',   ring: 'ring-amber-500/10 dark:ring-amber-500/20 shadow-amber-100 dark:shadow-amber-950/40',   text: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-500/5 dark:bg-amber-500/10' },
  violet:  { border: 'border-violet-500 dark:border-violet-500/80',  borderHover: 'hover:border-violet-600 dark:hover:border-violet-400',  ring: 'ring-violet-500/10 dark:ring-violet-500/20 shadow-violet-100 dark:shadow-violet-950/40',  text: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-500/5 dark:bg-violet-500/10' },
  cyan:    { border: 'border-cyan-500 dark:border-cyan-500/80',    borderHover: 'hover:border-cyan-600 dark:hover:border-cyan-400',    ring: 'ring-cyan-500/10 dark:ring-cyan-500/20 shadow-cyan-100 dark:shadow-cyan-950/40',    text: 'text-cyan-600 dark:text-cyan-400',    bg: 'bg-cyan-500/5 dark:bg-cyan-500/10' },
};

export const BaseNode: React.FC<BaseNodeProps> = memo(({ id, data, selected }) => {
  const name = data?.name ?? 'Node';
  const type = data?.type ?? 'server';

  const connection  = useConnection();
  const isConnecting = !!connection.inProgress;

  const { tooltipActive: isProcessing, nodeActive: isNodeActive, tooltipText: activeTooltipText } = useNodeAnimation(id);

  const visualNode     = useAppStore((s: any) => s.visualData.layoutNodes[id]);
  const themeKey       = visualNode?.theme ?? 'indigo';
  const displayMode    = visualNode?.displayMode ?? 'default';
  // orientation: rotation===90 means vertical (narrow+tall), rotation===0 means horizontal
  const isVertical     = (visualNode?.rotation ?? 0) === 90;
  const customStyles   = visualNode?.customStyles ?? {};

  const updateNodeDimensions = useAppStore((s: any) => s.updateNodeDimensions);
  const libraryComponents    = useAppStore((s: any) => s.libraryComponents);
  const nodeHandles          = useAppStore((s: any) => {
    return s.visualData.layoutNodes[id]?.handles;
  });

  const connectedHandlesArray = useAppStore(
    useShallow((s: any) => {
      const ports = new Set<string>();
      s.logicalData.edges.forEach((e: any) => {
        const ve = s.visualData.layoutEdges[e.id];
        if (e.sourceId === id && ve?.sourceHandle) ports.add(ve.sourceHandle);
        if (e.targetId === id && ve?.targetHandle) ports.add(ve.targetHandle);
      });
      return Array.from(ports).sort();
    })
  );

  const connectedHandles = useMemo(() => new Set(connectedHandlesArray), [connectedHandlesArray]);

  const handles         = useMemo(() => resolveHandles(nodeHandles), [nodeHandles]);
  const style           = themeStyles[themeKey] ?? themeStyles.indigo;
  const customTemplate  = libraryComponents.find((c: any) => c.componentId === type);

  const containerStyle: React.CSSProperties = {
    backgroundColor: customStyles.backgroundColor || undefined,
    borderColor:     customStyles.borderColor     || undefined,
    borderStyle:     customStyles.borderStyle     || undefined,
    borderRadius:    customStyles.borderRadius ? `${customStyles.borderRadius}px` : undefined,
  };

  // ── Key design principle ──────────────────────────────────────────────────
  // No CSS rotation is used anywhere.  The stored width × height IS the
  // bounding box exactly as React Flow sees it, so handles are always at the
  // real visual edges and edge routing is always correct.
  //
  // Orientation is achieved purely by changing content flow:
  //   Horizontal → flex-row, icon left, text right
  //   Vertical   → flex-col, icon top, text rotated 90° (writing-mode)
  //
  // When the user switches orientation in the properties panel,
  // updateNodeDetails() automatically swaps width ↔ height in the store.

  return (
    <div className="relative w-full h-full font-sans" style={{ overflow: 'visible' }}>

      <NodeResizer
        minWidth={isVertical ? 32 : 120}
        minHeight={isVertical ? 120 : 32}
        isVisible={!!selected}
        lineClassName="border-indigo-500"
        handleClassName="w-2 h-2 bg-white border-2 border-indigo-500 rounded-full"
        onResizeEnd={(_, params) => {
          updateNodeDimensions(id, params.width, params.height);
        }}
      />

      {/* Tooltip Bubble */}
      {activeTooltipText && (
        <div className="absolute top-[-52px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-xl shadow-lg border border-indigo-500/30 whitespace-nowrap animate-bounce duration-1000">
          <MessageSquare className="w-3.5 h-3.5 fill-white/10" />
          <span>{activeTooltipText}</span>
          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-indigo-600 rotate-45 border-r border-b border-indigo-500/30" />
        </div>
      )}

      {/* Connection handles — always at the bounding box edges, no transforms.
          Each position has TWO handles (source + target) for bidirectional connections,
          but only the SOURCE handle is visible. The TARGET handle is a transparent
          hit-area — this prevents the double-circle artifact on hover. */}
      {handles.map((h) => {
        const pos          = sideToPosition(h.side);
        const posStyle     = getHandleStyle(h.side, h.offset);
        const isConnected  = connectedHandles.has(h.id);
        const handleClass  = isConnected ? 'handle-connected' : 'handle-idle';
        const activeHandle = selected || isConnecting;
        const sizeClass    = activeHandle ? '!w-4 !h-4' : '!w-2.5 !h-2.5';

        return (
          <React.Fragment key={h.id}>
            {/* TARGET — invisible hit-area, same size as source so drop zone matches */}
            <Handle
              type="target"
              position={pos}
              id={`${h.id}-target`}
              style={{ ...posStyle, opacity: 0 }}
              className={`${sizeClass} !border-0 !bg-transparent ${handleClass}`}
            />
            {/* SOURCE — the only visible circle */}
            <Handle
              type="source"
              position={pos}
              id={`${h.id}-source`}
              style={{ ...posStyle, pointerEvents: isConnecting ? 'none' : 'auto' }}
              className={`${sizeClass} !border-2 !border-white dark:!border-slate-900 !bg-indigo-500 dark:!bg-indigo-400 !transition-all !duration-150 ${handleClass}`}
            />
          </React.Fragment>
        );
      })}

      {/* Node card — layout only, zero CSS rotation */}
      <div
        style={containerStyle}
        className={`w-full h-full rounded-xl text-slate-800 dark:text-slate-100 flex items-center justify-center transition-all duration-200 ${
          displayMode === 'icon-only'
            ? `bg-transparent border-transparent ${selected ? 'ring-2 ring-indigo-500/50' : ''}`
            : `border-2 gap-3 shadow-md dark:shadow-xl ${
                // Vertical layout: icon on top, text below
                isVertical ? 'flex-col px-2 py-4' : 'flex-row px-4 py-3'
              } ${
                isProcessing
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 scale-[1.02] shadow-emerald-100 dark:shadow-emerald-950/40 ring-4 ring-emerald-500/20 animate-pulse'
                  : isNodeActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 scale-[1.02] shadow-indigo-100 dark:shadow-indigo-950/40 ring-4 ring-indigo-500/20'
                  : selected
                  ? `bg-white dark:bg-slate-900 ${style.border} ${style.ring} ring-4 ring-indigo-500/10`
                  : `bg-white dark:bg-slate-900 ${style.border} ${style.borderHover}`
              }`
        }`}
      >
        {/* Icon */}
        <div
          className={`flex items-center justify-center shrink-0 overflow-hidden transition-all duration-300 ${
            displayMode === 'icon-only'
              ? 'w-full h-full'
              : `p-1.5 rounded-lg border ${style.bg} ${style.border} w-10 h-10`
          }`}
        >
          {customTemplate ? (
            <CustomSvgRenderer
              layers={customTemplate.layers}
              width={customTemplate.dimensions.width}
              height={customTemplate.dimensions.height}
            />
          ) : (
            getIcon(type, style.text, displayMode === 'icon-only')
          )}
        </div>

        {/* Text — vertical mode uses writing-mode so text reads bottom-to-top */}
        {displayMode === 'default' && (
          <div
            className="flex-1 min-w-0"
            style={isVertical ? {
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',   // bottom-to-top reading direction
              overflow: 'hidden',
            } : {}}
          >
            <div className="font-bold text-xs truncate text-slate-800 dark:text-slate-200">{name}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              {customTemplate ? customTemplate.category : type}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
