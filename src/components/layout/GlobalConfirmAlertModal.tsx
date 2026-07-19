import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AlertCircle, Info, X } from 'lucide-react';
import { translations } from '../../i18n/translations';

export const GlobalConfirmAlertModal: React.FC = () => {
  const confirmState = useAppStore((s) => s.confirmState);
  const closeConfirm = useAppStore((s) => s.closeConfirm);
  
  const alertState = useAppStore((s) => s.alertState);
  const closeAlert = useAppStore((s) => s.closeAlert);
  
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  // Helper for Confirm Icons & Colors
  const getConfirmStyle = (type: 'danger' | 'info' | 'warning' = 'info') => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 animate-pulse" />,
          bgColor: 'bg-rose-50 dark:bg-rose-950/20',
          borderColor: 'border-rose-100 dark:border-rose-900/50',
          btnBg: 'bg-rose-600 hover:bg-rose-500 dark:bg-rose-700 dark:hover:bg-rose-600',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-amber-500 dark:text-amber-400" />,
          bgColor: 'bg-amber-50 dark:bg-amber-950/20',
          borderColor: 'border-amber-100 dark:border-amber-900/50',
          btnBg: 'bg-amber-600 hover:bg-amber-500 dark:bg-amber-700 dark:hover:bg-amber-600',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-6 h-6 text-indigo-500" />,
          bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
          borderColor: 'border-indigo-100 dark:border-indigo-900/50',
          btnBg: 'bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600',
        };
    }
  };

  if (confirmState && confirmState.isOpen) {
    const style = getConfirmStyle(confirmState.type);
    
    return (
      <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all animate-in zoom-in-95 duration-200">
          
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-2.5 rounded-xl border shrink-0 ${style.bgColor} ${style.borderColor}`}>
              {style.icon}
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 pr-6">
                {confirmState.title}
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {confirmState.message}
              </div>
            </div>
            <button
              onClick={() => closeConfirm(false)}
              className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer absolute top-5 right-5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850 mt-4">
            <button
              onClick={() => closeConfirm(false)}
              className="px-4 py-2 bg-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
            >
              {confirmState.cancelText || t.cancel || 'Cancel'}
            </button>
            <button
              onClick={() => closeConfirm(true)}
              className={`px-5 py-2 text-white font-bold rounded-xl text-xs transition-all duration-200 cursor-pointer shadow-md shadow-indigo-600/10 dark:shadow-none ${style.btnBg}`}
            >
              {confirmState.confirmText || t.save || 'Confirm'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (alertState && alertState.isOpen) {
    return (
      <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all animate-in zoom-in-95 duration-200">
          
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/20 shrink-0">
              <Info className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 pr-6">
                {alertState.title}
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {alertState.message}
              </div>
            </div>
            <button
              onClick={closeAlert}
              className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer absolute top-5 right-5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-850 mt-4">
            <button
              onClick={closeAlert}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all duration-200 cursor-pointer shadow-md shadow-indigo-600/10 dark:shadow-none"
            >
              {alertState.okText || 'OK'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  return null;
};
