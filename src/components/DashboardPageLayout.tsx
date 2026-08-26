import type { ReactNode } from 'react';

import { DashboardHeader } from '@/components/DashboardHeader';
import { useSidebar } from '@/components/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export const DashboardPageLayout = ({
  children,
  rightSlot,
  mainClassName,
  headerBackTo,
  headerBackLabel,
}: {
  children: ReactNode;
  rightSlot?: ReactNode;
  mainClassName?: string;
  headerBackTo?: string;
  headerBackLabel?: string;
}) => {
  const { isExpanded } = useSidebar();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#F9FAF9]">
      <div
        className={cn(
          'mb-20 flex min-w-0 flex-1 flex-col bg-[#F9FAF9] md:mb-0',
          user && (isExpanded ? 'md:ml-64' : 'md:ml-20'),
        )}
      >
        <DashboardHeader rightSlot={rightSlot} backTo={headerBackTo} backLabel={headerBackLabel} />
        <main
          className={cn(
            'mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-6',
            mainClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
