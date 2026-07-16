import React, { useState, useEffect } from 'react';
import { extractShareData } from '../../utils/shareUtils';
import { useAppStore } from '../../store/useAppStore';
import { Lock, FileWarning, Loader2, ArrowRight } from 'lucide-react';
import { translations } from '../../i18n/translations';

export const ShareLoader: React.FC = () => {
  const loadSharedDiagram = useAppStore((s) => s.loadSharedDiagram);
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);
  const [shareData, setShareData] = useState<string | null>(null);

  useEffect(() => {
    // Check hash for share data
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
      const data = hash.substring(7);
      setShareData(data);
      attemptLoad(data);
    }
  }, []);

  const attemptLoad = async (data: string, providedPin?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await extractShareData(data, providedPin);

      // Clear hash to prevent reloading same data if user refreshes later
      window.history.replaceState(null, '', window.location.pathname);

      if (payload.logicalData && payload.visualData) {
        // Switch to the correct view if one is provided
        if (payload.currentView) {
            useAppStore.getState().setView(payload.currentView);
        }

        loadSharedDiagram(payload.logicalData, payload.visualData);
        setShareData(null);
      } else {
        throw new Error(language === 'tr' ? 'Diyagram verisi geçersiz veya bozuk.' : 'Diagram data is invalid or corrupt.');
      }
    } catch (err: any) {
      if (err.message === 'PIN_REQUIRED') {
        setNeedsPin(true);
      } else {
        const isDecryptionError = err.message && (
          err.message.toLowerCase().includes('decrypt') || 
          err.message.toLowerCase().includes('cipher') ||
          err.message.toLowerCase().includes('bad encrypt') ||
          err.message.toLowerCase().includes('key')
        );
        setError(
          isDecryptionError
            ? (language === 'tr' ? 'Yanlış PIN kodu girdiniz. Lütfen tekrar deneyin.' : 'Incorrect PIN code entered. Please try again.')
            : (err.message || (language === 'tr' ? 'Veri yüklenirken bir hata oluştu.' : 'An error occurred while loading data.'))
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4 && shareData) {
      attemptLoad(shareData, pin);
    }
  };

  if (!shareData) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700 animate-in fade-in zoom-in-95 duration-300">

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <h2 className="text-xl font-medium text-white">{t.loadingDiagram}</h2>
            <p className="text-slate-400">{t.loadingSub}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <FileWarning className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-medium text-white text-center">{t.loadFailed}</h2>
            <p className="text-slate-400 text-center">{error}</p>
            <button
              onClick={() => window.location.href = window.location.pathname}
              className="mt-4 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              {t.backToHome}
            </button>
          </div>
        ) : needsPin ? (
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">{t.secureDiagram}</h2>
              <p className="text-slate-400 text-sm">
                {t.enterPinNotice}
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={language === 'tr' ? 'PIN Kodunu Girin' : 'Enter PIN Code'}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-center text-xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                autoFocus
              />
              <button
                type="submit"
                disabled={pin.length < 4}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {t.unlockBtn}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : null}

      </div>
    </div>
  );
};
