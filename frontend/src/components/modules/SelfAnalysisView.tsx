import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { RadarChart } from '../ui/RadarChart';
import { Plus, X, Trash2, Target } from 'lucide-react';
import { selfAnalysisApi } from '../../api/selfAnalysisClient';
import { SelfAnalysisCategory } from '../../types';

const PALETTE = ['#3987e5', '#e5a339', '#4cae6b', '#c2596e', '#8b6ce0', '#3fb3c4'];

export const SelfAnalysisView: React.FC = () => {
  const [categories, setCategories] = useState<SelfAnalysisCategory[]>([]);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [critDrafts, setCritDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = () => selfAnalysisApi.getSummary().then(setCategories);

  useEffect(() => {
    load();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSaving(true);
    try {
      const color = PALETTE[categories.length % PALETTE.length];
      await selfAnalysisApi.createCategory({ name: catName, description: catDesc || undefined, color, sort_order: categories.length });
      setCatName('');
      setCatDesc('');
      setShowCatForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    await selfAnalysisApi.deleteCategory(id);
    await load();
  };

  const handleAddCriterion = async (categoryId: string) => {
    const name = (critDrafts[categoryId] || '').trim();
    if (!name) return;
    await selfAnalysisApi.createCriterion({ category_id: categoryId, name, rating: 2.5 });
    setCritDrafts((prev) => ({ ...prev, [categoryId]: '' }));
    await load();
  };

  const handleRatingChange = async (criterionId: string, rating: number) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        criteria: cat.criteria.map((c) => (c.id === criterionId ? { ...c, rating } : c)),
      }))
    );
    await selfAnalysisApi.updateCriterion(criterionId, { rating });
    await load();
  };

  const handleDeleteCriterion = async (id: string) => {
    await selfAnalysisApi.deleteCriterion(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Self-Analysis</h2>
          <p className="text-xs text-slate-400">Rate yourself across custom categories and see your strengths radar at a glance</p>
        </div>
        <button onClick={() => setShowCatForm(!showCatForm)} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {showCatForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Category</h3>
            <button onClick={() => setShowCatForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Category name (e.g. Founder Mindset)" value={catName} onChange={(e) => setCatName(e.target.value)} className="md:col-span-1 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input placeholder="Description (optional)" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Category'}
            </button>
          </form>
        </GlassCard>
      )}

      {!categories.length && (
        <GlassCard hoverEffect={false} className="text-center py-10">
          <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No self-analysis categories yet. Add one to start rating yourself.</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <GlassCard key={cat.id} hoverEffect={false} className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-base">{cat.name}</h3>
                {cat.description && <p className="text-[11px] text-slate-400">{cat.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: `${cat.color}22`, color: cat.color }}>
                  Avg {cat.average_rating.toFixed(1)} / 5
                </span>
                <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-500 hover:text-rose-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <RadarChart
              data={cat.criteria.map((c) => ({ label: c.name, value: c.rating }))}
              max={5}
              size={280}
              color={cat.color}
            />

            <div className="space-y-2">
              {cat.criteria.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-xs text-slate-200 flex-1 truncate">{c.name}</span>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.5}
                    value={c.rating}
                    onChange={(e) => handleRatingChange(c.id, parseFloat(e.target.value))}
                    className="w-24 accent-cyan-500"
                  />
                  <span className="text-xs font-bold w-8 text-right" style={{ color: cat.color }}>{c.rating.toFixed(1)}</span>
                  <button onClick={() => handleDeleteCriterion(c.id)} className="text-slate-500 hover:text-rose-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                placeholder="Add criterion (e.g. Discipline)"
                value={critDrafts[cat.id] || ''}
                onChange={(e) => setCritDrafts((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion(cat.id)}
                className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs"
              />
              <button onClick={() => handleAddCriterion(cat.id)} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold">
                Add
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
