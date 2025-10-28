import { LayoutDashboard, List, Map, ChevronRight, ChevronLeft } from 'lucide-react';
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
        "hidden md:flex bg-sidebar-bg flex-col py-6 transition-all duration-300 h-screen fixed left-0 top-0 z-50",
        isExpanded ? "w-48 items-start" : "w-20 items-center",
        className
      )}>
        {/* Profile Picture */}
        <div className={cn("mb-6", isExpanded ? "px-4" : "")}>
          <Avatar className="w-12 h-12">
            <AvatarFallback className="bg-primary text-primary-foreground">KS</AvatarFallback>
          </Avatar>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={300}>
          <nav className="flex-1 flex flex-col gap-4 w-full">
            {navItems.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  {isExpanded ? (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => cn(
                        "flex flex-row items-center gap-3 px-6 py-3 mx-4 rounded-xl transition-all duration-300",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg" 
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
                      className={({ isActive }) => cn(
                        "grid place-items-center w-12 h-12 mx-auto rounded-xl transition-all duration-300",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg" 
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
            ))}
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
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};
