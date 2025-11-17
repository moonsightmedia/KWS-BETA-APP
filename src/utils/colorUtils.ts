import { useColors } from '@/hooks/useColors';

/**
 * Get color hex code(s) for a color name
 * Returns primary hex and optional secondary hex for two-color grips
 */
export const getColorHex = (colorName: string, colors?: Array<{ name: string; hex: string; secondary_hex?: string | null }>): { primary: string; secondary?: string | null } => {
  if (!colors) {
    // Fallback to default colors if colors not loaded
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

  const color = colors.find(c => c.name === colorName);
  if (!color) {
    return { primary: '#9ca3af' }; // Default gray
  }

  return {
    primary: color.hex,
    secondary: color.secondary_hex || null,
  };
};

/**
 * Get CSS background style for a color (supports two-color gradients)
 */
export const getColorBackgroundStyle = (colorName: string, colors?: Array<{ name: string; hex: string; secondary_hex?: string | null }>): React.CSSProperties => {
  const { primary, secondary } = getColorHex(colorName, colors);
  
  if (secondary) {
    // Two-color gradient (diagonal split)
    return {
      background: `linear-gradient(135deg, ${primary} 0%, ${primary} 50%, ${secondary} 50%, ${secondary} 100%)`,
    };
  }
  
  // Single color
  return {
    backgroundColor: primary,
  };
};

