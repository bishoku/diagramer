import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, X, Save, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { HandleConfig, PortSide } from '../../types';
import { resolveHandles, MAX_HANDLES_PER_SIDE, MAX_HANDLES_PER_NODE } from '../../utils/portUtils';

interface NodePropertiesPopoverProps {
  properties: {
    id: string;
    x: number;
    y: number;
    name: string;
    type: string;
    theme: string;
    handles?: HandleConfig[];
  } | null;
  onClose: () => void;
  onApply: (id: string, name: string, type: string, theme: string, handles?: HandleConfig[]) => void;
}

interface DragState {
  handleId: string;
  side: PortSide;
}

interface PopoverDragState {
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
}

const SIDE_LABELS: Record<string, Record<PortSide, string>> = {
  dark: { top: 'Üst', right: 'Sağ', bottom: 'Alt', left: 'Sol' },
  light: { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' },
};

export const NodePropertiesPopover: React.FC<NodePropertiesPopoverProps> = ({
  properties,
  onClose,
  onApply,
}) => {
  const theme = useAppStore((state) => state.theme);
  const logicalData = useAppStore((state) => state.logicalData);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('server');
  const [formThemeColor, setFormThemeColor] = useState('indigo');
  const [formHandles, setFormHandles] = useState<HandleConfig[]>([]);
  const [activeDrag, setActiveDrag] = useState<DragState | null>(null);
  const [popoverDrag, setPopoverDrag] = useState<PopoverDragState | null>(null);
  
  // Store popover position in local state to enable dragging
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const previewRef = useRef<HTMLDivElement>(null);

  // Initialize and center popover position near double-click coords
  useEffect(() => {
    if (properties) {
      setFormName(properties.name);
      setFormType(properties.type);
      setFormThemeColor(properties.theme);
      
      // Ensure each handle config has a stable originalId to prevent key re-creation on drag
      const resolved = resolveHandles(properties.handles).map(h => ({
        ...h,
        originalId: h.originalId || h.id
      }));
      setFormHandles(resolved);
      
      const initialX = Math.min(properties.x, window.innerWidth - 340);
      const initialY = Math.max(10, Math.min(properties.y, window.innerHeight - 520));
      setPosition({ x: initialX, y: initialY });
    }
  }, [properties]);

  // Handle global mouse/touch move events for preview handle dragging
  useEffect(() => {
    if (!activeDrag || !previewRef.current) return;

    const handleMove = (clientX: number, clientY: number) => {
      const rect = previewRef.current!.getBoundingClientRect();
      const { side, handleId } = activeDrag;
      
      let percent = 50;
      if (side === 'top' || side === 'bottom') {
        const x = clientX - rect.left - 24; // 24px is the inset margin
        const width = rect.width - 48; // Total width minus double margin
        percent = Math.round((x / width) * 100);
      } else {
        const y = clientY - rect.top - 24;
        const height = rect.height - 48;
        percent = Math.round((y / height) * 100);
      }

      // Clamp values to keep handle within visual bounds
      const clamped = Math.max(5, Math.min(95, percent));
      
      // Keep handle ID stable during dragging to prevent DOM node re-creation
      setFormHandles(prev => prev.map(h => 
        h.id === handleId 
          ? { ...h, offset: clamped } 
          : h
      ));
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleDragEnd = () => {
      setActiveDrag(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [activeDrag]);

  // Handle popover window dragging via header
  useEffect(() => {
    if (!popoverDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - popoverDrag.startX;
      const dy = e.clientY - popoverDrag.startY;
      
      const newX = Math.max(10, Math.min(window.innerWidth - 340, popoverDrag.startPosX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 100, popoverDrag.startPosY + dy));
      
      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const dx = touch.clientX - popoverDrag.startX;
      const dy = touch.clientY - popoverDrag.startY;
      
      const newX = Math.max(10, Math.min(window.innerWidth - 340, popoverDrag.startPosX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 100, popoverDrag.startPosY + dy));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setPopoverDrag(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [popoverDrag]);

  // Check which handles are connected to edges
  const connectedHandleIds = useMemo(() => {
    if (!properties) return new Set<string>();
    const nodeId = properties.id;
    const connected = new Set<string>();
    logicalData.edges.forEach(e => {
      if (e.from === nodeId) connected.add(e.fromPort);
      if (e.to === nodeId) connected.add(e.toPort);
    });
    return connected;
  }, [properties, logicalData.edges]);

  if (!properties) return null;

  const bgColors: Record<string, string> = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    violet: 'bg-violet-500',
    cyan: 'bg-cyan-500',
  };

  const sides: PortSide[] = ['top', 'right', 'bottom', 'left'];
  const labels = theme === 'dark' ? SIDE_LABELS.dark : SIDE_LABELS.light;
  const totalHandles = formHandles.length;

  const addHandle = (side: PortSide) => {
    const sideHandles = formHandles.filter(h => h.side === side);
    if (sideHandles.length >= MAX_HANDLES_PER_SIDE) return;
    if (totalHandles >= MAX_HANDLES_PER_NODE) return;

    // Auto-distribute: find a good offset
    const offsets = sideHandles.map(h => h.offset).sort((a, b) => a - b);
    let newOffset = 50;
    if (offsets.length > 0) {
      // Find the largest gap
      const gaps: Array<{ start: number; end: number; size: number }> = [];
      gaps.push({ start: 0, end: offsets[0], size: offsets[0] });
      for (let i = 0; i < offsets.length - 1; i++) {
        gaps.push({ start: offsets[i], end: offsets[i + 1], size: offsets[i + 1] - offsets[i] });
      }
      gaps.push({ start: offsets[offsets.length - 1], end: 100, size: 100 - offsets[offsets.length - 1] });
      const largest = gaps.sort((a, b) => b.size - a.size)[0];
      newOffset = Math.round((largest.start + largest.end) / 2);
    }

    const id = `${side}:${newOffset}`;
    // Ensure unique
    const finalId = formHandles.some(h => h.id === id) ? `${side}:${newOffset + 1}` : id;
    setFormHandles([...formHandles, { id: finalId, side, offset: newOffset, originalId: finalId }]);
  };

  const removeHandle = (handleId: string) => {
    // Check if connected
    if (connectedHandleIds.has(handleId)) {
      const confirmMsg = theme === 'dark' 
        ? 'Bu bağlantı noktasına bağlı edge\'ler var. Silmek istediğinize emin misiniz? Bağlı edge\'ler de silinecektir.'
        : 'This handle has connected edges. Are you sure you want to delete it? Connected edges will also be removed.';
      if (!confirm(confirmMsg)) return;
    }
    setFormHandles(formHandles.filter(h => h.id !== handleId));
  };

  const updateHandleOffset = (handleId: string, newOffset: number) => {
    const clamped = Math.max(5, Math.min(95, newOffset));
    // Keep ID stable here during drag session
    setFormHandles(formHandles.map(h => 
      h.id === handleId 
        ? { ...h, offset: clamped }
        : h
    ));
  };

  return (
    <div
      className="fixed z-[1100] w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 select-none animate-in fade-in zoom-in-95 font-sans nodrag nopan"
      style={{
        left: position.x,
        top: position.y,
        maxHeight: 'calc(100vh - 40px)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Draggable Modal Header */}
      <div 
        onMouseDown={(e) => {
          if (e.button !== 0) return; // Only left click
          const target = e.target as HTMLElement;
          if (target.closest('button')) return; // Don't drag if clicking buttons
          
          e.stopPropagation();
          setPopoverDrag({
            startX: e.clientX,
            startY: e.clientY,
            startPosX: position.x,
            startPosY: position.y
          });
        }}
        onTouchStart={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button')) return;
          
          const touch = e.touches[0];
          setPopoverDrag({
            startX: touch.clientX,
            startY: touch.clientY,
            startPosX: position.x,
            startPosY: position.y
          });
        }}
        className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
        title={theme === 'dark' ? 'Taşımak için sürükleyin' : 'Drag to reposition'}
      >
        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 pointer-events-none">
          <Settings className="w-4 h-4 text-indigo-500" />
          {theme === 'dark' ? 'Bileşen Özellikleri' : 'Component Properties'}
        </span>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-400"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Middle Content Section */}
      <div 
        className="flex-1 pr-1 flex flex-col gap-3 min-h-0"
        style={{ overflowY: 'auto' }}
      >
        {/* Name Input */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
            {theme === 'dark' ? 'Bileşen Adı' : 'Name'}
          </label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-sans"
          />
        </div>

        {/* Type Input */}
        {properties.type !== 'section' && (
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
              {theme === 'dark' ? 'Bileşen Tipi' : 'Type'}
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer font-sans"
            >
              <option value="client">{theme === 'dark' ? 'İstemci (Client)' : 'Client'}</option>
              <option value="gateway">API Gateway</option>
              <option value="server">{theme === 'dark' ? 'Uygulama Sunucusu' : 'App Server'}</option>
              <option value="database">{theme === 'dark' ? 'Veritabanı (SQL)' : 'Database'}</option>
              <option value="cache">{theme === 'dark' ? 'Önbellek (Redis)' : 'Cache Store'}</option>
              <option value="queue">{theme === 'dark' ? 'Mesaj Kuyruğu' : 'Message Queue'}</option>
            </select>
          </div>
        )}

        {/* Theme Color Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5 font-sans">
            {theme === 'dark' ? 'Tema Rengi' : 'Theme Color'}
          </label>
          <div className="flex gap-2.5">
            {['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan'].map((color) => {
              return (
                <button
                  key={color}
                  onClick={() => setFormThemeColor(color)}
                  className={`w-5 h-5 rounded-full ${bgColors[color]} hover:scale-110 active:scale-90 transition-all cursor-pointer ${
                    formThemeColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900' : ''
                  }`}
                  title={color}
                />
              );
            })}
          </div>
        </div>

        {/* Connection Points Editor */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
              {theme === 'dark' ? 'Bağlantı Noktaları' : 'Connection Points'}
            </label>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
              {totalHandles}/{MAX_HANDLES_PER_NODE}
            </span>
          </div>

          {/* Mini Node Preview with interactive handle dragging */}
          <div 
            ref={previewRef}
            className="relative w-full h-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            {/* Node representation */}
            <div className="absolute inset-6 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
              <span className="absolute inset-0 flex items-center justify-center text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                {formName || 'Node'}
              </span>
            </div>
            {/* Handle dots on the preview - Use originalId as key to prevent DOM recreation */}
            {formHandles.map((h) => {
              const isConnected = connectedHandleIds.has(h.originalId || h.id);
              let style: React.CSSProperties = {};
              
              switch (h.side) {
                case 'top':
                  style = { left: `${6 + (h.offset / 100) * (100 - 12)}%`, top: '24px', transform: 'translate(-50%, -50%)' };
                  break;
                case 'bottom':
                  style = { left: `${6 + (h.offset / 100) * (100 - 12)}%`, bottom: '24px', transform: 'translate(-50%, 50%)' };
                  break;
                case 'left':
                  style = { left: '24px', top: `${6 + (h.offset / 100) * (100 - 12)}%`, transform: 'translate(-50%, -50%)' };
                  break;
                case 'right':
                  style = { right: '24px', top: `${6 + (h.offset / 100) * (100 - 12)}%`, transform: 'translate(50%, -50%)' };
                  break;
              }
              
              const isDragging = activeDrag?.handleId === h.id;

              return (
                <div
                  key={h.originalId || h.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setActiveDrag({ handleId: h.id, side: h.side });
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setActiveDrag({ handleId: h.id, side: h.side });
                  }}
                  className={`absolute w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-md transition-transform duration-100 hover:scale-125 cursor-grab active:cursor-grabbing ${
                    isDragging ? 'scale-125 bg-amber-500 ring-2 ring-indigo-500 z-10' : isConnected ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-500 hover:bg-indigo-600'
                  }`}
                  style={style}
                  title={`${h.side}:${h.offset}%${isConnected ? ' (connected)' : ''}`}
                />
              );
            })}
          </div>

          {/* Per-side handle list */}
          {sides.map((side) => {
            const sideHandles = formHandles
              .filter(h => h.side === side)
              .sort((a, b) => a.offset - b.offset);
            const canAdd = sideHandles.length < MAX_HANDLES_PER_SIDE && totalHandles < MAX_HANDLES_PER_NODE;

            return (
              <div key={side} className="flex flex-col gap-1 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {labels[side]} ({sideHandles.length}/{MAX_HANDLES_PER_SIDE})
                  </span>
                  <button
                    onClick={() => addHandle(side)}
                    disabled={!canAdd}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-bold transition-colors ${
                      canAdd
                        ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer'
                        : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{theme === 'dark' ? 'Ekle' : 'Add'}</span>
                  </button>
                </div>

                {sideHandles.map((h) => {
                  const isConnected = connectedHandleIds.has(h.originalId || h.id);
                  return (
                    <div key={h.originalId || h.id} className="flex items-center gap-2 pl-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        isConnected ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`} />
                      <input
                        type="range"
                        min={5}
                        max={95}
                        value={h.offset}
                        onChange={(e) => updateHandleOffset(h.id, Number(e.target.value))}
                        className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 w-8 text-right">
                        {h.offset}%
                      </span>
                      <button
                        onClick={() => removeHandle(h.id)}
                        className="p-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                        title={theme === 'dark' ? 'Sil' : 'Remove'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons - Remains static */}
      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors font-sans"
        >
          {theme === 'dark' ? 'Vazgeç' : 'Cancel'}
        </button>
        <button
          onClick={() => {
            // Apply new offset IDs now, and pass handles to canvas for edge resolution
            onApply(properties.id, formName, formType, formThemeColor, formHandles);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer transition-colors font-sans"
        >
          <Save className="w-3 h-3" />
          <span>{theme === 'dark' ? 'Uygula' : 'Apply'}</span>
        </button>
      </div>
    </div>
  );
};
