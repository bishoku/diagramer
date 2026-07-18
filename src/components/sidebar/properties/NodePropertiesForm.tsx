import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { HandleConfig } from '../../../types';
import { resolveHandles } from '../../../utils/portUtils';
import { ConnectionPointsEditor } from './ConnectionPointsEditor';
import { ActiveNodeProperties } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { KeyValueEditor } from './KeyValueEditor';

export type NodePropertiesFormRef = { submit: () => void; cancel: () => void };

interface NodePropertiesFormProps {
  activeNode: ActiveNodeProperties;
  language: string;
  connectedHandleIds: Set<string>;
  onSubmit: (
    id: string, name: string, type: string, theme: string,
    handles?: HandleConfig[], displayMode?: 'default' | 'icon-only',
    rotation?: number, customStyles?: any,
    properties?: Record<string, unknown>
  ) => void;
  /** Called immediately on every non-handle field change for live canvas preview */
  onPreview: (
    id: string, name: string, type: string, theme: string,
    displayMode: 'default' | 'icon-only', rotation: number, customStyles: any,
    properties: Record<string, unknown>
  ) => void;
  onValidationError?: (hasError: boolean) => void;
}

const THEME_COLORS = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan'] as const;
const BG: Record<string, string> = {
  indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', rose: 'bg-rose-500',
  amber: 'bg-amber-500',   violet: 'bg-violet-500',   cyan: 'bg-cyan-500',
};

const PRESET_HEX: Record<string, string> = {
  indigo: '#6366f1',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
};

/** Compact label used throughout the form */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
    {children}
  </span>
);

/** Compact text input */
const CompactInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
  />
);

/** Compact select */
const CompactSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer"
  />
);

/** Thin section divider */
const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-2 pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/70">
    {label && <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</span>}
    {label && <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/70" />}
  </div>
);

/**
 * NodePropertiesForm
 * Compact, focused form for editing a single node's properties.
 * All state is local; parent receives values only on submit.
 */
