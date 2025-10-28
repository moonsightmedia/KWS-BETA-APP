import { LayoutDashboard, List, Map, RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NavLink } from 'react-router-dom';
import { useState } from 'react';

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

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex bg-sidebar-bg flex-col items-center py-6 gap-6 transition-all duration-300 h-screen fixed left-0 top-0",
        isExpanded ? "w-48" : "w-20",
        className
      )}>
        {/* Profile Picture */}
        <div className="relative">
          <Avatar className="w-12 h-12 mb-2">
            <AvatarFallback className="bg-primary text-primary-foreground">KS</AvatarFallback>
          </Avatar>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={300}>
          <nav className="flex-1 flex flex-col gap-4 w-full px-4">
            {navItems.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 rounded-xl transition-all duration-300",
                      isExpanded ? "px-4 py-3" : "w-12 h-12 justify-center",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg" 
                        : "bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80"
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
                  </NavLink>
                </TooltipTrigger>
                {!isExpanded && (
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </nav>
        </TooltipProvider>

        {/* Refresh Button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={cn(
                "rounded-xl bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80 flex items-center gap-3 transition-all duration-300",
                isExpanded ? "px-4 py-3 w-full mx-4" : "w-12 h-12 justify-center"
              )}>
                <RefreshCw className="w-5 h-5 flex-shrink-0" />
                {isExpanded && <span className="text-sm font-medium">Aktualisieren</span>}
              </button>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent side="right">
                <p>Aktualisieren</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "rounded-xl bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80 flex items-center gap-3 transition-all duration-300",
            isExpanded ? "px-4 py-3 w-full mx-4" : "w-12 h-12 justify-center"
          )}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span className="text-sm font-medium">Einklappen</span>}
            </>
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
        <div className="flex items-center justify-around px-4 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground" 
                  : "text-sidebar-icon"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};
