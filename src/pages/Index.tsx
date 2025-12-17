import { DashboardHeader } from '@/components/DashboardHeader';
import { StatCard } from '@/components/StatCard';
import { DifficultyDistributionChart } from '@/components/DifficultyDistributionChart';
import { CategoryChart } from '@/components/CategoryChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useStatistics } from '@/hooks/useStatistics';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertCircle, Trophy, RefreshCw } from 'lucide-react';
import { useMemo, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSectorSchedule } from '@/hooks/useSectorSchedule';
import { usePreloadBoulderThumbnails } from '@/hooks/usePreloadBoulderThumbnails';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSidebar } from '@/components/SidebarContext';
import { cn } from '@/lib/utils';

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isExpanded } = useSidebar();
  const statistics = useStatistics();
  const { user, loading: authLoading } = useAuth();
  
  // CRITICAL: Log authLoading state to debug
  useEffect(() => {
    console.log('[Index] authLoading state:', authLoading, 'user:', !!user);
  }, [authLoading, user]);
  
  // CRITICAL: Only run queries after auth loading is complete AND user is available
  // This prevents race conditions where queries start before auth is ready
  const queriesEnabled = !authLoading && !!user;
  console.log('[Index] Queries enabled:', queriesEnabled, 'authLoading:', authLoading, 'user:', !!user);
  
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors(queriesEnabled);
  const { data: sectors, isLoading: isLoadingSectors, error: sectorsError } = useSectorsTransformed(queriesEnabled);
  const isLoading = isLoadingBoulders || isLoadingSectors;
  const error = bouldersError || sectorsError;
  
  // Preload all boulder thumbnails when user is logged in
  usePreloadBoulderThumbnails(!!user && !authLoading);

  // Log when component is mounted
  useEffect(() => {
    console.log('[Index] Component mounted');
  }, []);
  
  // CRITICAL FIX: Monitor queries for hanging and cancel/refetch if needed
  useEffect(() => {
    if (!authLoading && user) {
      // Monitor queries for 15 seconds - if still loading, cancel and refetch
      const timeoutId = setTimeout(() => {
        const bouldersQuery = queryClient.getQueryState(['boulders']);
        const sectorsQuery = queryClient.getQueryState(['sectors']);
        
        // If queries are still pending after 15s, cancel and refetch
        if (bouldersQuery?.status === 'pending') {
          console.warn('[Index] Query [boulders] still pending after 15s - canceling and refetching');
          queryClient.cancelQueries({ queryKey: ['boulders'] });
          queryClient.refetchQueries({ queryKey: ['boulders'] });
        }
        
        if (sectorsQuery?.status === 'pending') {
          console.warn('[Index] Query [sectors] still pending after 15s - canceling and refetching');
          queryClient.cancelQueries({ queryKey: ['sectors'] });
          queryClient.refetchQueries({ queryKey: ['sectors'] });
        }
      }, 15000); // 15 second timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, user, queryClient]);

  // Greeting state must be declared before any conditional returns to keep hook order stable
  // Load persisted name from localStorage to avoid "Fremder" flash on remount
  const getPersistedName = () => {
    try {
      return localStorage.getItem('greetingName');
    } catch {
      return null;
    }
  };
  
  const initialFirstFromMeta = (() => {
    // First try persisted name from localStorage, then user metadata
    const persisted = getPersistedName();
    if (persisted) return persisted;
    const meta = (user?.user_metadata || {}) as any;
    const full = meta?.first_name || meta?.full_name || meta?.name;
    return full ? String(full).split(' ')[0] : null;
  })();
  
  const [greetingName, setGreetingName] = useState<string | null>(initialFirstFromMeta);
  
  // Persist the name in localStorage whenever it changes
  useEffect(() => {
    if (greetingName) {
      try {
        localStorage.setItem('greetingName', greetingName);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [greetingName]);
  
  useEffect(() => {
    let active = true;
    (async () => {
      // Don't fetch if auth is still loading or user is not available
      if (authLoading || !user) {
        // If we have a persisted name from localStorage, use it
        const persisted = getPersistedName();
        if (persisted && !greetingName) {
          setGreetingName(persisted);
        }
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('first_name, full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      const profile = data as any;
      const first = profile?.first_name || (profile?.full_name ? String(profile.full_name).split(' ')[0] : undefined);
      if (first) {
        setGreetingName(first);
        // Name will be persisted via the useEffect above
      }
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading, greetingName]);

  // Nächster Schraubtermin aus sector_schedule
  const { data: schedule } = useSectorSchedule();
  const nextSchedule = useMemo(() => {
    const now = new Date();
    const upcoming = (schedule || []).filter(s => new Date(s.scheduled_at) > now)
      .sort((a,b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
    if (!upcoming) return null;
    
    // Find all schedules on the same day as the next one
    const nextDate = new Date(upcoming.scheduled_at);
    nextDate.setHours(0, 0, 0, 0);
    const nextDateEnd = new Date(nextDate);
    nextDateEnd.setHours(23, 59, 59, 999);
    
    const sameDaySchedules = (schedule || [])
      .filter(s => {
        const sDate = new Date(s.scheduled_at);
        return sDate >= nextDate && sDate <= nextDateEnd && sDate > now;
      })
      .map(s => {
        const sectorName = sectors?.find(sec => sec.id === s.sector_id)?.name || 'Unbekannter Sektor';
        return sectorName;
      });
    
    // Get unique sector names and join them
    const uniqueSectorNames = Array.from(new Set(sameDaySchedules));
    const sectorName = uniqueSectorNames.length > 0 
      ? uniqueSectorNames.join(', ')
      : (sectors?.find(s => s.id === upcoming.sector_id)?.name || '-');
    
    return { when: new Date(upcoming.scheduled_at), sectorName };
  }, [schedule, sectors]);

  // Berechne Boulder mit Beta-Videos (nur hängende)
  const videosCount = useMemo(() => {
    return boulders?.filter(b => b.betaVideoUrl && b.status === 'haengt').length || 0;
  }, [boulders]);

  // Berechne Anzahl der hängenden Boulder
  const hangingBouldersCount = useMemo(() => {
    return boulders?.filter(b => b.status === 'haengt').length || 0;
  }, [boulders]);
  
  // Berechne durchschnittliche Schwierigkeit (nur hängende, ignoriere "?" = null)
  const avgDifficulty = useMemo(() => {
    if (!statistics || statistics.totalBoulders === 0) return '0.0';
    // Summiere nur bewertete Boulder (1-8), ignoriere "?" (null)
    const totalRated = Object.entries(statistics.difficultyDistribution)
      .filter(([diff]) => diff !== 'null') // Ignoriere "?"
      .reduce((sum, [, count]) => sum + count, 0);
    if (totalRated === 0) return '0.0';
    return (
      Object.entries(statistics.difficultyDistribution)
        .filter(([diff]) => diff !== 'null') // Ignoriere "?"
        .reduce((sum, [diff, count]) => sum + (Number(diff) * count), 0) / 
      totalRated
    ).toFixed(1);
  }, [statistics]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9]">
        <div className={cn("flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-[#F9FAF9]", isExpanded ? "md:ml-64" : "md:ml-20")}>
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-8">
              <div className="mb-8">
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-96" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-96 lg:col-span-2" />
                <Skeleton className="h-96" />
              </div>
            </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9]">
        <div className={cn("flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-[#F9FAF9]", isExpanded ? "md:ml-64" : "md:ml-20")}>
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-8">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fehler beim Laden der Daten</AlertTitle>
                <AlertDescription className="mb-4">
                  {error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.'}
                </AlertDescription>
                <Button
                  onClick={async () => {
                    await Promise.all([
                      queryClient.refetchQueries({ queryKey: ['boulders'] }),
                      queryClient.refetchQueries({ queryKey: ['sectors'] }),
                    ]);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Erneut versuchen
                </Button>
              </Alert>
            </main>
        </div>
      </div>
    );
  }

  // If no data and not loading, show a message with refresh button
  if (!statistics && !isLoading && !error && (!boulders || boulders.length === 0) && (!sectors || sectors.length === 0)) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9]">
        <div className={cn("flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-[#F9FAF9]", isExpanded ? "md:ml-64" : "md:ml-20")}>
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
            <div className="text-center space-y-4">
              <p className="text-[#13112B]/60">Keine Daten geladen</p>
              <Button
                onClick={async () => {
                  await Promise.all([
                    queryClient.refetchQueries({ queryKey: ['boulders'] }),
                    queryClient.refetchQueries({ queryKey: ['sectors'] }),
                  ]);
                }}
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Daten laden
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // CRITICAL FIX: Don't return null - show fallback UI instead
  // Returning null causes empty screen when statistics haven't loaded yet
  if (!statistics) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9]">
        <div className={cn("flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-[#F9FAF9]", isExpanded ? "md:ml-64" : "md:ml-20")}>
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
            <div className="text-center space-y-4">
              <p className="text-[#13112B]/60">Statistiken werden geladen...</p>
              <Button
                onClick={async () => {
                  await Promise.all([
                    queryClient.refetchQueries({ queryKey: ['boulders'] }),
                    queryClient.refetchQueries({ queryKey: ['sectors'] }),
                  ]);
                }}
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Daten laden
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F9FAF9]">
      <div className={cn("flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-[#F9FAF9]", isExpanded ? "md:ml-64" : "md:ml-20")}>
        <DashboardHeader />
        
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="mb-2">
              <h1 className="text-3xl font-bold mb-1 font-heading tracking-wide text-[#13112B]">
                {authLoading ? (
                  <span className="opacity-50">Hallo... 👋</span>
                ) : (
                  <>Hallo, {greetingName || 'Fremder'}! 👋</>
                )}
              </h1>
              <p className="text-sm text-[#13112B]/60">Das passiert gerade in deiner Halle.</p>
            </div>
          </div>

          {/* Competition Button - Temporarily hidden */}
          {false && (
            <div className="mb-6">
              <Button
                onClick={() => navigate('/competition')}
                size="lg"
                className="w-full sm:w-auto min-h-[56px] text-base font-semibold"
              >
                <Trophy className="w-6 h-6 mr-2" />
                Nikolaus Wettkampf
              </Button>
            </div>
          )}

          {/* Stats Grid - kompakt nur mobil */}
          <div className="grid grid-cols-3 gap-3 mb-3 md:hidden overflow-x-hidden">
            <StatCard
              title="Aktive Boulder"
              value={hangingBouldersCount}
              subtitle="Aktuell"
            />
            <StatCard
              title="Neue Boulder"
              value={statistics.newBouldersCount}
              variant="primary"
              subtitle="7 Tage"
            />
            <StatCard
              title="Mit Beta-Video"
              value={videosCount}
              subtitle={hangingBouldersCount > 0 
                ? `${Math.round((videosCount / hangingBouldersCount) * 100)}%`
                : '0%'}
            />
          </div>

          {/* Nächster Schraubtermin - mobil unter den 3 Karten */}
          <div className="grid grid-cols-1 gap-3 mb-6 md:hidden">
            <StatCard
              title="Nächster Schraubtermin"
              value={nextSchedule?.when ? formatDate(nextSchedule.when, 'dd. MMM yyyy', { locale: de }) : 'Kein Termin'}
              subtitle={nextSchedule?.sectorName || '-'}
            />
          </div>
          {/* Standard-Grid ab md+: wieder alle 4 Karten */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="Aktive Boulder"
              value={hangingBouldersCount}
              subtitle="Aktueller Stand"
            />
            <StatCard
              title="Neue Boulder"
              value={statistics.newBouldersCount}
              variant="primary"
              subtitle="Seit letzter Woche"
            />
            <StatCard
              title="Mit Beta-Video"
              value={videosCount}
              subtitle={hangingBouldersCount > 0 
                ? `${Math.round((videosCount / hangingBouldersCount) * 100)}% aller Boulder`
                : 'Keine Boulder vorhanden'}
            />
            <StatCard
              title="Nächster Schraubtermin"
              value={nextSchedule?.when ? formatDate(nextSchedule.when, 'dd. MMM yyyy', { locale: de }) : 'Kein Termin'}
              subtitle={nextSchedule?.sectorName || '-'}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DifficultyDistributionChart stats={statistics} avgDifficulty={avgDifficulty} />
            <CategoryChart />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
