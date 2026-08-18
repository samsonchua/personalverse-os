import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { CheckSquare, Flame, Clock, Play, Pause, RotateCcw, Plus, X, Check, Sparkles, Trash2, CalendarClock } from 'lucide-react';
import { api } from '../../api/client';
import { Habit, TimeBlock } from '../../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export const ProductivityView: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [planDate, setPlanDate] = useState(todayStr());
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitCategory, setHabitCategory] = useState('Work');
  const [saving, setSaving] = useState(false);
  const [loggedToday, setLoggedToday] = useState<Set<string>>(new Set());

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('09:30');
  const [generating, setGenerating] = useState(false);

  const loadHabits = () => api.getProductivitySummary().then((res) => {
    setHabits(res.habits);
    setTimeBlocks(res.time_blocks);
  });

  useEffect(() => {
    loadHabits();
  }, []);

  const blocksForDate = timeBlocks
    .filter((b) => b.block_date === planDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTitle) return;
    setSaving(true);
    try {
      await api.createTimeBlock({ title: blockTitle, block_date: planDate, start_time: blockStart, end_time: blockEnd });
      setBlockTitle('');
      setShowBlockForm(false);
      await loadHabits();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async (block: TimeBlock) => {
    await api.updateTimeBlock(block.id, { is_completed: !block.is_completed });
    await loadHabits();
  };

  const handleDeleteBlock = async (id: string) => {
    await api.deleteTimeBlock(id);
    await loadHabits();
  };

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      await api.autoGeneratePlan(planDate);
      await loadHabits();
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle) return;
    setSaving(true);
    try {
      await api.createHabit({ title: habitTitle, category: habitCategory, frequency: 'Daily', target_streak: 30 });
      setHabitTitle('');
      setShowForm(false);
      await loadHabits();
    } finally {
      setSaving(false);
    }
  };

  const handleLogHabit = async (habit: Habit) => {
    if (loggedToday.has(habit.id)) return;
    setLoggedToday((prev) => new Set(prev).add(habit.id));
    await api.logHabit(habit.id, todayStr());
    await loadHabits();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Daily Productivity & Time Blocking</h2>
          <p className="text-xs text-slate-400">Habit streaks, Pomodoro deep work timer, and time blocking schedule</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Habit</span>
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Habit</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAddHabit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Habit title" value={habitTitle} onChange={(e) => setHabitTitle(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={habitCategory} onChange={(e) => setHabitCategory(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option>Work</option><option>Health</option><option>Mindset</option><option>Fitness</option><option>Daily</option>
            </select>
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Create Habit'}
            </button>
          </form>
        </GlassCard>
      )}

      {/* Grid: Pomodoro & Habits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pomodoro Timer Card */}
        <GlassCard className="space-y-4 text-center border-cyan-500/30 bg-gradient-to-b from-slate-900 to-cyan-950/20">
          <div className="flex items-center justify-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-widest">
            <Clock className="w-4 h-4 animate-spin-slow" />
            <span>Deep Work Pomodoro</span>
          </div>

          <div className="py-6">
            <span className="text-6xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]">
              {formatTime(timerSeconds)}
            </span>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/25"
            >
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isTimerRunning ? 'Pause' : 'Start Focus'}</span>
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(25 * 60);
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>

        {/* Habit Tracker */}
        <GlassCard className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amberAccent" />
              <span>Daily Habit Streaks</span>
            </h3>
            <span className="text-xs text-amber-400 font-bold">Tap the check to log today</span>
          </div>

          <div className="space-y-3">
            {habits.map((h) => {
              const done = loggedToday.has(h.id);
              return (
                <div key={h.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{h.title}</h4>
                    <p className="text-xs text-slate-400">{h.category} • Target: {h.target_streak} Days</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs">
                      <Flame className="w-4 h-4 fill-amber-400" />
                      <span>{h.current_streak} Day Streak</span>
                    </div>
                    <button
                      onClick={() => handleLogHabit(h)}
                      disabled={done}
                      title={done ? 'Logged today' : 'Mark done today'}
                      className={`p-2 rounded-xl transition-colors ${done ? 'bg-emerald-500/40 text-emerald-200' : 'bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300'}`}
                    >
                      {done ? <Check className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
            {!habits.length && <p className="text-xs text-slate-500 text-center py-4">No habits yet — add one above.</p>}
          </div>
        </GlassCard>
      </div>

      {/* Time Blocking Schedule */}
      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <CalendarClock className="w-5 h-5 text-cyanAccent" />
            <span>Time Blocking Schedule</span>
          </h3>
          <div className="flex items-center gap-2">
            <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="glass-input px-3 py-1.5 rounded-lg text-xs" />
            <button onClick={handleAutoGenerate} disabled={generating} className="px-3.5 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 font-bold text-xs flex items-center gap-1.5 border border-violet-500/30 disabled:opacity-50">
              <Sparkles className="w-3.5 h-3.5" /> {generating ? 'Generating...' : 'Auto-generate Plan'}
            </button>
            <button onClick={() => setShowBlockForm(!showBlockForm)} className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Block
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Auto-generate drafts blocks from what's pending elsewhere: active client services, unscheduled skill practice, a finance-goal check-in, a knowledge item to review, a health-log reminder, and a career skill below target.
        </p>

        {showBlockForm && (
          <form onSubmit={handleAddBlock} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <input required placeholder="Block title" value={blockTitle} onChange={(e) => setBlockTitle(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="md:col-span-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Block'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {blocksForDate.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-white/5 group">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleBlock(b)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${b.is_completed ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}
                >
                  {b.is_completed && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className="text-xs text-slate-400 font-mono">{b.start_time}–{b.end_time}</span>
                <span className={`text-xs ${b.is_completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{b.title}</span>
              </div>
              <button onClick={() => handleDeleteBlock(b.id)} className="p-1 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {!blocksForDate.length && <p className="text-xs text-slate-500 text-center py-6">No blocks scheduled for this date. Add one or auto-generate a plan.</p>}
        </div>
      </GlassCard>
    </div>
  );
};
