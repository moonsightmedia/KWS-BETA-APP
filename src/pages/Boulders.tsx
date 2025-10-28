import { useState, useMemo, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Sidebar } from '@/components/Sidebar';
import { BoulderDetailDialog } from '@/components/BoulderDetailDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockBoulders, mockSectors } from '@/data/mockData';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Search, Video, FileText, Calendar } from 'lucide-react';
import { Boulder } from '@/types/boulder';
import { useSearchParams } from 'react-router-dom';

const difficultyColors: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-green-600',
  3: 'bg-yellow-500',
  4: 'bg-yellow-600',
  5: 'bg-orange-500',
  6: 'bg-orange-600',
  7: 'bg-red-500',
  8: 'bg-red-700',
};

const Boulders = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'difficulty' | 'date'>('date');
  const [selectedBoulder, setSelectedBoulder] = useState<Boulder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Read sector from URL params on mount
  useEffect(() => {
    const sectorParam = searchParams.get('sector');
    if (sectorParam) {
      setSectorFilter(sectorParam);
    }
  }, [searchParams]);

  const filteredAndSortedBoulders = useMemo(() => {
    let filtered = mockBoulders.filter((boulder) => {
      const matchesSearch = boulder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           boulder.sector.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = sectorFilter === 'all' || boulder.sector === sectorFilter;
      const matchesDifficulty = difficultyFilter === 'all' || boulder.difficulty.toString() === difficultyFilter;
      
      return matchesSearch && matchesSector && matchesDifficulty;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'difficulty':
          return b.difficulty - a.difficulty;
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, sectorFilter, difficultyFilter, sortBy]);

  const handleBoulderClick = (boulder: Boulder) => {
    setSelectedBoulder(boulder);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
        <DashboardHeader />
        
        <main className="flex-1 p-4 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 font-teko tracking-wide">Boulder</h1>
            <p className="text-muted-foreground">
              {filteredAndSortedBoulders.length} von {mockBoulders.length} Bouldern
            </p>
          </div>

          {/* Filters */}
          <div className="space-y-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle Sektoren" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">Alle Sektoren</SelectItem>
                  {mockSectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.name}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle Schwierigkeiten" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">Alle Schwierigkeiten</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((diff) => (
                    <SelectItem key={diff} value={diff.toString()}>
                      Schwierigkeit {diff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sortieren nach" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="date">Neueste zuerst</SelectItem>
                  <SelectItem value="difficulty">Schwierigkeit</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Boulder Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedBoulders.map((boulder) => (
              <Card 
                key={boulder.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleBoulderClick(boulder)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{boulder.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${difficultyColors[boulder.difficulty]} text-white border-0`}>
                        {boulder.difficulty}
                      </Badge>
                      <Badge variant="secondary">{boulder.color}</Badge>
                    </div>
                  </div>
                  <CardDescription>{boulder.sector}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {boulder.note && (
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-muted-foreground">{boulder.note}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Erstellt: {formatDate(boulder.createdAt, 'dd. MMM yyyy', { locale: de })}</span>
                  </div>

                  {boulder.betaVideoUrl && (
                    <Button variant="outline" size="sm" className="w-full">
                      <Video className="w-4 h-4 mr-2" />
                      Beta Video ansehen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAndSortedBoulders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Keine Boulder gefunden.</p>
            </div>
          )}
        </main>

        <BoulderDetailDialog 
          boulder={selectedBoulder}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </div>
  );
};

export default Boulders;
