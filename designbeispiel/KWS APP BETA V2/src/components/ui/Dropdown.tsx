import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type DropdownMockProps = {
  label?: string;
  className?: string;
};

// Visual-only dropdown mock matching generated-page.html
export function DropdownMock({ label = 'Option Wählen', className }: DropdownMockProps) {
  return (
    <div className={cn('w-full bg-white border border-[#E7F7E9] rounded-xl p-3 flex justify-between items-center cursor-pointer shadow-sm', className)}>
      <span className="text-sm">{label}</span>
      <ChevronDown className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
    </div>
  );
}

export default DropdownMock;
