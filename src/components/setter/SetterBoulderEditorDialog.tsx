import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import { BoulderAttributeSelector } from '@/components/BoulderAttributeSelector';
import { HallMapView } from '@/components/HallMapView';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getBoulderAttributeIcon } from '@/lib/boulderAttributes';
import { cn } from '@/lib/utils';
import type { BoulderAttributeOption } from '@/types/community';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { generateBoulderName } from '@/utils/nameGenerator';

export interface SetterBoulderDraft {
  id: string;
  name: string;
  sectorId: string;
  sectorId2?: string;
  spansMultipleSectors: boolean;
  colorId: string;
  difficulty: number | null;
  note: string;
  attributeIds: string[];
  videoFile: File | null;
  thumbFile: File | null;
  existingThumbnailUrl?: string | null;
  existingVideoUrl?: string | null;
  mapX?: number;
  mapY?: number;
}

type EditorColor = {
  id: string;
  name: string;
  hex?: string | null;
};

type EditorSector = {
  id: string;
  name: string;
  boulderCount?: number | null;
};

const OPTIONAL_ATTRIBUTE_KEYS = new Set(['partner_boulder', 'dual_color']);

const newId = () => Math.random().toString(36).slice(2, 11);

export const createEmptySetterBoulderDraft = (colors: EditorColor[]): SetterBoulderDraft => {
  const defaultColor = colors[0];
  const defaultDifficulty = 4;

  return {
    id: newId(),
    name: defaultColor ? generateBoulderName(defaultColor.name, defaultDifficulty) : 'Neuer Boulder',
    sectorId: '',
    sectorId2: undefined,
    spansMultipleSectors: false,
    colorId: defaultColor?.id ?? '',
    difficulty: defaultDifficulty,
    note: '',
    attributeIds: [],
    videoFile: null,
    thumbFile: null,
    existingThumbnailUrl: null,
    existingVideoUrl: null,
    mapX: undefined,
    mapY: undefined,
  };
};

export const canSubmitSetterBoulderDraft = (draft: SetterBoulderDraft | null) => {
  if (!draft) return false;

  const hasVideo = Boolean(draft.videoFile || draft.existingVideoUrl);
  const hasThumbnail = Boolean(draft.thumbFile || draft.existingThumbnailUrl);

  return Boolean(
    hasVideo &&
    hasThumbnail &&
    draft.name.trim() &&
    draft.sectorId &&
    draft.colorId,
  );
};

function EditorMediaDrop({
  label,
  accept,
  icon,
  previewUrl,
  fileName,
  existingLabel,
  onChange,
}: {
  label: string;
  accept: string;
  icon: ReactNode;
  previewUrl?: string | null;
  fileName?: string | null;
  existingLabel?: string | null;
  onChange: (file: File) => void;
}) {
  const statusText = fileName ?? existingLabel ?? 'Datei aus der Galerie wählen';
  const isSelected = Boolean(fileName || existingLabel || previewUrl);

  return (
    <label className="relative block aspect-[9/16] overflow-hidden rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FCFDFC]">
      <input
        type="file"
        accept={accept}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onChange(file);
        }}
      />
      {previewUrl ? <img src={previewUrl} alt={label} className="absolute inset-0 h-full w-full object-cover" /> : null}
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center px-3 py-4 text-center',
          previewUrl ? 'bg-black/8' : 'bg-white',
        )}
      >
        {!previewUrl ? icon : null}
        <p className="text-sm font-semibold tracking-[-0.02em] text-[#13112B]">{label}</p>
        <p className="mt-2 line-clamp-2 text-[11px] text-[#13112B]/58">{statusText}</p>
        {isSelected ? (
          <span className="mt-3 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#69B545] text-white">
            <Check className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </label>
  );
}

