import React, { useEffect, useRef, useState } from 'react';
import { Search, Bot, Bell, ShieldCheck, Sparkles, Command, LogOut, Languages, Sun, Moon, Check } from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme, THEMES } from '../../context/ThemeContext';

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  onOpenAI: () => void;
  onSearch: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenAI, onSearch }) => {
  const [quickSearch, setQuickSearch] = useState('');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const activeThemeMeta = THEMES.find((th) => th.id === theme) || THEMES[0];
  const initial = (user?.full_name || user?.email || '?').charAt(0).toUpperCase();

  useEffect(() => {
    if (!themeMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [themeMenuOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      onSearch(quickSearch.trim());
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-white/10 px-6 py-3.5 flex items-center justify-between">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-72 md:w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          placeholder={t('header.searchPlaceholder')}
          className="w-full glass-input pl-10 pr-10 py-2 rounded-xl text-xs"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-0.5">
          <Command className="w-2.5 h-2.5" /> K
        </kbd>
      </form>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {/* System Status Pill */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{t('header.online')}</span>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-xl p-1 text-[11px] font-bold">
          <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded-lg transition-all ${language === 'en' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('zh')}
            className={`px-2 py-1 rounded-lg transition-all ${language === 'zh' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            中文
          </button>
        </div>

        {/* Theme Picker */}
        <div className="relative" ref={themeMenuRef}>
          <button
            onClick={() => setThemeMenuOpen((v) => !v)}
            title={`Theme: ${activeThemeMeta.label}`}
            className="p-2 rounded-xl bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white transition-all"
          >
            {activeThemeMeta.mode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          {themeMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-white/10 shadow-xl shadow-black/30 p-1.5 z-50">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => { setTheme(th.id); setThemeMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${theme === th.id ? 'bg-cyan-500/15' : 'hover:bg-white/5'}`}
                >
                  <span className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: th.swatch }} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-white">{th.label}</span>
                    <span className="block text-[10px] text-slate-400 truncate">{th.description}</span>
                  </span>
                  {theme === th.id && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Agent Drawer Trigger */}
        <button
          onClick={onOpenAI}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20 hover:from-cyan-500/30 hover:to-violet-500/30 border border-cyan-500/30 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-500/10"
        >
          <Sparkles className="w-4 h-4 text-cyanAccent animate-spin-slow" />
          <span>{t('header.aiSwarm')}</span>
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-white text-xs border border-white/20">
            {initial}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-white">{user?.full_name || 'User'}</p>
            <p className="text-[10px] text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title={t('header.signOut')}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
