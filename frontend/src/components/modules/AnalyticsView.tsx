import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { BarChart3, TrendingUp, CheckCircle, BookOpen, Activity } from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency } from '../../lib/currency';

interface LifeMetrics {
  task_completion_rate: number;
  total_tasks: number;
  completed_tasks: number;
  total_knowledge_items: number;
  expense_by_category: Record<string, number>;
  health_trend: Array<{ date: string; weight?: number; sleep?: number; calories?: number }>;
}

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<LifeMetrics | null>(null);

  useEffect(() => {
    api.getLifeMetrics().then(setData);
  }, []);

  const maxExpense = Math.max(1, ...Object.values(data?.expense_by_category || {}));
  const latestHealth = data?.health_trend?.[data.health_trend.length - 1];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">System Analytics & Life Performance</h2>
        <p className="text-xs text-slate-400">Real metrics computed from your tasks, finance, health, and knowledge data</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard hoverEffect={false} className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400"><CheckCircle className="w-4 h-4" /><span className="text-xs font-semibold text-slate-400">Task Completion Rate</span></div>
          <p className="text-2xl font-extrabold text-white">{data ? `${data.task_completion_rate}%` : '—'}</p>
          <p className="text-[11px] text-slate-500">{data ? `${data.completed_tasks} of ${data.total_tasks} tasks` : 'Loading...'}</p>
        </GlassCard>
        <GlassCard hoverEffect={false} className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400"><BookOpen className="w-4 h-4" /><span className="text-xs font-semibold text-slate-400">Knowledge Items</span></div>
          <p className="text-2xl font-extrabold text-white">{data?.total_knowledge_items ?? '—'}</p>
          <p className="text-[11px] text-slate-500">Indexed books, papers & NotebookLM imports</p>
        </GlassCard>
        <GlassCard hoverEffect={false} className="space-y-1">
          <div className="flex items-center gap-2 text-violet-400"><TrendingUp className="w-4 h-4" /><span className="text-xs font-semibold text-slate-400">Expense Categories</span></div>
          <p className="text-2xl font-extrabold text-white">{data ? Object.keys(data.expense_by_category).length : '—'}</p>
          <p className="text-[11px] text-slate-500">Distinct spending categories this period</p>
        </GlassCard>
        <GlassCard hoverEffect={false} className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400"><Activity className="w-4 h-4" /><span className="text-xs font-semibold text-slate-400">Latest Weight</span></div>
          <p className="text-2xl font-extrabold text-white">{latestHealth?.weight ? `${latestHealth.weight} kg` : '—'}</p>
          <p className="text-[11px] text-slate-500">{latestHealth ? `Logged ${latestHealth.date}` : 'No health logs yet'}</p>
        </GlassCard>
      </div>

      {/* Expense Category Breakdown */}
      <GlassCard className="space-y-4" hoverEffect={false}>
        <h3 className="font-bold text-white text-base flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-cyanAccent" />
          <span>Expense Breakdown by Category</span>
        </h3>
        <div className="space-y-3">
          {data && Object.entries(data.expense_by_category).length > 0 ? (
            Object.entries(data.expense_by_category).map(([cat, amt]) => (
              <div key={cat} className="space-y-1 p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">{cat}</span>
                  <span className="text-cyan-400 font-bold">{formatCurrency(amt)}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                    style={{ width: `${(amt / maxExpense) * 100}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">No expense transactions logged yet.</p>
          )}
        </div>
      </GlassCard>

      {/* Health Trend */}
      <GlassCard className="space-y-4" hoverEffect={false}>
        <h3 className="font-bold text-white text-base flex items-center space-x-2">
          <Activity className="w-5 h-5 text-rose-400" />
          <span>Recent Health Trend</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Weight (kg)</th>
                <th className="pb-2 font-semibold">Sleep (hrs)</th>
                <th className="pb-2 font-semibold">Calories</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(data?.health_trend || []).map((h) => (
                <tr key={h.date}>
                  <td className="py-2 text-slate-300">{h.date}</td>
                  <td className="py-2 text-white font-semibold">{h.weight ?? '—'}</td>
                  <td className="py-2 text-white font-semibold">{h.sleep ?? '—'}</td>
                  <td className="py-2 text-white font-semibold">{h.calories ?? '—'}</td>
                </tr>
              ))}
              {(!data || data.health_trend.length === 0) && (
                <tr><td colSpan={4} className="py-4 text-center text-slate-500">No health metrics logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
