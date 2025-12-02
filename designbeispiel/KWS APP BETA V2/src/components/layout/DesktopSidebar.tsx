import { NavLink, useLocation } from 'react-router-dom';
import { adminNav, setterNav, userNav } from '../../lib/routes';
import { cn } from '../../lib/utils';

function Item({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<any>; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) =>
      cn(
        'w-full flex items-center gap-3 px-2 py-2 text-sm rounded-md transition-colors',
        isActive
          ? 'font-medium text-[#36B531] bg-[#E7F7E9]'
          : 'text-[#13112B]/70 hover:text-[#36B531] hover:bg-[#F9FAF9]'
      )
    }>
      <Icon className="w-4 h-4" strokeWidth={1.5} />
      {label}
    </NavLink>
  );
}

export function DesktopSidebar() {
  const location = useLocation();
  // force rerender on path change (NavLink already handles active)
  void location;

  return (
    <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 border-r border-[#E7F7E9] bg-white z-50 transition-all duration-300">
      <div className="h-16 flex items-center px-6 border-b border-[#E7F7E9]">
        <div className="font-heading font-semibold tracking-wide text-3xl text-[#36B531]">APP</div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
        {/* Group: User */}
        <div>
          <h3 className="font-heading text-xl font-medium text-[#13112B]/40 uppercase tracking-wide mb-2 px-2">User Area</h3>
          <ul className="space-y-1">
            {userNav.map((r) => (
              <li key={r.path}><Item to={r.path} icon={r.icon} label={r.title === 'BOULDER LISTE' ? 'Boulder' : r.title === 'DASHBOARD' ? 'Dashboard' : 'Sektoren'} /></li>
            ))}
          </ul>
        </div>

        {/* Group: Setter */}
        <div>
          <h3 className="font-heading text-xl font-medium text-[#13112B]/40 uppercase tracking-wide mb-2 px-2">Setter Area</h3>
          <ul className="space-y-1">
            {setterNav.map((r) => (
              <li key={r.path}><Item to={r.path} icon={r.icon} label={r.title === 'UPLOAD' ? 'Upload' : r.title === 'ROUTENPLANUNG' ? 'Planung' : 'Bearbeiten'} /></li>
            ))}
          </ul>
        </div>

        {/* Group: Admin */}
        <div>
          <h3 className="font-heading text-xl font-medium text-[#13112B]/40 uppercase tracking-wide mb-2 px-2">Admin Area</h3>
          <ul className="space-y-1">
            {adminNav.map((r) => (
              <li key={r.path}><Item to={r.path} icon={r.icon} label={r.title === 'EINSTELLUNGEN' ? 'Einstellungen' : r.title === 'BENUTZER' ? 'Benutzer' : 'System'} /></li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="p-4 border-t border-[#E7F7E9]">
        <button className="flex items-center gap-3 w-full hover:bg-[#F9FAF9] p-2 rounded-md transition-colors text-left group">
          <div className="w-8 h-8 rounded-full bg-[#E7F7E9] flex items-center justify-center text-xs font-semibold text-[#36B531] ring-1 ring-[#36B531]/20">JD</div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[#13112B] group-hover:text-[#36B531] transition-colors">John Doe</span>
            <span className="text-[10px] text-[#13112B]/50">Admin</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
