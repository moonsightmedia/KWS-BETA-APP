import { createRoot } from 'react-dom/client';
import { BetaPlaceholder } from '@/components/boulder/BetaPlaceholder';
import '@/index.css';

// Standalone preview of the actual component; no account or database imports.
createRoot(document.getElementById('root')!).render(
  <main className="grid min-h-dvh place-items-center bg-background p-4">
    <section className="w-full max-w-md">
      <h1 className="mb-4 text-base font-semibold">Vorschau · Beta folgt</h1>
      <div className="aspect-[4/5] overflow-hidden rounded-kws-card shadow-soft">
        <BetaPlaceholder boulderName="Grüne Welle" />
      </div>
    </section>
  </main>,
);
