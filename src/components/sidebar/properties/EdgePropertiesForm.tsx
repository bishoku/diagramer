import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ActiveEdgeProperties } from '../../../types';
import { ParticleType, resolveParticleType } from '../../../config/particles';
import { ParticlePicker } from './ParticlePicker';

export type EdgePropertiesFormRef = { submit: () => void; cancel: () => void };

interface EdgePropertiesFormProps {
  activeEdge: ActiveEdgeProperties;
  language: string;
  maxSteps: number;
  sequenceDirection: 'forward' | 'reverse';
  sequenceRoundTrip: boolean;
  onSubmit: (
    id: string, protocol: string, isAsync: boolean, duration: number, delay: number,
    tooltipText: string, tooltipDuration: number, description: string,
    particleType: ParticleType | undefined, showArrow: boolean, color: string,
    stepNumber: number, direction: 'forward' | 'reverse', isRoundTrip: boolean
  ) => void;
  /** Called immediately on every field change for live canvas preview */
  onPreview: (
    id: string, protocol: string, isAsync: boolean, duration: number, delay: number,
    tooltipText: string, tooltipDuration: number, description: string,
    particleType: ParticleType, showArrow: boolean, color: string,
    stepNumber: number, direction: 'forward' | 'reverse', isRoundTrip: boolean
  ) => void;
}

// Preset edge color palette
const EDGE_COLORS = [
  { label: 'Default', value: '',        cls: 'bg-slate-400' },
  { label: 'Indigo',  value: '#6366f1', cls: 'bg-indigo-500' },
  { label: 'Emerald', value: '#10b981', cls: 'bg-emerald-500' },
  { label: 'Rose',    value: '#f43f5e', cls: 'bg-rose-500' },
  { label: 'Amber',   value: '#f59e0b', cls: 'bg-amber-500' },
  { label: 'Violet',  value: '#8b5cf6', cls: 'bg-violet-500' },
  { label: 'Cyan',    value: '#06b6d4', cls: 'bg-cyan-500' },
];
const DEFAULT_COLOR = '';


/** Compact label */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
    {children}
  </span>
);

