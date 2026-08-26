import { cn } from '@/lib/utils';

export type LoadingState = 'app' | 'route' | 'session' | 'signing-in' | 'signing-up' | 'signing-out' | 'confirming-email';

interface LoadingScreenProps {
  state?: LoadingState;
  className?: string;
}

const COPY: Record<LoadingState, { eyebrow: string; title: string; description: string }> = {
  app: {
    eyebrow: 'Kletterwelt Sauerland',
    title: 'App wird vorbereitet',
    description: 'Deine Boulder und Sessions werden geladen.',
  },
  route: {
    eyebrow: 'Boulderübersicht',
    title: 'Boulder werden geladen',
    description: 'Wir holen den aktuellen Stand von der Wand.',
  },
  session: {
    eyebrow: 'Sicherer Bereich',
    title: 'Sitzung wird geprüft',
    description: 'Einen kurzen Moment, dann geht es weiter.',
  },
  'signing-in': {
    eyebrow: 'Anmeldung',
    title: 'Zugang wird geprüft',
    description: 'Wir öffnen gleich deinen persönlichen Bereich.',
  },
  'signing-up': {
    eyebrow: 'Registrierung',
    title: 'Konto wird erstellt',
    description: 'Deine Angaben werden sicher verarbeitet.',
  },
  'signing-out': {
    eyebrow: 'Abmeldung',
    title: 'Sitzung wird beendet',
    description: 'Deine lokalen Sitzungsdaten werden geschlossen.',
  },
  'confirming-email': {
    eyebrow: 'E-Mail-Bestätigung',
    title: 'Bestätigung wird geprüft',
    description: 'Danach öffnen wir direkt deinen persönlichen Bereich.',
  },
};

export const LoadingScreen = ({ state = 'app', className }: LoadingScreenProps) => {
  const copy = COPY[state];

  return (
    <main
      className={cn(
        'fixed inset-0 z-[10000] flex min-h-[100svh] min-h-[100dvh] items-center justify-center overflow-hidden bg-[#F9FAF9] px-5 pb-[calc(1.5rem+var(--app-safe-area-bottom))] pt-[calc(1.5rem+var(--app-safe-area-top))] text-[#192436]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(54,181,49,0.08),rgba(54,181,49,0))]" aria-hidden="true" />

      <div className="relative w-full max-w-[22rem] rounded-kws-card bg-white px-5 py-6 shadow-[0_8px_30px_rgba(25,36,54,0.09)] sm:px-6 sm:py-7">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-kws-control bg-[#F1F5F1]">
            <img
              src="/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png"
              alt=""
              aria-hidden="true"
              className="h-8 w-8 object-contain"
            />
          </span>
          <span className="min-w-0">
            <span className="block font-sans text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">
              {copy.eyebrow}
            </span>
            <span className="mt-0.5 block font-sans text-sm font-semibold text-[#192436]">Beta App</span>
          </span>
        </div>

        <div className="mt-8">
          <h1 className="font-heading text-[2.35rem] font-semibold leading-[0.95] text-[#192436]">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-[17rem] font-sans text-xs leading-5 text-muted-foreground">
            {copy.description}
          </p>
        </div>

        <div className="mt-7 flex items-center gap-3" aria-hidden="true">
          <span className="kws-loading-bars flex h-7 items-end gap-1.5">
            <span />
            <span />
            <span />
          </span>
          <span className="h-px flex-1 overflow-hidden bg-[#E5EBE6]">
            <span className="kws-loading-line block h-full w-2/5 bg-primary" />
          </span>
        </div>
      </div>
    </main>
  );
};
