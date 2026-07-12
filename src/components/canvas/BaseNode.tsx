import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { CustomSvgRenderer } from './CustomSvgRenderer';
import { useNodeAnimation } from './hooks';
import { getNodeDefinition, getDefaultIcon } from '../../registry/NodeRegistry';

interface BaseNodeProps {
  id: string; // React Flow passes node id as id prop
  data: {
    name: string;
    type: string;
  };
  selected?: boolean;
}

const getIcon = (type: string, customColorClass?: string) => {
  const def = getNodeDefinition(type);
  if (def) {
    const color = customColorClass ?? def.colorClass;
    return React.cloneElement(def.icon as React.ReactElement, { 
      className: `w-5 h-5 ${color}` 
    } as any);
  }
  return getDefaultIcon(customColorClass ?? 'text-slate-500');
};

const themeStyles: Record<string, { border: string; borderHover: string; ring: string; text: string; bg: string }> = {
  indigo: { 
    border: 'border-indigo-500 dark:border-indigo-500/80', 
    borderHover: 'hover:border-indigo-600 dark:hover:border-indigo-400',
    ring: 'ring-indigo-500/10 dark:ring-indigo-500/20 shadow-indigo-100 dark:shadow-indigo-950/40', 
    text: 'text-indigo-600 dark:text-indigo-400', 
    bg: 'bg-indigo-500/5 dark:bg-indigo-500/10' 
  },
  emerald: { 
    border: 'border-emerald-500 dark:border-emerald-500/80', 
    borderHover: 'hover:border-emerald-600 dark:hover:border-emerald-400',
    ring: 'ring-emerald-500/10 dark:ring-emerald-500/20 shadow-emerald-100 dark:shadow-emerald-950/40', 
    text: 'text-emerald-600 dark:text-emerald-400', 
    bg: 'bg-emerald-500/5 dark:bg-emerald-500/10' 
  },
  rose: { 
    border: 'border-rose-500 dark:border-rose-500/80', 
    borderHover: 'hover:border-rose-600 dark:hover:border-rose-400',
    ring: 'ring-rose-500/10 dark:ring-rose-500/20 shadow-rose-100 dark:shadow-rose-950/40', 
    text: 'text-rose-600 dark:text-rose-400', 
    bg: 'bg-rose-500/5 dark:bg-rose-500/10' 
  },
  amber: { 
    border: 'border-amber-500 dark:border-amber-500/80', 
    borderHover: 'hover:border-amber-600 dark:hover:border-amber-400',
    ring: 'ring-amber-500/10 dark:ring-amber-500/20 shadow-amber-100 dark:shadow-amber-950/40', 
    text: 'text-amber-600 dark:text-amber-400', 
    bg: 'bg-amber-500/5 dark:bg-amber-500/10' 
  },
  violet: { 
    border: 'border-violet-500 dark:border-violet-500/80', 
    borderHover: 'hover:border-violet-600 dark:hover:border-violet-400',
    ring: 'ring-violet-500/10 dark:ring-violet-500/20 shadow-violet-100 dark:shadow-violet-950/40', 
    text: 'text-violet-600 dark:text-violet-400', 
    bg: 'bg-violet-500/5 dark:bg-violet-500/10' 
  },
  cyan: { 
    border: 'border-cyan-500 dark:border-cyan-500/80', 
    borderHover: 'hover:border-cyan-600 dark:hover:border-cyan-400',
    ring: 'ring-cyan-500/10 dark:ring-cyan-500/20 shadow-cyan-100 dark:shadow-cyan-950/40', 
    text: 'text-cyan-600 dark:text-cyan-400', 
    bg: 'bg-cyan-500/5 dark:bg-cyan-500/10' 
  },
};

