import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AIAssistantDrawer } from '../ui/AIAssistantDrawer';
import { NavigationTab } from '../../types';

import { DashboardView } from '../modules/DashboardView';
import { FinanceView } from '../modules/FinanceView';
import { WorkBuddyView } from '../modules/WorkBuddyView';
import { DepartmentView } from '../modules/DepartmentView';
import { ClientsView } from '../modules/ClientsView';
import { KnowledgeView } from '../modules/KnowledgeView';
import { DocumentsView } from '../modules/DocumentsView';
import { ProductivityView } from '../modules/ProductivityView';
import { SelfAnalysisView } from '../modules/SelfAnalysisView';
import { WorkflowsView } from '../modules/WorkflowsView';
import { WebReaderView } from '../modules/WebReaderView';
import { CoursesView } from '../modules/CoursesView';
import { StartupPlaybookView } from '../modules/StartupPlaybookView';
import { LifePlanningView } from '../modules/LifePlanningView';
import { SkillsView } from '../modules/SkillsView';
import { HealthView } from '../modules/HealthView';
import { CareerView } from '../modules/CareerView';
import { SecondBrainView } from '../modules/SecondBrainView';
import { AIAgentsView } from '../modules/AIAgentsView';
import { UniversalSearchView } from '../modules/UniversalSearchView';
import { AnalyticsView } from '../modules/AnalyticsView';
import { SettingsView } from '../modules/SettingsView';

export const Shell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleHeaderSearch = (query: string) => {
    setSearchQuery(query);
    setActiveTab('search');
  };

  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveTab} />;
      case 'finance':
        return <FinanceView />;
      case 'work':
        return <WorkBuddyView />;
      case 'clients':
        return <ClientsView />;
      case 'department':
        return <DepartmentView />;
      case 'knowledge':
        return <KnowledgeView />;
      case 'documents':
        return <DocumentsView />;
      case 'productivity':
        return <ProductivityView />;
      case 'self-analysis':
        return <SelfAnalysisView />;
      case 'skills':
        return <SkillsView />;
      case 'health':
        return <HealthView />;
      case 'career':
        return <CareerView />;
      case 'second-brain':
        return <SecondBrainView />;
      case 'ai-agents':
        return <AIAgentsView />;
      case 'workflows':
        return <WorkflowsView />;
      case 'web-reader':
        return <WebReaderView />;
      case 'courses':
        return <CoursesView />;
      case 'startup-playbook':
        return <StartupPlaybookView />;
      case 'life-planning':
        return <LifePlanningView />;
      case 'search':
        return <UniversalSearchView onNavigate={setActiveTab} initialQuery={searchQuery} />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAI={() => setIsAIDrawerOpen(true)}
          onSearch={handleHeaderSearch}
        />

        <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto space-y-6">
          {renderModule()}
        </main>
      </div>

      {/* Floating Multi-Agent AI Drawer */}
      <AIAssistantDrawer isOpen={isAIDrawerOpen} onClose={() => setIsAIDrawerOpen(false)} />
    </div>
  );
};
