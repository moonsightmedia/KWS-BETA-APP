import { cn } from '@/lib/utils';
import { getBoulderColorBackgroundStyle, getBoulderColorLabel, getColorHex } from '@/utils/colorUtils';

const LIGHT_TEXT_COLORS = new Set(['Grün', 'Blau', 'Rot', 'Schwarz', 'Lila']);

function getDifficultyTextColor(colorName: string, colorHex?: string) {
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

function getRelativeLuminance(red: number, green: number, blue: number) {
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
}

function getReadableDifficultyInkColor(colorName: string, colorHex: string | undefined, colors?: GripColor[]) {
  const source = colorHex || getColorHex(colorName, colors).primary;
  const normalized = source.replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((character) => `${character}${character}`).join('')
    : normalized;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) return '#354438';

  const channels = [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
  ];

  for (let factor = 1; factor >= 0; factor -= 0.025) {
    const [red, green, blue] = channels.map((channel) => Math.round(channel * factor));
    const contrastAgainstWhite = 1.05 / (getRelativeLuminance(red, green, blue) + 0.05);

    if (contrastAgainstWhite >= 4.5) {
      return `rgb(${red} ${green} ${blue})`;
    }
  }

  return '#13112B';
}

type GripColor = { name: string; hex: string; secondary_hex?: string | null };

type DifficultyBadgeProps = {
  color: string;
  color2?: string | null;
  colorHex?: string;
  difficulty: number | null;
  colors?: GripColor[];
  variant?: 'list' | 'detail';
  className?: string;
};

export function DifficultyBadge({
  color,
  color2,
  colorHex,
  difficulty,
  colors,
  variant = 'list',
  className,
}: DifficultyBadgeProps) {
  const label = difficulty === null ? '?' : difficulty;
  const isListVariant = variant === 'list';

  return (
    <span
      className={cn(
        !isListVariant
          ? 'inline-flex rounded-kws-badge px-2 py-0.5 text-xs font-bold backdrop-blur-sm'
          : 'absolute bottom-2 right-2 grid h-7 min-w-7 place-items-center rounded-kws-badge bg-white px-1 text-xs font-extrabold leading-none shadow-[0_2px_9px_rgba(19,17,43,0.18)]',
        !isListVariant && getDifficultyTextColor(color, colorHex),
        className,
      )}
      style={{
        ...(!isListVariant ? getBoulderColorBackgroundStyle(color, color2, colors) : {}),
        color: isListVariant ? getReadableDifficultyInkColor(color, colorHex, colors) : undefined,
      }}
      title={getBoulderColorLabel(color, color2)}
      aria-label={`Grad ${label}, Farbe ${getBoulderColorLabel(color, color2)}`}
    >
      {variant === 'detail' ? `${label} · ${getBoulderColorLabel(color, color2)}` : label}
    </span>
  );
}
