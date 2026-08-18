import React, { useEffect, useRef, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { StatWidget } from '../ui/StatWidget';
import { Activity, Flame, Moon, Droplets, Dumbbell, Plus, X, Pencil, Trash2, UploadCloud, Footprints } from 'lucide-react';
import { api } from '../../api/client';
import { HealthMetric, WorkoutLog } from '../../types';
import { parseMiHealthCsv } from '../../lib/miHealthImport';

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyMetricForm = () => ({ log_date: todayStr(), weight: '', sleep: '', calories: '', water: '', mood: 'Energized' });
const emptyWorkoutForm = () => ({ log_date: todayStr(), exerciseName: '', sets: '3', reps: '10', workoutWeight: '', duration: '30' });

export const HealthView: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [showForm, setShowForm] = useState<'none' | 'metric' | 'workout'>('none');
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [metricForm, setMetricForm] = useState(emptyMetricForm());
  const [workoutForm, setWorkoutForm] = useState(emptyWorkoutForm());

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadData = () =>
    api.getHealthSummary().then((res) => {
      setMetrics(res.metrics_history || []);
      setWorkouts(res.workouts_history || []);
    });

  useEffect(() => {
    loadData();
  }, []);

  const latest = metrics[0] || null;

  const openNewMetric = () => {
    setEditingMetricId(null);
    setMetricForm(emptyMetricForm());
    setShowForm(showForm === 'metric' ? 'none' : 'metric');
  };

  const openEditMetric = (m: HealthMetric) => {
    setEditingMetricId(m.id);
    setMetricForm({
      log_date: m.log_date,
      weight: m.weight_kg?.toString() ?? '',
      sleep: m.sleep_hours?.toString() ?? '',
      calories: m.calories_consumed?.toString() ?? '',
      water: m.water_ml?.toString() ?? '',
      mood: m.mood ?? 'Energized',
    });
    setShowForm('metric');
  };

  const handleSaveMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        log_date: metricForm.log_date,
        weight_kg: metricForm.weight ? parseFloat(metricForm.weight) : undefined,
        sleep_hours: metricForm.sleep ? parseFloat(metricForm.sleep) : undefined,
        calories_consumed: metricForm.calories ? parseInt(metricForm.calories) : undefined,
        water_ml: metricForm.water ? parseInt(metricForm.water) : undefined,
        mood: metricForm.mood,
      };
      if (editingMetricId) {
        await api.updateHealthMetric(editingMetricId, payload);
      } else {
        await api.logHealthMetric(payload);
      }
      setShowForm('none');
      setEditingMetricId(null);
      setMetricForm(emptyMetricForm());
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMetric = async (id: string) => {
    await api.deleteHealthMetric(id);
    await loadData();
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const { rows, skipped } = parseMiHealthCsv(text);
      if (!rows.length) {
        setImportResult(`No usable rows found${skipped ? ` (${skipped} rows skipped — couldn't find a date column)` : ''}.`);
        return;
      }
      const res = await api.bulkImportHealthMetrics(rows);
      setImportResult(`Imported ${res.total} days (${res.created} new, ${res.updated} updated)${skipped ? `, ${skipped} rows skipped` : ''}.`);
      await loadData();
    } catch (err: any) {
      setImportResult(err?.response?.data?.detail || 'Import failed — check the file is a CSV export.');
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const openNewWorkout = () => {
    setEditingWorkoutId(null);
    setWorkoutForm(emptyWorkoutForm());
    setShowForm(showForm === 'workout' ? 'none' : 'workout');
  };

  const openEditWorkout = (w: WorkoutLog) => {
    setEditingWorkoutId(w.id);
    setWorkoutForm({
      log_date: w.log_date, exerciseName: w.exercise_name, sets: String(w.sets), reps: String(w.reps),
      workoutWeight: String(w.weight_kg), duration: String(w.duration_min),
    });
    setShowForm('workout');
  };

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutForm.exerciseName) return;
    setSaving(true);
    try {
      const payload = {
        log_date: workoutForm.log_date,
        exercise_name: workoutForm.exerciseName,
        sets: parseInt(workoutForm.sets) || 0,
        reps: parseInt(workoutForm.reps) || 0,
        weight_kg: workoutForm.workoutWeight ? parseFloat(workoutForm.workoutWeight) : 0,
        duration_min: parseInt(workoutForm.duration) || 0,
      };
      if (editingWorkoutId) {
        await api.updateWorkout(editingWorkoutId, payload);
      } else {
        await api.logWorkout(payload);
      }
      setShowForm('none');
      setEditingWorkoutId(null);
      setWorkoutForm(emptyWorkoutForm());
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    await api.deleteWorkout(id);
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Health & Biohacking Tracker</h2>
          <p className="text-xs text-slate-400">Weight, nutrition, sleep recovery, workout logging & mood</p>
        </div>
        <div className="flex gap-2">
          <input ref={importInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5 disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{importing ? 'Importing...' : 'Import Mi Health CSV'}</span>
          </button>
          <button
            onClick={openNewMetric}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Log Metric</span>
          </button>
          <button
            onClick={openNewWorkout}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-rose-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Log Workout</span>
          </button>
        </div>
      </div>

      {importResult && (
        <GlassCard hoverEffect={false} className="border-cyan-500/30 flex items-center justify-between">
          <p className="text-xs text-cyan-300">{importResult}</p>
          <button onClick={() => setImportResult(null)}><X className="w-4 h-4 text-slate-400" /></button>
        </GlassCard>
      )}

      {showForm === 'metric' && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingMetricId ? 'Edit Health Metric' : "Log Today's Health Metric"}</h3>
            <button onClick={() => { setShowForm('none'); setEditingMetricId(null); }}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSaveMetric} className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <input type="date" value={metricForm.log_date} onChange={(e) => setMetricForm({ ...metricForm, log_date: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" step="0.1" placeholder="Weight (kg)" value={metricForm.weight} onChange={(e) => setMetricForm({ ...metricForm, weight: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" step="0.1" placeholder="Sleep (hrs)" value={metricForm.sleep} onChange={(e) => setMetricForm({ ...metricForm, sleep: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" placeholder="Calories" value={metricForm.calories} onChange={(e) => setMetricForm({ ...metricForm, calories: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" placeholder="Water (ml)" value={metricForm.water} onChange={(e) => setMetricForm({ ...metricForm, water: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={metricForm.mood} onChange={(e) => setMetricForm({ ...metricForm, mood: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option>Energized</option><option>Calm</option><option>Focused</option><option>Tired</option>
            </select>
            <button type="submit" disabled={saving} className="col-span-2 md:col-span-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingMetricId ? 'Save Changes' : 'Save Metric'}
            </button>
          </form>
        </GlassCard>
      )}

      {showForm === 'workout' && (
        <GlassCard hoverEffect={false} className="space-y-3 border-rose-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">{editingWorkoutId ? 'Edit Workout' : 'Log Workout'}</h3>
            <button onClick={() => { setShowForm('none'); setEditingWorkoutId(null); }}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSaveWorkout} className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <input type="date" value={workoutForm.log_date} onChange={(e) => setWorkoutForm({ ...workoutForm, log_date: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input required placeholder="Exercise name" value={workoutForm.exerciseName} onChange={(e) => setWorkoutForm({ ...workoutForm, exerciseName: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" placeholder="Sets" value={workoutForm.sets} onChange={(e) => setWorkoutForm({ ...workoutForm, sets: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" placeholder="Reps" value={workoutForm.reps} onChange={(e) => setWorkoutForm({ ...workoutForm, reps: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" step="0.5" placeholder="Weight (kg)" value={workoutForm.workoutWeight} onChange={(e) => setWorkoutForm({ ...workoutForm, workoutWeight: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" placeholder="Duration (min)" value={workoutForm.duration} onChange={(e) => setWorkoutForm({ ...workoutForm, duration: e.target.value })} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="col-span-2 md:col-span-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : editingWorkoutId ? 'Save Changes' : 'Save Workout'}
            </button>
          </form>
        </GlassCard>
      )}

      {/* Metrics Row — click any card to edit the latest entry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div onClick={() => (latest ? openEditMetric(latest) : openNewMetric())} className="cursor-pointer">
          <StatWidget
            title="Body Weight"
            value={latest?.weight_kg ? `${latest.weight_kg} kg` : '—'}
            subtitle={latest?.body_fat_pct ? `Body Fat: ${latest.body_fat_pct}%` : 'Click to log'}
            icon={Activity}
            iconColor="text-roseAccent"
          />
        </div>
        <div onClick={() => (latest ? openEditMetric(latest) : openNewMetric())} className="cursor-pointer">
          <StatWidget
            title="Sleep Recovery"
            value={latest?.sleep_hours ? `${latest.sleep_hours} hrs` : '—'}
            subtitle="Click to log"
            icon={Moon}
            iconColor="text-violetAccent"
          />
        </div>
        <div onClick={() => (latest ? openEditMetric(latest) : openNewMetric())} className="cursor-pointer">
          <StatWidget
            title="Daily Nutrition"
            value={latest?.calories_consumed ? `${latest.calories_consumed} kcal` : '—'}
            subtitle={latest?.protein_g ? `Protein: ${latest.protein_g}g` : 'Click to log'}
            icon={Flame}
            iconColor="text-amberAccent"
          />
        </div>
        <div onClick={() => (latest ? openEditMetric(latest) : openNewMetric())} className="cursor-pointer">
          <StatWidget
            title="Hydration"
            value={latest?.water_ml ? `${(latest.water_ml / 1000).toFixed(1)} L` : '—'}
            subtitle="Click to log"
            icon={Droplets}
            iconColor="text-cyanAccent"
          />
        </div>
        <div onClick={() => (latest ? openEditMetric(latest) : openNewMetric())} className="cursor-pointer">
          <StatWidget
            title="Steps"
            value={latest?.steps ? latest.steps.toLocaleString() : '—'}
            subtitle={latest?.resting_heart_rate ? `RHR: ${latest.resting_heart_rate} bpm` : 'From wearable import'}
            icon={Footprints}
            iconColor="text-emerald-400"
          />
        </div>
      </div>

      {/* Metrics History */}
      <GlassCard className="space-y-4">
        <h3 className="font-bold text-white text-base flex items-center space-x-2">
          <Activity className="w-5 h-5 text-cyanAccent" />
          <span>Metrics History</span>
        </h3>
        <div className="space-y-2">
          {metrics.map((m) => (
            <div key={m.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between group">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-bold text-white w-24">{m.log_date}</span>
                <span className="text-slate-300">{m.weight_kg ? `${m.weight_kg} kg` : '—'}</span>
                <span className="text-slate-300">{m.sleep_hours ? `${m.sleep_hours} hrs sleep` : '—'}</span>
                <span className="text-slate-300">{m.calories_consumed ? `${m.calories_consumed} kcal` : '—'}</span>
                <span className="text-slate-400">{m.mood}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditMetric(m)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDeleteMetric(m.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {!metrics.length && <p className="text-xs text-slate-500 text-center py-4">No metrics logged yet.</p>}
        </div>
      </GlassCard>

      {/* Workout Logs */}
      <GlassCard className="space-y-4">
        <h3 className="font-bold text-white text-base flex items-center space-x-2">
          <Dumbbell className="w-5 h-5 text-rose-400" />
          <span>Recent Workouts & Strength Logs</span>
        </h3>
        <div className="space-y-3">
          {workouts.map((w) => (
            <div key={w.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between group">
              <div>
                <h4 className="font-bold text-white text-sm">{w.exercise_name}</h4>
                <p className="text-xs text-slate-400">{w.log_date} • {w.sets} Sets × {w.reps} Reps ({w.weight_kg} kg)</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-400">{w.calories_burned} kcal burned</span>
                  <p className="text-[10px] text-slate-400">{w.duration_min} mins</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditWorkout(w)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteWorkout(w.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          {!workouts.length && <p className="text-xs text-slate-500 text-center py-4">No workouts logged yet.</p>}
        </div>
      </GlassCard>
    </div>
  );
};
