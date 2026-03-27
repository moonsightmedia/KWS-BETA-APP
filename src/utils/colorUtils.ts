type ColorLike = { name: string; hex: string; secondary_hex?: string | null };

/**
 * Get color hex code(s) for a color name.
 * Returns primary hex and optional secondary hex for color definitions.
 */
export const getColorHex = (
  colorName: string,
  colors?: ColorLike[]
): { primary: string; secondary?: string | null } => {
  if (!colors) {
    const DEFAULT_COLOR_HEX: Record<string, string> = {
      'Grün': '#22c55e',
      'Gelb': '#facc15',
      'Blau': '#3b82f6',
      'Orange': '#f97316',
      'Rot': '#ef4444',
      'Schwarz': '#111827',
      'Weiß': '#ffffff',
      'Lila': '#a855f7',
    };
    return { primary: DEFAULT_COLOR_HEX[colorName] || '#9ca3af' };
  }

  const color = colors.find((entry) => entry.name === colorName);
  if (!color) {
    return { primary: '#9ca3af' };
  }

  return {
    primary: color.hex,
    secondary: color.secondary_hex || null,
  };
};

/**
 * Get CSS background style for a color definition (supports secondary_hex gradients).
 */
export const getColorBackgroundStyle = (
  colorName: string,
  colors?: ColorLike[]
): React.CSSProperties => {
  const { primary, secondary } = getColorHex(colorName, colors);

  if (secondary) {
    return {
      background: `linear-gradient(135deg, ${primary} 0%, ${primary} 50%, ${secondary} 50%, ${secondary} 100%)`,
    };
  }

  return {
    backgroundColor: primary,
  };
};

/**
 * Build a split background for a specific boulder with two different grip colors.
 */
export const getBoulderColorBackgroundStyle = (
  primaryColorName: string,
  secondaryColorName?: string | null,
  colors?: ColorLike[]
): React.CSSProperties => {
  if (!secondaryColorName) {
    return getColorBackgroundStyle(primaryColorName, colors);
  }

  const primary = getColorHex(primaryColorName, colors).primary;
  const secondary = getColorHex(secondaryColorName, colors).primary;

  return {
    background: `linear-gradient(135deg, ${primary} 0%, ${primary} 50%, ${secondary} 50%, ${secondary} 100%)`,
  };
};

export const getBoulderColorLabel = (
  primaryColorName: string,
  secondaryColorName?: string | null
): string => {
  return secondaryColorName ? `${primaryColorName} + ${secondaryColorName}` : primaryColorName;
};

export const matchesBoulderColorFilter = (
  primaryColorName: string,
  secondaryColorName: string | null | undefined,
  filter: string
): boolean => {
  return filter === 'all' || primaryColorName === filter || secondaryColorName === filter;
};
