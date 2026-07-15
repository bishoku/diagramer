import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ShapeLayer, ShapeType } from '../../types';
import { StudioHeader } from './StudioHeader';
import { StudioSidebar } from './StudioSidebar';
import { StudioCanvas } from './StudioCanvas';
import { StudioInspector } from './StudioInspector';
import { translations, Language } from '../../i18n/translations';

export const ComponentStudio: React.FC = () => {
  const activeComponent = useAppStore((s: any) => s.activeComponent);
  const selectedLayerId = useAppStore((s: any) => s.selectedLayerId);
  const language = useAppStore((s: any) => s.language) as Language;
  const t = translations[language];
  
  const setView = useAppStore((s: any) => s.setView);
  const setActiveComponent = useAppStore((s: any) => s.setActiveComponent);
  const setSelectedLayerId = useAppStore((s: any) => s.setSelectedLayerId);
  const addLayer = useAppStore((s: any) => s.addLayer);
  const updateLayer = useAppStore((s: any) => s.updateLayer);
  const deleteLayer = useAppStore((s: any) => s.deleteLayer);
  const reorderLayers = useAppStore((s: any) => s.reorderLayers);
  const saveComponentToLibrary = useAppStore((s: any) => s.saveComponentToLibrary);

  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  if (!activeComponent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-955 font-sans">
        <span className="text-sm font-semibold text-slate-550">
          No component loaded in Studio.
        </span>
        <button 
          onClick={() => setView('diagram')} 
          className="mt-4 px-4 py-2 bg-indigo-650 text-white rounded-xl text-xs font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Helper to add shape layer with defaults
  const handleAddShape = (type: ShapeType) => {
    const layerCount = activeComponent.layers.length;
    const defaultStyles: Record<ShapeType, any> = {
      rectangle: { fill: '#6366f1', stroke: '#4f46e5', strokeWidth: 2, opacity: 1, rx: 8, rotation: 0 },
      circle: { fill: '#10b981', stroke: '#059669', strokeWidth: 2, opacity: 1, rotation: 0 },
      text: { fill: '#1e293b', opacity: 1, rotation: 0 },
      image: { opacity: 1, rotation: 0 },
    };

    const newLayer: ShapeLayer = {
      id: `layer-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      name: `Katman ${layerCount + 1} (${type === 'rectangle' ? 'Kutu' : type === 'circle' ? 'Daire' : type === 'text' ? 'Metin' : 'Görsel'})`,
      zIndex: layerCount,
      x: 30 + (layerCount * 10) % 50,
      y: 30 + (layerCount * 10) % 50,
      width: type === 'text' ? 100 : 60,
      height: type === 'text' ? 24 : 60,
      style: defaultStyles[type] || { opacity: 1 },
      content: type === 'text' ? 'Metin' : '',
    };

    addLayer(newLayer);
    setSelectedLayerId(newLayer.id);
  };

  // Convert uploaded image to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, layerId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateLayer(layerId, { content: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag shapes inside studio canvas
  const handleSvgMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    setSelectedLayerId(layerId);

    const layer = activeComponent.layers.find((l: ShapeLayer) => l.id === layerId);
    if (!layer) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = layer.x;
    const initialY = layer.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.round(moveEvent.clientX - startX);
      const deltaY = Math.round(moveEvent.clientY - startY);

      // Bound position to component dimensions
      const nextX = Math.max(0, Math.min(initialX + deltaX, activeComponent.dimensions.width - layer.width));
      const nextY = Math.max(0, Math.min(initialY + deltaY, activeComponent.dimensions.height - layer.height));

      updateLayer(layerId, {
        x: nextX,
        y: nextY,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Resize shapes inside studio canvas
  const handleResizeMouseDown = (e: React.MouseEvent, layerId: string, handleType: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    e.preventDefault();

    const layer = activeComponent.layers.find((l: ShapeLayer) => l.id === layerId);
    if (!layer) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = layer.x;
    const initialY = layer.y;
    const initialW = layer.width;
    const initialH = layer.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.round(moveEvent.clientX - startX);
      const deltaY = Math.round(moveEvent.clientY - startY);

      let nextX = initialX;
      let nextY = initialY;
      let nextW = initialW;
      let nextH = initialH;

      switch (handleType) {
        case 'br':
          nextW = Math.max(10, initialW + deltaX);
          nextH = Math.max(10, initialH + deltaY);
          break;
        case 'bl':
          const possibleW_bl = initialW - deltaX;
          if (possibleW_bl >= 10) {
            nextX = initialX + deltaX;
            nextW = possibleW_bl;
          }
          nextH = Math.max(10, initialH + deltaY);
          break;
        case 'tr':
          nextW = Math.max(10, initialW + deltaX);
          const possibleH_tr = initialH - deltaY;
          if (possibleH_tr >= 10) {
            nextY = initialY + deltaY;
            nextH = possibleH_tr;
          }
          break;
        case 'tl':
          const possibleW_tl = initialW - deltaX;
          const possibleH_tl = initialH - deltaY;
          if (possibleW_tl >= 10) {
            nextX = initialX + deltaX;
            nextW = possibleW_tl;
          }
          if (possibleH_tl >= 10) {
            nextY = initialY + deltaY;
            nextH = possibleH_tl;
          }
          break;
      }

      updateLayer(layerId, {
        x: Math.max(0, nextX),
        y: Math.max(0, nextY),
        width: nextW,
        height: nextH
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // HTML5 Drag & Drop handlers for real-time layer reordering using stable IDs
  const handleLayerDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === null || draggedId === id) return;

    // Find indices of dragged and target layers in sorted layers list
    const layers = [...activeComponent.layers].sort((a: ShapeLayer, b: ShapeLayer) => a.zIndex - b.zIndex);
    const sourceIdx = layers.findIndex(l => l.id === draggedId);
    const targetIdx = layers.findIndex(l => l.id === id);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      reorderLayers(sourceIdx, targetIdx);
    }
  };

  const handleLayerDragEnd = () => {
    setDraggedId(null);
  };

  // Save changes to library
  const handleSave = async () => {
    if (!activeComponent.name.trim()) {
      setError(t.enterComponentNameError);
      return;
    }
    setError(null);
    await saveComponentToLibrary();
    setActiveComponent(null);
    setView('diagram');
  };

  const moveLayerUp = (index: number) => {
    if (index === activeComponent.layers.length - 1) return;
    reorderLayers(index, index + 1);
  };

  const moveLayerDown = (index: number) => {
    if (index === 0) return;
    reorderLayers(index, index - 1);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-955 transition-colors duration-300 font-sans">
      <StudioHeader
        name={activeComponent.name}
        category={activeComponent.category}
        width={activeComponent.dimensions.width}
        height={activeComponent.dimensions.height}
        error={error}
        onBack={() => {
          setActiveComponent(null);
          setView('diagram');
        }}
        onNameChange={(val) => useAppStore.setState((s: any) => ({
          activeComponent: { ...s.activeComponent, name: val }
        }))}
        onCategoryChange={(val) => useAppStore.setState((s: any) => ({
          activeComponent: { ...s.activeComponent, category: val }
        }))}
        onWidthChange={(val) => useAppStore.setState((s: any) => ({
          activeComponent: { 
            ...s.activeComponent, 
            dimensions: { ...s.activeComponent.dimensions, width: val } 
          }
        }))}
        onHeightChange={(val) => useAppStore.setState((s: any) => ({
          activeComponent: { 
            ...s.activeComponent, 
            dimensions: { ...s.activeComponent.dimensions, height: val } 
          }
        }))}
        onSave={handleSave}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <StudioSidebar onAddShape={handleAddShape} />
        
        <StudioCanvas
          width={activeComponent.dimensions.width}
          height={activeComponent.dimensions.height}
          layers={activeComponent.layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onSvgMouseDown={handleSvgMouseDown}
          onResizeMouseDown={handleResizeMouseDown}
        />

        <StudioInspector
          layers={activeComponent.layers}
          selectedLayerId={selectedLayerId}
          draggedId={draggedId}
          onSelectLayer={setSelectedLayerId}
          onLayerDragStart={handleLayerDragStart}
          onLayerDragOver={handleLayerDragOver}
          onLayerDragEnd={handleLayerDragEnd}
          onMoveLayerUp={moveLayerUp}
          onMoveLayerDown={moveLayerDown}
          onDeleteLayer={deleteLayer}
          onUpdateLayer={updateLayer}
          onImageUpload={handleImageUpload}
          totalLayersCount={activeComponent.layers.length}
        />
      </div>
    </div>
  );
};