export function SetterBoulderEditorDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  draft,
  colors,
  sectors,
  attributeCatalog,
  onDraftChange,
  onSubmit,
  onDelete,
  isSubmitting = false,
  isDeleting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  draft: SetterBoulderDraft | null;
  colors: EditorColor[];
  sectors: EditorSector[];
  attributeCatalog: BoulderAttributeOption[];
  onDraftChange: (draft: SetterBoulderDraft) => void;
  onSubmit: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  isSubmitting?: boolean;
  isDeleting?: boolean;
}) {
  const [primarySectorSearch, setPrimarySectorSearch] = useState('');
  const [secondarySectorSearch, setSecondarySectorSearch] = useState('');
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPrimarySectorSearch('');
      setSecondarySectorSearch('');
    }
  }, [open, draft?.id]);

  useEffect(() => {
    if (!draft) {
      setThumbPreviewUrl(null);
      return;
    }

    if (draft.thumbFile) {
      const objectUrl = URL.createObjectURL(draft.thumbFile);
      setThumbPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setThumbPreviewUrl(draft.existingThumbnailUrl ?? null);
  }, [draft]);

  const mainAttributeCatalog = useMemo(
    () => attributeCatalog.filter((attribute) => !OPTIONAL_ATTRIBUTE_KEYS.has(attribute.key)),
    [attributeCatalog],
  );
  const optionalAttributeCatalog = useMemo(
    () => attributeCatalog.filter((attribute) => OPTIONAL_ATTRIBUTE_KEYS.has(attribute.key)),
    [attributeCatalog],
  );
  const sectorCountsById = useMemo(
    () =>
      sectors.reduce<Record<string, number>>((accumulator, sector) => {
        accumulator[sector.id] = sector.boulderCount ?? 0;
        return accumulator;
      }, {}),
    [sectors],
  );
  const filteredPrimarySectors = useMemo(() => {
    const query = primarySectorSearch.trim().toLowerCase();
    if (!query) return sectors;
    return sectors.filter((sector) => sector.name.toLowerCase().includes(query));
  }, [primarySectorSearch, sectors]);
  const filteredSecondarySectors = useMemo(() => {
    const query = secondarySectorSearch.trim().toLowerCase();
    const availableSectors = draft ? sectors.filter((sector) => sector.id !== draft.sectorId) : sectors;
    if (!query) return availableSectors;
    return availableSectors.filter((sector) => sector.name.toLowerCase().includes(query));
  }, [draft, secondarySectorSearch, sectors]);
  if (!draft) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hidden" />
      </Dialog>
    );
  }

  const updateDraft = (updates: Partial<SetterBoulderDraft>) => {
    onDraftChange({ ...draft, ...updates });
  };

  const toggleAttribute = (attributeId: string) => {
    updateDraft({
      attributeIds: draft.attributeIds.includes(attributeId)
        ? draft.attributeIds.filter((id) => id !== attributeId)
        : [...draft.attributeIds, attributeId],
    });
  };

  const selectPrimarySector = (sectorId: string) => {
    updateDraft({
      sectorId,
      sectorId2: draft.sectorId2 === sectorId ? undefined : draft.sectorId2,
      mapX: draft.sectorId === sectorId ? draft.mapX : undefined,
      mapY: draft.sectorId === sectorId ? draft.mapY : undefined,
    });
  };

  const selectSecondarySector = (sectorId: string) => {
    updateDraft({
      sectorId2: draft.sectorId2 === sectorId ? undefined : sectorId,
    });
  };

  const selectPrimarySectorByName = (sectorName: string) => {
    const sector = sectors.find((entry) => entry.name === sectorName);
    if (!sector) return;
    selectPrimarySector(sector.id);
  };

  const selectSecondarySectorByName = (sectorName: string) => {
    const sector = sectors.find((entry) => entry.name === sectorName);
    if (!sector || sector.id === draft.sectorId) return;
    selectSecondarySector(sector.id);
  };

  const handleFileSelect = (kind: 'video' | 'thumb', file: File) => {
    updateDraft(kind === 'video' ? { videoFile: file } : { thumbFile: file });
  };

  const selectedSectorName = sectors.find((sector) => sector.id === draft.sectorId)?.name ?? null;
  const selectedSecondarySectorName = sectors.find((sector) => sector.id === draft.sectorId2)?.name ?? null;
  const selectedColorName = colors.find((color) => color.id === draft.colorId)?.name ?? 'Farbe';
  const hasVideo = Boolean(draft.videoFile || draft.existingVideoUrl);
  const hasThumbnail = Boolean(draft.thumbFile || draft.existingThumbnailUrl);
  const dialogErrors = {
    video: !hasVideo,
    thumb: !hasThumbnail,
    name: !draft.name.trim(),
    sector: !draft.sectorId,
    color: !draft.colorId,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-white p-0 shadow-none sm:h-[90vh] sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-[#DDE7DF] sm:shadow-[0_18px_45px_rgba(19,17,43,0.12)]">
        <div className="shrink-0 border-b border-[#E7F0E8] bg-white/96 px-4 py-4 backdrop-blur sm:px-6">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-[#13112B]">{title}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <section className="space-y-3 pb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">1. Medien</p>
            <div className="grid grid-cols-2 gap-3">
              <EditorMediaDrop
                label="Video"
                accept="video/*"
                icon={<FileVideo className="mb-2 h-6 w-6 text-[#6C6A7E]" />}
                fileName={draft.videoFile?.name}
                existingLabel={draft.existingVideoUrl ? 'Video vorhanden' : null}
                onChange={(file) => handleFileSelect('video', file)}
              />
              <EditorMediaDrop
                label="Thumbnail"
                accept="image/*"
                icon={<ImageIcon className="mb-2 h-6 w-6 text-[#6C6A7E]" />}
                previewUrl={thumbPreviewUrl}
                fileName={draft.thumbFile?.name}
                existingLabel={draft.existingThumbnailUrl ? 'Thumbnail vorhanden' : null}
                onChange={(file) => handleFileSelect('thumb', file)}
              />
            </div>
            {dialogErrors.video || dialogErrors.thumb ? (
              <p className="text-xs text-destructive">Video und Thumbnail sind Pflicht.</p>
            ) : null}
          </section>

          <section className="space-y-4 border-t border-[#E7F0E8] py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">2. Route-DNA</p>

            <div className="space-y-2">
              <Label>Sektor</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#13112B]/40" />
                <Input
                  placeholder="Sektor suchen..."
                  value={primarySectorSearch}
                  onChange={(event) => setPrimarySectorSearch(event.target.value)}
                  className="h-10 rounded-xl border-none bg-[#F3F6F3] pl-10 pr-4 text-sm text-[#13112B] shadow-none placeholder:text-[#13112B]/42 focus-visible:ring-2 focus-visible:ring-[#69B545]/35"
                />
              </div>
              {filteredPrimarySectors.length > 0 ? (
                <HallMapView
                  sectors={filteredPrimarySectors}
                  countsBySectorId={sectorCountsById}
                  selectedSectorName={selectedSectorName ?? 'all'}
                  onSelectSector={selectPrimarySectorByName}
                  onClearSector={() => {
                    setPrimarySectorSearch('');
                    updateDraft({ sectorId: '', mapX: undefined, mapY: undefined });
                  }}
                  compact
                  frameless
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FCFDFC] px-4 py-5 text-sm text-[#13112B]/58">
                  Kein Sektor zur Suche gefunden.
                </div>
              )}
              <p className="text-xs text-[#13112B]/58">
                {selectedSectorName ? `Ausgewählt: ${selectedSectorName}` : 'Sektor direkt auf der Karte auswählen.'}
              </p>
              {dialogErrors.sector ? <p className="text-xs text-destructive">Sektor wählen.</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Farbe</Label>
              <div className="grid grid-cols-2 gap-2">
                {colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() =>
                      updateDraft({
                        colorId: color.id,
                        name: generateBoulderName(color.name, draft.difficulty),
                      })
                    }
                    className={cn(
                      'flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                      draft.colorId === color.id
                        ? 'border-[#69B545] bg-[#F4FBF4]'
                        : 'border-[#DDE7DF] bg-white hover:border-[#69B545]/40',
                    )}
                  >
                    <span
                      className="h-6 w-6 shrink-0 rounded-[8px] border border-white/70 shadow-sm"
                      style={getColorBackgroundStyle(color.name, colors)}
                    />
                    <span className="min-w-0 flex-1 text-sm font-semibold text-[#13112B]">{color.name}</span>
                    {draft.colorId === color.id ? <Check className="h-4 w-4 shrink-0 text-[#69B545]" /> : null}
                  </button>
                ))}
              </div>
              {dialogErrors.color ? <p className="text-xs text-destructive">Farbe wählen.</p> : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Schwierigkeit</Label>
                <span className="text-xs font-medium text-[#13112B]/52">Aktuell: {draft.difficulty ?? '?'}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[null, 1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                  <button
                    key={level === null ? '?' : level}
                    type="button"
                    onClick={() => updateDraft({ difficulty: level })}
                    className={cn(
                      'h-11 rounded-xl border text-sm font-semibold transition-colors',
                      draft.difficulty === level
                        ? 'border-[#69B545] bg-[#F4FBF4] text-[#13112B]'
                        : 'border-[#DDE7DF] bg-white text-[#13112B] hover:border-[#69B545]/40',
                    )}
                  >
                    {level === null ? '?' : level}
                  </button>
                ))}
              </div>
            </div>

            <BoulderAttributeSelector
              attributes={mainAttributeCatalog}
              selectedAttributeIds={draft.attributeIds}
              onToggle={toggleAttribute}
              title="Attribute"
              description=""
              compact
            />
          </section>

          <section className="space-y-4 border-t border-[#E7F0E8] pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">3. Name</p>
            <div className="space-y-2">
              <Label htmlFor="setter-boulder-name">Name</Label>
              <div className="flex gap-2">
                <Input
                  id="setter-boulder-name"
                  value={draft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  className={cn(
                    'h-11 rounded-xl border-[#DDE7DF] bg-white px-4',
                    dialogErrors.name && 'border-destructive focus-visible:ring-destructive',
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl border-[#DDE7DF] bg-white"
                  onClick={() => updateDraft({ name: generateBoulderName(selectedColorName, draft.difficulty) })}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
              {dialogErrors.name ? <p className="text-xs text-destructive">Name erforderlich.</p> : null}
            </div>
          </section>

          <section className="space-y-4 border-t border-[#E7F0E8] pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">4. Optionale Zusatzfelder</p>

            <div className="flex items-center gap-3 rounded-xl border border-[#DDE7DF] bg-[#FCFDFC] px-4 py-3">
              <Checkbox
                id="setter-spans-sectors"
                checked={draft.spansMultipleSectors}
                onCheckedChange={(checked) =>
                  updateDraft({
                    spansMultipleSectors: checked === true,
                    sectorId2: checked === true ? draft.sectorId2 : undefined,
                  })
                }
              />
              <Label htmlFor="setter-spans-sectors" className="cursor-pointer text-sm font-medium text-[#13112B]">
                Verläuft über mehrere Sektoren
              </Label>
            </div>

            {optionalAttributeCatalog.length ? (
              <div className="space-y-2">
                <Label>Spezialfälle</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {optionalAttributeCatalog.map((attribute) => {
                    const Icon = getBoulderAttributeIcon(attribute);
                    const isSelected = draft.attributeIds.includes(attribute.id);

                    return (
                      <button
                        key={attribute.id}
                        type="button"
                        onClick={() => toggleAttribute(attribute.id)}
                        className={cn(
                          'flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                          isSelected
                            ? 'border-[#69B545] bg-[#F4FBF4]'
                            : 'border-[#DDE7DF] bg-white hover:border-[#69B545]/40',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                            isSelected ? 'bg-[#69B545] text-white' : 'bg-[#EFF7F0] text-[#36B531]',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-[#13112B]">
                          {attribute.label}
                        </span>
                        {isSelected ? <Check className="h-4 w-4 shrink-0 text-[#69B545]" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {draft.spansMultipleSectors ? (
              <div className="space-y-2">
                <Label>Endsektor</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#13112B]/40" />
                  <Input
                    placeholder="Endsektor suchen..."
                    value={secondarySectorSearch}
                    onChange={(event) => setSecondarySectorSearch(event.target.value)}
                    className="h-10 rounded-xl border-none bg-[#F3F6F3] pl-10 pr-4 text-sm text-[#13112B] shadow-none placeholder:text-[#13112B]/42 focus-visible:ring-2 focus-visible:ring-[#69B545]/35"
                  />
                </div>
                {filteredSecondarySectors.length > 0 ? (
                  <HallMapView
                    sectors={filteredSecondarySectors}
                    countsBySectorId={sectorCountsById}
                    selectedSectorName={selectedSecondarySectorName ?? 'all'}
                    onSelectSector={selectSecondarySectorByName}
                    onClearSector={() => {
                      setSecondarySectorSearch('');
                      updateDraft({ sectorId2: undefined });
                    }}
                    compact
                    frameless
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FCFDFC] px-4 py-5 text-sm text-[#13112B]/58">
                    Kein Endsektor zur Suche gefunden.
                  </div>
                )}
                <p className="text-xs text-[#13112B]/58">
                  {selectedSecondarySectorName ? `Ausgewählt: ${selectedSecondarySectorName}` : 'Zweiten Sektor auf der Karte auswählen.'}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="setter-boulder-note">Notiz</Label>
              <Textarea
                id="setter-boulder-note"
                value={draft.note}
                onChange={(event) => updateDraft({ note: event.target.value })}
                className="min-h-[112px] rounded-xl border-[#DDE7DF] bg-white"
              />
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-[#E7F0E8] bg-white/96 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2 sm:flex-1">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl border-[#DDE7DF] bg-white"
                onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
              {onDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl border-[#F1D7D2] text-[#B64332] hover:bg-[#FFF4F2] hover:text-[#B64332]"
                  disabled={isDeleting}
                  onClick={() => void onDelete()}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={() => void onSubmit()}
              disabled={isSubmitting || !canSubmitSetterBoulderDraft(draft)}
              className="h-11 rounded-xl bg-[#69B545] px-5 text-white hover:bg-[#5fa039] sm:flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
