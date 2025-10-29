import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StatCard } from '@/components/StatCard';
import { DifficultyDistributionChart } from '@/components/DifficultyDistributionChart';
import { CategoryChart } from '@/components/CategoryChart';
import { DatabaseTest } from '@/components/DatabaseTest';
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

const Index = () => {
  const [showDbTest, setShowDbTest] = useState(false);
  const statistics = useStatistics();
  const { user } = useAuth();
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors();
  const { data: sectors, isLoading: isLoadingSectors, error: sectorsError } = useSectorsTransformed();
  const isLoading = isLoadingBoulders || isLoadingSectors;
  const error = bouldersError || sectorsError;

  // Nächster Schraubtermin
  const nextSector = useMemo(() => {
    if (!sectors) return null;
    return [...sectors]
      .filter(s => s.nextSchraubtermin)
      .sort((a, b) => {
        if (!a.nextSchraubtermin || !b.nextSchraubtermin) return 0;
        return a.nextSchraubtermin.getTime() - b.nextSchraubtermin.getTime();
      })[0] || null;
  }, [sectors]);

  // Berechne Boulder mit Beta-Videos
  const videosCount = useMemo(() => {
    return boulders?.filter(b => b.betaVideoUrl).length || 0;
  }, [boulders]);
  
  // Berechne durchschnittliche Schwierigkeit
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
  const [greetingName, setGreetingName] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('first_name, full_name').eq('id', user.id).maybeSingle();
      if (!active) return;
      const first = data?.first_name || (data?.full_name ? String(data.full_name).split(' ')[0] : undefined);
      if (first) setGreetingName(first);
    })();
    return () => { active = false; };
  }, [user]);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
        <DashboardHeader />
        
        <main className="flex-1 p-4 md:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="mb-2">
              <h1 className="text-3xl font-bold mb-1 font-teko tracking-wide">Hallo, {greetingName || (() => {
                const meta = user?.user_metadata as any;
                const full = meta?.first_name || meta?.full_name || meta?.name;
                if (full) return String(full).split(' ')[0];
                const email = user?.email || '';
                return email ? email.split('@')[0] : 'Kletterwelt';
              })()}! 👋</h1>
              <p className="text-muted-foreground">Das passiert gerade in deiner Halle.</p>
            </div>
          </div>

          {/* Stats Grid - kompakt nur mobil */}
          <div className="grid grid-cols-3 gap-3 mb-3 md:hidden">
            <StatCard
              title="Aktive Boulder"
              value={statistics.totalBoulders}
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
              subtitle={statistics.totalBoulders > 0 
                ? `${Math.round((videosCount / statistics.totalBoulders) * 100)}%`
                : '0%'}
            />
          </div>
          {/* Standard-Grid ab md+: wieder alle 4 Karten */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="Aktive Boulder"
              value={statistics.totalBoulders}
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
              subtitle={statistics.totalBoulders > 0 
                ? `${Math.round((videosCount / statistics.totalBoulders) * 100)}% aller Boulder`
                : 'Keine Boulder vorhanden'}
            />
            <StatCard
              title="Nächster Schraubtermin"
              value={nextSector?.name.split(' - ')[0] || '-'}
              subtitle={nextSector?.nextSchraubtermin 
                ? formatDate(nextSector.nextSchraubtermin, 'dd. MMM yyyy', { locale: de })
                : 'Kein Termin'}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DifficultyDistributionChart stats={statistics} avgDifficulty={avgDifficulty} />
            <CategoryChart />
          </div>

          {/* Database Test (optional, für Debugging) */}
          {import.meta.env.DEV && (
            <div className="mt-8">
              <button
                onClick={() => setShowDbTest(!showDbTest)}
                className="mb-4 text-sm text-muted-foreground hover:text-foreground underline"
              >
                {showDbTest ? '🔼 Datenbanktest ausblenden' : '🔽 Datenbanktest anzeigen'}
              </button>
              {showDbTest && <DatabaseTest />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
