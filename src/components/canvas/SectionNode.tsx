import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeResizer, useConnection } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { useSectionAnimation } from './hooks';
import { resolveHandles, getHandleStyle } from '../../utils/portUtils';
import { PortSide } from '../../types';

interface SectionNodeProps {
  id: string;
  data: {
    name: string;
    type: string;
  };
  selected?: boolean;
}

const sideToPosition = (side: PortSide): Position => {
  switch (side) {
    case 'top': return Position.Top;
    case 'right': return Position.Right;
    case 'bottom': return Position.Bottom;
    case 'left': return Position.Left;
  }
};

const themeStyles: Record<string, { border: string; bg: string; label: string; glow: string }> = {
  slate: {
    border: 'border-slate-400/60 dark:border-slate-500/50',
    bg: 'bg-slate-100/20 dark:bg-slate-800/15',
    label: 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600',
    glow: 'shadow-slate-200/50 dark:shadow-slate-700/30',
  },
  indigo: {
    border: 'border-indigo-400/50 dark:border-indigo-500/40',
    bg: 'bg-indigo-50/20 dark:bg-indigo-900/10',
    label: 'bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600',
    glow: 'shadow-indigo-200/50 dark:shadow-indigo-700/30',
  },
  emerald: {
    border: 'border-emerald-400/50 dark:border-emerald-500/40',
    bg: 'bg-emerald-50/20 dark:bg-emerald-900/10',
    label: 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600',
    glow: 'shadow-emerald-200/50 dark:shadow-emerald-700/30',
  },
  rose: {
    border: 'border-rose-400/50 dark:border-rose-500/40',
    bg: 'bg-rose-50/20 dark:bg-rose-900/10',
    label: 'bg-rose-100/80 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-600',
    glow: 'shadow-rose-200/50 dark:shadow-rose-700/30',
  },
  amber: {
    border: 'border-amber-400/50 dark:border-amber-500/40',
    bg: 'bg-amber-50/20 dark:bg-amber-900/10',
    label: 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-600',
    glow: 'shadow-amber-200/50 dark:shadow-amber-700/30',
  },
  violet: {
    border: 'border-violet-400/50 dark:border-violet-500/40',
    bg: 'bg-violet-50/20 dark:bg-violet-900/10',
    label: 'bg-violet-100/80 dark:bg-violet-900/60 text-violet-600 dark:text-violet-300 border-violet-300 dark:border-violet-600',
    glow: 'shadow-violet-200/50 dark:shadow-violet-700/30',
  },
  cyan: {
    border: 'border-cyan-400/50 dark:border-cyan-500/40',
    bg: 'bg-cyan-50/20 dark:bg-cyan-900/10',
    label: 'bg-cyan-100/80 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-300 border-cyan-300 dark:border-cyan-600',
    glow: 'shadow-cyan-200/50 dark:shadow-cyan-700/30',
  },
};

export const SectionNode: React.FC<SectionNodeProps> = memo(({ id, data, selected }) => {
  const name = data?.name ?? 'Section';
  const themeKey = useAppStore((s: any) => s.visualData.layoutNodes[id]?.theme ?? 'slate');
  const updateNodeDimensions = useAppStore((s: any) => s.updateNodeDimensions);
  const nodeHandles = useAppStore((s: any) => {
    const ln = s.logicalData.nodes.find((n: any) => n.id === id);
    return ln?.handles;
  });
  
  const connection = useConnection();
  const isConnecting = !!connection.inProgress;

  const handles = useMemo(() => resolveHandles(nodeHandles), [nodeHandles]);
  const isActive = useSectionAnimation(id);
  const style = themeStyles[themeKey] ?? themeStyles.slate;

  return (
    <div className="relative w-full h-full font-sans">
      <NodeResizer 
        minWidth={200} 
        minHeight={150} 
        isVisible={!!selected} 
        lineClassName="border-indigo-500/50" 
        handleClassName="w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-full shadow-sm"
        onResizeEnd={(_, params) => {
          updateNodeDimensions(id, params.width, params.height);
        }}
      />

      {/* Section Label — Top-left corner */}
      <div className={`absolute -top-[22px] left-3 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider 
                        rounded-t-lg border border-b-0 z-10 select-none whitespace-nowrap
                        ${style.label}`}>
        {name}
      </div>

      {/* Section Container */}
      <div className={`w-full h-full rounded-xl border-2 border-dashed backdrop-blur-[1px] transition-all duration-300
                        ${style.border} ${style.bg}
                        ${isActive 
                          ? 'ring-2 ring-emerald-500/30 dark:ring-emerald-400/20 border-emerald-500/60 dark:border-emerald-400/40 shadow-lg ' + style.glow
                          : selected 
                            ? 'ring-2 ring-indigo-500/20 shadow-md ' + style.glow
                            : ''
                        }`}>
        {/* Child nodes are rendered by ReactFlow via parentId — this area is just the background */}
      </div>

      {/* Dynamic Connection Handles */}
      {handles.map((h) => {
        const pos = sideToPosition(h.side);
        const posStyle = getHandleStyle(h.side, h.offset);
        return (
          <React.Fragment key={h.id}>
            <Handle 
              type="target" 
              position={pos} 
              id={`${h.id}-target`}
              style={posStyle}
              className="!w-3.5 !h-3.5 !border-2 !border-white dark:!border-slate-900 !bg-slate-400 dark:!bg-slate-500 hover:!bg-indigo-500 hover:!scale-125 !transition-all !rounded-full" 
            />
            <Handle 
              type="source" 
              position={pos} 
              id={`${h.id}-source`}
              style={{ ...posStyle, pointerEvents: isConnecting ? 'none' : 'auto' }}
              className="!w-3.5 !h-3.5 !border-2 !border-white dark:!border-slate-900 !bg-slate-400 dark:!bg-slate-500 hover:!bg-indigo-500 hover:!scale-125 !transition-all !rounded-full" 
            />
          </React.Fragment>
        );
      })}
    </div>
  );
});
