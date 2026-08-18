import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Table2, Plus, Trash2, Save, RowsIcon, Columns3 } from 'lucide-react';
import { calcSheetsApi } from '../../../api/calcSheetsClient';
import { CalcSheet } from '../../../types';
import { computeCell, colLabel, Grid } from '../../../lib/sheetFormula';

const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 6;

const makeGrid = (rows: number, cols: number): Grid =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));

export const CalcSheetTab: React.FC = () => {
  const [sheets, setSheets] = useState<CalcSheet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('New Sheet');
  const [grid, setGrid] = useState<Grid>(makeGrid(DEFAULT_ROWS, DEFAULT_COLS));
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => calcSheetsApi.list().then(setSheets);

  useEffect(() => {
    load();
  }, []);

  const selectSheet = (sheet: CalcSheet | null) => {
    setSelectedId(sheet?.id ?? null);
    setTitle(sheet?.title ?? 'New Sheet');
    setGrid(sheet?.grid_json ?? makeGrid(DEFAULT_ROWS, DEFAULT_COLS));
    setEditingCell(null);
  };

  const setCellValue = (row: number, col: number, value: string) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = value;
      return next;
    });
  };

  const addRow = () => setGrid((prev) => [...prev, Array.from({ length: prev[0]?.length ?? DEFAULT_COLS }, () => '')]);
  const addCol = () => setGrid((prev) => prev.map((r) => [...r, '']));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedId) {
        await calcSheetsApi.update(selectedId, { title, grid_json: grid });
      } else {
        const created = await calcSheetsApi.create(title, grid);
        setSelectedId(created.id);
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await calcSheetsApi.remove(id);
    if (selectedId === id) selectSheet(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <GlassCard hoverEffect={false} className="lg:col-span-1 space-y-2">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Table2 className="w-4 h-4 text-cyanAccent" /> Saved Sheets
          </h3>
          <button onClick={() => selectSheet(null)} className="w-full px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> New Sheet
          </button>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {sheets.map((s) => (
              <div
                key={s.id}
                onClick={() => selectSheet(s)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer ${
                  selectedId === s.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">{s.title}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="text-slate-500 hover:text-rose-400 shrink-0 ml-2">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {!sheets.length && <p className="text-xs text-slate-500 py-4 text-center">No saved sheets yet.</p>}
          </div>
        </GlassCard>

        <GlassCard hoverEffect={false} className="lg:col-span-3 space-y-3">
          <div className="flex items-center gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs font-bold" placeholder="Sheet title" />
            <button onClick={addRow} className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center gap-1"><RowsIcon className="w-3.5 h-3.5" /> Row</button>
            <button onClick={addCol} className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center gap-1"><Columns3 className="w-3.5 h-3.5" /> Col</button>
            <button onClick={handleSave} disabled={saving} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : selectedId ? 'Update' : 'Save'}
            </button>
          </div>

          <div className="overflow-auto max-h-[32rem] rounded-xl border border-white/10">
            <table className="border-collapse text-xs w-full">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 bg-slate-900 border border-white/10 w-10" />
                  {grid[0]?.map((_, col) => (
                    <th key={col} className="sticky top-0 z-10 bg-slate-900 border border-white/10 px-2 py-1 text-slate-400 font-semibold min-w-[90px]">
                      {colLabel(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, r) => (
                  <tr key={r}>
                    <td className="sticky left-0 bg-slate-900 border border-white/10 px-2 py-1 text-slate-500 font-semibold text-center">{r + 1}</td>
                    {row.map((raw, c) => {
                      const isEditing = editingCell?.row === r && editingCell?.col === c;
                      const { value, error } = computeCell(grid, r, c);
                      return (
                        <td key={c} className="border border-white/10 p-0">
                          {isEditing ? (
                            <input
                              autoFocus
                              value={raw}
                              onChange={(e) => setCellValue(r, c, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && setEditingCell(null)}
                              className="w-full h-full px-2 py-1.5 bg-slate-800 text-white outline-none min-w-[90px]"
                            />
                          ) : (
                            <div
                              onClick={() => setEditingCell({ row: r, col: c })}
                              className={`px-2 py-1.5 min-h-[28px] cursor-text hover:bg-slate-800/60 ${error ? 'text-rose-400' : 'text-slate-200'} ${typeof value === 'number' ? 'text-right' : 'text-left'}`}
                            >
                              {value}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-500">Tip: type <code>=SUM(A1:A5)</code>, <code>=B2*1.06</code>, etc. Formulas start with "=".</p>
        </GlassCard>
      </div>
    </div>
  );
};
