import React, { useState } from 'react';
import { X, FileText, Upload } from 'lucide-react';
import { translations } from '../../i18n/translations';
import { useAppStore } from '../../store/useAppStore';
import { isTauri } from '../../services/storage';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';

interface TextImportModalProps {
  adapterId: string;
  adapterName: string;
  onClose: () => void;
  onSubmit: (adapterId: string, rawData: string) => void;
}

export const TextImportModal: React.FC<TextImportModalProps> = ({ adapterId, adapterName, onClose, onSubmit }) => {
  const language = useAppStore(s => s.language);
  const t = translations[language];
  
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) {
      setError(t.workspaceNamePlaceholder); // Need better translation, fallback for now
      return;
    }
    onSubmit(adapterId, content);
  };

  const handleBrowseFile = async () => {
    setError(null);
    try {
      let rawData = '';
      if (isTauri()) {
        const selected = await open({
          multiple: false,
          title: `Select file for ${adapterName}`,
        });
        if (!selected || typeof selected !== 'string') return;
        setLoading(true);
        const data = await readFile(selected);
        rawData = new TextDecoder().decode(data);
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setLoading(true);
          const reader = new FileReader();
          reader.onload = async (event: any) => {
            try {
              rawData = event.target.result as string;
              onSubmit(adapterId, rawData);
            } catch (err: any) {
              setError(err.message || err.toString());
            } finally {
              setLoading(false);
            }
          };
          reader.readAsText(file);
        };
        input.click();
        return;
      }
      
      onSubmit(adapterId, rawData);
    } catch (err: any) {
      setError(err.message || err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Import {adapterName}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Paste Content
            </label>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setError(null);
              }}
              disabled={loading}
              placeholder="Paste raw text or JSON here..."
              rows={12}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 text-sm font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleBrowseFile}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Browse File...
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/45 text-slate-100 font-bold rounded-xl text-xs transition-all duration-200 cursor-pointer"
              >
                Import Data
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
