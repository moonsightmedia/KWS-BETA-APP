import { createRoot } from 'react-dom/client';

import { BoulderVideoPlayer } from '@/components/boulder/BoulderVideoPlayer';
import '@/index.css';

const source = '/test/fixtures/vertical-player.mp4';

createRoot(document.getElementById('root')!).render(
  <main className="grid min-h-[100dvh] place-items-center bg-[#F9FAF9] p-4">
    <section className="w-full max-w-sm space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#17641D]">Mobile Player QA</p>
      <div className="h-[720px] max-h-[82dvh] overflow-hidden rounded-kws-card shadow-medium">
        <BoulderVideoPlayer
          betaVideoUrls={{ hd: source, sd: source, low: source }}
          showOfficialBadge
        />
      </div>
    </section>
  </main>,
);
