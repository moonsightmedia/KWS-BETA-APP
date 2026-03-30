import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, MinusCircle, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { HallMapView } from '@/components/HallMapView';
import { SetterSurface } from '@/components/setter/SetterWorkspaceShell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useBouldersWithSectors, useBulkUpdateBoulderStatus } from '@/hooks/useBoulders';
import { useColors } from '@/hooks/useColors';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { cn } from '@/lib/utils';
import { getColorBackgroundStyle } from '@/utils/colorUtils';

import { formatDifficulty, getTextClassForHex, getThumbnailUrl } from './setterPageUtils';

type BoulderStatus = 'haengt' | 'abgeschraubt';

const SetterStatusPage = () => {
  const { data: boulders, isLoading } = useBouldersWithSectors();
  const { data: sectors = [] } = useSectorsTransformed();
  const { data: colors } = useColors();
  const bulkStatusUpdate = useBulkUpdateBoulderStatus();

  const [query, setQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(true);

  const colorMeta = useMemo(() => {
    const entries = new Map<string, { hex?: string }>();
    (colors ?? []).forEach((color) => {
      entries.set(color.name, { hex: color.hex });
    });
    return entries;
  }, [colors]);

  const selectedSectorName = useMemo(
    () => (sectorFilter === 'all' ? 'all' : sectors.find((sector) => sector.id === sectorFilter)?.name ?? 'all'),
    [sectorFilter, sectors],
  );

  const mapCountsBySectorId = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (boulders ?? []).reduce<Record<string, number>>((accumulator, boulder) => {
      if (normalizedQuery) {
        const haystack = [boulder.name, boulder.sector, boulder.sector2 ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return accumulator;
        }
      }

      const primarySectorId = sectors.find((sector) => sector.name === boulder.sector)?.id;
      const secondarySectorId = boulder.sector2
        ? sectors.find((sector) => sector.name === boulder.sector2)?.id
        : null;

      if (primarySectorId) {
        accumulator[primarySectorId] = (accumulator[primarySectorId] ?? 0) + 1;
      }
      if (secondarySectorId) {
        accumulator[secondarySectorId] = (accumulator[secondarySectorId] ?? 0) + 1;
      }

      return accumulator;
    }, {});
  }, [boulders, query, sectors]);

  const filteredBoulders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sectorName =
      sectorFilter === 'all'
        ? null
        : sectors.find((sector) => sector.id === sectorFilter)?.name ?? null;

    return (boulders ?? []).filter((boulder) => {
      if (normalizedQuery) {
        const haystack = [boulder.name, boulder.sector, boulder.sector2 ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      if (sectorName && boulder.sector !== sectorName && boulder.sector2 !== sectorName) {
        return false;
      }

      return true;
    });
  }, [boulders, query, sectorFilter, sectors]);

  const filteredBoulderIds = useMemo(
    () => filteredBoulders.map((boulder) => boulder.id),
    [filteredBoulders],
  );

  const areAllFilteredSelected = useMemo(
    () =>
      filteredBoulderIds.length > 0 &&
      filteredBoulderIds.every((id) => selectedIds.has(id)),
    [filteredBoulderIds, selectedIds],
  );

  const getBoulderIdsForSector = (nextSectorId: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    const sectorName =
      nextSectorId === 'all'
        ? null
        : sectors.find((sector) => sector.id === nextSectorId)?.name ?? null;

    return (boulders ?? [])
      .filter((boulder) => {
        if (normalizedQuery) {
          const haystack = [boulder.name, boulder.sector, boulder.sector2 ?? ''].join(' ').toLowerCase();
          if (!haystack.includes(normalizedQuery)) {
            return false;
          }
        }

        if (sectorName && boulder.sector !== sectorName && boulder.sector2 !== sectorName) {
          return false;
        }

        return true;
      })
      .map((boulder) => boulder.id);
  };

  const toggleSelectedId = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const runStatusUpdate = async (
    ids: string[],
    status: BoulderStatus,
    actionKey: string,
    resetSelection: boolean,
  ) => {
    if (ids.length === 0) return;

    setActiveAction(actionKey);

    try {
      await bulkStatusUpdate.mutateAsync({ ids, status });
      if (resetSelection) {
        setSelectedIds(new Set());
      }
      toast.success(status === 'haengt' ? 'Boulder h\u00E4ngen wieder.' : 'Boulder wurden abgeschraubt.');
    } catch (error) {
      toast.error('Fehler beim \u00C4ndern des Status');
      console.error('[SetterStatusPage] status update failed', error);
    } finally {
      setActiveAction(null);
    }
  };

  const handleMapSectorSelect = (sectorName: string) => {
    const sector = sectors.find((entry) => entry.name === sectorName);
    if (!sector) return;

    const nextSectorId = sectorFilter === sector.id ? 'all' : sector.id;
    setSectorFilter(nextSectorId);
    setSelectedIds(new Set(nextSectorId === 'all' ? [] : getBoulderIdsForSector(nextSectorId)));
  };

  const clearSectorFilter = () => {
    setSectorFilter('all');
    setSelectedIds(new Set());
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds(areAllFilteredSelected ? new Set() : new Set(filteredBoulderIds));
  };

  return (
    <div className="space-y-5 pb-32">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#13112B]/42" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name oder Sektor durchsuchen"
            className="h-11 rounded-xl border-[#DDE7DF] bg-white pl-9"
          />
        </div>

        <SetterSurface className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearSectorFilter}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                sectorFilter === 'all'
                  ? 'border-[#69B545] bg-[#F4FBF4] text-[#13112B]'
                  : 'border-[#DDE7DF] bg-white text-[#13112B]/62 hover:bg-[#F4F8F4]',
              )}
            >
              Alle Sektoren
            </button>
            {sectorFilter !== 'all' ? (
              <button
                type="button"
                onClick={clearSectorFilter}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DDE7DF] bg-white px-3 py-2 text-sm font-medium text-[#13112B] transition-colors hover:bg-[#F4F8F4]"
              >
                {selectedSectorName}
                <X className="h-3.5 w-3.5 text-[#13112B]/55" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setIsMapOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#DDE7DF] bg-white px-3 py-2 text-sm font-medium text-[#13112B] transition-colors hover:bg-[#F4F8F4]"
            >
              {isMapOpen ? 'Karte ausblenden' : 'Karte anzeigen'}
              {isMapOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              disabled={filteredBoulderIds.length === 0}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                areAllFilteredSelected
                  ? 'border-[#DDE7DF] bg-white text-[#13112B] hover:bg-[#F4F8F4]'
                  : 'border-[#69B545] bg-[#F4FBF4] text-[#13112B] hover:bg-[#EEF7EE]',
              )}
            >
              {areAllFilteredSelected ? 'Auswahl aufheben' : 'Alle ausw\u00E4hlen'}
            </button>
          </div>

          {isMapOpen ? (
            <div className="overflow-hidden rounded-2xl border border-[#DDE7DF] bg-white p-2">
              <HallMapView
                sectors={sectors}
                countsBySectorId={mapCountsBySectorId}
                selectedSectorName={selectedSectorName}
                onSelectSector={handleMapSectorSelect}
                onClearSector={clearSectorFilter}
                compact
                frameless
              />
            </div>
          ) : null}
        </SetterSurface>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#DDE7DF] bg-white shadow-[0_8px_24px_rgba(19,17,43,0.05)]">
        {isLoading ? (
          <div className="px-5 py-12 text-sm text-[#13112B]/60">Boulder werden geladen...</div>
        ) : filteredBoulders.length === 0 ? (
          <div className="px-5 py-12 text-sm text-[#13112B]/60">Keine Boulder gefunden.</div>
        ) : (
          <div className="divide-y divide-[#E7F0E8]">
            {filteredBoulders.map((boulder) => {
              const color = colorMeta.get(boulder.color);
              const thumbnailUrl = getThumbnailUrl(boulder);
              const isSelected = selectedIds.has(boulder.id);
              const currentStatus = boulder.status ?? 'haengt';
              const hangsActionKey = `${boulder.id}:haengt`;
              const offActionKey = `${boulder.id}:abgeschraubt`;
              const isPendingHangs = bulkStatusUpdate.isPending && activeAction === hangsActionKey;
              const isPendingOff = bulkStatusUpdate.isPending && activeAction === offActionKey;

              return (
                <article
                  key={boulder.id}
                  className={cn('px-4 py-2.5 transition-colors sm:px-5', isSelected && 'bg-[#F7FBF7]')}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectedId(boulder.id)}
                      className="shrink-0 self-center bg-white"
                    />

                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E7F0E8] bg-[#F5F9F5]">
                      {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt={boulder.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[11px] text-[#13112B]/45">
                          Kein Bild
                        </div>
                      )}
                      <span
                        className={cn(
                          'absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-sm',
                          getTextClassForHex(color?.hex),
                        )}
                        style={{
                          background: color
                            ? getColorBackgroundStyle(boulder.color, colors ?? [])
                            : '#9ca3af',
                        }}
                      >
                        {formatDifficulty(boulder.difficulty)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 break-words text-[0.98rem] font-semibold leading-tight tracking-[-0.02em] text-[#13112B]">
                        {boulder.name}
                      </p>
                      <p className="mt-1 truncate text-sm text-[#13112B]/60">
                        {boulder.sector2 ? `${boulder.sector} \u2192 ${boulder.sector2}` : boulder.sector}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'h-8 rounded-xl border px-2.5 text-xs font-medium [&_svg]:size-4',
                            currentStatus === 'haengt'
                              ? 'border-[#CFE4B8] bg-[#EEF6E1] text-[#4E8A31] hover:bg-[#E8F4D9]'
                              : 'border-[#DDE7DF] bg-white text-[#13112B] hover:bg-[#F5FBF6]',
                          )}
                          disabled={bulkStatusUpdate.isPending}
                          onClick={() => runStatusUpdate([boulder.id], 'haengt', hangsActionKey, false)}
                        >
                          {isPendingHangs ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                          )}
                          {'H\u00E4ngt'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'h-8 rounded-xl border px-2.5 text-xs font-medium [&_svg]:size-4',
                            currentStatus === 'abgeschraubt'
                              ? 'border-[#E7B7B0] bg-[#FFF4F2] text-[#B64332] hover:bg-[#FFF0ED]'
                              : 'border-[#DDE7DF] bg-white text-[#13112B] hover:bg-[#FFF8F7]',
                          )}
                          disabled={bulkStatusUpdate.isPending}
                          onClick={() => runStatusUpdate([boulder.id], 'abgeschraubt', offActionKey, false)}
                        >
                          {isPendingOff ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <MinusCircle className="mr-1 h-4 w-4" />
                          )}
                          Abgeschraubt
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedIds.size > 0 ? (
        <div className="fixed inset-x-4 bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-[125] md:bottom-6 md:left-auto md:right-6 md:w-auto">
          <div className="rounded-2xl border border-[#DDE7DF] bg-white p-2 shadow-[0_18px_40px_rgba(19,17,43,0.12)]">
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#13112B]/48">
              {`${selectedIds.size} ausgew\u00E4hlt`}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 justify-start rounded-xl border-[#CFE4B8] bg-[#EEF6E1] px-3 text-[#4E8A31] hover:bg-[#E7F3D8] hover:text-[#4E8A31]"
                disabled={bulkStatusUpdate.isPending}
                onClick={() => runStatusUpdate(Array.from(selectedIds), 'haengt', 'bulk:haengt', true)}
              >
                {bulkStatusUpdate.isPending && activeAction === 'bulk:haengt' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {'H\u00E4ngend'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 justify-start rounded-xl border-[#E7B7B0] bg-[#FFF4F2] px-3 text-[#B64332] hover:bg-[#FFF0ED] hover:text-[#B64332]"
                disabled={bulkStatusUpdate.isPending}
                onClick={() => runStatusUpdate(Array.from(selectedIds), 'abgeschraubt', 'bulk:abgeschraubt', true)}
              >
                {bulkStatusUpdate.isPending && activeAction === 'bulk:abgeschraubt' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MinusCircle className="h-4 w-4" />
                )}
                Abschrauben
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-[#13112B]/56 hover:bg-[#F4F8F4] hover:text-[#13112B]"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SetterStatusPage;
