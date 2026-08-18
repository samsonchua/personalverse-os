import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Database, Cpu, LogOut, UserCircle, Languages, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme, THEMES } from '../../context/ThemeContext';

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic Claude (live API)',
  openai: 'OpenAI GPT (live API)',
  openrouter: 'OpenRouter (live API)',
  synthetic: 'Synthetic Fallback (no API key configured)',
};

export const SettingsView: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [providerStatus, setProviderStatus] = useState<{ provider: string; configured: boolean } | null>(null);

  useEffect(() => {
    api.getAIProviderStatus().then(setProviderStatus);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">{t('settings.title')}</h2>
        <p className="text-xs text-slate-400">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account */}
        <GlassCard className="space-y-4">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <UserCircle className="w-5 h-5 text-cyanAccent" />
            <span>{t('settings.account')}</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Name</span>
                <span className="font-bold text-white">{user?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email</span>
                <span className="font-bold text-white">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">User ID</span>
                <span className="font-mono text-[10px] text-slate-500">{user?.id}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs transition-all"
            >
              <LogOut className="w-4 h-4" />
              {t('settings.signOut')}
            </button>
          </div>
        </GlassCard>

        {/* Language */}
        <GlassCard className="space-y-4">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Languages className="w-5 h-5 text-cyanAccent" />
            <span>{t('settings.language')}</span>
          </h3>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-2.5 rounded-xl font-bold transition-all border ${language === 'en' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white'}`}
            >
              {t('settings.languageEnglish')}
            </button>
            <button
              onClick={() => setLanguage('zh')}
              className={`flex-1 py-2.5 rounded-xl font-bold transition-all border ${language === 'zh' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white'}`}
            >
              {t('settings.languageMandarin')}
            </button>
          </div>
        </GlassCard>

        {/* Theme */}
        <GlassCard className="space-y-4">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            {theme === 'dark' || theme === 'midnight' ? <Moon className="w-5 h-5 text-cyanAccent" /> : <Sun className="w-5 h-5 text-cyanAccent" />}
            <span>Theme</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {THEMES.map((th) => (
              <button
                key={th.id}
                onClick={() => setTheme(th.id)}
                className={`p-3 rounded-xl font-bold transition-all border text-left flex items-start gap-2.5 ${theme === th.id ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900/60 text-slate-300 border-white/10 hover:border-white/20'}`}
              >
                <span className="w-5 h-5 rounded-full border border-white/20 shrink-0 mt-0.5" style={{ backgroundColor: th.swatch }} />
                <span className="min-w-0">
                  <span className="block">{th.label}</span>
                  <span className="block font-normal text-[10px] text-slate-500 mt-0.5">{th.description}</span>
                </span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* AI Provider Config */}
        <GlassCard className="space-y-4">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-cyanAccent" />
            <span>{t('settings.aiProvider')}</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Active Provider</span>
                <span className={`px-2 py-0.5 rounded font-bold ${providerStatus?.configured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {providerStatus?.configured ? 'Live API' : 'Synthetic'}
                </span>
              </div>
              <p className="text-slate-400">
                {providerStatus ? PROVIDER_LABELS[providerStatus.provider] : 'Checking...'}
              </p>
            </div>
            <p className="text-slate-500 leading-relaxed">
              API keys are configured server-side via environment variables
              (<code className="text-cyan-400">ANTHROPIC_API_KEY</code>, <code className="text-cyan-400">OPENAI_API_KEY</code>, or{' '}
              <code className="text-cyan-400">OPENROUTER_API_KEY</code> in <code className="text-cyan-400">backend/.env</code>) —
              never entered in the browser, so they can't leak via client storage.
            </p>
          </div>
        </GlassCard>

        {/* Database & Infrastructure */}
        <GlassCard className="space-y-4 lg:col-span-2">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Database className="w-5 h-5 text-violetAccent" />
            <span>{t('settings.database')}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Database Engine</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Connected</span>
              </div>
              <p className="text-slate-400">SQLite (dev) / PostgreSQL (Docker) via SQLAlchemy ORM</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
