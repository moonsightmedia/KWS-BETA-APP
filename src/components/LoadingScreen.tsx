import { BetaLogo } from '@/components/brand/BetaLogo';
import { cn } from '@/lib/utils';
import '@/styles/beta-loading.css';

export type LoadingState = 'app' | 'route' | 'session' | 'signing-in' | 'signing-up' | 'signing-out' | 'confirming-email';

interface LoadingScreenProps {
  state?: LoadingState;
  className?: string;
}

const COPY: Record<LoadingState, string> = {
  app: 'App wird geladen …',
  route: 'Boulder werden geladen …',
  session: 'Sitzung wird geprüft …',
  'signing-in': 'Du wirst angemeldet …',
  'signing-up': 'Dein Konto wird erstellt …',
  'signing-out': 'Du wirst abgemeldet …',
  'confirming-email': 'E-Mail wird bestätigt …',
};

export const LoadingScreen = ({ state = 'app', className }: LoadingScreenProps) => (
  <main
    className={cn('beta-loading-screen fixed inset-0 z-[10000] flex min-h-[100svh] min-h-[100dvh] items-center justify-center overflow-hidden bg-white px-6 text-brand-ink', className)}
    role="status"
    aria-live="polite"
    aria-label={COPY[state]}
    aria-busy="true"
  >
    <div className="beta-loading-content flex w-full max-w-[18rem] flex-col items-center text-center">
      <BetaLogo decorative className="beta-loading-logo w-[152px] md:w-[176px]" />
      <div className="beta-loading-track mt-10 h-[2px] w-24 overflow-hidden bg-brand-secondary" aria-hidden="true">
        <span className="beta-loading-indicator block h-full w-1/3 bg-primary" />
      </div>
      <p className="mt-4 font-sans text-xs leading-5 text-muted-foreground" aria-hidden="true">{COPY[state]}</p>
    </div>
  </main>
);
