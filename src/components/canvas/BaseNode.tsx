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
import { findDeviconItem, getDeviconComponent } from '../../registry/DeviconRegistry';

interface BaseNodeProps {
  id: string;
  data: { name: string; type: string };
  selected?: boolean;
}

const getIcon = (type: string, colorClass: string, isIconOnly: boolean, customColor?: string) => {
  const def = getNodeDefinition(type);
  const sizeClass = isIconOnly ? 'w-[80%] h-[80%]' : 'w-8 h-8';
  const isHex = customColor?.startsWith('#');
  const isPredefined = customColor && !isHex;
  const finalColorClass = isPredefined ? (themeStyles[customColor]?.text ?? colorClass) : colorClass;
  const className = `${sizeClass} ${isHex ? '' : finalColorClass} transition-all duration-300`;
  const extraProps = {
    className,
    style: isHex ? { color: customColor } : undefined,
  };

  if (def) {
    return React.cloneElement(def.icon as React.ReactElement, extraProps as any);
  }
  return React.cloneElement(getDefaultIcon(colorClass) as React.ReactElement, extraProps as any);
};

const sideToPosition = (side: PortSide): Position => {
  switch (side) {
    case 'top': return Position.Top;
    case 'right': return Position.Right;
    case 'bottom': return Position.Bottom;
    case 'left': return Position.Left;
  }
};

const getThemeHexColor = (themeKey: string): string => {
  switch (themeKey) {
    case 'emerald': return '#10b981';
    case 'rose':    return '#f43f5e';
    case 'amber':   return '#f59e0b';
    case 'violet':  return '#8b5cf6';
    case 'cyan':    return '#06b6d4';
    case 'indigo':  return '#6366f1';
    default:        return themeKey; // custom hex color
  }
};

