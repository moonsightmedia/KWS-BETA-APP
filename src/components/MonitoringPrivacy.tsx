import { useOnboarding } from '@/components/onboarding/OnboardingContext';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { KwsSurface } from '@/components/ui/kws-surface';
import { getUsageConsent, isMonitoringEnabled, setUsageConsent } from '@/utils/monitoring';

function useUsageChoice() {
  const [choice, setChoice] = useState(getUsageConsent);
  useEffect(() => {
    const update = () => setChoice(getUsageConsent());
    window.addEventListener('kws:monitoring-consent', update);
    return () => window.removeEventListener('kws:monitoring-consent', update);
  }, []);
  return choice;
}

export function MonitoringConsentPrompt() {
  const { isOpen: onboardingOpen } = useOnboarding();
  const { pathname } = useLocation();
  const choice = useUsageChoice();
  if (onboardingOpen || pathname.startsWith('/onboarding/') || !isMonitoringEnabled() || choice !== 'unknown') return null;
  return <aside aria-label="Nutzungsstatistik auswählen" className="fixed inset-x-4 bottom-[calc(var(--app-safe-area-bottom)+96px)] z-40 mx-auto max-w-md">
    <KwsSurface className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" aria-hidden="true" />
        <div className="min-w-0"><h2 className="text-sm font-semibold">Nutzungsstatistik erlauben?</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Für eine bessere App zählen wir mit deiner Zustimmung App-Starts, Boulderansichten und Videostarts. Admins sehen auch die Onlinezahl und aktuell geöffnete Boulder – ohne Namen.</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Freiwillig. Nur für dieses Gerät. Jederzeit im Profil änderbar.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => setUsageConsent('denied')}>Ohne Statistik</Button><Button onClick={() => setUsageConsent('granted')}>Statistik erlauben</Button></div>
      <p className="text-xs leading-relaxed text-muted-foreground">Technische Fehlerberichte sind davon unabhängig. <Link to="/app/privacy" className="font-medium text-primary-ink underline underline-offset-2">Datenschutz & Auswahl</Link></p>
    </KwsSurface>
  </aside>;
}

export function MonitoringPrivacySettings() {
  const choice = useUsageChoice();
  if (!isMonitoringEnabled()) return null;
  return <section className="space-y-2" aria-labelledby="monitoring-privacy-title">
    <h2 id="monitoring-privacy-title" className="text-sm font-semibold">Datenschutz & Diagnose</h2>
    <KwsSurface className="divide-y divide-border/60">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0"><Label htmlFor="usage-statistics" className="text-sm font-medium">Nutzungsstatistik erlauben</Label><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Für eine bessere App zählen wir App-Starts, Boulderansichten und Videostarts. Admins sehen auch die Onlinezahl und geöffnete Boulder – ohne Namen. Freiwillig, nur für dieses Gerät und jederzeit abschaltbar.</p></div>
        <Switch id="usage-statistics" checked={choice === 'granted'} onCheckedChange={checked => setUsageConsent(checked ? 'granted' : 'denied')} className="shrink-0" />
      </div>
      <div className="space-y-2 p-4 text-xs leading-relaxed text-muted-foreground"><p>Fehlerberichte enthalten technische Angaben zur Störung, App-Version und Plattform. Sie helfen uns, die Beta stabil zu halten. Es werden keine Bildschirmaufnahmen oder Eingaben mitgeschnitten.</p><Link to="/app/privacy" className="inline-flex min-h-11 items-center font-medium text-primary-ink underline underline-offset-2">Datenschutz der App</Link></div>
    </KwsSurface>
  </section>;
}
