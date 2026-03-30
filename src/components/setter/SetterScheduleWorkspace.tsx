import { ReactNode } from 'react';

import { SetterWorkspaceShell } from './SetterWorkspaceShell';

export function SetterScheduleWorkspace({
  count,
  actionSlot,
  children,
  dialog,
}: {
  count: number;
  actionSlot?: ReactNode;
  children: ReactNode;
  dialog?: ReactNode;
}) {
  return (
    <SetterWorkspaceShell
      eyebrow="Setter Workspace"
      title="Schrauberplan"
      description="Plane Termine mit klaren Tagesclustern und einem fokussierten Dialog für sektorbasierte Planung."
      metrics={[
        { label: 'Geplante Termine', value: `${count}` },
        { label: 'Struktur', value: 'Kalender + Tagescluster', tone: 'success' },
        { label: 'Modus', value: 'Planung statt Verwaltung', tone: 'muted' },
      ]}
      primarySlot={actionSlot}
    >
      {children}
      {dialog}
    </SetterWorkspaceShell>
  );
}
