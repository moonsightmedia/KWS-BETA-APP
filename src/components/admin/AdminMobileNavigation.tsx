import { useEffect, useState } from 'react';
import { Activity, Bell, Check, FileText, Map, MessageSquare } from 'lucide-react';
import { UsersIcon as Users } from '@/lib/appIcons';
import { Link, useLocation } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { kwsPopoverClassName } from '@/components/ui/kws-surface';
import { ADMIN_TABS, OPERATIONS_TABS, adminTabPath, resolveAdminTab } from '@/lib/adminNavigation';
import { cn } from '@/lib/utils';

const icons = { users: Users, settings: Map, feedback: MessageSquare, monitoring: Activity, logs: FileText, tests: Bell };

export function AdminMobileNavigation({ compact = false }: { compact?: boolean }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  const current = resolveAdminTab(new URLSearchParams(location.search).get('tab'));
  const inOperations = OPERATIONS_TABS.some(tab => tab.value === current);
  const itemClass = 'group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-kws-control px-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
  const content = (Icon: typeof Users, label: string, active: boolean) => <>
    <span aria-hidden="true" className={cn('grid h-10 w-10 place-items-center rounded-kws-control transition-colors motion-reduce:transition-none', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground group-hover:bg-secondary')}><Icon className="h-5 w-5" /></span>
    {!compact && <span className={cn('text-[11px] font-semibold leading-4', active ? 'text-primary-ink' : 'text-muted-foreground')}>{label}</span>}
  </>;
  return <nav aria-label="Adminnavigation" data-compact={compact} className={cn('fixed left-1/2 z-[110] flex w-[calc(100%-2.5rem)] max-w-[440px] -translate-x-1/2 items-stretch rounded-kws-card bg-card px-1.5 shadow-medium md:hidden', compact ? 'h-14' : 'h-[68px]')} style={{ bottom: 'calc(var(--app-safe-area-bottom) + 12px)' }}>
    {ADMIN_TABS.slice(0, 3).map(tab => <Link key={tab.value} to={adminTabPath(tab.value)} aria-label={tab.label} aria-current={current === tab.value ? 'page' : undefined} className={itemClass}>{content(icons[tab.value], tab.label, current === tab.value)}</Link>)}
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild><button type="button" aria-label={inOperations ? `Betrieb: ${ADMIN_TABS.find(tab => tab.value === current)?.label}` : 'Betrieb'} className={itemClass}>{content(Activity, 'Betrieb', inOperations)}</button></DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" sideOffset={12} collisionPadding={16} className={cn(kwsPopoverClassName, 'z-[120] w-60 max-w-[calc(100vw-2rem)] p-2')}>
        <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground">Betrieb und Diagnose</DropdownMenuLabel>
        {OPERATIONS_TABS.map(tab => {
          const Icon = icons[tab.value];
          return <DropdownMenuItem key={tab.value} asChild className={cn('min-h-11 rounded-kws-badge text-sm text-foreground data-[highlighted]:bg-secondary data-[highlighted]:text-foreground', current === tab.value && 'bg-primary/10')}><Link to={adminTabPath(tab.value)} aria-current={current === tab.value ? 'page' : undefined}><Icon className="mr-3 h-4 w-4" aria-hidden="true" />{tab.label}{current === tab.value && <Check className="ml-auto h-4 w-4" aria-hidden="true" />}</Link></DropdownMenuItem>;
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  </nav>;
}
