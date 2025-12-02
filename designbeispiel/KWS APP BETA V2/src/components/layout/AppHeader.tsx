import { Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getRouteMeta } from '../../lib/routes';

export function AppHeader() {
  const { pathname } = useLocation();
  const meta = getRouteMeta(pathname);

  return (
    <div className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto w-full relative">
      {/* Mobile Avatar (left) */}
      <div className="w-10 flex items-center lg:hidden">
        <div className="w-8 h-8 rounded-full bg-[#E7F7E9] flex items-center justify-center text-xs font-semibold text-[#36B531]">JD</div>
      </div>

      {/* Center Title */}
      <div className="absolute left-1/2 -translate-x-1/2 pt-1 flex items-center gap-3">
        <h1 className="font-heading font-semibold tracking-wide text-2xl text-[#13112B]">
          {meta?.title ?? 'DESIGN KIT'}
        </h1>
      </div>

      {/* Right Action */}
      <div className="flex items-center justify-end w-10 lg:w-auto gap-4">
        <button className="p-2 -mr-2 text-[#13112B]/70 active:scale-95 transition-transform"><Bell className="w-6 h-6" /></button>
        <div className="hidden lg:flex items-center gap-2">
          <span className="w-2 h-2 bg-[#36B531] rounded-full animate-pulse"></span>
          <span className="text-[10px] font-mono text-[#13112B]/50">LIVE</span>
        </div>
      </div>
    </div>
  );
}
