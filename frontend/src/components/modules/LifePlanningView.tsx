import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Sparkles, ChevronRight, X, CheckCircle2, Circle } from 'lucide-react';
import { api } from '../../api/client';
import { MandalaBoard, MandalaCell } from '../../types';

// Standard mandala reading order for a 3x3 grid, rendered row-major:
// top-left, top, top-right, left, CENTER, right, bottom-left, bottom, bottom-right.
const GRID_ORDER = [1, 2, 3, 4, 0, 5, 6, 7, 8];

const BOARD_TYPE_LABEL: Record<string, string> = {
  life: 'Life Vision — 8 decades surrounding your center goal',
  decade: 'Decade Goal — 8 sub-goals for this 10-year period',
  action: 'Action Steps — 8 concrete steps for this sub-goal',
};

interface Crumb {
  id: string;
  title: string;
}

export const LifePlanningView: React.FC = () => {
  const [board, setBoard] = useState<MandalaBoard | null>(null);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<MandalaCell | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandingId, setExpandingId] = useState<string | null>(null);

  const loadRoot = async () => {
    if (!board) setLoading(true);
    try {
      const b = await api.getMandalaRoot();
      setBoard(b);
      setCrumbs([{ id: b.id, title: 'Life' }]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadRoot(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = async (boardId: string, crumbTitle: string, keepUpTo?: number) => {
    setLoading(true);
    try {
      const b = await api.getMandalaBoard(boardId);
      setBoard(b);
      setCrumbs((prev) => (keepUpTo != null ? prev.slice(0, keepUpTo + 1) : [...prev, { id: boardId, title: crumbTitle || 'Untitled' }]));
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrentBoard = async () => {
    if (!board) return;
    setBoard(await api.getMandalaBoard(board.id));
  };

  const openEdit = (cell: MandalaCell) => {
    setEditingCell(cell);
    setEditTitle(cell.title || '');
    setEditNotes(cell.notes || '');
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    setSaving(true);
    try {
      await api.updateMandalaCell(editingCell.id, { title: editTitle, notes: editNotes });
      setEditingCell(null);
      await refreshCurrentBoard();
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (cell: MandalaCell) => {
    await api.updateMandalaCell(cell.id, { is_completed: !cell.is_completed });
    await refreshCurrentBoard();
  };

  const handleExpandOrOpen = async (cell: MandalaCell) => {
    if (cell.child_board_id) {
      await navigateTo(cell.child_board_id, cell.title || 'Untitled');
      return;
    }
    setExpandingId(cell.id);
    try {
      const childBoard = await api.expandMandalaCell(cell.id);
      setBoard(childBoard);
      setCrumbs((prev) => [...prev, { id: childBoard.id, title: cell.title || 'Untitled' }]);
    } finally {
      setExpandingId(null);
    }
  };

  if (loading && !board) {
    return <div className="text-slate-400 text-sm">Loading your life chart...</div>;
  }
  if (!board) return null;

  const cellByPos = new Map(board.cells.map((c) => [c.position, c]));
  const canExpand = board.board_type !== 'action';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-cyanAccent" />
          Mandala Life Chart
        </h2>
        <p className="text-xs text-slate-400">
          An "Open Window 64" chart: your life vision broken into 8 decades, each decade into 8 sub-goals, each sub-goal into 8 action steps.
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        {crumbs.map((c, i) => (
          <React.Fragment key={c.id}>
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
            <button
              onClick={() => navigateTo(c.id, c.title, i)}
              className={`px-2 py-1 rounded-lg transition-colors ${
                i === crumbs.length - 1 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {c.title}
            </button>
          </React.Fragment>
        ))}
      </div>

      <GlassCard hoverEffect={false} className="space-y-3">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider">{BOARD_TYPE_LABEL[board.board_type]}</p>
        <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto">
          {GRID_ORDER.map((pos) => {
            const cell = cellByPos.get(pos);
            if (!cell) return <div key={pos} />;
            const isCenter = pos === 0;
            const hasChild = !!cell.child_board_id;
            return (
              <div
                key={cell.id}
                className={`relative aspect-square rounded-xl border p-2.5 flex flex-col transition-colors ${
                  isCenter ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-1">
                  {!isCenter && (
                    <button onClick={() => toggleComplete(cell)} className="shrink-0 mt-0.5" title="Toggle complete">
                      {cell.is_completed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Circle className="w-3.5 h-3.5 text-slate-600" />}
                    </button>
                  )}
                  <button onClick={() => openEdit(cell)} className="flex-1 text-left">
                    <span className={`text-[11px] font-semibold leading-tight break-words ${
                      cell.is_completed ? 'line-through text-slate-500' : isCenter ? 'text-cyan-200' : 'text-slate-200'
                    }`}>
                      {cell.title || <span className="text-slate-600 italic font-normal">Empty — click to edit</span>}
                    </span>
                  </button>
                </div>
                {!isCenter && canExpand && (
                  <button
                    onClick={() => handleExpandOrOpen(cell)}
                    disabled={expandingId === cell.id}
                    className="mt-auto self-end text-[9px] text-slate-500 hover:text-cyan-300 flex items-center gap-0.5 disabled:opacity-50 pt-1"
                  >
                    {expandingId === cell.id ? 'Creating...' : hasChild ? 'Open' : 'Expand'} <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {editingCell && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingCell(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-white/10 rounded-2xl p-5 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Edit Cell</h3>
              <button onClick={() => setEditingCell(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input
              autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title" className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
            />
            <textarea
              value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notes" rows={4} className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
            />
            <button onClick={saveEdit} disabled={saving} className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
