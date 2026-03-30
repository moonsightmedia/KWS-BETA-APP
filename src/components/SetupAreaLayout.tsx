import type { ReactNode } from 'react';

import { useSidebar } from '@/components/SidebarContext';
import { cn } from '@/lib/utils';

export const SetupAreaLayout = ({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) => {
  const { isExpanded } = useSidebar();

  return (
    <div className={cn('flex min-h-screen bg-[#F9FAF9]', className)}>
      <div
        className={cn(
          'flex min-h-screen flex-1 flex-col bg-[#F9FAF9] pb-28 md:pb-0',
          isExpanded ? 'md:ml-64' : 'md:ml-20',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};
