import { Outlet, useLocation } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { AppHeader } from './AppHeader';
import { ContextSwitcher } from './ContextSwitcher';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileFilterBar } from '../filters/MobileFilterBar';

export function AppLayout() {
  // just used to trigger rerenders on location change where needed
  useLocation();

  return (
    <div className="flex">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Main Content Wrapper */}
      <div className="flex flex-col h-screen lg:pl-64 transition-all duration-300 w-full">
        {/* Header */}
        <header className="shrink-0 sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7F7E9]">
          <AppHeader />
          <ContextSwitcher />
        </header>

        {/* Main View Port */}
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 lg:p-8 pb-32 lg:pb-8 max-w-7xl mx-auto w-full no-scrollbar relative">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileFilterBar />
      <MobileBottomNav />
    </div>
  );
}
