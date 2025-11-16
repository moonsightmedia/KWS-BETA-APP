import { useMemo } from 'react';
import { useBouldersWithSectors } from './useBoulders';
import { useSectorsTransformed } from './useSectors';
import { Statistics } from '@/types/boulder';

/**
 * Hook der Statistiken aus den echten Daten berechnet
 */
export const useStatistics = () => {
  const { data: boulders } = useBouldersWithSectors();
  const { data: sectors } = useSectorsTransformed();

  const statistics: Statistics | undefined = useMemo(() => {
    // Filtere nur hängende Boulder
    const hangingBoulders = boulders?.filter(b => b.status === 'haengt') || [];
    
    if (!hangingBoulders || hangingBoulders.length === 0) {
      return {
        totalBoulders: 0,
        lastUpdate: new Date(),
        newBouldersCount: 0,
        difficultyDistribution: {
          null: 0, // "?" (unbewertet)
          1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0,
        },
        colorDistribution: {
          'Grün': 0, 'Gelb': 0, 'Blau': 0, 'Orange': 0,
          'Rot': 0, 'Schwarz': 0, 'Weiß': 0, 'Lila': 0,
        },
      };
    }

    // Berechne Schwierigkeitsverteilung (nur hängende) - inkl. "?" (null)
    const difficultyDistribution: Record<number | null, number> = {
      null: 0, // "?" (unbewertet)
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0,
    };
    
    hangingBoulders.forEach(boulder => {
      if (boulder.difficulty === null) {
        difficultyDistribution[null] = (difficultyDistribution[null] || 0) + 1;
      } else if (boulder.difficulty >= 1 && boulder.difficulty <= 8) {
        difficultyDistribution[boulder.difficulty] = (difficultyDistribution[boulder.difficulty] || 0) + 1;
      }
    });

    // Berechne Farbverteilung (nur hängende)
    const colorDistribution: Record<string, number> = {
      'Grün': 0, 'Gelb': 0, 'Blau': 0, 'Orange': 0,
      'Rot': 0, 'Schwarz': 0, 'Weiß': 0, 'Lila': 0,
    };
    
    hangingBoulders.forEach(boulder => {
      if (colorDistribution.hasOwnProperty(boulder.color)) {
        colorDistribution[boulder.color] = (colorDistribution[boulder.color] || 0) + 1;
      }
    });

    // Finde das neueste Datum (nur hängende)
    const lastUpdate = hangingBoulders.reduce((latest, boulder) => {
      return boulder.createdAt > latest ? boulder.createdAt : latest;
    }, hangingBoulders[0].createdAt);

    // Zähle neue Boulder (letzte 7 Tage, nur hängende)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newBouldersCount = hangingBoulders.filter(b => b.createdAt >= sevenDaysAgo).length;

    return {
      totalBoulders: hangingBoulders.length,
      lastUpdate,
      newBouldersCount,
      difficultyDistribution: difficultyDistribution as Statistics['difficultyDistribution'],
      colorDistribution: colorDistribution as Statistics['colorDistribution'],
    };
  }, [boulders]);

  return statistics;
};

