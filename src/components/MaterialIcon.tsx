import { cn } from '@/lib/utils';

interface MaterialIconProps {
  name: string;
  className?: string;
  size?: number | string;
}

export const MaterialIcon = ({ name, className, size = 24 }: MaterialIconProps) => {
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
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
};