/** Compact text/number input */
const CompactInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 ${props.className ?? ''}`}
  />
);

/** Thin divider with optional inline label */
const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-2 pt-2 mt-0.5 border-t border-slate-100 dark:border-slate-800/70">
    {label && <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</span>}
    {label && <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/70" />}
  </div>
);

/**
 * EdgePropertiesForm
 * Compact, focused form for editing a single edge's properties.
 */
export const EdgePropertiesForm = forwardRef<EdgePropertiesFormRef, EdgePropertiesFormProps>(({

  activeEdge,
  language: lang,
  maxSteps,
  sequenceDirection,
  sequenceRoundTrip,
  onSubmit,
  onPreview,
}, ref) => {
  const [protocol, setProtocol] = useState(activeEdge.protocol);
  const [isAsync, setIsAsync] = useState(activeEdge.isAsync);
  const [stepNumber, setStepNumber] = useState(activeEdge.stepNumber);
  const [duration, setDuration] = useState(activeEdge.duration);
  const [delay, setDelay] = useState(activeEdge.delay);
  const [tooltipText, setTooltipText] = useState(activeEdge.tooltipText);
  const [tooltipDuration, setTooltipDuration] = useState(activeEdge.tooltipDuration);
  const [formDirection, setFormDirection] = useState<'forward' | 'reverse'>(sequenceDirection);
  const [formRoundTrip, setFormRoundTrip] = useState(sequenceRoundTrip);
  const [description, setDescription] = useState(activeEdge.description ?? '');
  const [particleType, setParticleType] = useState<ParticleType>(resolveParticleType(activeEdge.particleType));
  const [showArrow, setShowArrow] = useState(activeEdge.showArrow ?? false);
  const [color, setColor] = useState(activeEdge.color ?? DEFAULT_COLOR);

  // Snapshot originals for cancel
  const [orig, setOrig] = useState({
    protocol: activeEdge.protocol, isAsync: activeEdge.isAsync,
    stepNumber: activeEdge.stepNumber, duration: activeEdge.duration,
    delay: activeEdge.delay, tooltipText: activeEdge.tooltipText,
    tooltipDuration: activeEdge.tooltipDuration, description: activeEdge.description ?? '',
    particleType: resolveParticleType(activeEdge.particleType),
    showArrow: activeEdge.showArrow ?? false,
    color: activeEdge.color ?? DEFAULT_COLOR,
    direction: sequenceDirection, roundTrip: sequenceRoundTrip,
  });

  useEffect(() => {
    const snap = {
      protocol: activeEdge.protocol, isAsync: activeEdge.isAsync,
      stepNumber: activeEdge.stepNumber, duration: activeEdge.duration,
      delay: activeEdge.delay, tooltipText: activeEdge.tooltipText,
      tooltipDuration: activeEdge.tooltipDuration, description: activeEdge.description ?? '',
      particleType: resolveParticleType(activeEdge.particleType),
      showArrow: activeEdge.showArrow ?? false,
      color: activeEdge.color ?? DEFAULT_COLOR,
      direction: sequenceDirection, roundTrip: sequenceRoundTrip,
    };
    setProtocol(snap.protocol); setIsAsync(snap.isAsync); setStepNumber(snap.stepNumber);
    setDuration(snap.duration); setDelay(snap.delay); setTooltipText(snap.tooltipText);
    setTooltipDuration(snap.tooltipDuration); setDescription(snap.description);
    setParticleType(snap.particleType); setShowArrow(snap.showArrow); setColor(snap.color);
    setFormDirection(snap.direction); setFormRoundTrip(snap.roundTrip);
    setOrig(snap);
  }, [activeEdge, sequenceDirection, sequenceRoundTrip]);

  // Convenience: preview current values
  const preview = (o?: Partial<{
    p: string; ia: boolean; s: number; d: number; dl: number;
    tt: string; td: number; desc: string; pt: ParticleType; arr: boolean; clr: string;
    dir: 'forward' | 'reverse'; rt: boolean;
  }>) =>
    onPreview(
      activeEdge.id,
      o?.p ?? protocol, o?.ia ?? isAsync,
      o?.d ?? duration, o?.dl ?? delay,
      o?.tt ?? tooltipText, o?.td ?? tooltipDuration,
      o?.desc ?? description, o?.pt ?? particleType, o?.arr ?? showArrow, o?.clr ?? color,
      o?.s ?? stepNumber, o?.dir ?? formDirection, o?.rt ?? formRoundTrip,
    );

  useImperativeHandle(ref, () => ({
    submit: () => onSubmit(activeEdge.id, protocol, isAsync, duration, delay, tooltipText, tooltipDuration, description, particleType, showArrow, color, stepNumber, formDirection, formRoundTrip),
    cancel: () => {
      setProtocol(orig.protocol); setIsAsync(orig.isAsync); setStepNumber(orig.stepNumber);
      setDuration(orig.duration); setDelay(orig.delay); setTooltipText(orig.tooltipText);
      setTooltipDuration(orig.tooltipDuration); setDescription(orig.description);
      setParticleType(orig.particleType); setShowArrow(orig.showArrow); setColor(orig.color);
      setFormDirection(orig.direction); setFormRoundTrip(orig.roundTrip);
      onPreview(activeEdge.id, orig.protocol, orig.isAsync, orig.duration, orig.delay,
        orig.tooltipText, orig.tooltipDuration, orig.description, orig.particleType, orig.showArrow, orig.color,
        orig.stepNumber, orig.direction, orig.roundTrip);
    },
  }), [activeEdge.id, protocol, isAsync, duration, delay, tooltipText, tooltipDuration,
       description, particleType, showArrow, color, stepNumber, formDirection, formRoundTrip, orig, onSubmit, onPreview]);

  const tr = (t: string, e: string) => lang === 'tr' ? t : e;

  return (
    <div className="flex flex-col gap-2">

      {/* Protocol + Step — side by side */}
      <div className="grid grid-cols-[1fr_80px] gap-2">
        <div className="flex flex-col gap-1">
          <Label>{tr('Protokol', 'Protocol')}</Label>
          <CompactInput
            type="text"
            placeholder="HTTP, gRPC, WS..."
            value={protocol}
            onChange={(e) => { setProtocol(e.target.value); preview({ p: e.target.value }); }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>{tr('Adım', 'Step')}</Label>
          <select
            value={stepNumber}
            onChange={(e) => { setStepNumber(Number(e.target.value)); preview({ s: Number(e.target.value) }); }}
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer font-bold"
          >
            {Array.from({ length: maxSteps }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>#{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Async toggle + Arrow toggle — side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between">
          <Label>{tr('Asenkron', 'Async')}</Label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isAsync} onChange={(e) => { setIsAsync(e.target.checked); preview({ ia: e.target.checked }); }} className="sr-only peer" />
            <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
          </label>
        </div>
        <div className="flex items-center justify-between">
          <Label>{tr('Ok Ucu', 'Arrow')}</Label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={showArrow} onChange={(e) => { setShowArrow(e.target.checked); preview({ arr: e.target.checked }); }} className="sr-only peer" />
            <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500" />
          </label>
        </div>
      </div>

      {/* Edge Color — preset swatches + native color picker */}
      <div className="flex items-center justify-between">
        <Label>{tr('Renk', 'Color')}</Label>
        <div className="flex items-center gap-1.5">
          {/* Preset swatches */}
          {EDGE_COLORS.map((ec) => (
            <button
              key={ec.value}
              onClick={() => { setColor(ec.value); preview({ clr: ec.value }); }}
              className={`w-5 h-5 rounded-full ${ec.cls} hover:scale-110 active:scale-90 transition-transform cursor-pointer ${
                color === ec.value
                  ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-offset-slate-900'
                  : ''
              }`}
              title={ec.label}
            />
          ))}
          {/* Divider */}
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
          {/* Custom hex picker */}
          <div className="relative">
            <input
              type="color"
              value={color || '#94a3b8'}
              onChange={(e) => { setColor(e.target.value); preview({ clr: e.target.value }); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Custom color"
            />
            <div
              className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: color || undefined }}
            >
              {!color && (
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M4.5 1v7M1 4.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Duration + Delay — side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label>{tr('Süre (ms)', 'Duration')}</Label>
          <CompactInput
            type="number" min="50" value={duration}
            onChange={(e) => { const v = Math.max(50, Number(e.target.value)); setDuration(v); preview({ d: v }); }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>{tr('Gecikme (ms)', 'Delay')}</Label>
          <CompactInput
            type="number" min="0" value={delay}
            onChange={(e) => { const v = Math.max(0, Number(e.target.value)); setDelay(v); preview({ dl: v }); }}
          />
        </div>
      </div>

      {/* Simulation mode */}
      <Divider label={tr('Simülasyon', 'Simulation')} />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox" checked={formRoundTrip}
            onChange={(e) => { setFormRoundTrip(e.target.checked); preview({ rt: e.target.checked }); }}
            className="accent-indigo-600 rounded cursor-pointer w-3.5 h-3.5"
          />
          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
            {tr('Gidiş-Dönüş', 'Round-Trip')}
          </span>
        </label>
      </div>

      <div className={`flex gap-3 transition-opacity duration-150 ${formRoundTrip ? 'opacity-30 pointer-events-none' : ''}`}>
        {(['forward', 'reverse'] as const).map((dir) => (
          <label key={dir} className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio" name="edge-direction" disabled={formRoundTrip}
              checked={formDirection === dir} onChange={() => { setFormDirection(dir); preview({ dir }); }}
              className="accent-indigo-600 cursor-pointer w-3.5 h-3.5"
            />
            <span className="text-[10px] text-slate-600 dark:text-slate-300">
              {dir === 'forward' ? tr('İleri (A→B)', 'Fwd (A→B)') : tr('Geri (B→A)', 'Rev (B→A)')}
            </span>
          </label>
        ))}
      </div>

      {/* Particle type — picker with preview */}
      <Divider label={tr('Parçacık', 'Particle')} />
      <ParticlePicker
        value={particleType}
        language={lang}
        onChange={(pt) => { setParticleType(pt); preview({ pt }); }}
      />

      {/* Internal process tooltip — compact two-column layout */}
      <Divider label={tr('Tooltip', 'Tooltip')} />
      <div className="grid grid-cols-[1fr_72px] gap-2">
        <CompactInput
          type="text"
          placeholder={tr('İşlem adı...', 'Process name...')}
          value={tooltipText}
          onChange={(e) => { setTooltipText(e.target.value); preview({ tt: e.target.value }); }}
        />
        <CompactInput
          type="number" min="100" value={tooltipDuration}
          onChange={(e) => { const v = Math.max(100, Number(e.target.value)); setTooltipDuration(v); preview({ td: v }); }}
          placeholder="ms"
        />
      </div>

      {/* Description */}
      <Divider label={tr('Açıklama', 'Notes')} />
      <textarea
        rows={2}
        placeholder={tr('Bu adım hakkında not...', 'Step notes...')}
        value={description}
        onChange={(e) => { setDescription(e.target.value); preview({ desc: e.target.value }); }}
        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 resize-none"
      />

    </div>
  );
});
