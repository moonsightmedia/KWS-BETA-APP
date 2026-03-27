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
    const hangingBoulders = boulders?.filter((boulder) => boulder.status === 'haengt') || [];

    if (!hangingBoulders || hangingBoulders.length === 0) {
      return {
        totalBoulders: 0,
        lastUpdate: new Date(),
        newBouldersCount: 0,
        difficultyDistribution: {
          null: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
          7: 0,
          8: 0,
        },
        colorDistribution: {},
      };
    }

    const difficultyDistribution: Record<number | null, number> = {
      null: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
    };

    hangingBoulders.forEach((boulder) => {
      if (boulder.difficulty === null) {
        difficultyDistribution[null] = (difficultyDistribution[null] || 0) + 1;
      } else if (boulder.difficulty >= 1 && boulder.difficulty <= 8) {
        difficultyDistribution[boulder.difficulty] = (difficultyDistribution[boulder.difficulty] || 0) + 1;
      }
    });

    const colorDistribution: Record<string, number> = {};

    hangingBoulders.forEach((boulder) => {
      [boulder.color, boulder.color2].filter(Boolean).forEach((colorName) => {
        colorDistribution[colorName!] = (colorDistribution[colorName!] || 0) + 1;
      });
    });

    const lastUpdate = hangingBoulders.reduce((latest, boulder) => {
      return boulder.createdAt > latest ? boulder.createdAt : latest;
    }, hangingBoulders[0].createdAt);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newBouldersCount = hangingBoulders.filter((boulder) => boulder.createdAt >= sevenDaysAgo).length;

    return {
      totalBoulders: hangingBoulders.length,
      lastUpdate,
      newBouldersCount,
      difficultyDistribution: difficultyDistribution as Statistics['difficultyDistribution'],
      colorDistribution,
    };
  }, [boulders, sectors]);

  return statistics;
};
