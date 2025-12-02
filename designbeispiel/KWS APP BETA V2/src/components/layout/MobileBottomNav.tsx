import { Link, useLocation } from 'react-router-dom';
import { adminNav, getGroupFromPath, setterNav, userNav } from '../../lib/routes';
import { cn } from '../../lib/utils';

function MobileItem({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className="mobile-nav-item flex flex-col items-center justify-center w-full h-full group active:scale-90 transition-transform touch-manipulation"
    >
      <div className={cn('icon-container transition-colors', active ? 'text-white' : 'text-white/70 group-hover:text-white')}>
        <Icon className="w-6 h-6" />
      </div>
      <span className={cn('text-[10px] font-medium tracking-tight mt-1 transition-colors', active ? 'text-white' : 'text-white/80')}>{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const group = getGroupFromPath(pathname);

  const renderGroup = (items: typeof userNav) => (
    <div className="flex w-full justify-around items-center h-16">
      {items.map((r) => (
        <MobileItem key={r.path} to={r.path} icon={r.icon} label={
            r.title === 'DASHBOARD' ? 'Dash' :
            r.title === 'BOULDER LISTE' ? 'Boulder' :
            r.title === 'SEKTOREN' ? 'Sektoren' :
            r.title === 'BEARBEITEN' ? 'Edit' :
            r.title === 'ROUTENPLANUNG' ? 'Plan' :
            r.title === 'EINSTELLUNGEN' ? 'Set' :
            r.title === 'BENUTZER' ? 'User' :
            r.title === 'DESIGN KIT' ? 'Sys' : r.title
          } active={pathname === r.path} />
      ))}
    </div>
  );

  return (
    <nav className="fixed bottom-6 inset-x-4 lg:hidden z-50 pb-safe">
      <div className="bg-[#13112B] backdrop-blur-xl text-white rounded-2xl shadow-2xl shadow-black/20 px-2 border border-white/10 h-[4.5rem]">
        {group === 'user' && renderGroup(userNav)}
        {group === 'setter' && renderGroup(setterNav)}
        {group === 'admin' && renderGroup(adminNav)}
      </div>
    </nav>
  );
}
