import { useMemo, useState } from 'react';
import { Calendar, Play, Mountain } from 'lucide-react';

type Boulder = {
  id: string;
  name: string;
  sector: string;
  difficulty: number; // 1..8
  active: boolean;
  hasBetaVideo: boolean;
  createdAt: number; // epoch ms
};

type PlanEvent = {
  id: string;
  title: string;
  sector: string;
  when: number; // epoch ms
  people?: string[]; // optional placeholder for avatars
};

const SECTORS = ['Sektor A', 'Sektor B', 'Sektor C', 'Cave', 'Roof', 'Slab'] as const;

// Small helper for dates like "Heute, 14:00" or dd.MM.yyyy, HH:mm
function formatWhen(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay) return `Heute, ${time}`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${time}`;
}

export function DashboardView() {
  // Mock data (replace with store/API later)
  const boulders: Boulder[] = useMemo(() => {
    const now = Date.now();
    const days = (n: number) => n * 24 * 60 * 60 * 1000;
    return [
      { id: 'b1', name: 'Green Tiger', sector: 'Sektor A', difficulty: 3, active: true, hasBetaVideo: true, createdAt: now - days(1) },
      { id: 'b2', name: 'Blue Roof', sector: 'Roof', difficulty: 6, active: true, hasBetaVideo: false, createdAt: now - days(2) },
      { id: 'b3', name: 'Crimson Slab', sector: 'Slab', difficulty: 2, active: false, hasBetaVideo: false, createdAt: now - days(10) },
      { id: 'b4', name: 'Granite Wave', sector: 'Sektor B', difficulty: 5, active: true, hasBetaVideo: true, createdAt: now - days(4) },
      { id: 'b5', name: 'Hidden Cave', sector: 'Cave', difficulty: 7, active: true, hasBetaVideo: true, createdAt: now - days(6) },
      { id: 'b6', name: 'Royal Arete', sector: 'Sektor C', difficulty: 4, active: false, hasBetaVideo: false, createdAt: now - days(14) },
      { id: 'b7', name: 'Electric Dyno', sector: 'Sektor B', difficulty: 8, active: true, hasBetaVideo: false, createdAt: now - days(0.5) },
      { id: 'b8', name: 'Silent Edge', sector: 'Sektor A', difficulty: 1, active: true, hasBetaVideo: false, createdAt: now - days(0.25) },
      { id: 'b9', name: 'Spicy Flow', sector: 'Sektor C', difficulty: 3, active: true, hasBetaVideo: true, createdAt: now - days(20) },
      { id: 'b10', name: 'Cosmic Cave', sector: 'Cave', difficulty: 6, active: true, hasBetaVideo: false, createdAt: now - days(3) },
      { id: 'b11', name: 'Granite Roof', sector: 'Roof', difficulty: 5, active: true, hasBetaVideo: true, createdAt: now - days(9) },
      { id: 'b12', name: 'Black Crimp', sector: 'Sektor A', difficulty: 4, active: true, hasBetaVideo: false, createdAt: now - days(1.5) },
    ];
  }, []);

  const events: PlanEvent[] = useMemo(() => {
    const now = Date.now();
    const hours = (h: number) => h * 60 * 60 * 1000;
    return [
      { id: 'p1', title: 'Schrauben', sector: 'Sektor B', when: now + hours(4), people: ['AL', 'JS'] },
      { id: 'p2', title: 'Schrauben', sector: 'Roof', when: now + hours(28), people: ['MK'] },
    ];
  }, []);

  // Derived stats
  const NEW_DAYS = 7;
  const now = Date.now();
  const isNew = (ts: number) => now - ts <= NEW_DAYS * 24 * 60 * 60 * 1000;

  const activeCount = boulders.filter((b) => b.active).length;
  const newCount = boulders.filter((b) => isNew(b.createdAt)).length;
  const withBetaCount = boulders.filter((b) => b.hasBetaVideo).length;

  const nextEvent = [...events]
    .filter((e) => e.when >= now)
    .sort((a, b) => a.when - b.when)[0];

  const gradeCounts = useMemo(() => {
    const arr = Array.from({ length: 8 }, () => 0);
    for (const b of boulders) {
      const idx = Math.min(Math.max(b.difficulty, 1), 8) - 1;
      arr[idx] += 1;
    }
    return arr;
  }, [boulders]);

  const maxGradeCount = Math.max(1, ...gradeCounts);

  const sectorCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of SECTORS) map.set(s, 0);
    for (const b of boulders) map.set(b.sector, (map.get(b.sector) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [boulders]);

  const total = boulders.length || 1;

  // Local sector filter for the difficulty distribution chart (null = Alle)
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);

  const chartBoulders = useMemo(() => {
    if (!sectorFilter) return boulders;
    return boulders.filter((b) => b.sector === sectorFilter);
  }, [boulders, sectorFilter]);

  const filteredGradeCounts = useMemo(() => {
    const counts = Array.from({ length: 8 }, () => 0);
    for (const b of chartBoulders) {
      const idx = Math.min(Math.max(b.difficulty, 1), 8) - 1;
      counts[idx] += 1;
    }
    return counts;
  }, [chartBoulders]);

  const filteredMax = Math.max(1, ...filteredGradeCounts);

  return (
    <div className="view-section fade-in h-full flex flex-col relative">
      {/* Header */}
      <div className="border-b border-[#E7F7E9] pb-6 flex flex-col gap-2 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-3xl font-semibold tracking-wide text-[#13112B]">DASHBOARD</h2>
        </div>
        <p className="text-sm text-[#13112B]/60">Überblick über Boulder und Planung.</p>
      </div>

      <div className="space-y-6">
        {/* KPI Cards (better cards, side‑by‑side) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              { label: 'Aktive Boulder', value: activeCount },
              { label: `Neue Boulder (letzte ${NEW_DAYS} Tage)`, value: newCount },
              { label: 'Mit Beta Video', value: withBetaCount },
            ] as const
          ).map((k) => (
            <div key={k.label} className="bg-white border border-[#E7F7E9] p-6 rounded-3xl shadow-sm hover:border-[#36B531]/40 transition-colors">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#13112B]/60">{k.label}</div>
              <div className="mt-3 flex items-baseline gap-3">
                <div className="font-heading text-5xl lg:text-6xl text-[#13112B] leading-none">{k.value}</div>
                <span className="text-sm text-[#13112B]/40">von {total}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Next planned event */}
        <div className="bg-white border border-l-4 border-l-[#36B531] border-y-[#E7F7E9] border-r-[#E7F7E9] p-4 rounded-r-2xl rounded-l-md shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F9FAF9] border border-[#E7F7E9] flex items-center justify-center text-[#36B531]">
              <Calendar className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-xs text-[#36B531] font-bold uppercase mb-0.5">
                {nextEvent ? formatWhen(nextEvent.when) : 'Kein Termin'}
              </div>
              <div className="font-medium text-sm text-[#13112B]">
                {nextEvent ? `${nextEvent.title}: ${nextEvent.sector}` : 'Nächster Schraubtermin folgt'}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex -space-x-2">
            {(nextEvent?.people ?? ['AL', 'JS']).slice(0, 3).map((p) => (
              <div key={p} className="w-7 h-7 rounded-full bg-gray-200 border border-white text-[10px] font-bold text-[#13112B]/70 flex items-center justify-center">
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Difficulty distribution (columns) with sector filter */}
          <div className="bg-white border border-[#E7F7E9] p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#13112B]">Schwierigkeitsverteilung</div>
              <div className="text-xs text-[#13112B]/50">1–8</div>
            </div>
            {/* Sector filter chips */}
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSectorFilter(null)}
                className={`shrink-0 px-4 py-1.5 rounded-2xl text-xs font-semibold border transition-colors ${
                  sectorFilter === null
                    ? 'bg-[#36B531] text-white border-[#36B531] shadow'
                    : 'bg-[#F9FAF9] hover:bg-[#E7F7E9] border-[#E7F7E9] text-[#13112B]'
                }`}
                aria-label="Alle Sektoren"
              >
                Alle
              </button>
              {SECTORS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSectorFilter(s)}
                  className={`shrink-0 px-4 py-1.5 rounded-2xl text-xs font-semibold border transition-colors ${
                    sectorFilter === s
                      ? 'bg-[#36B531] text-white border-[#36B531] shadow'
                      : 'bg-[#F9FAF9] hover:bg-[#E7F7E9] border-[#E7F7E9] text-[#13112B]'
                  }`}
                  aria-pressed={sectorFilter === s}
                  aria-label={`Sektor ${s} filtern`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="h-40 mt-2 flex items-end gap-2">
              {filteredGradeCounts.map((cnt, idx) => {
                const h = Math.max(6, Math.round((cnt / filteredMax) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div
                      className="w-full bg-[#F9FAF9] border border-[#E7F7E9] rounded-t-md overflow-hidden flex items-end"
                      style={{ height: '100%' }}
                    >
                      <div className="w-full bg-[#36B531]" style={{ height: `${h}%` }} />
                    </div>
                    <div className="text-[10px] text-[#13112B]/70">{idx + 1}</div>
                    <div className="text-[10px] text-[#13112B]/40">{cnt}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sector distribution (list with bars) */}
          <div className="bg-white border border-[#E7F7E9] p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-[#13112B]">Boulder nach Sektoren</div>
              <Mountain className="w-4 h-4 text-[#13112B]/40" strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              {sectorCounts.map(([sector, count]) => {
                const share = Math.round((count / total) * 100);
                return (
                  <div key={sector} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#13112B]/70">{sector}</span>
                      <span className="text-[#13112B]/50">{count} • {share}%</span>
                    </div>
                    <div className="h-2 bg-[#F9FAF9] border border-[#E7F7E9] rounded">
                      <div className="h-full bg-[#36B531] rounded" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* With beta video list preview (optional small card) */}
        <div className="bg-white border border-[#E7F7E9] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-[#13112B]">Mit Beta Video</div>
            <Play className="w-4 h-4 text-[#13112B]/40" strokeWidth={1.5} />
          </div>
          {boulders.filter((b) => b.hasBetaVideo).length === 0 ? (
            <div className="text-sm text-[#13112B]/50">Keine Boulder mit Beta‑Video gefunden.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {boulders
                .filter((b) => b.hasBetaVideo)
                .slice(0, 6)
                .map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-2 border border-[#E7F7E9] rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#36B531]/10 text-[#36B531] flex items-center justify-center">
                        <Play className="w-3 h-3" strokeWidth={1.5} />
                      </div>
                      <div className="text-sm text-[#13112B] font-medium truncate max-w-[12rem]">{b.name}</div>
                    </div>
                    <div className="text-[10px] text-[#13112B]/50">G{b.difficulty}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
