import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoonStar, Palette, Smartphone } from 'lucide-react';

import { SetupAreaLayout } from '@/components/SetupAreaLayout';

const AppearanceSettings = () => {
  const navigate = useNavigate();

  return (
    <SetupAreaLayout>
      <div className="flex-1 bg-[#F9FAF9]">
        <main className="flex-1">
          <div className="mx-auto max-w-4xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
            <div className="space-y-5 rounded-2xl bg-[#F9FAF9] px-3 pb-8 pt-6 md:px-6">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F4EE] text-[#6E7487] transition-transform active:scale-[0.98]"
                  aria-label="Zurück"
                >
                  <ArrowLeft className="h-5 w-5" strokeWidth={2} />
                </button>
                <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-[#13112B]">Erscheinungsbild</h1>
              </div>

              <section className="rounded-2xl border border-[#DDE7DF] bg-white px-6 py-6 shadow-[0_8px_24px_rgba(19,17,43,0.04)]">
                <p className="text-sm text-[#13112B]/58">
                  Dieser Bereich ist vorbereitet. Wir hängen hier als nächsten Schritt die echten Anzeige- und Theme-Optionen an.
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    { icon: <Palette className="h-5 w-5 text-[#8CCF19]" />, title: 'Farbstil', text: 'Hier landet als nächstes die visuelle Grundrichtung der App.' },
                    { icon: <MoonStar className="h-5 w-5 text-[#8CCF19]" />, title: 'Darstellung', text: 'Später findest du hier Optionen für Kontrast, Theme und Lesbarkeit.' },
                    { icon: <Smartphone className="h-5 w-5 text-[#8CCF19]" />, title: 'App-Ansicht', text: 'Auch kompakte Ansichten und persönliche Layout-Präferenzen hängen wir hier an.' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-[#E7F7E9] bg-[#F9FAF9] p-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#EEF6E8]">{item.icon}</div>
                        <div>
                          <p className="font-medium text-[#13112B]">{item.title}</p>
                          <p className="pt-1 text-sm text-[#13112B]/58">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </SetupAreaLayout>
  );
};

export default AppearanceSettings;
