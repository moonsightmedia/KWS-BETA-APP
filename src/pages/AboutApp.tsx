import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { SetupAreaLayout } from '@/components/SetupAreaLayout';
import { clearAllCaches } from '@/utils/cacheUtils';
import { checkForUpdates, getVersionInfo } from '@/utils/version';

const AboutApp = () => {
  const navigate = useNavigate();
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
      toast.error('Update-Pr\u00FCfung fehlgeschlagen');
    } finally {
      setCheckingUpdate(false);
    }
  };

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
                  aria-label="Zur\u00FCck"
                >
                  <ArrowLeft className="h-5 w-5" strokeWidth={2} />
                </button>
                <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-[#13112B]">\u00DCber die App</h1>
              </div>

              <section className="rounded-2xl border border-[#DDE7DF] bg-white px-6 py-6 shadow-[0_8px_24px_rgba(19,17,43,0.04)]">
                <div className="space-y-2 text-sm text-[#13112B]/60">
                  <div className="flex items-center justify-between">
                    <span>Version</span>
                    <span className="font-medium text-[#13112B]">{versionInfo.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Build</span>
                    <span className="font-medium text-[#13112B]">{versionInfo.buildDate} {versionInfo.buildTime}</span>
                  </div>
                  {versionInfo.isDevelopment ? (
                    <div className="flex items-center justify-between">
                      <span>Modus</span>
                      <span className="font-medium text-orange-600">Entwicklung</span>
                    </div>
                  ) : null}
                </div>

                {hasUpdate ? (
                  <div className="mt-5 flex items-center justify-between rounded-xl border border-[#DDE7DF] bg-[#F9FAF9] px-4 py-4">
                    <span className="font-medium text-[#36B531]">Neue Version verf\u00FCgbar</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (Capacitor.isNativePlatform()) {
                          toast.info('App-Update verf\u00FCgbar', {
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

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="outline" onClick={checkUpdates} disabled={checkingUpdate}>
                    {checkingUpdate ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Pr\u00FCfe...
                      </>
                    ) : (
                      'Auf Updates pr\u00FCfen'
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!confirm('M\u00F6chtest du wirklich alle Caches leeren? Die App wird danach neu geladen.')) return;
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
              </section>
            </div>
          </div>
        </main>
      </div>
    </SetupAreaLayout>
  );
};

export default AboutApp;
