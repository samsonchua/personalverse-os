import React from 'react';
import { WorkflowEditorPanel } from '../WorkflowEditorPanel';

interface PlanningTabProps {
  clientId: string;
}

export const PlanningTab: React.FC<PlanningTabProps> = ({ clientId }) => (
  <WorkflowEditorPanel entityType="client" entityId={clientId} />
);
