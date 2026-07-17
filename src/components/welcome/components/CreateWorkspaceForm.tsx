import React from 'react';
import { FolderPlus, AlertCircle, Globe } from 'lucide-react';
import { translations } from '../../../i18n/translations';

interface CreateWorkspaceFormProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  loading: boolean;
  error: string | null;
  language: 'tr' | 'en';
  onSubmit: (e: React.FormEvent) => void;
  onGoogleSignIn: () => void;
  googleUser: any;
}

export const CreateWorkspaceForm: React.FC<CreateWorkspaceFormProps> = ({
  name,
  setName,
  description,
  setDescription,
  loading,
  error,
  language,
  onSubmit,
  onGoogleSignIn,
  googleUser,
}) => {
  const t = translations[language];

  return (
    <div className="w-full md:w-1/2 p-8 bg-slate-100/10 dark:bg-slate-950/20 flex flex-col justify-between">
      <div>
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
          <FolderPlus className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          {t.createWorkspace}
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t.workspaceName} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              placeholder={t.workspaceNamePlaceholder}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t.description}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder={t.descriptionPlaceholder}
              rows={4}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200 resize-none"
              maxLength={200}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/45 text-slate-100 font-bold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-indigo-650/10 dark:shadow-indigo-650/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FolderPlus className="w-4 h-4" />
                <span>{t.createButton}</span>
              </>
            )}
          </button>
        </form>

        {import.meta.env.VITE_ENABLE_GOOGLE_SYNC === 'true' && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 text-center">
              {language === 'tr' ? 'Bulut Senkronizasyonu' : 'Cloud Synchronization'}
            </h3>
            
            {!googleUser ? (
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>{language === 'tr' ? 'Google ile Giriş Yap' : 'Login with Google'}</span>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <Globe className="w-4 h-4" />
                  <span>{language === 'tr' ? 'Oturum Açıldı' : 'Signed In'}</span>
                </div>
                <p className="text-xs text-slate-500 text-center max-w-[240px]">
                  {language === 'tr' 
                    ? 'Geçmiş projeleriniz başarıyla buluttan indirildi ve listelendi.' 
                    : 'Your past projects were successfully fetched and listed.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
