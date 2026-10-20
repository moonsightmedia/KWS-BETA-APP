import { useEffect, useState } from 'react';
import { Check, ExternalLink, RefreshCw, TriangleAlert } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import type { AppInfo } from '@capacitor/app';
import { Link } from 'react-router-dom';

import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { Button, buttonVariants } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { clearBrowserCaches } from '@/utils/cacheUtils';
import { checkForUpdates, getVersionInfo, type WebUpdateInfo } from '@/utils/version';
import { cn } from '@/lib/utils';

type UpdateState =
  | { status: 'idle' | 'checking' }
  | { status: 'checked'; info: WebUpdateInfo; checkedAt: string }
  | { status: 'error'; message: string };

const externalLinkClass = 'inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-kws-badge';

const AboutApp = () => {
  const versionInfo = getVersionInfo();
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  const [nativeInfo, setNativeInfo] = useState<AppInfo | null>(null);
  const [nativeError, setNativeError] = useState(false);
  const [nativeAttempt, setNativeAttempt] = useState(0);
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    setNativeError(false);
    import('@capacitor/app').then(({ App }) => App.getInfo()).then((info) => {
      if (!cancelled) setNativeInfo(info);
    }).catch(() => {
      if (!cancelled) setNativeError(true);
    });
    return () => { cancelled = true; };
  }, [isNative, nativeAttempt]);

  const checkUpdates = async () => {
    setUpdate({ status: 'checking' });
    try {
      const info = await checkForUpdates();
      setUpdate({ status: 'checked', info, checkedAt: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) });
    } catch {
      setUpdate({ status: 'error', message: 'Updates konnten nicht geprüft werden. Prüfe deine Verbindung und versuche es erneut.' });
    }
  };

  const applyWebUpdate = async () => {
    if (isNative || update.status !== 'checked' || !update.info.hasUpdate || updating) return;
    setUpdating(true);
    try {
      await clearBrowserCaches();
      window.location.reload();
    } catch {
      setUpdating(false);
      setUpdate({ status: 'error', message: 'Die neue Web-Version konnte nicht geladen werden. Bitte versuche es erneut.' });
    }
  };

  return (
    <DashboardPageLayout headerBackTo="/profile">
      <div className="mx-auto max-w-3xl space-y-5">
        <KwsSurface className="space-y-5 p-4 sm:p-5">
          <div>
            <h2 className="font-sans text-base font-semibold text-foreground">Version und Updates</h2>
            <p className="mt-1 text-sm text-muted-foreground">{isNative ? 'Deine installierte Beta-App' : 'Deine Beta-Web-App'}</p>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Plattform</dt><dd className="text-right font-medium">{isNative ? platform === 'android' ? 'Android' : 'iPhone / iPad' : 'Web'}</dd></div>
            {isNative ? (
              <>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Installierte Version</dt><dd className="text-right font-semibold">{nativeInfo ? `${nativeInfo.version} (Build ${nativeInfo.build})` : nativeError ? 'Nicht verfügbar' : 'Wird gelesen …'}</dd></div>
                {nativeError ? <div role="status" className="text-sm text-muted-foreground">Die installierte Version konnte nicht gelesen werden. <button className={externalLinkClass} onClick={() => setNativeAttempt((attempt) => attempt + 1)}>Erneut versuchen</button></div> : null}
              </>
            ) : null}
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{isNative ? 'Enthaltene Beta-Oberfläche' : 'Beta-Version'}</dt><dd className="text-right font-semibold">{versionInfo.version}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Stand</dt><dd className="text-right font-medium">{versionInfo.buildDate}</dd></div>
            {versionInfo.revision ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Revision</dt><dd className="font-mono text-right text-xs">{versionInfo.revision.slice(0, 8)}</dd></div> : null}
            {versionInfo.isDevelopment ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Modus</dt><dd>Entwicklung</dd></div> : null}
          </dl>

          <div className="space-y-3 border-t border-border/60 pt-4">
            {isNative ? (
              <>
                <p className="text-sm text-muted-foreground">Neue App-Versionen installierst du über denselben Store oder Testkanal wie bisher. Dort siehst du, ob ein Update für dein Konto bereitsteht.</p>
                <div className="flex flex-wrap gap-2">
                  {platform === 'android' ? <a className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')} href="https://play.google.com/store/apps/details?id=com.kletterwelt.beta" target="_blank" rel="noopener noreferrer">Im Play Store prüfen<ExternalLink className="h-4 w-4" aria-hidden="true" /></a> : <>
                    <a className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')} href="itms-beta://">TestFlight öffnen<ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
                    <a className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')} href="https://apps.apple.com/app/id6756424260" target="_blank" rel="noopener noreferrer">App Store öffnen<ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
                  </>}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">Ein Neuladen der Oberfläche installiert kein App-Update. Testversionen sind nur für freigeschaltete Tester sichtbar.</p>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => void checkUpdates()} disabled={update.status === 'checking' || updating} className="w-full sm:w-auto">
                  <RefreshCw className={cn('mr-2 h-4 w-4', update.status === 'checking' && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
                  {update.status === 'checking' ? 'Updates werden geprüft …' : 'Auf Updates prüfen'}
                </Button>
                <div aria-live="polite" aria-atomic="true">
                  {update.status === 'checked' ? <div className="flex items-start gap-3 rounded-kws-control bg-secondary p-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" aria-hidden="true" />
                    <div className="min-w-0 space-y-2 text-sm">
                      <p className="font-semibold">{update.info.hasUpdate ? 'Neue Web-Version verfügbar' : 'Deine Web-App ist aktuell'}</p>
                      <p className="text-xs text-muted-foreground">{update.info.hasUpdate ? `Version ${update.info.latestVersion} · ${update.info.latestBuildTime}` : `Zuletzt geprüft um ${update.checkedAt} Uhr`}</p>
                      {update.info.hasUpdate ? <Button size="sm" onClick={() => void applyWebUpdate()} disabled={updating}>{updating ? 'Neue Version wird geladen …' : 'Web-App aktualisieren'}</Button> : null}
                    </div>
                  </div> : null}
                  {update.status === 'error' ? <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{update.message}</p> : null}
                </div>
              </>
            )}
          </div>
        </KwsSurface>

        <KwsSurface className="space-y-5 p-4 sm:p-5">
          <h2 className="font-sans text-base font-semibold text-foreground">Die Menschen hinter Beta</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <a href="https://www.kletterwelt-sauerland.de/" target="_blank" rel="noopener noreferrer" className="flex h-20 items-center rounded-kws-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Website der Kletterwelt Sauerland öffnen"><img src="/landing/kws-logo.svg" alt="Kletterwelt Sauerland" className="h-20 w-auto max-w-full object-contain object-left" /></a>
              <p className="mt-2 text-sm font-medium">Eine App der Kletterwelt Sauerland</p>
              <a className={externalLinkClass} href="https://www.kletterwelt-sauerland.de/" target="_blank" rel="noopener noreferrer">Zur Kletterwelt<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
            </div>
            <div className="min-w-0">
              <a href="https://moonsight.media/" target="_blank" rel="noopener noreferrer" className="flex h-20 items-center rounded-kws-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Website von Moonsight Media öffnen"><img src="/landing/moonsight-color.svg" alt="Moonsight Media" className="h-auto w-56 max-w-full" /></a>
              <p className="mt-2 text-sm font-medium">Digitaler Partner: Moonsight Media</p>
              <a className={externalLinkClass} href="https://moonsight.media/" target="_blank" rel="noopener noreferrer">Zu Moonsight Media<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
            </div>
          </div>
          <div className="border-t border-border/60 pt-3">
            <nav className="flex flex-wrap gap-x-5" aria-label="Rechtliches">
              <Link className={externalLinkClass} to="/privacy">Datenschutz</Link><Link className={externalLinkClass} to="/imprint">Impressum</Link><Link className={externalLinkClass} to="/community-rules">Community-Regeln</Link>
            </nav>
            <a className={cn(externalLinkClass, 'break-all')} href="mailto:marketing@kletterwelt-sauerland.de">marketing@kletterwelt-sauerland.de</a>
          </div>
        </KwsSurface>
      </div>
    </DashboardPageLayout>
  );
};

export default AboutApp;
