import { Link, useLocation } from 'react-router-dom';
import { getGroupFromPath, getDefaultPathForGroup } from '../../lib/routes';
import { cn } from '../../lib/utils';

export function ContextSwitcher() {
  const { pathname } = useLocation();
  const activeGroup = getGroupFromPath(pathname);

  const tabs = [
    { key: 'user' as const, label: 'User' },
    { key: 'setter' as const, label: 'Setter' },
    { key: 'admin' as const, label: 'Admin' },
  ];

  return (
    <div className="lg:hidden border-b border-[#E7F7E9] bg-white/50 backdrop-blur-sm">
      <div className="px-4 py-2 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex bg-[#F9FAF9] p-1 rounded-xl w-full max-w-md mx-auto lg:mx-0 border border-[#E7F7E9]">
          {tabs.map((t) => {
            const to = getDefaultPathForGroup(t.key);
            const isActive = activeGroup === t.key;
            return (
              <Link
                key={t.key}
                to={to}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-xs font-semibold active:scale-95 transition-all focus:outline-none touch-manipulation text-center',
                  isActive ? 'bg-[#36B531] text-white shadow-sm' : 'text-[#13112B]/60 hover:text-[#13112B]'
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
