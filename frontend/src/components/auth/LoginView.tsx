import React, { useState } from 'react';
import { Sparkles, Loader2, Languages } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';

const DEMO_EMAIL = 'demo@personalverse.ai';
const DEMO_PASSWORD = 'demo123';

export const LoginView: React.FC = () => {
  const { login, register, error } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName || 'Samson');
      }
    } catch {
      // error state is surfaced via context `error`
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setLocalError(null);
    setSubmitting(true);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
    } catch {
      setLocalError('Demo account unavailable. Run backend/seed_data.py to create it.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-4">
          <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-xl p-1 text-[11px] font-bold">
            <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
            <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded-lg transition-all ${language === 'en' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
            <button onClick={() => setLanguage('zh')} className={`px-2 py-1 rounded-lg transition-all ${language === 'zh' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>中文</button>
          </div>
        </div>
        <div className="flex items-center space-x-3 justify-center mb-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-white/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-xl tracking-tight bg-gradient-to-r from-white via-cyan-200 to-violet-200 bg-clip-text text-transparent">
              {t('nav.appName')}
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">
              {t('nav.appTagline')}
            </p>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4">
          <div className="flex rounded-xl bg-slate-900/60 p-1 border border-white/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${mode === 'login' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}
            >
              {t('login.signIn')}
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${mode === 'register' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}
            >
              {t('login.createAccount')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <input
                type="text"
                placeholder={t("login.fullName")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
              />
            )}
            <input
              type="email"
              required
              placeholder={t("login.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
            />
            <input
              type="password"
              required
              minLength={mode === 'register' ? 8 : undefined}
              placeholder={t("login.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
            />

            {(error || localError) && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {localError || error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:opacity-90 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? t('login.signIn') : t('login.createAccount')}
            </button>
          </form>

          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <div className="flex-1 h-px bg-white/10" />
            <span>{t('login.or')}</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={submitting}
            className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-all disabled:opacity-50"
          >
            {t('login.continueDemo')}
          </button>
        </div>
      </div>
    </div>
  );
};
