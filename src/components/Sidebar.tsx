import { LayoutDashboard, List, Map, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SidebarProps {
  className?: string;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: List, label: 'Boulder' },
  { icon: Map, label: 'Sektoren' },
];

export const Sidebar = ({ className }: SidebarProps) => {
  return (
    <aside className={cn("w-20 bg-sidebar-bg flex flex-col items-center py-6 gap-6", className)}>
      {/* Profile Picture */}
      <Avatar className="w-12 h-12 mb-2">
        <AvatarFallback className="bg-primary text-primary-foreground">KS</AvatarFallback>
      </Avatar>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-4">
        {navItems.map((item, index) => (
          <button
            key={item.label}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
              index === 0 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80"
            )}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </nav>

      {/* Refresh Button */}
      <button className="w-12 h-12 rounded-xl bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80 flex items-center justify-center transition-all duration-300">
        <RefreshCw className="w-5 h-5" />
      </button>
    </aside>
  );
};
