import { Check, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getBoulderAttributeHint, getBoulderAttributeIcon } from '@/lib/boulderAttributes';
import type { BoulderAttributeOption } from '@/types/community';

interface BoulderAttributeSelectorProps {
  attributes: BoulderAttributeOption[];
  selectedAttributeIds: string[];
  onToggle: (attributeId: string) => void;
  title?: string;
  description?: string;
  compact?: boolean;
}

export function BoulderAttributeSelector({
  attributes,
  selectedAttributeIds,
  onToggle,
  title = 'Boulder-Merkmale',
  description = 'Der Setter legt fest, welche Bewegungsqualitäten diesen Boulder prägen.',
  compact = false,
}: BoulderAttributeSelectorProps) {
  const selectedCount = attributes.filter((attribute) => selectedAttributeIds.includes(attribute.id)).length;

  if (compact) {
    return (
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">{title}</p>
            {description ? (
              <p className="mt-1 text-xs leading-5 text-[#13112B]/56">
                {description}
              </p>
            ) : null}
          </div>
          {selectedCount > 0 ? (
            <span className="text-xs font-medium text-[#13112B]/52">{selectedCount} gewählt</span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attributes.map((attribute) => {
            const isSelected = selectedAttributeIds.includes(attribute.id);
            const Icon = getBoulderAttributeIcon(attribute);

            return (
              <button
                key={attribute.id}
                type="button"
                onClick={() => onToggle(attribute.id)}
                className={cn(
                  'flex min-h-[56px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                  isSelected
                    ? 'border-[#69B545] bg-[#F4FBF4] text-[#13112B]'
                    : 'border-[#DDE7DF] bg-white text-[#13112B] hover:border-[#69B545]/40',
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
                <span className="min-w-0 flex-1 text-sm font-semibold leading-4 break-words">
                  {attribute.label}
                </span>
                {isSelected ? <Check className="h-4 w-4 shrink-0 text-[#69B545]" /> : null}
              </button>
            );
          })}

          {attributes.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-[#DCEEDF] bg-white/70 px-3 py-5 text-center text-xs text-[#13112B]/58">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-[#36B531]" />
              Keine aktiven Attribute gefunden.
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">{title}</p>
          {description ? (
            <p className="mt-1 max-w-xl text-sm leading-6 text-[#13112B]/62">
              {description}
            </p>
          ) : null}
        </div>
        <span className="rounded-xl border border-[#DCEEDF] bg-[#FCFDFC] px-3 py-1 text-xs font-medium text-[#13112B]/58">
          {selectedCount} aktiv
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {attributes.map((attribute) => {
          const isSelected = selectedAttributeIds.includes(attribute.id);
          const Icon = getBoulderAttributeIcon(attribute);

          return (
            <button
              key={attribute.id}
              type="button"
              onClick={() => onToggle(attribute.id)}
              className={cn(
                'group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all',
                isSelected
                  ? 'border-[#36B531] bg-[#36B531] text-white'
                  : 'border-[#E7F0E8] bg-[#FCFDFC] text-[#13112B] hover:border-[#BEDFC2] hover:bg-white',
              )}
            >
              <div className="relative flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'grid h-12 w-12 place-items-center rounded-2xl',
                    isSelected
                      ? 'bg-white/18 text-white'
                      : 'bg-[#EFF7F0] text-[#36B531]',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="relative mt-5">
                  <p className="text-base font-semibold leading-tight">{attribute.label}</p>
                  <p className={cn('mt-1 text-xs leading-5', isSelected ? 'text-white/78' : 'text-[#13112B]/55')}>
                    {getBoulderAttributeHint(attribute.key)}
                  </p>
                </div>
                <span
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded-xl border transition-opacity',
                    isSelected
                      ? 'border-white/40 bg-white/10 opacity-100'
                      : 'border-[#E7F0E8] bg-white opacity-0 group-hover:opacity-100',
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          );
        })}

        {attributes.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-[#DCEEDF] bg-white/70 px-4 py-6 text-center text-sm text-[#13112B]/58">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-[#36B531]" />
            Keine aktiven Attribute gefunden.
          </div>
        )}
      </div>
    </section>
  );
}