const themeStyles: Record<string, { border: string; borderHover: string; ring: string; text: string; bg: string; handleBg: string; resizerBorder: string; resizerHandleBorder: string }> = {
  indigo: { border: 'border-indigo-500 dark:border-indigo-500/80', borderHover: 'hover:border-indigo-600 dark:hover:border-indigo-400', ring: 'ring-indigo-500/10 dark:ring-indigo-500/20 shadow-indigo-100 dark:shadow-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/5 dark:bg-indigo-500/10', handleBg: '!bg-indigo-500 dark:!bg-indigo-400', resizerBorder: '!border-indigo-500', resizerHandleBorder: '!border-indigo-500' },
  emerald: { border: 'border-emerald-500 dark:border-emerald-500/80', borderHover: 'hover:border-emerald-600 dark:hover:border-emerald-400', ring: 'ring-emerald-500/10 dark:ring-emerald-500/20 shadow-emerald-100 dark:shadow-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5 dark:bg-emerald-500/10', handleBg: '!bg-emerald-500 dark:!bg-emerald-400', resizerBorder: '!border-emerald-500', resizerHandleBorder: '!border-emerald-500' },
  rose: { border: 'border-rose-500 dark:border-rose-500/80', borderHover: 'hover:border-rose-600 dark:hover:border-rose-400', ring: 'ring-rose-500/10 dark:ring-rose-500/20 shadow-rose-100 dark:shadow-rose-950/40', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/5 dark:bg-rose-500/10', handleBg: '!bg-rose-500 dark:!bg-rose-400', resizerBorder: '!border-rose-500', resizerHandleBorder: '!border-rose-500' },
  amber: { border: 'border-amber-500 dark:border-amber-500/80', borderHover: 'hover:border-amber-600 dark:hover:border-amber-400', ring: 'ring-amber-500/10 dark:ring-amber-500/20 shadow-amber-100 dark:shadow-amber-950/40', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/5 dark:bg-amber-500/10', handleBg: '!bg-amber-500 dark:!bg-amber-400', resizerBorder: '!border-amber-500', resizerHandleBorder: '!border-amber-500' },
  violet: { border: 'border-violet-500 dark:border-violet-500/80', borderHover: 'hover:border-violet-600 dark:hover:border-violet-400', ring: 'ring-violet-500/10 dark:ring-violet-500/20 shadow-violet-100 dark:shadow-violet-950/40', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/5 dark:bg-violet-500/10', handleBg: '!bg-violet-500 dark:!bg-violet-400', resizerBorder: '!border-violet-500', resizerHandleBorder: '!border-violet-500' },
  cyan: { border: 'border-cyan-500 dark:border-cyan-500/80', borderHover: 'hover:border-cyan-600 dark:hover:border-cyan-400', ring: 'ring-cyan-500/10 dark:ring-cyan-500/20 shadow-cyan-100 dark:shadow-cyan-950/40', text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/5 dark:bg-cyan-500/10', handleBg: '!bg-cyan-500 dark:!bg-cyan-400', resizerBorder: '!border-cyan-500', resizerHandleBorder: '!border-cyan-500' },
};

export const BaseNode: React.FC<BaseNodeProps> = memo(({ id, data, selected }) => {
  const name = data?.name ?? 'Node';
  const type = data?.type ?? 'server';

  const connection = useConnection();
  const isConnecting = !!connection.inProgress;

  const { tooltipActive: isProcessing, nodeActive: isNodeActive, tooltipText: activeTooltipText } = useNodeAnimation(id);

  const visualNode = useAppStore((s: any) => s.visualData.layoutNodes[id]);
  const themeKey = visualNode?.theme ?? 'indigo';
  const displayMode = visualNode?.displayMode ?? 'default';
  // orientation: rotation===90 means vertical (narrow+tall), rotation===0 means horizontal
  const isVertical = (visualNode?.rotation ?? 0) === 90;
  const customStyles = visualNode?.customStyles ?? {};

  const updateNodeDimensions = useAppStore((s: any) => s.updateNodeDimensions);
  const libraryComponents = useAppStore((s: any) => s.libraryComponents);
  const nodeHandles = useAppStore((s: any) => {
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

  const handles = useMemo(() => resolveHandles(nodeHandles), [nodeHandles]);
  const style = themeStyles[themeKey] ?? themeStyles.indigo;
  const customTemplate = libraryComponents.find((c: any) => c.componentId === type);

  const isCustomTheme = themeKey.startsWith('#');
  const themeHexColor = useMemo(() => getThemeHexColor(themeKey), [themeKey]);

  const containerStyle: React.CSSProperties = {
    backgroundColor: customStyles.backgroundColor || ((isNodeActive && isCustomTheme) ? `${themeKey}1A` : undefined),
    borderColor: customStyles.borderColor || (isCustomTheme ? themeKey : undefined),
    borderStyle: customStyles.borderStyle || undefined,
    borderRadius: customStyles.borderRadius ? `${customStyles.borderRadius}px` : undefined,
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
        lineClassName={isCustomTheme ? undefined : style.resizerBorder}
        lineStyle={isCustomTheme ? { borderColor: themeKey } : undefined}
        handleClassName={`w-2 h-2 bg-white border-2 rounded-full ${isCustomTheme ? '' : style.resizerHandleBorder}`}
        handleStyle={isCustomTheme ? { borderColor: themeKey } : undefined}
        onResizeEnd={(_, params) => {
          updateNodeDimensions(id, params.width, params.height);
        }}
      />

      {/* Tooltip Bubble */}
      {activeTooltipText && (
        <div className="absolute top-[-52px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-xl shadow-lg border border-indigo-500/30 whitespace-nowrap">
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
        const pos = sideToPosition(h.side);
        const posStyle = getHandleStyle(h.side, h.offset);
        const isConnected = connectedHandles.has(h.id);
        const handleClass = isConnected ? 'handle-connected' : 'handle-idle';
        const activeHandle = selected || isConnecting;
        const sizeClass = activeHandle ? '!w-4 !h-4' : '!w-2.5 !h-2.5';

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
              style={{
                ...posStyle,
                pointerEvents: isConnecting ? 'none' : 'auto',
                backgroundColor: isCustomTheme ? themeKey : undefined,
                ['--handle-glow-color' as any]: themeHexColor,
              }}
              className={`${sizeClass} !border-2 !border-white dark:!border-slate-900 !transition-all !duration-150 ${handleClass} ${
                isCustomTheme ? '' : style.handleBg
              }`}
            />
          </React.Fragment>
        );
      })}

      {/* Node card — layout only, zero CSS rotation */}
      <div
        style={containerStyle}
        className={`w-full h-full rounded-xl text-slate-800 dark:text-slate-100 flex items-center justify-center transition-all duration-200 ${displayMode === 'icon-only'
            ? `bg-transparent border-transparent ${selected ? (isCustomTheme ? '' : 'ring-2 ring-indigo-500/50') : ''}`
            : `border-2 shadow-md dark:shadow-xl ${
            // Vertical layout: icon on top, text below
            isVertical ? 'flex-col px-2 py-4 gap-3' : 'flex-row px-4 py-3 gap-2.5'
            } ${isProcessing
              ? 'bg-white dark:bg-slate-900 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500'
              : isNodeActive
                ? `bg-white dark:bg-slate-900 ${isCustomTheme ? '' : `${style.bg} ${style.border}`}`
                : selected
                  ? `bg-white dark:bg-slate-900 ${isCustomTheme ? '' : `${style.border}`}`
                  : `bg-white dark:bg-slate-900 ${isCustomTheme ? '' : `${style.border} ${style.borderHover}`}`
            }`
          }`}
      >
        {/* Icon */}
        <div
          className={`flex items-center justify-center shrink-0 overflow-hidden transition-all duration-300 ${displayMode === 'icon-only'
              ? 'w-full h-full'
              : 'w-9 h-9'
            }`}
        >
          {(() => {
            if (customStyles.productIcon) {
              const item = findDeviconItem(customStyles.productIcon);
              if (item) {
                const IconComponent = getDeviconComponent(
                  item,
                  customStyles.productIconColored !== false,
                  !!customStyles.productIconWordmark
                );
                if (IconComponent) {
                  const size = displayMode === 'icon-only' ? '80%' : 30;
                  const isColored = customStyles.productIconColored !== false;
                  const isHex = customStyles.iconColor?.startsWith('#');
                  const finalIconColor = isHex
                    ? customStyles.iconColor
                    : (customStyles.iconColor ? themeStyles[customStyles.iconColor]?.text : style.text);
                  return (
                    <div
                      className={`flex items-center justify-center w-full h-full ${!isColored && !isHex ? finalIconColor : ''}`}
                      style={!isColored && isHex ? { color: finalIconColor } : undefined}
                    >
                      <IconComponent size={size} />
                    </div>
                  );
                }
              }
            }
            if (customTemplate) {
              return (
                <CustomSvgRenderer
                  layers={customTemplate.layers}
                  width={customTemplate.dimensions.width}
                  height={customTemplate.dimensions.height}
                />
              );
            }
            return getIcon(type, style.text, displayMode === 'icon-only', customStyles.iconColor);
          })()}
        </div>

        {/* Divider (only for horizontal layout with text) */}
        {displayMode === 'default' && !isVertical && (
          <div className="w-px h-7 bg-slate-200 dark:bg-slate-800/80 shrink-0 self-center" />
        )}

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
