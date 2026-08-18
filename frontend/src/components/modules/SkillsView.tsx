import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Target, Plus, X, Trash2, CalendarPlus, Check } from 'lucide-react';
import { skillsApi } from '../../api/skillsClient';
import { SkillWithTasks } from '../../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export const SkillsView: React.FC = () => {
  const [skills, setSkills] = useState<SkillWithTasks[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [currentLevel, setCurrentLevel] = useState('3');
  const [targetLevel, setTargetLevel] = useState('10');
  const [saving, setSaving] = useState(false);
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(todayStr());
  const [scheduleStart, setScheduleStart] = useState('19:00');
  const [scheduleEnd, setScheduleEnd] = useState('19:30');

  const load = () => skillsApi.getSummary().then(setSkills);

  useEffect(() => {
    load();
  }, []);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await skillsApi.createSkill({ name, category, current_level: parseInt(currentLevel), target_level: parseInt(targetLevel) });
      setName('');
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    await skillsApi.deleteSkill(id);
    await load();
  };

  const handleAddTask = async (skillId: string) => {
    const title = (taskDrafts[skillId] || '').trim();
    if (!title) return;
    await skillsApi.createTask(skillId, title);
    setTaskDrafts((prev) => ({ ...prev, [skillId]: '' }));
    await load();
  };

  const handleToggleTask = async (id: string, is_completed: boolean) => {
    await skillsApi.updateTask(id, { is_completed: !is_completed });
    await load();
  };

  const handleDeleteTask = async (id: string) => {
    await skillsApi.deleteTask(id);
    await load();
  };

  const handleSchedule = async (taskId: string) => {
    await skillsApi.scheduleTask(taskId, scheduleDate, scheduleStart, scheduleEnd);
    setSchedulingTaskId(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Skill Development</h2>
          <p className="text-xs text-slate-400">Break each skill into micro-tasks and schedule practice sessions in your Daily Planner</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Skill
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Skill</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAddSkill} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input required placeholder="Skill name" value={name} onChange={(e) => setName(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <div className="flex gap-2">
              <input type="number" min="1" max="10" value={currentLevel} onChange={(e) => setCurrentLevel(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs w-full" title="Current level" />
              <input type="number" min="1" max="10" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs w-full" title="Target level" />
            </div>
            <button type="submit" disabled={saving} className="md:col-span-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Skill'}
            </button>
          </form>
        </GlassCard>
      )}

      {!skills.length && (
        <GlassCard hoverEffect={false} className="text-center py-10">
          <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No skills tracked yet. Add one to break it into practice micro-tasks.</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {skills.map((skill) => (
          <GlassCard key={skill.id} hoverEffect={false} className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-base">{skill.name}</h3>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{skill.category}</p>
              </div>
              <button onClick={() => handleDeleteSkill(skill.id)} className="text-slate-500 hover:text-rose-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Level {skill.current_level} / {skill.target_level}</span>
                <span className="text-cyan-400 font-bold">{skill.task_progress_pct}% tasks done</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-gradient-to-r from-amber-500 to-cyan-500 h-2 rounded-full" style={{ width: `${(skill.current_level / skill.target_level) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              {skill.tasks.map((t) => (
                <div key={t.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleToggleTask(t.id, t.is_completed)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${t.is_completed ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}
                    >
                      {t.is_completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`text-xs flex-1 ${t.is_completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{t.title}</span>
                    {t.scheduled_date && <span className="text-[9px] text-emerald-400 font-bold">{t.scheduled_date}</span>}
                    <button onClick={() => setSchedulingTaskId(schedulingTaskId === t.id ? null : t.id)} className="text-slate-500 hover:text-cyan-400">
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteTask(t.id)} className="text-slate-500 hover:text-rose-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {schedulingTaskId === t.id && (
                    <div className="flex items-center gap-2 pl-7">
                      <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="glass-input px-2 py-1 rounded-lg text-[10px]" />
                      <input type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} className="glass-input px-2 py-1 rounded-lg text-[10px]" />
                      <input type="time" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} className="glass-input px-2 py-1 rounded-lg text-[10px]" />
                      <button onClick={() => handleSchedule(t.id)} className="px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-[10px] font-bold">
                        Add to Planner
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!skill.tasks.length && <p className="text-[11px] text-slate-500 text-center py-2">No micro-tasks yet.</p>}
            </div>

            <div className="flex gap-2">
              <input
                placeholder="Add micro-task (e.g. Practice 20 min)"
                value={taskDrafts[skill.id] || ''}
                onChange={(e) => setTaskDrafts((prev) => ({ ...prev, [skill.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask(skill.id)}
                className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs"
              />
              <button onClick={() => handleAddTask(skill.id)} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold">
                Add
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
