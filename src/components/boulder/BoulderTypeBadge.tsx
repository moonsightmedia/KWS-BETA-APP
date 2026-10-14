import { Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Structural marker, independent of the grade and the color swatch. */
export function BoulderTypeBadge({ volumeOnly, compact = false, className }: {
  volumeOnly?: boolean; compact?: boolean; className?: string;
}) {
  if (!volumeOnly) return null;
  return (
    <span title="Nur Volumen – ohne zusätzliche Griffe" aria-label="Nur Volumen"
      className={cn('inline-flex w-fit shrink-0 items-center gap-1 rounded-kws-badge bg-secondary px-2 py-1 text-[10px] font-semibold text-foreground',
        compact && 'bg-white/95 px-1.5 py-0.5 text-[8px]', className)}>
      <Boxes aria-hidden="true" className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {compact ? 'Volumen' : 'Nur Volumen'}
    </span>
  );
}
