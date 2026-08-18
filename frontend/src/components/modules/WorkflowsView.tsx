import React from 'react';
import { WorkflowEditorPanel } from './WorkflowEditorPanel';

export const WorkflowsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Workflow Designer</h2>
        <p className="text-xs text-slate-400">Sketch flowcharts in Mermaid syntax or import a draw.io diagram</p>
      </div>
      <WorkflowEditorPanel />
    </div>
  );
};