export const NodePropertiesForm = forwardRef<NodePropertiesFormRef, NodePropertiesFormProps>(({
  activeNode,
  language: lang,
  connectedHandleIds,
  onSubmit,
  onPreview,
  onValidationError,
}, ref) => {
  const [name, setName] = useState(activeNode.name);
  const [type, setType] = useState(activeNode.type);
  const [theme, setTheme] = useState(activeNode.theme);
  const [handles, setHandles] = useState<HandleConfig[]>([]);
  const [displayMode, setDisplayMode] = useState<'default' | 'icon-only'>(activeNode.displayMode ?? 'default');
  const [rotation, setRotation] = useState(activeNode.rotation ?? 0);
  const [customStyles, setCustomStyles] = useState<any>(activeNode.customStyles ?? {});
  const [properties, setProperties] = useState<Record<string, unknown>>(activeNode.properties ?? {});

  const nodes = useAppStore((s) => s.logicalData.nodes);
  const nameExists = useMemo(() => {
    return nodes.some(n => n.id !== activeNode.id && n.name.trim().toLowerCase() === name.trim().toLowerCase());
  }, [nodes, activeNode.id, name]);

  useEffect(() => {
    onValidationError?.(nameExists);
  }, [nameExists, onValidationError]);

  // Snapshot of original values — used to reset on cancel
  const [origName, setOrigName] = useState(activeNode.name);
  const [origType, setOrigType] = useState(activeNode.type);
  const [origTheme, setOrigTheme] = useState(activeNode.theme);
  const [origHandles, setOrigHandles] = useState<HandleConfig[]>([]);
  const [origDisplayMode, setOrigDisplayMode] = useState<'default' | 'icon-only'>(activeNode.displayMode ?? 'default');
  const [origRotation, setOrigRotation] = useState(activeNode.rotation ?? 0);
  const [origCustomStyles, setOrigCustomStyles] = useState<any>(activeNode.customStyles ?? {});
  const [origProperties, setOrigProperties] = useState<Record<string, unknown>>(activeNode.properties ?? {});

  // Sync when active node changes (new selection)
  useEffect(() => {
    const resolved = resolveHandles(activeNode.handles).map((h) => ({ ...h, originalId: h.originalId || h.id }));
    setName(activeNode.name); setOrigName(activeNode.name);
    setType(activeNode.type); setOrigType(activeNode.type);
    setTheme(activeNode.theme); setOrigTheme(activeNode.theme);
    setHandles(resolved); setOrigHandles(resolved);
    setDisplayMode(activeNode.displayMode ?? 'default'); setOrigDisplayMode(activeNode.displayMode ?? 'default');
    setRotation(activeNode.rotation ?? 0); setOrigRotation(activeNode.rotation ?? 0);
    setCustomStyles(activeNode.customStyles ?? {}); setOrigCustomStyles(activeNode.customStyles ?? {});
    setProperties(activeNode.properties ?? {}); setOrigProperties(activeNode.properties ?? {});
  }, [activeNode]);

  // Convenience: preview the current field values (except handles)
  const preview = (overrides?: Partial<{ n: string; t: string; th: string; dm: 'default' | 'icon-only'; r: number; cs: any; props: Record<string, unknown> }>) => {
    const nextName = overrides?.n ?? name;
    // Check if nextName already exists in another node
    const isDup = nodes.some(n => n.id !== activeNode.id && n.name.trim().toLowerCase() === nextName.trim().toLowerCase());
    // If it's a duplicate, preview with origName so the canvas doesn't reflect the duplicate name
    const previewName = isDup ? origName : nextName;

    onPreview(
      activeNode.id,
      previewName,
      overrides?.t ?? type,
      overrides?.th ?? theme,
      overrides?.dm ?? displayMode,
      overrides?.r ?? rotation,
      overrides?.cs ?? customStyles,
      overrides?.props ?? properties,
    );
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (nameExists) return;
      onSubmit(activeNode.id, name, type, theme, handles, displayMode, rotation, customStyles, properties);
    },
    cancel: () => {
      setName(origName); setType(origType); setTheme(origTheme);
      setHandles(origHandles); setDisplayMode(origDisplayMode);
      setRotation(origRotation); setCustomStyles(origCustomStyles);
      setProperties(origProperties);
      // Revert preview to original values
      onPreview(activeNode.id, origName, origType, origTheme, origDisplayMode, origRotation, origCustomStyles, origProperties);
    },
  }), [activeNode.id, name, type, theme, handles, displayMode, rotation, customStyles, properties,
       origName, origType, origTheme, origHandles, origDisplayMode, origRotation, origCustomStyles, origProperties,
       onSubmit, onPreview, nameExists]);

  const isSection = activeNode.type === 'section';
  const tr = (t: string, e: string) => lang === 'tr' ? t : e;

  return (
    <div className="flex flex-col gap-2">

      {/* Name */}
      <div className="flex flex-col gap-1">
        <Label>{tr('Ad', 'Name')}</Label>
        <CompactInput
          value={name}
          onChange={(e) => { setName(e.target.value); preview({ n: e.target.value }); }}
        />
        {nameExists && (
          <span className="text-[10px] text-rose-500 font-semibold mt-0.5">
            {tr('Geçersiz - bu isim zaten mevcut', 'Invalid - name already exists')}
          </span>
        )}
      </div>

      {/* Type (not for sections) */}
      {!isSection && (
        <div className="flex flex-col gap-1">
          <Label>{tr('Tip', 'Type')}</Label>
          <CompactSelect value={type} onChange={(e) => { setType(e.target.value); preview({ t: e.target.value }); }}>
            <option value="client">{tr('İstemci (Client)', 'Client')}</option>
            <option value="load_balancer">{tr('Yük Dengeleyici', 'Load Balancer')}</option>
            <option value="gateway">API Gateway</option>
            <option value="firewall">{tr('Güvenlik Duvarı', 'Firewall / WAF')}</option>
            <option value="server">{tr('Uygulama Sunucusu', 'App Server')}</option>
            <option value="database">{tr('Veritabanı (SQL)', 'Database')}</option>
            <option value="cache">{tr('Önbellek (Redis)', 'Cache Store')}</option>
            <option value="queue">{tr('Mesaj Kuyruğu', 'Message Queue')}</option>
          </CompactSelect>
        </div>
      )}

      {/* Theme color — inline row */}
      {!isSection && (
        <div className="flex flex-col gap-2">
          {/* Component Color */}
          <div className="flex items-center justify-between">
            <Label>{tr('Bileşen Rengi', 'Component Color')}</Label>
            <div className="flex gap-1.5 items-center">
              {THEME_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setTheme(c);
                    // Also sync icon color to match
                    const s = { ...customStyles, iconColor: c };
                    setCustomStyles(s);
                    preview({ th: c, cs: s });
                  }}
                  className={`w-5 h-5 rounded-full ${BG[c]} hover:scale-110 active:scale-90 transition-transform cursor-pointer ${
                    theme === c ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900' : ''
                  }`}
                  title={c}
                />
              ))}
              <div className="w-9 flex items-center justify-start gap-1">
                <div className={`w-5 h-5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 ${
                  theme.startsWith('#') ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900 scale-110 shadow-sm' : 'hover:scale-105 transition-transform'
                }`} title={tr('Özel Renk', 'Custom Color')}>
                  <input
                    type="color"
                    value={theme.startsWith('#') ? theme : '#4f46e5'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTheme(val);
                      const s = { ...customStyles, iconColor: val };
                      setCustomStyles(s);
                      preview({ th: val, cs: s });
                    }}
                    className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0 bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Icon Color */}
          <div className="flex items-center justify-between">
            <Label>{tr('İkon Rengi', 'Icon Color')}</Label>
            <div className="flex gap-1.5 items-center">
              {THEME_COLORS.map((c) => {
                const activeIconColor = customStyles.iconColor || theme;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      const s = { ...customStyles, iconColor: c };
                      setCustomStyles(s);
                      preview({ cs: s });
                    }}
                    className={`w-5 h-5 rounded-full ${BG[c]} hover:scale-110 active:scale-90 transition-transform cursor-pointer ${
                      activeIconColor === c ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900' : ''
                    }`}
                    title={c}
                  />
                );
              })}
              <div className="w-9 flex items-center justify-start gap-1">
                <div className={`w-5 h-5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 ${
                  (customStyles.iconColor || '').startsWith('#') ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900 scale-110 shadow-sm' : 'hover:scale-105 transition-transform'
                }`} title={tr('Özel İkon Rengi', 'Custom Icon Color')}>
                  <input
                    type="color"
                    value={customStyles.iconColor?.startsWith('#') ? customStyles.iconColor : '#4f46e5'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const s = { ...customStyles, iconColor: val };
                      setCustomStyles(s);
                      preview({ cs: s });
                    }}
                    className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0 bg-transparent"
                  />
                </div>
                {customStyles.iconColor && (
                  <button
                    onClick={() => {
                      const s = { ...customStyles };
                      delete s.iconColor;
                      setCustomStyles(s);
                      preview({ cs: s });
                    }}
                    className="text-rose-500 hover:text-rose-750 text-xs cursor-pointer ml-0.5 leading-none shrink-0"
                    title={tr('Sıfırla', 'Reset')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Background Color */}
          <div className="flex items-center justify-between">
            <Label>{tr('Arka Plan Rengi', 'Background Color')}</Label>
            <div className="flex gap-1.5 items-center">
              {THEME_COLORS.map((c) => {
                const hexVal = PRESET_HEX[c];
                return (
                  <button
                    key={c}
                    onClick={() => {
                      const s = { ...customStyles, backgroundColor: hexVal };
                      setCustomStyles(s);
                      preview({ cs: s });
                    }}
                    className={`w-5 h-5 rounded-full ${BG[c]} hover:scale-110 active:scale-90 transition-transform cursor-pointer ${
                      customStyles.backgroundColor === hexVal ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900' : ''
                    }`}
                    title={c}
                  />
                );
              })}
              <div className="w-9 flex items-center justify-start gap-1">
                <div className={`w-5 h-5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 ${
                  (customStyles.backgroundColor || '').startsWith('#') && !Object.values(PRESET_HEX).includes(customStyles.backgroundColor) ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900 scale-110 shadow-sm' : 'hover:scale-105 transition-transform'
                }`} title={tr('Özel Arka Plan', 'Custom Background')}>
                  <input
                    type="color"
                    value={customStyles.backgroundColor?.startsWith('#') ? customStyles.backgroundColor : '#ffffff'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const s = { ...customStyles, backgroundColor: val };
                      setCustomStyles(s);
                      preview({ cs: s });
                    }}
                    className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%]"
                  />
                </div>
                {customStyles.backgroundColor && (
                  <button
                    onClick={() => {
                      const s = { ...customStyles };
                      delete s.backgroundColor;
                      setCustomStyles(s);
                      preview({ cs: s });
                    }}
                    className="text-rose-500 hover:text-rose-755 text-xs cursor-pointer ml-0.5 leading-none shrink-0"
                    title={tr('Sıfırla', 'Reset')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Border Color */}
          <div className="flex items-center justify-between">
            <Label>{tr('Çerçeve Rengi', 'Border Color')}</Label>
            <div className="flex gap-1.5 items-center">
              {THEME_COLORS.map((c) => {
                const hexVal = PRESET_HEX[c];
                return (
                  <button
                    key={c}
                    onClick={() => {
                      const s = { ...customStyles, borderColor: hexVal };
                      setCustomStyles(s);
                      preview({ cs: s });
                    }}
                    className={`w-5 h-5 rounded-full ${BG[c]} hover:scale-110 active:scale-90 transition-transform cursor-pointer ${
                      customStyles.borderColor === hexVal ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900' : ''
                    }`}
                    title={c}
                  />
                );
              })}
              <div className="w-9 flex items-center justify-start gap-1">
                <div className={`w-5 h-5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 ${
                  (customStyles.borderColor || '').startsWith('#') && !Object.values(PRESET_HEX).includes(customStyles.borderColor) ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900 scale-110 shadow-sm' : 'hover:scale-105 transition-transform'
                }`} title={tr('Özel Çerçeve', 'Custom Border')}>
                  <input
                    type="color"
                    value={customStyles.borderColor?.startsWith('#') ? customStyles.borderColor : '#000000'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const s = { ...customStyles, borderColor: val };
                      setCustomStyles(s);
                      preview({ cs: s });
                    }}
                    className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0 bg-transparent"
                  />
                </div>
                {customStyles.borderColor && (
                  <button
                    onClick={() => {
                      const s = { ...customStyles };
                      delete s.borderColor;
                      setCustomStyles(s);
                      preview({ cs: s });
                    }}
                    className="text-rose-500 hover:text-rose-755 text-xs cursor-pointer ml-0.5 leading-none shrink-0"
                    title={tr('Sıfırla', 'Reset')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isSection && <Divider />}

      {/* Display mode + Rotation — side by side */}
      {!isSection && (
        <div className="grid grid-cols-2 gap-2">
          {/* Display mode */}
          <div className="flex flex-col gap-1">
            <Label>{tr('Görünüm', 'Display')}</Label>
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
              {(['default', 'icon-only'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setDisplayMode(mode); preview({ dm: mode }); }}
                  className={`flex-1 py-1 text-[10px] rounded-md font-semibold transition-colors leading-none ${
                    displayMode === mode
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {mode === 'default' ? tr('Tam', 'Full') : tr('İkon', 'Icon')}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div className="flex flex-col gap-1">
            <Label>{tr('Yön', 'Orient.')}</Label>
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
              {([0, 90] as const).map((deg) => (
                <button
                  key={deg}
                  onClick={() => { setRotation(deg); preview({ r: deg }); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] rounded-md font-semibold transition-colors leading-none ${
                    rotation === deg
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {deg === 0 ? (
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="1" y="4" width="12" height="6" rx="1.5" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="4" y="1" width="6" height="12" rx="1.5" />
                    </svg>
                  )}
                  {deg === 0 ? tr('Yatay', 'H') : tr('Dikey', 'V')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}



      {/* Key-Value Attributes Editor */}
      <KeyValueEditor
        properties={properties}
        onChange={(next) => { setProperties(next); preview({ props: next }); }}
        language={lang}
      />

      {/* Connection points editor */}
      <Divider />
      <ConnectionPointsEditor
        nodeId={activeNode.id}
        nodeName={name}
        handles={handles}
        connectedHandleIds={connectedHandleIds}
        language={lang}
        onChange={setHandles}
      />

    </div>
  );
});
