import { useState } from 'react';
import { Header } from '@/components/Header';
import { StatisticsOverview } from '@/components/StatisticsOverview';
import { SectorCard } from '@/components/SectorCard';
import { BoulderCard } from '@/components/BoulderCard';
import { DifficultyChart } from '@/components/DifficultyChart';
import { ColorDistribution } from '@/components/ColorDistribution';
import { VideoModal } from '@/components/VideoModal';
import { mockSectors, mockBoulders, mockStatistics } from '@/data/mockData';

const Index = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <StatisticsOverview stats={mockStatistics} />

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Sektoren</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockSectors.map((sector) => (
              <SectorCard key={sector.id} sector={sector} />
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Statistiken</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DifficultyChart stats={mockStatistics} />
            <ColorDistribution stats={mockStatistics} />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6 text-foreground">Alle Boulder</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockBoulders.map((boulder) => (
              <BoulderCard
                key={boulder.id}
                boulder={boulder}
                onVideoClick={setSelectedVideo}
              />
            ))}
          </div>
        </section>
      </main>

      <VideoModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo || ''}
      />
    </div>
  );
};

export default Index;
