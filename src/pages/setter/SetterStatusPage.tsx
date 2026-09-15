import { useQueryClient } from "@tanstack/react-query";
import { useId, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Map as MapIcon,
  MinusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { HallMapView } from "@/components/HallMapView";
import { SetterSurface } from "@/components/setter/SetterWorkspaceShell";
import {
  ActiveFilterChip,
  BoulderFilterPanel,
  BoulderFilterTrigger,
} from "@/components/boulder/BoulderFilterControls";
import { SectorFilterOptions } from "@/components/boulder/SectorFilterOptions";
import {
  SetterConfirm,
  SetterSearch,
  SetterSelectionBar,
  SetterState,
} from "@/components/setter/SetterControls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useBouldersWithSectors,
  useBulkUpdateBoulderStatus,
} from "@/hooks/useBoulders";
import { useColors } from "@/hooks/useColors";
import { useSectorsTransformed } from "@/hooks/useSectors";
import { cn } from "@/lib/utils";
import {
  getBoulderColorBackgroundStyle,
  getBoulderColorLabel,
} from "@/utils/colorUtils";
import { formatDifficulty, getThumbnailUrl } from "./setterPageUtils";

type Status = "haengt" | "abgeschraubt";
type Change = { ids: string[]; status: Status; label: string };
export default function SetterStatusPage() {
  const queryClient = useQueryClient();
  const boulderQuery = useBouldersWithSectors();
  const sectorQuery = useSectorsTransformed();
  const { data: colors = [] } = useColors();
  const mutation = useBulkUpdateBoulderStatus();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groupPrefix = useId();
  const [mapOpen, setMapOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [change, setChange] = useState<Change | null>(null);
  const lock = useRef(false);
  const { data: boulders = [] } = boulderQuery;
  const sectors = sectorQuery.data ?? [];
  const base = useMemo(
    () =>
      boulders.filter(
        (b) =>
          (sector === "all" || b.sector === sector || b.sector2 === sector) &&
          [b.name, b.sector, b.sector2]
            .join(" ")
            .toLocaleLowerCase("de")
            .includes(query.trim().toLocaleLowerCase("de")),
      ),
    [boulders, query, sector],
  );
  const visible = useMemo(
    () =>
      base.filter((b) => status === "all" || (b.status ?? "haengt") === status),
    [base, status],
  );
  const visibleIds = visible.map((b) => b.id);
  // Never act on an entry that disappeared after a refetch or a filter change.
  const selectedIds = visibleIds.filter((id) => selected.has(id));
  const groups = useMemo(() => {
    const grouped = new Map<string, typeof visible>();
    visible.forEach((b) => {
      const key = sector === "all" ? b.sector : sector;
      grouped.set(key, [...(grouped.get(key) ?? []), b]);
    });
    return [...grouped.entries()].sort(([a], [b]) =>
      a.localeCompare(b, "de", { numeric: true }),
    );
  }, [visible, sector]);
  const allCollapsed =
    groups.length > 0 && groups.every(([name]) => collapsed.has(name));
  const hiddenSelection = groups
    .filter(([name]) => collapsed.has(name))
    .reduce(
      (count, [, items]) =>
        count + items.filter((b) => selected.has(b.id)).length,
      0,
    );
  const counts = Object.fromEntries(
    sectors.map((s) => [
      s.id,
      base.filter((b) => b.sectorId === s.id || b.sector2Id === s.id).length,
    ]),
  );
  const filter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setSelected(new Set());
    setCollapsed(new Set());
  };
  const toggleIds = (ids: string[]) =>
    setSelected((current) => {
      const next = new Set(current);
      const all = ids.every((id) => current.has(id));
      ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
      return next;
    });
  const apply = async () => {
    if (!change || lock.current) return false;
    lock.current = true;
    try {
      await mutation.mutateAsync({ ids: change.ids, status: change.status });
      setSelected(new Set());
      toast.success(`${change.ids.length} Boulder aktualisiert.`);
    } finally {
      lock.current = false;
    }
  };
  const loading = boulderQuery.isLoading || sectorQuery.isLoading;
  const failed = Boolean(boulderQuery.error) || Boolean(sectorQuery.error);
  const busy = mutation.isPending;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SetterSearch
          value={query}
          onChange={(v) => filter(setQuery, v)}
          disabled={busy}
        />
        <BoulderFilterTrigger
          count={sector === "all" ? 0 : 1}
          aria-expanded={filtersOpen}
          disabled={busy || loading || failed}
          onClick={() => setFiltersOpen(true)}
        />
        <Button
          variant="secondary"
          aria-expanded={mapOpen}
          aria-label="Hallenkarte"
          className="shrink-0 px-3"
          onClick={() => setMapOpen((v) => !v)}
        >
          <MapIcon className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Hallenkarte</span>
        </Button>
      </div>
      {sector !== "all" && (
        <fieldset disabled={busy}>
          <ActiveFilterChip
            label={`Sektor ${sector}`}
            onRemove={() => filter(setSector, "all")}
          >
            {sector}
          </ActiveFilterChip>
        </fieldset>
      )}
      <BoulderFilterPanel
        open={filtersOpen && !busy && !loading && !failed}
        onOpenChange={setFiltersOpen}
        resultCount={visible.length}
        activeCount={sector === "all" ? 0 : 1}
        onReset={() => filter(setSector, "all")}
      >
        <SectorFilterOptions
          sectors={sectors}
          selected={sector === "all" ? [] : [sector]}
          single
          onChange={(names) => filter(setSector, names[0] ?? "all")}
        />
      </BoulderFilterPanel>
      <div className="flex flex-wrap gap-2" aria-label="Status filtern">
        {[
          ["all", "Alle"],
          ["haengt", "Hängt"],
          ["abgeschraubt", "Abgeschraubt"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={status === value ? "default" : "secondary"}
            aria-pressed={status === value}
            disabled={busy}
            onClick={() => filter(setStatus, value)}
          >
            {label}
            {!loading && !failed && <span className="ml-2 text-xs">
              {
                base.filter(
                  (b) => value === "all" || (b.status ?? "haengt") === value,
                ).length
              }
            </span>}
          </Button>
        ))}
        {(query || sector !== "all" || status !== "all") && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setQuery("");
              setSector("all");
              setStatus("all");
              setSelected(new Set());
              setCollapsed(new Set());
            }}
          >
            Zurücksetzen
          </Button>
        )}
      </div>
      {mapOpen && !loading && !failed && (
        <SetterSurface>
          <HallMapView
            sectors={sectors}
            countsBySectorId={counts}
            boulderSectorReferences={boulders}
            selectedSectorName={sector}
            onSelectSectorId={(id) => {
              if (!busy)
                filter(
                  setSector,
                  sectors.find((s) => s.id === id)?.name ?? "all",
                );
            }}
            onClearSector={() => {
              if (!busy) filter(setSector, "all");
            }}
            compact
            frameless
          />
        </SetterSurface>
      )}
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
        {!loading && !failed && (
          <p className="text-sm text-muted-foreground" role="status">
            {visible.length} Boulder · {groups.length} {groups.length === 1 ? 'Sektor' : 'Sektoren'}
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          <Button
            variant="ghost"
            className="px-2 text-xs"
            disabled={loading || failed || !groups.length}
            onClick={() =>
              setCollapsed((current) => {
                const next = new Set(current);
                groups.forEach(([name]) =>
                  allCollapsed ? next.delete(name) : next.add(name),
                );
                return next;
              })
            }
          >
            {allCollapsed ? (
              <ChevronsUpDown className="mr-2 h-4 w-4" />
            ) : (
              <ChevronsDownUp className="mr-2 h-4 w-4" />
            )}
            {allCollapsed ? "Alle ausklappen" : "Alle einklappen"}
          </Button>
          <Button
            variant="ghost"
            className="px-2 text-xs"
            aria-label={
              visible.length > 0 && selectedIds.length === visible.length
                ? "Auswahl aufheben"
                : "Alle Ergebnisse wählen"
            }
            disabled={busy || !visible.length || failed}
            onClick={() => toggleIds(visibleIds)}
          >
            {visible.length > 0 && selectedIds.length === visible.length
              ? "Auswahl aufheben"
              : "Alle wählen"}
          </Button>
        </div>
      </div>
      {!loading && !failed && hiddenSelection > 0 && (
        <p role="status" className="text-xs text-muted-foreground">
          {hiddenSelection} ausgewählte Boulder in eingeklappten Gruppen. Die
          Auswahl bleibt aktiv.
        </p>
      )}
      {loading ? (
        <SetterState loading title="Boulder werden geladen …" />
      ) : failed ? (
        <SetterState
          title="Boulder konnten nicht geladen werden."
          retrying={boulderQuery.isFetching || sectorQuery.isFetching}
          onRetry={() => {
            void queryClient.refetchQueries({ queryKey: ["boulders"] });
            void queryClient.refetchQueries({ queryKey: ["sectors"] });
          }}
        />
      ) : !visible.length ? (
        <SetterState
          title="Keine Boulder gefunden"
          description="Passe die Suche oder die Filter an."
        />
      ) : (
        groups.map(([name, items]) => (
          <section key={name} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="min-w-0 flex-1 text-base font-semibold">
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-2 rounded-kws-control py-2 pr-2 text-left hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${name} · ${items.length} Boulder${items.some((b) => selected.has(b.id)) ? ` · ${items.filter((b) => selected.has(b.id)).length} ausgewählt` : ""}`}
                  aria-expanded={!collapsed.has(name)}
                  aria-controls={`${groupPrefix}-${encodeURIComponent(name)}`}
                  onClick={() =>
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(name)) next.delete(name);
                      else next.add(name);
                      return next;
                    })
                  }
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none",
                      collapsed.has(name) && "-rotate-90",
                    )}
                  />
                  <span className="min-w-0 break-words">
                    {name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {items.length}
                    </span>
                    {items.some((b) => selected.has(b.id)) && (
                      <span className="mt-0.5 block text-xs font-medium text-primary-ink">
                        {items.filter((b) => selected.has(b.id)).length}{" "}
                        ausgewählt
                      </span>
                    )}
                  </span>
                </button>
              </h2>
              <Button
                variant="ghost"
                disabled={busy}
                aria-label={`${name}: Boulder ${items.every((b) => selected.has(b.id)) ? "abwählen" : "auswählen"}`}
                onClick={() => toggleIds(items.map((b) => b.id))}
              >
                {items.every((b) => selected.has(b.id))
                  ? "Auswahl lösen"
                  : "Auswählen"}
              </Button>
            </div>
            <div
              id={`${groupPrefix}-${encodeURIComponent(name)}`}
              hidden={collapsed.has(name)}
            >
              <SetterSurface className="p-0 sm:p-0 overflow-hidden">
                <div className="divide-y divide-border/60">
                  {items.map((b) => {
                    const hanging = (b.status ?? "haengt") === "haengt";
                    const thumbnail = getThumbnailUrl(b);
                    return (
                      <article
                        key={b.id}
                        className={cn(
                          "grid grid-cols-[44px_48px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-3 sm:grid-cols-[44px_48px_minmax(0,1fr)_auto] sm:px-4",
                          selected.has(b.id) && "bg-primary/10",
                        )}
                      >
                        <label className="flex h-11 w-11 shrink-0 items-center justify-center">
                          <Checkbox
                            aria-label={`${b.name} auswählen`}
                            disabled={busy}
                            checked={selected.has(b.id)}
                            onCheckedChange={() => toggleIds([b.id])}
                          />
                        </label>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-kws-control bg-secondary">
                          {thumbnail && (
                            <img
                              src={thumbnail}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">
                            {b.name}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span
                              aria-hidden="true"
                              className="h-3.5 w-3.5 shrink-0 rounded-kws-badge ring-1 ring-foreground/15"
                              style={getBoulderColorBackgroundStyle(
                                b.color,
                                b.color2,
                                colors,
                              )}
                            />
                            {getBoulderColorLabel(b.color, b.color2)} · Grad{" "}
                            {formatDifficulty(b.difficulty)}
                          </p>
                          {b.sector2 && (
                            <p className="text-xs text-muted-foreground">
                              Auch {b.sector2}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          className={cn(
                            "col-start-3 justify-self-start text-xs sm:col-start-4 sm:justify-self-end",
                            hanging && "text-primary-ink",
                          )}
                          aria-label={`${b.name}: ${hanging ? "abschrauben" : "wieder aufhängen"}`}
                          onClick={() =>
                            setChange({
                              ids: [b.id],
                              status: hanging ? "abgeschraubt" : "haengt",
                              label: b.name,
                            })
                          }
                        >
                          {hanging ? (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          ) : (
                            <MinusCircle className="mr-2 h-4 w-4" />
                          )}
                          {hanging ? "Hängt" : "Abgeschraubt"}
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </SetterSurface>
            </div>
          </section>
        ))
      )}
      <SetterSelectionBar
        count={loading || failed ? 0 : selectedIds.length}
        onClear={() => setSelected(new Set())}
        disabled={busy || loading || failed}
      >
        <Button
          variant="secondary"
          disabled={busy || loading || failed}
          onClick={() =>
            setChange({
              ids: selectedIds,
              status: "haengt",
              label: `${selectedIds.length} ausgewählte Boulder`,
            })
          }
        >
          Aufhängen
        </Button>
        <Button
          disabled={busy || loading || failed}
          onClick={() =>
            setChange({
              ids: selectedIds,
              status: "abgeschraubt",
              label: `${selectedIds.length} ausgewählte Boulder`,
            })
          }
        >
          Abschrauben
        </Button>
      </SetterSelectionBar>
      <SetterConfirm
        open={!!change}
        onOpenChange={(open) => {
          if (!open) setChange(null);
        }}
        title={
          change?.status === "haengt"
            ? "Boulder aufhängen?"
            : "Boulder abschrauben?"
        }
        description={`${change?.label ?? ""} – ${change?.status === "haengt" ? "wird als hängend markiert." : "wird als abgeschraubt markiert. Die Boulder werden nicht gelöscht."}`}
        confirmLabel={change?.status === "haengt" ? "Aufhängen" : "Abschrauben"}
        destructive={false}
        onConfirm={apply}
      />
    </div>
  );
}
