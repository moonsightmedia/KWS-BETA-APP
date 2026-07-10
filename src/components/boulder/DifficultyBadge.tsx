import { cn } from '@/lib/utils';
import { getColorBackgroundStyle } from '@/utils/colorUtils';

const LIGHT_TEXT_COLORS = new Set(['Grün', 'Blau', 'Rot', 'Schwarz', 'Lila']);

export function getDifficultyTextColor(colorName: string, colorHex?: string) {
  if (colorHex) {
    const hex = colorHex.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.72 ? 'text-black' : 'text-white';
    }
  }

  return LIGHT_TEXT_COLORS.has(colorName) ? 'text-white' : 'text-black';
}

type GripColor = { name: string; hex: string; secondary_hex?: string | null };

type DifficultyBadgeProps = {
  color: string;
  colorHex?: string;
  difficulty: number | null;
  colors?: GripColor[];
  variant?: 'list' | 'detail';
  className?: string;
};

export function DifficultyBadge({
  color,
  colorHex,
  difficulty,
  colors,
  variant = 'list',
  className,
}: DifficultyBadgeProps) {
  const label = difficulty === null ? '?' : difficulty;

  return (
    <span
      className={cn(
        variant === 'detail'
          ? 'inline-flex rounded-lg px-2 py-0.5 text-xs font-bold backdrop-blur-sm'
          : 'absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm',
        getDifficultyTextColor(color, colorHex),
        className,
      )}
      style={{
        ...(getColorBackgroundStyle(color, colors) || {}),
        color: undefined,
      }}
    >
      {label}
    </span>
  );
}
