import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, X, Save, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { HandleConfig, PortSide } from '../../types';
import { resolveHandles, MAX_HANDLES_PER_SIDE, MAX_HANDLES_PER_NODE } from '../../utils/portUtils';

interface PropertiesPanelProps {
  activeNode: {
    id: string;
    name: string;
    type: string;
    theme: string;
    handles?: HandleConfig[];
    displayMode?: 'default' | 'icon-only';
    rotation?: number;
    customStyles?: any;
  } | null;
  activeEdge: {
    id: string;
    protocol: string;
    isAsync: boolean;
    stepNumber: number;
    duration: number;
    delay: number;
    tooltipText: string;
    tooltipDuration: number;
    description?: string;
    particleType?: 'circle' | 'arrow' | 'envelope';
    isNew?: boolean;
  } | null;
  onCloseNode: () => void;
  onApplyNode: (id: string, name: string, type: string, theme: string, handles?: HandleConfig[], displayMode?: 'default' | 'icon-only', rotation?: number, customStyles?: any) => void;
  onCloseEdge: () => void;
  onApplyEdge: (
    id: string,
    protocol: string,
    isAsync: boolean,
    duration: number,
    delay: number,
    tooltipText: string,
    tooltipDuration: number,
    description: string,
    particleType: 'circle' | 'arrow' | 'envelope' | undefined,
    stepNumber: number,
    direction: 'forward' | 'reverse',
    isRoundTrip: boolean
  ) => void;
  onCancelEdge?: () => void;
}

