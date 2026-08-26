import { useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { clearAllCaches } from '@/utils/cacheUtils';
import { checkForUpdates, getVersionInfo } from '@/utils/version';

const AboutApp = () => {
  const queryClient = useQueryClient();
  const versionInfo = getVersionInfo();
  const [clearingCache, setClearingCache] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  const checkUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const updateInfo = await checkForUpdates();
      setHasUpdate(updateInfo.hasUpdate);
    } catch {
      toast.error('Update-Prüfung fehlgeschlagen');
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <DashboardPageLayout headerBackTo="/profile">
      <div className="mx-auto max-w-3xl space-y-5">
        <KwsSurface className="px-4 py-5 sm:px-5">
                <div className="space-y-3 font-sans text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Version</span>
                    <span className="font-semibold text-[#192436]">{versionInfo.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Build</span>
                    <span className="font-semibold text-[#192436]">{versionInfo.buildDate}</span>
                  </div>
                  {versionInfo.isDevelopment ? (
                    <div className="flex items-center justify-between">
                      <span>Modus</span>
                      <span className="font-medium text-orange-600">Entwicklung</span>
                    </div>
                  ) : null}
                </div>

                {hasUpdate ? (
                  <div className="mt-5 flex items-center justify-between gap-3 rounded-kws-control bg-primary/10 px-3.5 py-3.5">
                    <span className="font-sans text-sm font-semibold text-primary">Neue Version verfügbar</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (Capacitor.isNativePlatform()) {
                          toast.info('App-Update verfügbar', {
                            description: 'Bitte installiere die neue Version der App manuell.',
                            duration: 5000,
                          });
                        }
                        await clearAllCaches(queryClient);
                        window.location.reload();
                      }}
                    >
                      Aktualisieren
                    </Button>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" onClick={checkUpdates} disabled={checkingUpdate}>
                    {checkingUpdate ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Prüfe...
                      </>
                    ) : (
                      'Auf Updates prüfen'
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!confirm('Möchtest du wirklich alle Caches leeren? Die App wird danach neu geladen.')) return;
                      setClearingCache(true);
                      try {
                        await clearAllCaches(queryClient);
                        toast.success('Cache geleert', {
                          description: 'Die App wird jetzt neu geladen.',
                        });
                        setTimeout(() => window.location.reload(), 500);
                      } catch (error: unknown) {
                        toast.error('Fehler beim Leeren des Caches', {
                          description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.',
                        });
                      } finally {
                        setClearingCache(false);
                      }
                    }}
                    disabled={clearingCache}
                  >
                    {clearingCache ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Leere Cache...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Cache leeren
                      </>
                    )}
                  </Button>
                </div>
        </KwsSurface>

        <p className="px-1 font-sans text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
          Die Versionsprüfung und das Leeren des Caches verändern keine persönlichen Boulder- oder Profildaten.
        </p>
      </div>
    </DashboardPageLayout>
  );
};

export default AboutApp;
