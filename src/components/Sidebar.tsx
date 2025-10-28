import { LayoutDashboard, List, Map, ChevronRight, ChevronLeft, User, LogOut, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarProps {
  className?: string;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: List, label: 'Boulder', path: '/boulders' },
  { icon: Map, label: 'Sektoren', path: '/sectors' },
];

export const Sidebar = ({ className }: SidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex bg-sidebar-bg flex-col py-6 transition-all duration-300 h-screen fixed left-0 top-0 z-50",
        isExpanded ? "w-48 items-start" : "w-20 items-center",
        className
      )}>
        {/* Profile Picture with Dropdown */}
        <div className={cn("mb-6", isExpanded ? "px-4" : "")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer focus:outline-none">
                <Avatar className="w-12 h-12 hover:opacity-80 transition-opacity">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user ? (
                      user.email?.substring(0, 2).toUpperCase() || 'KS'
                    ) : (
                      <HelpCircle className="w-6 h-6" />
                    )}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-card">
              {user ? (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Profil Einstellungen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Abmelden
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => navigate('/auth')}>
                  <User className="w-4 h-4 mr-2" />
                  Anmelden
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={300}>
          <nav className="flex-1 flex flex-col gap-4 w-full">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    {isExpanded ? (
                      <NavLink
                        to={item.path}
                        className={cn(
                          "flex flex-row items-center gap-3 px-6 py-3 mx-4 rounded-xl transition-all duration-300",
                          isActive
                            ? "bg-sidebar-bg text-success"
                            : "bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80"
                        )}
                      >
                        <div className="grid place-items-center w-8 h-8 flex-shrink-0">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                      </NavLink>
                    ) : (
                      <NavLink
                        to={item.path}
                        className={cn(
                          "grid place-items-center w-12 h-12 mx-auto rounded-xl transition-all duration-300",
                          isActive
                            ? "bg-sidebar-bg text-success"
                            : "bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                      </NavLink>
                    )}
                  </TooltipTrigger>
                  {!isExpanded && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        </TooltipProvider>

        {/* Toggle Button */}
        <div className="w-full">
          {isExpanded ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex flex-row items-center gap-3 px-6 py-3 mx-4 rounded-xl bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80 transition-all duration-300"
            >
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Einklappen</span>
            </button>
          ) : (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="grid place-items-center w-12 h-12 mx-auto rounded-xl bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80 transition-all duration-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
        <div className="flex items-center justify-around px-4 py-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-300",
                  isActive ? "text-success" : "text-sidebar-icon"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};