export const BaseNode: React.FC<BaseNodeProps> = memo(({ id, data, selected }) => {
  const name = data?.name ?? 'Node';
  const type = data?.type ?? 'server';

  const { tooltipActive: isProcessing, nodeActive: isNodeActive, tooltipText: activeTooltipText } = useNodeAnimation(id);
  const themeKey = useAppStore((s: any) => s.visualData.layoutNodes[id]?.theme ?? 'indigo');
  const updateNodeDimensions = useAppStore((s: any) => s.updateNodeDimensions);
  const libraryComponents = useAppStore((s: any) => s.libraryComponents);

  // Resolve theme style options
  const style = themeStyles[themeKey] ?? themeStyles.indigo;

  // Check if this is a custom library component
  const customTemplate = libraryComponents.find((c: any) => c.componentId === type);

  return (
    <div className="relative w-full h-full font-sans">
      <NodeResizer 
        minWidth={150} 
        minHeight={48} 
        isVisible={!!selected} 
        lineClassName="border-indigo-500" 
        handleClassName="w-2 h-2 bg-white border-2 border-indigo-500 rounded-full"
        onResizeEnd={(_, params) => {
          updateNodeDimensions(id, params.width, params.height);
        }}
      />

      {/* Absolute Tooltip Bubble */}
      {activeTooltipText && (
        <div className="absolute top-[-52px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-xl shadow-lg border border-indigo-500/30 whitespace-nowrap animate-bounce duration-1000">
          <MessageSquare className="w-3.5 h-3.5 fill-white/10" />
          <span>{activeTooltipText}</span>
          {/* Arrow */}
          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-indigo-600 rotate-45 border-r border-b border-indigo-500/30" />
        </div>
      )}

      {/* Node Card Container */}
      <div className={`px-4 py-3 rounded-xl border-2 text-slate-800 dark:text-slate-100 flex items-center gap-3 w-full h-full shadow-md dark:shadow-xl transition-all duration-200 ${
        isProcessing
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 scale-[1.02] shadow-emerald-100 dark:shadow-emerald-950/40 ring-4 ring-emerald-500/20 animate-pulse'
          : isNodeActive
          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 scale-[1.02] shadow-indigo-100 dark:shadow-indigo-950/40 ring-4 ring-indigo-500/20'
          : selected 
          ? `bg-white dark:bg-slate-900 ${style.border} scale-[1.02] ${style.ring} ring-4 ring-indigo-500/10` 
          : `bg-white dark:bg-slate-900 ${style.border} ${style.borderHover}`
      }`}>
        
        {/* Handles */}
        <Handle 
          type="target" 
          position={Position.Top} 
          id="top" 
          className="w-2.5 h-2.5 border-2 border-white dark:border-slate-900 bg-indigo-500 dark:bg-indigo-400 hover:scale-125 transition-transform" 
        />
        
        <Handle 
          type="target" 
          position={Position.Left} 
          id="left" 
          className="w-2.5 h-2.5 border-2 border-white dark:border-slate-900 bg-indigo-500 dark:bg-indigo-400 hover:scale-125 transition-transform" 
        />

        {/* Node Content - adapt background and border to the custom theme, render custom SVG if customTemplate exists */}
        <div className={`p-1.5 rounded-lg border ${style.bg} ${style.border} w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden`}>
          {customTemplate ? (
            <CustomSvgRenderer 
              layers={customTemplate.layers} 
              width={customTemplate.dimensions.width} 
              height={customTemplate.dimensions.height} 
            />
          ) : (
            getIcon(type, style.text)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-xs truncate text-slate-800 dark:text-slate-200">{name}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            {customTemplate ? customTemplate.category : type}
          </div>
        </div>

        {/* Right Handle */}
        <Handle 
          type="source" 
          position={Position.Right} 
          id="right" 
          className="w-2.5 h-2.5 border-2 border-white dark:border-slate-900 bg-indigo-500 dark:bg-indigo-400 hover:scale-125 transition-transform" 
        />
        
        {/* Bottom Handle */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="bottom" 
          className="w-2.5 h-2.5 border-2 border-white dark:border-slate-900 bg-indigo-500 dark:bg-indigo-400 hover:scale-125 transition-transform" 
        />
      </div>
    </div>
  );
});
