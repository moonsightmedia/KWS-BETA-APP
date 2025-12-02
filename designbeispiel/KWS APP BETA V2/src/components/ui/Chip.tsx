import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export type FilterChipProps = {
  children: React.ReactNode;
  activeDark?: boolean; // dark active variant used for "Alle"
  withChevron?: boolean;
  className?: string;
  onClick?: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
};

export function FilterChip({ children, activeDark, withChevron, className, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1',
        activeDark
          ? 'bg-[#13112B] text-white'
          : 'bg-white border border-[#E7F7E9] text-[#13112B]/70 hover:border-[#36B531]',
        className
      )}
    >
      {children}
      {withChevron && <ChevronDown className="w-3 h-3" strokeWidth={1.5} />}
    </button>
  );
}

export default FilterChip;
