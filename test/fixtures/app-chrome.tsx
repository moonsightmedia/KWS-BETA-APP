// Served only by the local test server. Auth/data hooks are mocked by the test.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ProfileMenu } from '@/components/ProfileMenu';
import { NotificationCenter } from '@/components/NotificationCenter';
import { BoulderFilterControls, BoulderFilterPanel } from '@/components/boulder/BoulderFilterControls';
import '@/index.css';

export function FilterFixture() {
  const [open, setOpen] = useState(false);
  const [colors, setColors] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const toggle = (items: string[], value: string) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
  return <>
    <button type="button" onClick={() => setOpen(true)}>Filtertest</button>
    <BoulderFilterPanel open={open} onOpenChange={setOpen} resultCount={colors.length || difficulties.length ? 7 : 104}>
      <BoulderFilterControls leadingControls={<p>Testauswahl</p>} difficulties={difficulties} onDifficultyToggle={(value) => setDifficulties(toggle(difficulties, value))} selectedColors={colors} onColorToggle={(value) => setColors(toggle(colors, value))} colors={[{ id: 'red', name: 'Rot', hex: '#ef4444', is_active: true, sort_order: 0 }, { id: 'blue', name: 'Blau', hex: '#3b82f6', is_active: true, sort_order: 1 }]} colorsLoading={false} colorsError={false} onRetryColors={() => {}} activeCount={colors.length + difficulties.length} onReset={() => { setColors([]); setDifficulties([]); }} />
    </BoulderFilterPanel>
  </>;
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter>
    <main className="min-h-screen bg-secondary p-4">
      <div className="flex justify-between">
        <ProfileMenu />
        <NotificationCenter variant="header" />
      </div>
      <FilterFixture />
      <button type="button" className="fixed bottom-4 right-4 p-4">Außerhalb</button>
    </main>
  </MemoryRouter>,
);
