import React, { useEffect, useRef, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { FlowchartViewer } from '../ui/FlowchartViewer';
import { Workflow, Plus, Trash2, Upload, Save, X } from 'lucide-react';
import { workflowsApi } from '../../api/workflowsClient';
import { WorkflowDiagram } from '../../types';
import { convertDrawioXmlToMermaid } from '../../lib/drawioImport';

const STARTER_SOURCE = `flowchart TD
    A["Start"] --> B["Do the thing"]
    B --> C{"Decision?"}
    C -- Yes --> D["Done"]
    C -- No --> B`;

interface WorkflowEditorPanelProps {
  /** Scope diagrams to an owning entity (e.g. a client) instead of showing/creating general ones. */
  entityType?: string;
  entityId?: string;
}

export const WorkflowEditorPanel: React.FC<WorkflowEditorPanelProps> = ({ entityType, entityId }) => {
  const [workflows, setWorkflows] = useState<WorkflowDiagram[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('New Workflow');
  const [source, setSource] = useState(STARTER_SOURCE);
  const [importError, setImportError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => workflowsApi.list(entityType, entityId).then(setWorkflows);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const selectWorkflow = (wf: WorkflowDiagram | null) => {
    setSelectedId(wf?.id ?? null);
    setTitle(wf?.title ?? 'New Workflow');
    setSource(wf?.mermaid_source ?? STARTER_SOURCE);
    setImportError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedId) {
        await workflowsApi.update(selectedId, { title, mermaid_source: source });
      } else {
        const created = await workflowsApi.create({ title, mermaid_source: source, entity_type: entityType, entity_id: entityId });
        setSelectedId(created.id);
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await workflowsApi.remove(id);
    if (selectedId === id) selectWorkflow(null);
    await load();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      const mermaidSource = convertDrawioXmlToMermaid(text);
      setSource(mermaidSource);
      setTitle(file.name.replace(/\.(xml|drawio)$/i, ''));
      setSelectedId(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <input ref={fileInputRef} type="file" accept=".xml,.drawio" className="hidden" onChange={handleFileChange} />
        <button onClick={handleImportClick} className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5">
          <Upload className="w-4 h-4" /> Import draw.io XML
        </button>
        <button onClick={() => selectWorkflow(null)} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {importError && (
        <GlassCard hoverEffect={false} className="border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
          <p className="text-xs text-rose-300">{importError} Tip: in draw.io use File → Export as → XML, and uncheck "Compressed".</p>
          <button onClick={() => setImportError(null)}><X className="w-4 h-4 text-rose-300" /></button>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Saved workflows list */}
        <GlassCard hoverEffect={false} className="lg:col-span-1 space-y-2">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Workflow className="w-4 h-4 text-cyanAccent" /> {entityType ? 'Client Plans' : 'Saved Diagrams'}
          </h3>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => selectWorkflow(wf)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer ${
                  selectedId === wf.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">{wf.title}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(wf.id); }} className="text-slate-500 hover:text-rose-400 shrink-0 ml-2">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {!workflows.length && <p className="text-xs text-slate-500 py-4 text-center">No saved diagrams yet.</p>}
          </div>
        </GlassCard>

        {/* Editor */}
        <GlassCard hoverEffect={false} className="lg:col-span-1 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-bold"
            placeholder="Workflow title"
          />
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono h-80 resize-none"
          />
          <button onClick={handleSave} disabled={saving} className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : selectedId ? 'Update Diagram' : 'Save Diagram'}
          </button>
        </GlassCard>

        {/* Live Preview */}
        <GlassCard hoverEffect={false} className="lg:col-span-2 space-y-2">
          <h3 className="font-bold text-white text-sm">Live Preview</h3>
          <FlowchartViewer chart={source} className="min-h-[26rem]" />
        </GlassCard>
      </div>
    </div>
  );
};
