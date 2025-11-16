import { Sidebar } from '@/components/Sidebar';
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
import { AlertCircle } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSectorSchedule } from '@/hooks/useSectorSchedule';

const Index = () => {
  const statistics = useStatistics();
  const { user } = useAuth();
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors();
  const { data: sectors, isLoading: isLoadingSectors, error: sectorsError } = useSectorsTransformed();
  const isLoading = isLoadingBoulders || isLoadingSectors;
  const error = bouldersError || sectorsError;

  // Greeting state must be declared before any conditional returns to keep hook order stable
  const initialFirstFromMeta = (() => {
    const meta = (user?.user_metadata || {}) as any;
    const full = meta?.first_name || meta?.full_name || meta?.name;
    return full ? String(full).split(' ')[0] : null;
  })();
  const [greetingName, setGreetingName] = useState<string | null>(initialFirstFromMeta);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      const profile = data as any;
      const first = profile?.first_name || (profile?.full_name ? String(profile.full_name).split(' ')[0] : undefined);
      if (first) setGreetingName(first);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Nächster Schraubtermin aus sector_schedule
  const { data: schedule } = useSectorSchedule();
  const nextSchedule = useMemo(() => {
    const now = new Date();
    const upcoming = (schedule || []).filter(s => new Date(s.scheduled_at) > now)
      .sort((a,b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
    if (!upcoming) return null;
    const sectorName = sectors?.find(s => s.id === upcoming.sector_id)?.name || '-';
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
  
  // Berechne durchschnittliche Schwierigkeit (nur hängende)
  const avgDifficulty = useMemo(() => {
    if (!statistics || statistics.totalBoulders === 0) return '0.0';
    return (
      Object.entries(statistics.difficultyDistribution)
        .reduce((sum, [diff, count]) => sum + (Number(diff) * count), 0) / 
      statistics.totalBoulders
    ).toFixed(1);
  }, [statistics]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
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
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler beim Laden der Daten</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.'}
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0 overflow-x-hidden">
        <DashboardHeader />
        
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="mb-2">
              <h1 className="text-3xl font-bold mb-1 font-teko tracking-wide">Hallo, {greetingName || 'Fremder'}! 👋</h1>
              <p className="text-muted-foreground">Das passiert gerade in deiner Halle.</p>
            </div>
          </div>

          {/* Stats Grid - kompakt nur mobil */}
          <div className="grid grid-cols-3 gap-3 mb-3 md:hidden overflow-x-hidden">
            <StatCard
              title="Aktive Boulder"
              value={hangingBouldersCount}
              variant="primary"
              subtitle="Aktuell"
            />
            <StatCard
              title="Neue Boulder"
              value={statistics.newBouldersCount}
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
              value={nextSchedule?.sectorName || '-'}
              subtitle={nextSchedule?.when ? formatDate(nextSchedule.when, 'dd. MMM yyyy', { locale: de }) : 'Kein Termin'}
            />
          </div>
          {/* Standard-Grid ab md+: wieder alle 4 Karten */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="Aktive Boulder"
              value={hangingBouldersCount}
              variant="primary"
              subtitle="Aktueller Stand"
            />
            <StatCard
              title="Neue Boulder"
              value={statistics.newBouldersCount}
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
              value={nextSchedule?.sectorName || '-'}
              subtitle={nextSchedule?.when ? formatDate(nextSchedule.when, 'dd. MMM yyyy', { locale: de }) : 'Kein Termin'}
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
