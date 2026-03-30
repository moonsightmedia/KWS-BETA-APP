import { ReactNode } from 'react';

import { SetterSurface, SetterWorkspaceShell } from './SetterWorkspaceShell';

export function SetterEditWorkspace({
  resultCount,
  selectionCount,
  toolbar,
  children,
  dialog,
}: {
  resultCount: number;
  selectionCount: number;
  toolbar: ReactNode;
  children: ReactNode;
  dialog?: ReactNode;
}) {
  return (
    <SetterWorkspaceShell
      eyebrow="Setter Workspace"
      title="Bearbeiten"
      description="Suche Boulder schneller, arbeite konzentriert auf Kartenebene und öffne Details nur dann, wenn du wirklich in die Route eintauchen musst."
      metrics={[
        { label: 'Treffer', value: `${resultCount}` },
        {
          label: 'Auswahl',
          value: selectionCount > 0 ? `${selectionCount} markiert` : 'Keine Auswahl',
          tone: selectionCount > 0 ? 'success' : 'muted',
        },
        { label: 'Fokus', value: 'Search -> Select -> Edit' },
      ]}
    >
      <SetterSurface className="space-y-5">
        {toolbar}
        {children}
      </SetterSurface>
      {dialog}
    </SetterWorkspaceShell>
  );
}
