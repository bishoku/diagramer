import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Lock, Copy, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { prepareShareData } from '../../../utils/shareUtils';
import { translations } from '../../../i18n/translations';

interface ShareModalProps {
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ onClose }) => {
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const currentView = useAppStore((s) => s.currentView);
  const language = useAppStore((s) => s.language);
  const isTr = language === 'tr';
  const t = translations[language];

  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MAX URL length for safe sharing is generally around 2000 characters.
  // We leave some buffer for the domain name.
  const MAX_SAFE_URL_LENGTH = 8000;

  useEffect(() => {
    if (usePin && pin.length < 4) {
      setShareUrl('');
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      generateLink();
    }, 400);
    return () => clearTimeout(timer);
  }, [usePin, pin]);

  const generateLink = async () => {
    setIsGenerating(true);
    setError(null);
    setShareUrl('');
    setCopied(false);

    try {
      // Gather current workspace data to share
      const sharePayload = {
        logicalData,
        visualData,
        currentView
      };

      const compressedBase64 = await prepareShareData(
        sharePayload,
        usePin && pin.length >= 4 ? pin : undefined
      );

      // Create full URL
      const baseUrl = window.location.origin + window.location.pathname;
      const url = `${baseUrl}#share=${compressedBase64}`;

      if (url.length > MAX_SAFE_URL_LENGTH) {
        setError(t.urlTooLongError);
      } else {
        setShareUrl(url);
      }
    } catch (err: any) {
      setError(err.message || (isTr ? 'Link oluşturulurken bir hata oluştu' : 'An error occurred while generating link'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t.shareTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.shareSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Security Options */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={usePin}
                onChange={(e) => {
                    setUsePin(e.target.checked);
                    if (!e.target.checked) setPin('');
                }}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {t.encryptWithPin}
              </span>
            </label>

            {usePin && (
              <div className="pl-8 animate-in slide-in-from-top-2">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={t.pinPlaceholder}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  maxLength={8}
                />
                {pin.length > 0 && pin.length < 4 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                    {isTr ? `PIN en az 4 karakter olmalıdır (Mevcut: ${pin.length}/8)` : `PIN must be at least 4 characters (Current: ${pin.length}/8)`}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">
                    {t.pinHint}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Share Link Result */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.shareLinkLabel}
            </label>

            {error ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {error}
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={isGenerating ? (isTr ? 'Link oluşturuluyor...' : 'Generating link...') : shareUrl}
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 outline-none"
                />
                <button
                  onClick={handleCopy}
                  disabled={!shareUrl || isGenerating || (usePin && pin.length < 4)}
                  className={`px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all
                    ${shareUrl && (!usePin || pin.length >= 4)
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? t.copiedBtn : t.copyBtn}
                </button>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg flex items-start gap-2">
            <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {t.shareNotice}
            </p>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
