import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { StatWidget } from '../ui/StatWidget';
import { QuickCapture } from '../ui/QuickCapture';
import { 
  DollarSign, CheckSquare, Briefcase, HeartPulse, Sparkles, 
  ArrowUpRight, Clock, Target, ShieldCheck
} from 'lucide-react';
import { api } from '../../api/client';
import { DashboardSummary } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/currency';

export const DashboardView: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const firstName = (user?.full_name || 'there').split(' ')[0];
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardSummary();
      setData(res);
    } catch {
      // fallback handled in client
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-900/40 via-blue-900/30 to-violet-900/40 border border-cyan-500/30 p-6 glass-panel">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>AI Autonomous Command Center</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {firstName}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Your Personal Operating System is synchronized across every connected life domain.
            </p>
          </div>
          <button
            onClick={() => onNavigate('ai-agents')}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-500/25 flex items-center space-x-2 whitespace-nowrap"
          >
            <span>Ask CEO Agent</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Capture Dock */}
      <QuickCapture onCaptured={loadData} />

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          title="Net Worth"
          value={formatCurrency(data?.net_worth ?? 0)}
          subtitle={`${data?.account_count || 4} Connected Accounts`}
          icon={DollarSign}
          iconColor="text-emerald-400"
          change="+4.2% mo/mo"
          isPositive
        />
        <StatWidget
          title="WorkBuddy Tasks"
          value={data?.pending_task_count || 3}
          subtitle="Pending Action Items"
          icon={CheckSquare}
          iconColor="text-cyanAccent"
        />
        <StatWidget
          title="Active Projects"
          value={data?.active_project_count || 2}
          subtitle="75% Average Progress"
          icon={Briefcase}
          iconColor="text-violetAccent"
        />
        <StatWidget
          title="Health Status"
          value={`${data?.health_today.weight_kg || 72.5} kg`}
          subtitle={`Sleep: ${data?.health_today.sleep_hours || 7.8} hrs (${data?.health_today.mood || 'Energized'})`}
          icon={HeartPulse}
          iconColor="text-roseAccent"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects Widget */}
        <GlassCard className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-cyanAccent" />
              <span>High-Priority WorkBuddy Projects</span>
            </h3>
            <button onClick={() => onNavigate('work')} className="text-xs font-semibold text-cyan-400 hover:underline">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {data?.active_projects.map((proj) => (
              <div key={proj.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white text-sm">{proj.title}</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold">
                    {proj.priority} Priority
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-violet-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${proj.progress_pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Progress</span>
                  <span className="font-bold text-white">{proj.progress_pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Second Brain & Journal Log */}
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Clock className="w-5 h-5 text-violetAccent" />
              <span>Second Brain Feed</span>
            </h3>
            <button onClick={() => onNavigate('second-brain')} className="text-xs font-semibold text-violet-400 hover:underline">
              View Journal
            </button>
          </div>

          <div className="space-y-3">
            {data?.recent_journals.map((j) => (
              <div key={j.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 px-2 py-0.5 rounded bg-violet-500/10 inline-block">
                  {j.entry_type}
                </span>
                <h4 className="text-xs font-bold text-white mt-1">{j.title}</h4>
                <p className="text-[10px] text-slate-400">{new Date(j.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
