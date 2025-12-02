import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

export type EmptyStateProps = {
  className?: string;
  iconClassName?: string;
  title?: string;
  actionLabel?: string;
  onActionClick?: () => void;
};

// Visual Empty State used in SystemView (border-dashed card)
export function EmptyState({
  className,
  iconClassName,
  title = 'Keine Daten vorhanden',
  actionLabel,
  onActionClick,
}: EmptyStateProps) {
  return (
    <div className={cn('border-2 border-dashed border-[#E7F7E9] rounded-2xl p-8 flex flex-col items-center justify-center text-center', className)}>
      <div className="w-12 h-12 bg-[#F9FAF9] rounded-full flex items-center justify-center mb-3">
        <Inbox className={cn('w-6 h-6 text-[#13112B]/30', iconClassName)} strokeWidth={1.5} />
      </div>
      <span className="text-sm font-medium text-[#13112B]/60">{title}</span>
      {actionLabel && (
        <button onClick={onActionClick} className="mt-3 text-xs text-[#36B531] font-bold uppercase hover:underline">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
