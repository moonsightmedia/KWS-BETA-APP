import { createRoot } from 'react-dom/client';
import { BouldersIcon, HomeIcon, StatisticsIcon } from '@/lib/appIcons';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <main className="mx-auto max-w-2xl space-y-8 p-6">
    <h1 className="font-sans text-xl font-semibold">Unser Boulder-Icon</h1>
    <div data-icon-preview className="flex items-center gap-6 rounded-kws-card bg-white p-6 shadow-soft">
      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-kws-card bg-primary text-primary-foreground"><BouldersIcon size={64} aria-hidden="true" /></div>
      <div><p className="font-semibold">Klettergriff</p><p className="mt-1 text-sm text-muted-foreground">Klare Kontur, ein Schraubpunkt</p></div>
    </div>
    <div className="flex items-center gap-6">{[16, 20, 24, 32].map(size => <div key={size} className="grid justify-items-center gap-3"><BouldersIcon size={size} aria-hidden="true" /><span className="text-xs text-muted-foreground">{size} px</span></div>)}</div>
    <div data-icon-family className="flex justify-between rounded-kws-card bg-white p-4 shadow-soft">{[[HomeIcon, 'Home'], [BouldersIcon, 'Boulder'], [StatisticsIcon, 'Statistiken']].map(([Icon, label]) => {
      const Symbol = Icon as typeof BouldersIcon;
      return <div key={String(label)} className="grid justify-items-center gap-2"><span className="grid h-10 w-10 place-items-center text-muted-foreground"><Symbol size={20} aria-hidden="true" /></span><span className="text-xs">{String(label)}</span></div>;
    })}</div>
  </main>,
);
