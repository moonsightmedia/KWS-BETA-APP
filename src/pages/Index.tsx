import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StatCard } from '@/components/StatCard';
import { DifficultyDistributionChart } from '@/components/DifficultyDistributionChart';
import { CategoryChart } from '@/components/CategoryChart';
import { mockStatistics, mockSectors, mockBoulders } from '@/data/mockData';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';

const Index = () => {
  // Nächster Schraubtermin
  const nextSector = [...mockSectors]
    .filter(s => s.nextSchraubtermin)
    .sort((a, b) => {
      if (!a.nextSchraubtermin || !b.nextSchraubtermin) return 0;
      return a.nextSchraubtermin.getTime() - b.nextSchraubtermin.getTime();
    })[0];

  // Berechne Boulder mit Beta-Videos
  const videosCount = mockBoulders.filter(b => b.betaVideoUrl).length;
  
  // Berechne durchschnittliche Schwierigkeit
  const avgDifficulty = (
    Object.entries(mockStatistics.difficultyDistribution)
      .reduce((sum, [diff, count]) => sum + (Number(diff) * count), 0) / 
    mockStatistics.totalBoulders
  ).toFixed(1);
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col md:ml-20">
        <DashboardHeader />
        
        <main className="flex-1 p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="mb-2">
              <h1 className="text-3xl font-bold mb-1">Hallo, Kletterwelt! 👋</h1>
              <p className="text-muted-foreground">Das passiert gerade in deiner Halle.</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="Aktive Boulder"
              value={mockStatistics.totalBoulders}
              change={2.6}
              variant="primary"
              subtitle="Aktueller Stand"
            />
            
            <StatCard
              title="Neue Boulder"
              value={mockStatistics.newBouldersCount}
              change={-2.2}
              subtitle="Seit letzter Woche"
            />
            
            <StatCard
              title="Mit Beta-Video"
              value={videosCount}
              subtitle={`${Math.round((videosCount / mockStatistics.totalBoulders) * 100)}% aller Boulder`}
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
            <DifficultyDistributionChart stats={mockStatistics} avgDifficulty={avgDifficulty} />
            <CategoryChart />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
