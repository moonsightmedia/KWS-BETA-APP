import { cn } from '@/lib/utils';
import { Wrench } from 'lucide-react';

interface MaterialIconProps {
  name: string;
  className?: string;
  size?: number | string;
}

// Icons that don't exist in Material Symbols - use Lucide React fallback
const FALLBACK_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  'build': Wrench,
  'wrench': Wrench,
  'tool': Wrench,
};

export const MaterialIcon = ({ name, className, size = 28 }: MaterialIconProps) => {
  const lowerName = name.toLowerCase();
  
  // Use Lucide React icon as fallback for icons that don't exist in Material Symbols
  if (FALLBACK_ICONS[lowerName]) {
    const IconComponent = FALLBACK_ICONS[lowerName];
    const iconSize = typeof size === 'number' ? size : (typeof size === 'string' ? parseInt(size) || 28 : 28);
    return <IconComponent className={cn(className)} size={iconSize} />;
  }
  
  // Use Material Symbols for all other icons
  return (
    <span 
      className={cn('material-symbols-outlined', className)}
      style={{ 
        fontSize: typeof size === 'number' ? `${size}px` : size,
        display: 'inline-block',
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        lineHeight: 1,
        textAlign: 'center',
        fontFamily: "'Material Symbols Outlined'",
        fontFeatureSettings: "'liga'",
        WebkitFontSmoothing: 'antialiased',
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
};

