import { useLocation } from 'react-router-dom';
import { getGroupFromPath } from '../../lib/routes';
import { Map, Palette, X, BarChart3, ArrowUpDown, ArrowDown, ArrowUp, Check } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * MobileFilterBar
 * Floating filter bar that hovers directly above the bottom navbar (mobile only).
 * New‑design styling, shows a count chip and quick filter icons.
 */
export function MobileFilterBar({
  count = 17,
}: {
  count?: number;
}) {
  const { pathname } = useLocation();
  const group = getGroupFromPath(pathname);

  // Only show for the user area on mobile
  if (group !== 'user') return null;

  const [panel, setPanel] = useState<null | 'color' | 'sector' | 'difficulty' | 'sort'>(null);

  // Filter state (UI-only for now)
  const [activeSectors, setActiveSectors] = useState<string[]>([]);
  const [activeGrades, setActiveGrades] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'difficulty' | 'name'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Colors from the styleguide
  const colors = useMemo(
    () => [
      '#69B54A',
      '#5681EA',
      '#D65448',
      '#ECD348',
      '#E08636',
      '#8E44ED',
      '#1F1E31',
      'white',
      '#36B531', // primary green as option
    ],
    []
  );

  const sectors = useMemo(
    () => ['Sektor A', 'Sektor B', 'Sektor C', 'Cave', 'Roof', 'Slab'],
    []
  );

  const grades = useMemo(() => Array.from({ length: 8 }, (_, i) => i + 1), []);

  // Position: sit slightly above the bottom nav (which is bottom-6 and h-[4.5rem])
  // 1.5rem + 4.5rem + 0.5rem gap ≈ 6.5rem
  const bottomOffset = 'bottom-[6.5rem]';

  return (
    <div className={`fixed inset-x-4 ${bottomOffset} lg:hidden z-50 pb-safe pointer-events-none`}>
      {/* Popover Panels */}
      {panel === 'color' && (
        <div className="mb-2 pointer-events-auto">
          <div className="rounded-2xl bg-[#13112B] text-white shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-semibold">Farbe</span>
              <button onClick={() => setPanel(null)} className="p-2 text-white/70 hover:text-white">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <button className="px-3 py-1.5 bg-[#36B531] text-white rounded-xl text-xs font-semibold shadow">
                  Alle
                </button>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                {colors.map((c) => (
                  <button
                    key={c}
                    className={`w-10 h-10 rounded-full border ${
                      c === 'white' ? 'bg-white border-gray-200' : 'border-black/10'
                    } shadow`}
                    style={c !== 'white' ? { backgroundColor: c } : undefined}
                    aria-label={`Filter Farbe ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {panel === 'sector' && (
        <div className="mb-2 pointer-events-auto">
          <div className="rounded-2xl bg-[#13112B] text-white shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-semibold">Sektionen</span>
              <button onClick={() => setPanel(null)} className="p-2 text-white/70 hover:text-white">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <button
                  className="px-3 py-1.5 bg-[#36B531] text-white rounded-xl text-xs font-semibold shadow"
                  onClick={() => setActiveSectors([])}
                >
                  Alle
                </button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {sectors.map((s) => {
                  const active = activeSectors.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() =>
                        setActiveSectors((prev) =>
                          prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                        )
                      }
                      className={`shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-[#36B531] text-white border-[#36B531] shadow'
                          : 'bg-white/10 text-white/90 hover:bg-white/20 border-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {panel === 'difficulty' && (
        <div className="mb-2 pointer-events-auto">
          <div className="rounded-2xl bg-[#13112B] text-white shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-semibold">Schwierigkeit</span>
              <button onClick={() => setPanel(null)} className="p-2 text-white/70 hover:text-white">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <button
                  className="px-3 py-1.5 bg-[#36B531] text-white rounded-xl text-xs font-semibold shadow"
                  onClick={() => setActiveGrades([])}
                >
                  Alle
                </button>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {grades.map((g) => {
                  const active = activeGrades.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() =>
                        setActiveGrades((prev) =>
                          prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
                        )
                      }
                      className={`aspect-square rounded-xl flex items-center justify-center text-sm font-semibold border transition-colors ${
                        active ? 'bg-[#36B531] text-white border-[#36B531] shadow' : 'bg-white/10 text-white/90 border-white/10'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {panel === 'sort' && (
        <div className="mb-2 pointer-events-auto">
          <div className="rounded-2xl bg-[#13112B] text-white shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-semibold">Sortierung</span>
              <button onClick={() => setPanel(null)} className="p-2 text-white/70 hover:text-white">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-3 pb-3">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {(
                    [
                      { key: 'date', label: 'Datum' },
                      { key: 'difficulty', label: 'Schwierigkeit' },
                      { key: 'name', label: 'Name' },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.key}
                      onClick={() => setSortBy(o.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                        sortBy === o.key
                          ? 'bg-[#36B531] text-white border-[#36B531] shadow'
                          : 'bg-white/10 text-white/90 hover:bg-white/20 border-white/10'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold"
                  aria-label="Richtung umschalten"
                >
                  {sortDir === 'asc' ? (
                    <>
                      <ArrowUp className="w-4 h-4" /> Aufsteigend
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-4 h-4" /> Absteigend
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/70">
                <Check className="w-3.5 h-3.5" />
                <span>
                  {`Sortiere nach ${
                    sortBy === 'date' ? 'Datum' : sortBy === 'difficulty' ? 'Schwierigkeit' : 'Name'
                  } (${sortDir === 'asc' ? 'aufsteigend' : 'absteigend'})`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="pointer-events-auto">
        <div className="bg-[#13112B] text-white rounded-2xl shadow-2xl border border-white/10 px-2 py-2 flex items-center justify-between">
          <div>
            <button className="px-3 py-1.5 bg-white text-[#13112B] rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition">
              {count} Treffer
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPanel(panel === 'color' ? null : 'color')}
              className="w-10 h-10 rounded-xl bg-white text-[#13112B] flex items-center justify-center shadow-sm active:scale-95"
              aria-label="Farbe filtern"
            >
              <Palette className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setPanel(panel === 'sector' ? null : 'sector')}
              className="w-10 h-10 rounded-xl bg-white text-[#13112B] flex items-center justify-center shadow-sm active:scale-95"
              aria-label="Sektionen filtern"
            >
              <Map className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setPanel(panel === 'difficulty' ? null : 'difficulty')}
              className="w-10 h-10 rounded-xl bg-white text-[#13112B] flex items-center justify-center shadow-sm active:scale-95"
              aria-label="Schwierigkeit filtern"
            >
              <BarChart3 className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setPanel(panel === 'sort' ? null : 'sort')}
              className="w-10 h-10 rounded-xl bg-white text-[#13112B] flex items-center justify-center shadow-sm active:scale-95"
              aria-label="Sortieren"
            >
              <ArrowUpDown className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileFilterBar;
