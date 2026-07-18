import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Save, FileText } from 'lucide-react';
import { createPortal } from 'react-dom';

export const StickyNoteEditorModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  
  const annotations = useAppStore((s) => s.visualData.annotations);
  const updateStickyNote = useAppStore((s) => s.updateStickyNote);
  
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [textColor, setTextColor] = useState('');
  const [opacity, setOpacity] = useState(1);
  const [alwaysVisible, setAlwaysVisible] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5000);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      const id = customEvent.detail.id;
      const note = useAppStore.getState().visualData.annotations?.[id];
      if (note) {
        setNoteId(id);
        setHeader(note.header);
        setBody(note.body);
        setBgColor(note.style.backgroundColor);
        setTextColor(note.style.textColor);
        setOpacity(note.style.opacity ?? 1);
        setAlwaysVisible(note.alwaysVisible || false);
        setStartTime(note.startTime);
        setEndTime(note.endTime);
        setIsOpen(true);
      }
    };
    window.addEventListener('canvas:editStickyNote', handleOpen);
    return () => window.removeEventListener('canvas:editStickyNote', handleOpen);
  }, []);

  const handleSave = () => {
    if (noteId) {
      updateStickyNote(noteId, {
        header,
        body,
        alwaysVisible,
        startTime,
        endTime,
        style: {
          ...(annotations?.[noteId]?.style || {}),
          backgroundColor: bgColor,
          textColor: textColor,
          opacity: opacity,
        } as any
      });
    }
    setIsOpen(false);
  };

  if (!isOpen || !noteId) return null;

  const presetColors = [
    { bg: '#fef08a', text: '#422006' }, // Yellow
    { bg: '#bbf7d0', text: '#064e3b' }, // Green
    { bg: '#bfdbfe', text: '#1e3a8a' }, // Blue
    { bg: '#fecaca', text: '#7f1d1d' }, // Red
    { bg: '#e9d5ff', text: '#4c1d95' }, // Purple
    { bg: '#f8fafc', text: '#0f172a' }, // Slate/White
    { bg: '#1e293b', text: '#f8fafc' }, // Dark
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            Sticky Note Özellikleri
          </span>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 animate-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
          
          <div className="flex flex-col gap-1.5 font-sans">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Başlık (Opsiyonel)
            </label>
            <input
              type="text"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-600 w-full font-bold text-slate-700 dark:text-slate-200"
              placeholder="Not başlığı..."
            />
          </div>

          <div className="flex flex-col gap-1.5 font-sans">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              İçerik (Markdown Destekli)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-600 w-full font-mono text-slate-700 dark:text-slate-300 resize-none"
              placeholder="**Kalın**, *eğik* veya - liste kullanabilirsiniz."
            />
          </div>

          <div className="flex flex-col gap-1.5 font-sans mt-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Renk Teması
            </label>
            <div className="flex gap-2 flex-wrap items-center">
              {presetColors.map((c, i) => (
                <button
                  key={i}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${bgColor === c.bg ? 'border-indigo-500 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c.bg }}
                  onClick={() => {
                    setBgColor(c.bg);
                    setTextColor(c.text);
                  }}
                />
              ))}
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
              <div className="flex items-center gap-1.5" title="Özel Arka Plan Rengi">
                <input
                  type="color"
                  value={bgColor.startsWith('#') ? bgColor.slice(0, 7) : '#fef08a'}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                />
              </div>
              <div className="flex items-center gap-1.5" title="Özel Metin Rengi">
                <input
                  type="color"
                  value={textColor.startsWith('#') ? textColor.slice(0, 7) : '#422006'}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 font-sans mt-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Şeffaflık (Opacity)
              </label>
              <span className="text-[10px] text-slate-500 font-mono">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-1 flex flex-col gap-3 font-sans">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Zaman Çizelgesi Görünürlüğü
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer w-max">
              <input
                type="checkbox"
                checked={alwaysVisible}
                onChange={(e) => setAlwaysVisible(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Her Zaman Görünür</span>
            </label>

            {!alwaysVisible && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Başlangıç Zamanı (ms)
                  </label>
                  <input
                    type="number"
                    value={startTime}
                    onChange={(e) => setStartTime(Number(e.target.value))}
                    className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-600 w-full font-bold text-slate-700 dark:text-slate-200"
                    min={0}
                    step={100}
                  />
                </div>
                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Bitiş Zamanı (ms)
                  </label>
                  <input
                    type="number"
                    value={endTime}
                    onChange={(e) => setEndTime(Number(e.target.value))}
                    className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-600 w-full font-bold text-slate-700 dark:text-slate-200"
                    min={0}
                    step={100}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-2 font-sans pt-1">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Kaydet</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

