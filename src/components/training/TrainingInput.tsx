import * as React from 'react';
import { cn } from '@/lib/utils';

/** Training fields use one focus border; no outer ring or ring offset. */
const TrainingInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-kws-control border border-input bg-background px-3 py-2 font-sans text-base text-foreground transition-colors placeholder:text-muted-foreground [outline:none] focus:border-primary-ink focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground md:text-sm',
        className,
      )}
      {...props}
    />
  ),
);
TrainingInput.displayName = 'TrainingInput';

export { TrainingInput };
export default TrainingInput;