const SIDE_LABELS: Record<string, Record<PortSide, string>> = {
  dark: { top: 'Üst', right: 'Sağ', bottom: 'Alt', left: 'Sol' },
  light: { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' },
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  activeNode,
  activeEdge,
  onCloseNode,
  onApplyNode,
  onCloseEdge,
  onApplyEdge,
  onCancelEdge,
}) => {
  const theme = useAppStore((state) => state.theme);
  const logicalData = useAppStore((state) => state.logicalData);
  const maxSteps = useAppStore((state) => state.maxSteps);

  // --- Node State ---
  const [nodeName, setNodeName] = useState('');
  const [nodeType, setNodeType] = useState('server');
  const [nodeThemeColor, setNodeThemeColor] = useState('indigo');
  const [nodeHandles, setNodeHandles] = useState<HandleConfig[]>([]);
  const [displayMode, setDisplayMode] = useState<'default' | 'icon-only'>('default');
  const [rotation, setRotation] = useState<number>(0);
  const [customStyles, setCustomStyles] = useState<any>({});
  
  const [activeDrag, setActiveDrag] = useState<{ handleId: string; side: PortSide } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeNode) {
      setNodeName(activeNode.name);
      setNodeType(activeNode.type);
      setNodeThemeColor(activeNode.theme);
      const resolved = resolveHandles(activeNode.handles).map(h => ({
        ...h,
        originalId: h.originalId || h.id
      }));
      setNodeHandles(resolved);
      setDisplayMode(activeNode.displayMode ?? 'default');
      setRotation(activeNode.rotation ?? 0);
      setCustomStyles(activeNode.customStyles ?? {});
    }
  }, [activeNode]);

  // --- Edge State ---
  const [protocol, setProtocol] = useState('');
  const [isAsync, setIsAsync] = useState(false);
  const [stepNumber, setStepNumber] = useState(1);
  const [duration, setDuration] = useState(1000);
  const [delay, setDelay] = useState(0);
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipDuration, setTooltipDuration] = useState(1000);
  const [formDirection, setFormDirection] = useState<'forward' | 'reverse'>('forward');
  const [formRoundTrip, setFormRoundTrip] = useState(false);
  const [description, setDescription] = useState('');
  const [particleType, setParticleType] = useState<'circle' | 'arrow' | 'envelope'>('circle');

  useEffect(() => {
    if (activeEdge) {
      setProtocol(activeEdge.protocol);
      setIsAsync(activeEdge.isAsync);
      setStepNumber(activeEdge.stepNumber);
      setDuration(activeEdge.duration);
      setDelay(activeEdge.delay);
      setTooltipText(activeEdge.tooltipText);
      setTooltipDuration(activeEdge.tooltipDuration);
      setDescription(activeEdge.description ?? '');
      setParticleType(activeEdge.particleType ?? 'circle');

      const seq = logicalData.sequences.find((s) => s.edgeId === activeEdge.id);
      setFormRoundTrip(seq?.isRoundTrip ?? false);
    }
  }, [activeEdge, logicalData.sequences]);

  // --- Node Dragging Logic ---
  useEffect(() => {
    if (!activeDrag || !previewRef.current) return;

    const handleMove = (clientX: number, clientY: number) => {
      const rect = previewRef.current!.getBoundingClientRect();
      const { side, handleId } = activeDrag;
      
      let percent = 50;
      if (side === 'top' || side === 'bottom') {
        const x = clientX - rect.left - 24;
        const width = rect.width - 48;
        percent = Math.round((x / width) * 100);
      } else {
        const y = clientY - rect.top - 24;
        const height = rect.height - 48;
        percent = Math.round((y / height) * 100);
      }
      const clamped = Math.max(5, Math.min(95, percent));
      setNodeHandles(prev => prev.map(h => 
        h.id === handleId ? { ...h, offset: clamped } : h
      ));
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleDragEnd = () => setActiveDrag(null);

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

  const connectedHandleIds = useMemo(() => {
    if (!activeNode) return new Set<string>();
    const nodeId = activeNode.id;
    const connected = new Set<string>();
    logicalData.edges.forEach(e => {
      const ve = (useAppStore.getState().visualData.layoutEdges ?? {})[e.id];
      if (e.sourceId === nodeId && ve?.sourceHandle) connected.add(ve.sourceHandle);
      if (e.targetId === nodeId && ve?.targetHandle) connected.add(ve.targetHandle);
    });
    return connected;
  }, [activeNode, logicalData.edges]);

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

  const handleApplyNodeLocal = () => {
    if (!activeNode) return;
    onApplyNode(activeNode.id, nodeName, nodeType, nodeThemeColor, nodeHandles, displayMode, rotation, customStyles);
  };

  const handleApplyEdgeLocal = () => {
    if (!activeEdge) return;
    onApplyEdge(
      activeEdge.id,
      protocol,
      isAsync,
      duration,
      delay,
      tooltipText,
      tooltipDuration,
      description,
      particleType,
      stepNumber,
      formDirection,
      formRoundTrip
    );
  };

  if (!activeNode && !activeEdge) return null;

  return (
    <div
      className="absolute top-4 right-4 bottom-4 w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans select-none animate-in slide-in-from-right-8 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-500" />
            {activeNode ? (theme === 'dark' ? 'Bileşen Özellikleri' : 'Component Properties') : (theme === 'dark' ? 'Bağlantı Özellikleri' : 'Edge Properties')}
          </span>
          <button 
            onClick={activeNode ? onCloseNode : (activeEdge?.isNew ? onCancelEdge : onCloseEdge)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          
          {/* Node Properties */}
          {activeNode && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {theme === 'dark' ? 'Bileşen Adı' : 'Name'}
                </label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              {activeNode.type !== 'section' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {theme === 'dark' ? 'Bileşen Tipi' : 'Type'}
                  </label>
                  <select
                    value={nodeType}
                    onChange={(e) => setNodeType(e.target.value)}
                    className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="client">{theme === 'dark' ? 'İstemci (Client)' : 'Client'}</option>
                    <option value="load_balancer">{theme === 'dark' ? 'Yük Dengeleyici (LB)' : 'Load Balancer'}</option>
                    <option value="gateway">API Gateway</option>
                    <option value="firewall">{theme === 'dark' ? 'Güvenlik Duvarı' : 'Firewall / WAF'}</option>
                    <option value="server">{theme === 'dark' ? 'Uygulama Sunucusu' : 'App Server'}</option>
                    <option value="database">{theme === 'dark' ? 'Veritabanı (SQL)' : 'Database'}</option>
                    <option value="cache">{theme === 'dark' ? 'Önbellek (Redis)' : 'Cache Store'}</option>
                    <option value="queue">{theme === 'dark' ? 'Mesaj Kuyruğu' : 'Message Queue'}</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                  {theme === 'dark' ? 'Tema Rengi' : 'Theme Color'}
                </label>
                <div className="flex gap-2.5">
                  {['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNodeThemeColor(color)}
                      className={`w-6 h-6 rounded-full ${bgColors[color]} hover:scale-110 active:scale-90 transition-all cursor-pointer ${
                        nodeThemeColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900' : ''
                      }`}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                  {theme === 'dark' ? 'Görünüm Modu' : 'Display Mode'}
                </label>
                <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button
                    onClick={() => setDisplayMode('default')}
                    className={`flex-1 py-1 text-xs rounded-lg font-semibold transition-colors ${displayMode === 'default' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {theme === 'dark' ? 'Standart' : 'Default'}
                  </button>
                  <button
                    onClick={() => setDisplayMode('icon-only')}
                    className={`flex-1 py-1 text-xs rounded-lg font-semibold transition-colors ${displayMode === 'icon-only' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {theme === 'dark' ? 'Sadece İkon' : 'Icon Only'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {theme === 'dark' ? 'Yönelim' : 'Orientation'}
                </label>
                <div className="flex p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRotation(0)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                      rotation === 0
                        ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {/* Horizontal icon */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <rect x="1" y="4" width="12" height="6" rx="1.5"/>
                      <line x1="3.5" y1="7" x2="10.5" y2="7"/>
                    </svg>
                    {theme === 'dark' ? 'Yatay' : 'Horizontal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation(90)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                      rotation === 90
                        ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {/* Vertical icon */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <rect x="4" y="1" width="6" height="12" rx="1.5"/>
                      <line x1="7" y1="3.5" x2="7" y2="10.5"/>
                    </svg>
                    {theme === 'dark' ? 'Dikey' : 'Vertical'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                  {theme === 'dark' ? 'Özel Stil (Gelişmiş)' : 'Custom Styling'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500">Arka Plan Rengi</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={customStyles.backgroundColor || '#ffffff'} 
                        onChange={(e) => setCustomStyles({...customStyles, backgroundColor: e.target.value})}
                        className="w-6 h-6 rounded cursor-pointer p-0 border-0" 
                      />
                      <button 
                        onClick={() => { const s = {...customStyles}; delete s.backgroundColor; setCustomStyles(s); }}
                        className="text-[9px] text-rose-500 hover:underline"
                      >Temizle</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500">Çizgi Rengi</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={customStyles.borderColor || '#000000'} 
                        onChange={(e) => setCustomStyles({...customStyles, borderColor: e.target.value})}
                        className="w-6 h-6 rounded cursor-pointer p-0 border-0" 
                      />
                      <button 
                        onClick={() => { const s = {...customStyles}; delete s.borderColor; setCustomStyles(s); }}
                        className="text-[9px] text-rose-500 hover:underline"
                      >Temizle</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {theme === 'dark' ? 'Bağlantı Noktaları' : 'Connection Points'}
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {nodeHandles.length}/{MAX_HANDLES_PER_NODE}
                  </span>
                </div>

                <div 
                  ref={previewRef}
                  className="relative w-full h-28 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-1"
                >
                  <div className="absolute inset-6 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                      {nodeName || 'Node'}
                    </span>
                  </div>
                  {nodeHandles.map((h) => {
                    const isConnected = connectedHandleIds.has(h.originalId || h.id);
                    let style: React.CSSProperties = {};
                    switch (h.side) {
                      case 'top': style = { left: `${6 + (h.offset / 100) * 88}%`, top: '24px', transform: 'translate(-50%, -50%)' }; break;
                      case 'bottom': style = { left: `${6 + (h.offset / 100) * 88}%`, bottom: '24px', transform: 'translate(-50%, 50%)' }; break;
                      case 'left': style = { left: '24px', top: `${6 + (h.offset / 100) * 88}%`, transform: 'translate(-50%, -50%)' }; break;
                      case 'right': style = { right: '24px', top: `${6 + (h.offset / 100) * 88}%`, transform: 'translate(50%, -50%)' }; break;
                    }
                    const isDragging = activeDrag?.handleId === h.id;

                    return (
                      <div
                        key={h.originalId || h.id}
                        onMouseDown={(e) => { e.stopPropagation(); setActiveDrag({ handleId: h.id, side: h.side }); }}
                        onTouchStart={(e) => { e.stopPropagation(); setActiveDrag({ handleId: h.id, side: h.side }); }}
                        className={`absolute w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-md transition-transform duration-100 hover:scale-125 cursor-grab active:cursor-grabbing ${
                          isDragging ? 'scale-125 bg-amber-500 ring-2 ring-indigo-500 z-10' : isConnected ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-500 hover:bg-indigo-600'
                        }`}
                        style={style}
                        title={`${h.side}:${h.offset}%`}
                      />
                    );
                  })}
                </div>

                {sides.map((side) => {
                  const sideHandles = nodeHandles.filter(h => h.side === side).sort((a, b) => a.offset - b.offset);
                  const canAdd = sideHandles.length < MAX_HANDLES_PER_SIDE && nodeHandles.length < MAX_HANDLES_PER_NODE;
                  return (
                    <div key={side} className="flex flex-col gap-1.5 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {labels[side]} ({sideHandles.length}/{MAX_HANDLES_PER_SIDE})
                        </span>
                        <button
                          onClick={() => {
                            if (!canAdd) return;
                            const offsets = sideHandles.map(h => h.offset).sort((a, b) => a - b);
                            let newOffset = 50;
                            if (offsets.length > 0) {
                              const gaps = [{ start: 0, end: offsets[0], size: offsets[0] }];
                              for (let i = 0; i < offsets.length - 1; i++) gaps.push({ start: offsets[i], end: offsets[i + 1], size: offsets[i + 1] - offsets[i] });
                              gaps.push({ start: offsets[offsets.length - 1], end: 100, size: 100 - offsets[offsets.length - 1] });
                              const largest = gaps.sort((a, b) => b.size - a.size)[0];
                              newOffset = Math.round((largest.start + largest.end) / 2);
                            }
                            const id = `${side}:${newOffset}`;
                            const finalId = nodeHandles.some(h => h.id === id) ? `${side}:${newOffset + 1}` : id;
                            setNodeHandles([...nodeHandles, { id: finalId, side, offset: newOffset, originalId: finalId }]);
                          }}
                          disabled={!canAdd}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            canAdd ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
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
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                            <input
                              type="range" min={5} max={95} value={h.offset}
                              onChange={(e) => setNodeHandles(nodeHandles.map(nh => nh.id === h.id ? { ...nh, offset: Number(e.target.value) } : nh))}
                              className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 w-8 text-right">{h.offset}%</span>
                            <button
                              onClick={() => {
                                if (connectedHandleIds.has(h.id)) {
                                  if (!confirm(theme === 'dark' ? 'Bağlı edge\'ler var, emin misiniz?' : 'Has connected edges, are you sure?')) return;
                                }
                                setNodeHandles(nodeHandles.filter(nh => nh.id !== h.id));
                              }}
                              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Edge Properties */}
          {activeEdge && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {theme === 'dark' ? 'Protokol' : 'Protocol'}
                </label>
                <input
                  type="text"
                  placeholder="örn: HTTP, HTTPS, gRPC, WebSocket"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {theme === 'dark' ? 'İşlem Sırası' : 'Step'}
                  </label>
                  <select
                    value={stepNumber}
                    onChange={(e) => setStepNumber(Number(e.target.value))}
                    className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer font-bold"
                  >
                    {Array.from({ length: maxSteps }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>Step {n}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 justify-center">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {theme === 'dark' ? 'Asenkron Akış' : 'Async Mode'}
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input type="checkbox" checked={isAsync} onChange={(e) => setIsAsync(e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {theme === 'dark' ? 'Simülasyon Modu' : 'Simulation Mode'}
                </label>
                
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={formRoundTrip} onChange={(e) => setFormRoundTrip(e.target.checked)} className="accent-indigo-600 rounded cursor-pointer w-4 h-4" />
                  <span className="font-semibold">{theme === 'dark' ? 'Gidiş-Dönüş (Gecikmeli)' : 'Round-Trip'}</span>
                </label>

                <div className={`flex gap-4 pl-6 transition-opacity duration-150 ${formRoundTrip ? 'opacity-40 pointer-events-none' : ''}`}>
                  <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input type="radio" name="direction" disabled={formRoundTrip} checked={formDirection === 'forward'} onChange={() => setFormDirection('forward')} className="accent-indigo-600 cursor-pointer w-4 h-4" />
                    <span>{theme === 'dark' ? 'İleri (A ➔ B)' : 'Forward (A ➔ B)'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input type="radio" name="direction" disabled={formRoundTrip} checked={formDirection === 'reverse'} onChange={() => setFormDirection('reverse')} className="accent-indigo-600 cursor-pointer w-4 h-4" />
                    <span>{theme === 'dark' ? 'Geri (B ➔ A)' : 'Reverse (B ➔ A)'}</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {theme === 'dark' ? 'Süre (ms)' : 'Duration (ms)'}
                  </label>
                  <input type="number" min="50" value={duration} onChange={(e) => setDuration(Math.max(50, Number(e.target.value)))} className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {theme === 'dark' ? 'Gecikme (ms)' : 'Delay (ms)'}
                  </label>
                  <input type="number" min="0" value={delay} onChange={(e) => setDelay(Math.max(0, Number(e.target.value)))} className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {theme === 'dark' ? 'Tooltip (Bileşen İçi)' : 'Internal Process Tooltip'}
                </label>
                <input type="text" placeholder="örn: Veri İşleniyor..." value={tooltipText} onChange={(e) => setTooltipText(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 mb-1" />
                <input type="number" placeholder="Süre (ms)" min="100" value={tooltipDuration} onChange={(e) => setTooltipDuration(Math.max(100, Number(e.target.value)))} className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200" />
              </div>

              <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {theme === 'dark' ? 'Parçacık Tipi' : 'Particle Type'}
                </label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="particleType" checked={particleType === 'circle'} onChange={() => setParticleType('circle')} className="accent-indigo-600" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">Nokta</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="particleType" checked={particleType === 'arrow'} onChange={() => setParticleType('arrow')} className="accent-indigo-600" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">Ok</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="particleType" checked={particleType === 'envelope'} onChange={() => setParticleType('envelope')} className="accent-indigo-600" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">Zarf</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {theme === 'dark' ? 'Akış Açıklaması' : 'Flow Description'}
                </label>
                <textarea rows={3} placeholder={theme === 'dark' ? 'Bu adımda gerçekleşen işlem açıklaması...' : 'Step description...'} value={description} onChange={(e) => setDescription(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 resize-none" />
              </div>
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0 flex gap-2 justify-end">
          {activeEdge?.isNew && (
            <button
              onClick={onCancelEdge}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {theme === 'dark' ? 'Sil' : 'Discard'}
            </button>
          )}
          <button
            onClick={activeNode ? handleApplyNodeLocal : handleApplyEdgeLocal}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{theme === 'dark' ? 'Uygula' : 'Apply'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
