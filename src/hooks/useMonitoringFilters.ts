import { useEffect, useRef } from 'react';
import { trackMonitoring } from '@/utils/monitoring';

export function useMonitoringFilters(search: string, sectors: string[], difficulties: string[], colors: string[]) {
  const signature = JSON.stringify([Boolean(search.trim()), [...sectors].sort(), [...difficulties].sort(), [...colors].sort()]);
  const previous = useRef(signature);
  useEffect(() => {
    if (previous.current === signature) return;
    const timer = window.setTimeout(() => {
      const before = JSON.parse(previous.current) as [boolean, string[], string[], string[]];
      const after = JSON.parse(signature) as [boolean, string[], string[], string[]];
      if (after[0] && !before[0]) trackMonitoring('search_used');
      if (JSON.stringify(before.slice(1)) !== JSON.stringify(after.slice(1))) {
        trackMonitoring('filter_applied', { filter_count: after[1].length + after[2].length + after[3].length });
        for (const sector of after[1].filter(sector => !before[1].includes(sector))) trackMonitoring('sector_open', { sector_id: sector });
      }
      previous.current = signature;
    }, 500);
    return () => window.clearTimeout(timer);
  }, [signature]);
}
