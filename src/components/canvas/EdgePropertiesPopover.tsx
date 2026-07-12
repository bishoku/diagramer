import React, { useState, useEffect } from 'react';
import { Settings, X, Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface EdgePropertiesPopoverProps {
  properties: {
    id: string;
    x: number;
    y: number;
    protocol: string;
    isAsync: boolean;
    stepNumber: number;
    duration: number;
    delay: number;
    tooltipText: string;
    tooltipDuration: number;
    description?: string;
    isNew?: boolean;
  } | null;
  onClose: () => void;
  onCancel?: () => void;
}

export const EdgePropertiesPopover: React.FC<EdgePropertiesPopoverProps> = ({
  properties,
  onClose,
  onCancel,
}) => {
  const { 
    theme, 
    logicalData, 
    updateEdgeDetails, 
    setSequenceStepOrder,
    setSequenceStepDirection,
    setSequenceStepRoundTrip
  } = useAppStore();

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

  useEffect(() => {
    if (properties) {
      setProtocol(properties.protocol);
      setIsAsync(properties.isAsync);
      setStepNumber(properties.stepNumber);
      setDuration(properties.duration);
      setDelay(properties.delay);
      setTooltipText(properties.tooltipText);
      setTooltipDuration(properties.tooltipDuration);
      setDescription(properties.description ?? '');

      const seq = logicalData.sequences.find((s) => s.edgeId === properties.id);
      setFormDirection(seq?.direction ?? 'forward');
      setFormRoundTrip(seq?.isRoundTrip ?? false);
    }
  }, [properties, logicalData.sequences]);

  if (!properties) return null;

  const handleApply = () => {
    updateEdgeDetails(
      properties.id,
      protocol,
      isAsync,
      duration,
      delay,
      tooltipText,
      tooltipDuration,
      description
    );

    const seq = logicalData.sequences.find((s) => s.edgeId === properties.id);
    if (seq) {
      if (seq.stepNumber !== stepNumber) {
        setSequenceStepOrder(seq.id, stepNumber);
      }
      setSequenceStepDirection(seq.id, formDirection);
      setSequenceStepRoundTrip(seq.id, formRoundTrip);
    }

    onClose();
  };

  return (
    <div
      className="fixed z-[1100] w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 select-none animate-in fade-in zoom-in-95 font-sans"
      style={{
        left: Math.min(properties.x, window.innerWidth - 340),
        top: Math.min(properties.y, window.innerHeight - 420),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-indigo-500" />
          {theme === 'dark' ? 'Bağlantı Özellikleri' : 'Connection Properties'}
        </span>
        <button 
          onClick={onCancel || onClose}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-400"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
        {/* Protocol */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
            {theme === 'dark' ? 'Protokol' : 'Protocol'}
          </label>
          <input
            type="text"
            placeholder="örn: HTTP, HTTPS, gRPC, WebSocket"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-sans"
          />
        </div>

        {/* Step Order & Async Flow */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
              {theme === 'dark' ? 'İşlem Sırası' : 'Step Number'}
            </label>
            <select
              value={stepNumber}
              onChange={(e) => setStepNumber(Number(e.target.value))}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer font-bold font-sans"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>Step {n}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 justify-center">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-sans">
              {theme === 'dark' ? 'Asenkron Akış' : 'Async Mode'}
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAsync}
                onChange={(e) => setIsAsync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>
        </div>

        {/* Direction & Round-Trip Selectors */}
        <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans mb-1">
            {theme === 'dark' ? 'Simülasyon Modu' : 'Simulation Mode'}
          </label>
          
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer font-sans mb-1">
            <input
              type="checkbox"
              checked={formRoundTrip}
              onChange={(e) => setFormRoundTrip(e.target.checked)}
              className="accent-indigo-600 rounded cursor-pointer scale-95"
            />
            <span className="font-semibold">{theme === 'dark' ? 'Gidiş-Dönüş (Gecikmeli Cevap)' : 'Round-Trip (Delayed Response)'}</span>
          </label>

          <div className={`flex gap-4 pl-5 transition-opacity duration-150 ${formRoundTrip ? 'opacity-40 pointer-events-none' : ''}`}>
            <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer font-sans">
              <input
                type="radio"
                name="direction"
                disabled={formRoundTrip}
                checked={formDirection === 'forward'}
                onChange={() => setFormDirection('forward')}
                className="accent-indigo-600 cursor-pointer"
              />
              <span>{theme === 'dark' ? 'İleri (A ➔ B)' : 'Forward (A ➔ B)'}</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer font-sans">
              <input
                type="radio"
                name="direction"
                disabled={formRoundTrip}
                checked={formDirection === 'reverse'}
                onChange={() => setFormDirection('reverse')}
                className="accent-indigo-600 cursor-pointer"
              />
              <span>{theme === 'dark' ? 'Geri (B ➔ A)' : 'Reverse (B ➔ A)'}</span>
            </label>
          </div>
        </div>

        {/* Timings (Duration & Delay) */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
              {theme === 'dark' ? 'Süre (ms)' : 'Duration (ms)'}
            </label>
            <input
              type="number"
              min="50"
              value={duration}
              onChange={(e) => setDuration(Math.max(50, Number(e.target.value)))}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-sans"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
              {theme === 'dark' ? 'Gecikme (ms)' : 'Delay (ms)'}
            </label>
            <input
              type="number"
              min="0"
              value={delay}
              onChange={(e) => setDelay(Math.max(0, Number(e.target.value)))}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-sans"
            />
          </div>
        </div>

        {/* Tooltip Description Bubble */}
        <div className="flex flex-col gap-1 border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
            {theme === 'dark' ? 'Bileşen İçi İşlem (Tooltip)' : 'Internal Process Tooltip'}
          </label>
          <input
            type="text"
            placeholder="örn: Veri İşleniyor..."
            value={tooltipText}
            onChange={(e) => setTooltipText(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 mb-1 font-sans"
          />
          <input
            type="number"
            placeholder="Gösterim Süresi (ms)"
            min="100"
            value={tooltipDuration}
            onChange={(e) => setTooltipDuration(Math.max(100, Number(e.target.value)))}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-sans"
          />
        </div>

        {/* Step Description */}
        <div className="flex flex-col gap-1 border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
            {theme === 'dark' ? 'Akış Açıklaması' : 'Flow Description'}
          </label>
          <textarea
            rows={3}
            placeholder={theme === 'dark' ? 'Bu adımda gerçekleşen işlem açıklaması...' : 'Step description...'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 resize-none font-sans"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button
          onClick={onCancel || onClose}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors font-sans"
        >
          {theme === 'dark' ? 'Vazgeç' : 'Cancel'}
        </button>
        <button
          onClick={handleApply}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer transition-colors font-sans"
        >
          <Save className="w-3 h-3" />
          <span>{theme === 'dark' ? 'Uygula' : 'Apply'}</span>
        </button>
      </div>
    </div>
  );
};
