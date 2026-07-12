import React, { useState, useEffect } from 'react';
import { Settings, X, Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface NodePropertiesPopoverProps {
  properties: {
    id: string;
    x: number;
    y: number;
    name: string;
    type: string;
    theme: string;
  } | null;
  onClose: () => void;
  onApply: (id: string, name: string, type: string, theme: string) => void;
}

export const NodePropertiesPopover: React.FC<NodePropertiesPopoverProps> = ({
  properties,
  onClose,
  onApply,
}) => {
  const theme = useAppStore((state) => state.theme);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('server');
  const [formThemeColor, setFormThemeColor] = useState('indigo');

  useEffect(() => {
    if (properties) {
      setFormName(properties.name);
      setFormType(properties.type);
      setFormThemeColor(properties.theme);
    }
  }, [properties]);

  if (!properties) return null;

  const bgColors: Record<string, string> = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    violet: 'bg-violet-500',
    cyan: 'bg-cyan-500',
  };

  return (
    <div
      className="fixed z-[1100] w-[280px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 select-none animate-in fade-in zoom-in-95 font-sans"
      style={{
        left: Math.min(properties.x, window.innerWidth - 300),
        top: Math.min(properties.y, window.innerHeight - 300),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
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

      <div className="flex flex-col gap-2">
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
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors font-sans"
        >
          {theme === 'dark' ? 'Vazgeç' : 'Cancel'}
        </button>
        <button
          onClick={() => {
            onApply(properties.id, formName, formType, formThemeColor);
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
