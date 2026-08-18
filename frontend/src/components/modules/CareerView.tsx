import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Award, Zap, Plus, X } from 'lucide-react';
import { api } from '../../api/client';
import { CareerSkill, CareerMilestone } from '../../types';
import { formatCurrency } from '../../lib/currency';

const todayStr = () => new Date().toISOString().slice(0, 10);

export const CareerView: React.FC = () => {
  const [skills, setSkills] = useState<CareerSkill[]>([]);
  const [milestones, setMilestones] = useState<CareerMilestone[]>([]);
  const [showForm, setShowForm] = useState<'none' | 'skill' | 'milestone'>('none');
  const [saving, setSaving] = useState(false);

  const [skillName, setSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState('5');
  const [skillTarget, setSkillTarget] = useState('10');

  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneImpact, setMilestoneImpact] = useState('');
  const [milestoneSalary, setMilestoneSalary] = useState('');

  const loadData = () =>
    api.getCareerSummary().then((res) => {
      setSkills(res.skills);
      setMilestones(res.milestones);
    });

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName) return;
    setSaving(true);
    try {
      await api.createCareerSkill({ name: skillName, current_level: parseInt(skillLevel), target_level: parseInt(skillTarget) });
      setSkillName('');
      setShowForm('none');
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle) return;
    setSaving(true);
    try {
      await api.createCareerMilestone({
        title: milestoneTitle,
        milestone_date: todayStr(),
        impact_summary: milestoneImpact || undefined,
        salary_delta: milestoneSalary ? parseFloat(milestoneSalary) : 0,
      });
      setMilestoneTitle('');
      setMilestoneImpact('');
      setMilestoneSalary('');
      setShowForm('none');
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Career Progress & Skill Matrix</h2>
          <p className="text-xs text-slate-400">Skills level matrix, promotion stage tracker, and compensation milestones</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(showForm === 'skill' ? 'none' : 'skill')} className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Skill
          </button>
          <button onClick={() => setShowForm(showForm === 'milestone' ? 'none' : 'milestone')} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Milestone
          </button>
        </div>
      </div>

      {showForm === 'skill' && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Skill</h3>
            <button onClick={() => setShowForm('none')}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAddSkill} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input required placeholder="Skill name" value={skillName} onChange={(e) => setSkillName(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" min="1" max="10" placeholder="Current level (1-10)" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" min="1" max="10" placeholder="Target level (1-10)" value={skillTarget} onChange={(e) => setSkillTarget(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="md:col-span-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Skill'}
            </button>
          </form>
        </GlassCard>
      )}

      {showForm === 'milestone' && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Milestone</h3>
            <button onClick={() => setShowForm('none')}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAddMilestone} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Milestone title" value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" step="1000" placeholder="Salary delta (RM/yr, optional)" value={milestoneSalary} onChange={(e) => setMilestoneSalary(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <textarea placeholder="Impact summary (optional)" value={milestoneImpact} onChange={(e) => setMilestoneImpact(e.target.value)} className="md:col-span-3 glass-input px-3.5 py-2 rounded-xl text-xs" rows={2} />
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Milestone'}
            </button>
          </form>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Matrix */}
        <GlassCard className="space-y-4">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amberAccent" />
            <span>Core Skill Matrix (1-10 Scale)</span>
          </h3>
          <div className="space-y-4">
            {skills.map((s) => (
              <div key={s.id} className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">{s.name}</span>
                  <span className="text-cyan-400 font-bold">Level {s.current_level} / {s.target_level}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-cyan-500 h-2 rounded-full"
                    style={{ width: `${(s.current_level / s.target_level) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {!skills.length && <p className="text-xs text-slate-500 text-center py-4">No skills tracked yet.</p>}
          </div>
        </GlassCard>

        {/* Career Milestones */}
        <GlassCard className="space-y-4">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Award className="w-5 h-5 text-cyanAccent" />
            <span>Career Milestones & Achievements</span>
          </h3>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white text-sm">{m.title}</span>
                  {m.salary_delta !== 0 && <span className="text-emerald-400 font-bold">+{formatCurrency(m.salary_delta)}/yr</span>}
                </div>
                {m.impact_summary && <p className="text-xs text-slate-300">{m.impact_summary}</p>}
                <p className="text-[10px] text-slate-400 mt-1">{m.milestone_date}{m.promotion_stage ? ` • ${m.promotion_stage}` : ''}</p>
              </div>
            ))}
            {!milestones.length && <p className="text-xs text-slate-500 text-center py-4">No milestones logged yet.</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
