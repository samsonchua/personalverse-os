import React, { useState } from 'react';
import {
  LayoutDashboard, DollarSign, Briefcase, BookOpen, CheckSquare,
  HeartPulse, Award, Brain, Bot, Search, BarChart3, Settings,
  Sparkles, FileText, Building2, Users, ChevronDown, ChevronRight,
  Target, Workflow, Globe, Radar, Contact, GraduationCap, Rocket, Grid3x3
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { TranslationKey } from '../../i18n/en';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
}

type Category = 'core' | 'samgy' | 'productivity' | 'intelligence' | 'system';

interface LeafItem {
  kind: 'leaf';
  id: NavigationTab;
  icon: any;
  badge?: string;
}

interface SubmenuItem {
  kind: 'submenu';
  id: string;
  icon: any;
  labelKey: TranslationKey;
  children: LeafItem[];
}

type NavEntry = LeafItem | SubmenuItem;

const leaf = (id: NavigationTab, icon: any, badge?: string): LeafItem => ({ kind: 'leaf', id, icon, badge });

const NAVIGATION: Record<Category, NavEntry[]> = {
  core: [
    leaf('dashboard', LayoutDashboard),
    leaf('finance', DollarSign),
    leaf('work', Briefcase, 'Projects'),
    leaf('knowledge', BookOpen, 'NotebookLM'),
    leaf('documents', FileText),
  ],
  samgy: [
    { kind: 'submenu', id: 'clients', icon: Users, labelKey: 'nav.samgy.clients', children: [leaf('clients', Contact), leaf('department', Building2)] },
  ],
  productivity: [
    leaf('productivity', CheckSquare),
    leaf('life-planning', Grid3x3),
    leaf('self-analysis', Radar),
    leaf('skills', Target),
    leaf('health', HeartPulse),
    leaf('career', Award),
  ],
  intelligence: [
    leaf('second-brain', Brain),
    leaf('ai-agents', Bot, '6 Persona'),
    leaf('workflows', Workflow),
    leaf('web-reader', Globe),
    leaf('courses', GraduationCap),
    leaf('startup-playbook', Rocket),
    leaf('search', Search),
  ],
  system: [
    leaf('analytics', BarChart3),
    leaf('settings', Settings),
  ],
};

const CATEGORIES: Category[] = ['core', 'samgy', 'productivity', 'intelligence', 'system'];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useI18n();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({ clients: true });

  const toggleSubmenu = (id: string) => setOpenSubmenus((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderLeaf = (item: LeafItem, indent = false) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${indent ? 'pl-8' : ''} ${
          isActive
            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyanAccent' : 'text-slate-400 group-hover:text-slate-200'}`} />
          <span>{t(`nav.${item.id}` as TranslationKey)}</span>
        </div>
        {item.badge && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-white/10 text-cyan-300 border border-white/10">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const renderEntry = (entry: NavEntry) => {
    if (entry.kind === 'leaf') return renderLeaf(entry);

    const SubIcon = entry.icon;
    const isOpen = !!openSubmenus[entry.id];
    const hasActiveChild = entry.children.some((c) => c.id === activeTab);
    return (
      <div key={entry.id} className="space-y-1">
        <button
          onClick={() => toggleSubmenu(entry.id)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
            hasActiveChild ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <SubIcon className="w-4 h-4" />
            <span>{t(entry.labelKey)}</span>
          </div>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {isOpen && <div className="space-y-1">{entry.children.map((c) => renderLeaf(c, true))}</div>}
      </div>
    );
  };

  return (
    <aside className="w-64 bg-[var(--bg-primary)]/90 border-r border-white/10 flex flex-col h-screen sticky top-0 backdrop-blur-2xl">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-white/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-white text-lg tracking-tight bg-gradient-to-r from-white via-cyan-200 to-violet-200 bg-clip-text text-transparent">
            {t('nav.appName')}
          </h1>
          <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">
            {t('nav.appTagline')}
          </p>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              {t(`nav.category.${cat}` as TranslationKey)}
            </p>
            {NAVIGATION[cat].map((entry) => renderEntry(entry))}
          </div>
        ))}
      </div>

      {/* Footer OS Version Status */}
      <div className="p-4 border-t border-white/10 text-center">
        <div className="bg-slate-900/60 rounded-xl p-2.5 border border-white/5">
          <p className="text-[11px] font-medium text-slate-300">PersonalVerse OS v1.0</p>
          <p className="text-[9px] text-slate-500 mt-0.5">Life Graph Engine: Active</p>
        </div>
      </div>
    </aside>
  );
};
