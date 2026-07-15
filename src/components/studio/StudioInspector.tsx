import React from 'react';
import { Move, ArrowUp, ArrowDown, Trash2, Image as ImageIcon } from 'lucide-react';
import { ShapeLayer } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface StudioInspectorProps {
  layers: ShapeLayer[];
  selectedLayerId: string | null;
  draggedId: string | null;
  onSelectLayer: (id: string | null) => void;
  onLayerDragStart: (e: React.DragEvent, id: string) => void;
  onLayerDragOver: (e: React.DragEvent, id: string) => void;
  onLayerDragEnd: () => void;
  onMoveLayerUp: (index: number) => void;
  onMoveLayerDown: (index: number) => void;
  onDeleteLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<ShapeLayer>) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, layerId: string) => void;
  totalLayersCount: number;
}

export const StudioInspector: React.FC<StudioInspectorProps> = ({
  layers,
  selectedLayerId,
  draggedId,
  onSelectLayer,
  onLayerDragStart,
  onLayerDragOver,
  onLayerDragEnd,
  onMoveLayerUp,
  onMoveLayerDown,
  onDeleteLayer,
  onUpdateLayer,
  onImageUpload,
  totalLayersCount,
}) => {
  const language = useAppStore((state) => state.language);
  const t = translations[language];
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const layersListDescending = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex flex-col overflow-hidden shrink-0">
      {/* Top Half: Layers Panel */}
      <div className="flex-1 flex flex-col border-b border-slate-200 dark:border-slate-800 p-4 min-h-[220px] overflow-hidden">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 shrink-0">
          {t.layersListTitle}
        </span>

        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
          {layersListDescending.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-slate-400 italic text-[11px] text-center">
              {t.noLayers}
            </div>
          ) : (
            layersListDescending.map((layer) => {
              const originalIdx = layers.findIndex((l) => l.id === layer.id);
              const isSelected = selectedLayerId === layer.id;
              
              return (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(e) => onLayerDragStart(e, layer.id)}
                  onDragOver={(e) => onLayerDragOver(e, layer.id)}
                  onDragEnd={onLayerDragEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLayer(layer.id);
                  }}
                  className={`px-3 py-2 border rounded-xl flex items-center justify-between cursor-pointer group transition-all duration-150 ${
                    isSelected 
                      ? 'border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-500/10' 
                      : 'border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  } ${draggedId === layer.id ? 'opacity-40 bg-slate-100/50 dark:bg-slate-800/50 border-dashed border-indigo-500' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Move className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold truncate text-slate-700 dark:text-slate-350">
                      {layer.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayerUp(originalIdx);
                      }}
                      disabled={originalIdx === totalLayersCount - 1}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Katmanı Üste Taşı"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayerDown(originalIdx);
                      }}
                      disabled={originalIdx === 0}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Katmanı Alta Taşı"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(layer.id);
                      }}
                      className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Half: Property Inspector */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
          {t.attributesInspectorTitle}
        </span>

        {!selectedLayer ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-slate-400 italic text-[11px] text-center">
            {t.selectLayerPrompt}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* Layer Rename */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {t.layerTitle}
              </label>
              <input
                type="text"
                value={selectedLayer.name}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { name: e.target.value })}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-bold"
              />
            </div>

            {/* X & Y position / width / height */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  X ({language === 'tr' ? 'Koordinat' : 'Coord'})
                </label>
                <input
                  type="number"
                  value={selectedLayer.x}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Y ({language === 'tr' ? 'Koordinat' : 'Coord'})
                </label>
                <input
                  type="number"
                  value={selectedLayer.y}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t.widthW}
                </label>
                <input
                  type="number"
                  value={selectedLayer.width}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { width: Math.max(1, Number(e.target.value)) })}
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t.heightH}
                </label>
                <input
                  type="number"
                  value={selectedLayer.height}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { height: Math.max(1, Number(e.target.value)) })}
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t.rotationDeg}
                </label>
                <input
                  type="number"
                  value={selectedLayer.style.rotation ?? 0}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, {
                    style: { ...selectedLayer.style, rotation: Number(e.target.value) % 360 }
                  })}
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Opacity slider */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                <span>{t.opacity}</span>
                <span>{Math.round((selectedLayer.style.opacity ?? 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={selectedLayer.style.opacity ?? 1}
                onChange={(e) => onUpdateLayer(selectedLayer.id, {
                  style: { ...selectedLayer.style, opacity: Number(e.target.value) }
                })}
                className="w-full accent-indigo-650 cursor-pointer mt-1"
              />
            </div>

            {/* Content based fields (Text and Image) */}
            {selectedLayer.type === 'text' && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t.textValue}
                </label>
                <input
                  type="text"
                  value={selectedLayer.content || ''}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { content: e.target.value })}
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-250 font-bold"
                />
              </div>
            )}

            {selectedLayer.type === 'image' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t.chooseImageAsset}
                </label>
                <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                  <span className="text-[10px] font-semibold text-indigo-555 dark:text-indigo-400">
                    {selectedLayer.content ? t.changeImage : t.uploadImage}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onImageUpload(e, selectedLayer.id)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Colors (Fill and Stroke) */}
            {selectedLayer.type !== 'image' && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t.fillColor}
                  </label>
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-0.5">
                    <input
                      type="color"
                      value={selectedLayer.style.fill || '#000000'}
                      onChange={(e) => onUpdateLayer(selectedLayer.id, {
                        style: { ...selectedLayer.style, fill: e.target.value }
                      })}
                      className="w-5 h-5 border-0 bg-transparent cursor-pointer rounded"
                    />
                    <span className="text-[10px] font-mono select-all truncate w-full uppercase">
                      {selectedLayer.style.fill || 'None'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t.strokeColor}
                  </label>
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-0.5">
                    <input
                      type="color"
                      value={selectedLayer.style.stroke || '#000000'}
                      onChange={(e) => onUpdateLayer(selectedLayer.id, {
                        style: { ...selectedLayer.style, stroke: e.target.value }
                      })}
                      className="w-5 h-5 border-0 bg-transparent cursor-pointer rounded"
                    />
                    <span className="text-[10px] font-mono select-all truncate w-full uppercase">
                      {selectedLayer.style.stroke || 'None'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Border properties (StrokeWidth & BorderRadius rx for rectangles) */}
            {selectedLayer.type !== 'image' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t.strokeWidth}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedLayer.style.strokeWidth ?? 0}
                    onChange={(e) => onUpdateLayer(selectedLayer.id, {
                      style: { ...selectedLayer.style, strokeWidth: Number(e.target.value) }
                    })}
                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {selectedLayer.type === 'rectangle' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                      {t.cornerRadius}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={selectedLayer.style.rx ?? 0}
                      onChange={(e) => onUpdateLayer(selectedLayer.id, {
                        style: { ...selectedLayer.style, rx: Number(e.target.value) }
                      })}
                      className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
