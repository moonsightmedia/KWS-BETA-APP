import { ReactNode } from 'react';

import { SetterWorkspaceShell } from './SetterWorkspaceShell';

export function SetterStatusWorkspace({
  count,
  filters,
  children,
  dialog,
}: {
  count: number;
  filters: ReactNode;
  children: ReactNode;
  dialog?: ReactNode;
}) {
  return (
    <SetterWorkspaceShell
      eyebrow="Setter Workspace"
      title="Status"
      description="Der operative Blick auf den Hallenbestand: filtern, pruefen und den Haengt/Abgeschraubt-Status ohne Umwege umstellen."
      metrics={[
        { label: 'Boulder', value: `${count}` },
        { label: 'Status Flow', value: 'Einzelaktion oder Bulk', tone: 'success' },
        { label: 'Ansicht', value: 'Operative Kartenliste', tone: 'muted' },
      ]}
    >
      <div className="space-y-5">
        {filters}
        {children}
      </div>
      {dialog}
    </SetterWorkspaceShell>
  );
}
