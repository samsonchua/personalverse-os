import React, { useEffect, useMemo, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { FlowchartViewer } from '../ui/FlowchartViewer';
import { Briefcase, GitBranch, Plus, Search, Video, X } from 'lucide-react';
import { api } from '../../api/client';
import { WorkProject, WorkTask, WorkMeeting } from '../../types';

const SAMPLE_ARCHITECTURE_DIAGRAM = `
graph TD
    A[User Request] --> B(FastAPI Gateway)
    B --> C{Life Graph Engine}
    C --> D[PostgreSQL / SQLite]
    C --> E[AI Multi-Agent Swarm]
    E --> F[OpenAI / Gemini / Claude]
    E --> G[Universal Search Index]
`;

const todayStr = () => new Date().toISOString().slice(0, 10);

export const WorkBuddyView: React.FC = () => {
  const [data, setData] = useState<{
    projects: WorkProject[];
    tasks: WorkTask[];
    meetings: WorkMeeting[];
  } | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'projects' | 'tasks' | 'meetings' | 'flowchart'>('projects');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  // Project form
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectPriority, setProjectPriority] = useState('High');

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');

  // Meeting form
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingProjectId, setMeetingProjectId] = useState('');
  const [meetingSummary, setMeetingSummary] = useState('');

  const loadData = async () => {
    const res = await api.getWorkSummary();
    setData(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortedProjects = useMemo(
    () => [...(data?.projects || [])].sort((a, b) => a.title.localeCompare(b.title)),
    [data?.projects],
  );
  const filteredProjects = useMemo(
    () => sortedProjects.filter((p) => p.title.toLowerCase().includes(projectSearch.trim().toLowerCase())),
    [sortedProjects, projectSearch],
  );

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle) return;
    setSaving(true);
    try {
      await api.createWorkProject({ title: projectTitle, description: projectDesc, priority: projectPriority, status: 'In Progress', progress_pct: 0 });
      setProjectTitle('');
      setProjectDesc('');
      setShowForm(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;
    setSaving(true);
    try {
      await api.createWorkTask({ title: taskTitle, project_id: taskProjectId || undefined, priority: taskPriority, status: 'Todo' });
      setTaskTitle('');
      setShowForm(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle) return;
    setSaving(true);
    try {
      await api.createWorkMeeting({ title: meetingTitle, project_id: meetingProjectId || undefined, meeting_date: todayStr(), summary: meetingSummary || undefined });
      setMeetingTitle('');
      setMeetingSummary('');
      setShowForm(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">WorkBuddy & Operating System Projects</h2>
          <p className="text-xs text-slate-400">Projects, OKRs, Tasks, Meeting Minutes, and Interactive Flowcharts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex space-x-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/10 text-xs">
            {(['projects', 'tasks', 'meetings', 'flowchart'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveSubTab(tab); setShowForm(false); }}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all ${
                  activeSubTab === tab ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {activeSubTab !== 'flowchart' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add {activeSubTab === 'projects' ? 'Project' : activeSubTab === 'tasks' ? 'Task' : 'Meeting'}
            </button>
          )}
        </div>
      </div>

      {/* Projects Subtab */}
      {activeSubTab === 'projects' && (
        <>
          {showForm && (
            <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">New Project</h3>
                <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <form onSubmit={handleAddProject} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input required placeholder="Project title" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
                <select value={projectPriority} onChange={(e) => setProjectPriority(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
                  <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                </select>
                <textarea placeholder="Description (optional)" value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} className="md:col-span-3 glass-input px-3.5 py-2 rounded-xl text-xs" rows={2} />
                <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
                  {saving ? 'Saving...' : 'Create Project'}
                </button>
              </form>
            </GlassCard>
          )}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search projects..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="glass-input w-full pl-9 pr-3.5 py-2 rounded-xl text-xs"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProjects.map((p) => (
              <GlassCard key={p.id} className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10">
                      {p.priority} Priority
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1.5">{p.title}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{p.description}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Project Velocity</span>
                    <span className="font-bold text-white">{p.progress_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full"
                      style={{ width: `${p.progress_pct}%` }}
                    />
                  </div>
                </div>
              </GlassCard>
            ))}
            {!data?.projects.length && <p className="text-xs text-slate-500 text-center py-8 md:col-span-2">No projects yet — add one above.</p>}
            {!!data?.projects.length && !filteredProjects.length && (
              <p className="text-xs text-slate-500 text-center py-8 md:col-span-2">No projects match "{projectSearch}".</p>
            )}
          </div>
        </>
      )}

      {/* Tasks Subtab */}
      {activeSubTab === 'tasks' && (
        <GlassCard className="space-y-4">
          {showForm && (
            <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-cyan-500/30">
              <input required placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
              <select value={taskProjectId} onChange={(e) => setTaskProjectId(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
                <option value="">No project</option>
                {sortedProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
              <button type="submit" disabled={saving} className="md:col-span-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Task'}
              </button>
            </form>
          )}
          <h3 className="font-bold text-white text-base">Task Backlog & Kanban Items</h3>
          <div className="space-y-2">
            {data?.tasks.map((t) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input type="checkbox" defaultChecked={t.status === 'Completed'} disabled className="rounded accent-cyan-500 w-4 h-4" />
                  <div>
                    <h4 className={`text-xs font-bold ${t.status === 'Completed' ? 'line-through text-slate-500' : 'text-white'}`}>
                      {t.title}
                    </h4>
                    <p className="text-[10px] text-slate-400">{t.tags || 'General'}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-300 border border-white/10">
                  {t.priority}
                </span>
              </div>
            ))}
            {!data?.tasks.length && <p className="text-xs text-slate-500 text-center py-4">No tasks yet — add one above.</p>}
          </div>
        </GlassCard>
      )}

      {/* Meetings Subtab */}
      {activeSubTab === 'meetings' && (
        <div className="space-y-4">
          {showForm && (
            <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">New Meeting</h3>
                <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <form onSubmit={handleAddMeeting} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input required placeholder="Meeting title" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
                <select value={meetingProjectId} onChange={(e) => setMeetingProjectId(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
                  <option value="">No project</option>
                  {sortedProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <textarea placeholder="Notes / summary (optional)" value={meetingSummary} onChange={(e) => setMeetingSummary(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" rows={2} />
                <button type="submit" disabled={saving} className="md:col-span-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add Meeting'}
                </button>
              </form>
            </GlassCard>
          )}
          {data?.meetings.map((m) => (
            <GlassCard key={m.id} className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Video className="w-5 h-5 text-violetAccent" />
                  <h3 className="font-bold text-white text-base">{m.title}</h3>
                </div>
                <span className="text-xs text-slate-400">{m.meeting_date} ({m.duration_min} mins)</span>
              </div>
              {m.summary && <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-white/5">{m.summary}</p>}
              {m.action_items_json && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-cyan-400">Action Items:</p>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                    {m.action_items_json.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </GlassCard>
          ))}
          {!data?.meetings.length && <p className="text-xs text-slate-500 text-center py-8">No meetings logged yet.</p>}
        </div>
      )}

      {/* Flowchart Subtab */}
      {activeSubTab === 'flowchart' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-cyanAccent" />
              <span>Interactive Mermaid System Architecture & Mindmap</span>
            </h3>
            <span className="text-xs text-cyan-400 font-semibold">Live Mermaid Renderer</span>
          </div>
          <FlowchartViewer chart={SAMPLE_ARCHITECTURE_DIAGRAM} />
        </GlassCard>
      )}
    </div>
  );
};
