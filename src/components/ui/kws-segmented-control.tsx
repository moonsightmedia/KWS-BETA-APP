import { cn } from '@/lib/utils';

type KwsSegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type KwsSegmentedControlProps<T extends string> = {
  value: T;
  options: readonly KwsSegmentedOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
};

export function KwsSegmentedControl<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
}: KwsSegmentedControlProps<T>) {
  return (
    <div
      className={cn('flex gap-1 rounded-kws-card bg-secondary p-1', className)}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'min-h-9 flex-1 rounded-kws-control px-3 py-2 text-sm font-semibold transition-[background-color,color,box-shadow,transform] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:bg-white/55 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
