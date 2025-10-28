import { Clock, FileText, Grid3x3, Users, Presentation, MessageCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

const navItems = [
  { icon: Clock, label: 'Dashboard' },
  { icon: FileText, label: 'Dokumente' },
  { icon: Grid3x3, label: 'Boulder' },
  { icon: Users, label: 'Benutzer' },
  { icon: Presentation, label: 'Statistiken' },
  { icon: MessageCircle, label: 'Feedback' },
];

export const Sidebar = ({ className }: SidebarProps) => {
  return (
    <aside className={cn("w-20 bg-sidebar-bg flex flex-col items-center py-6 gap-6", className)}>
      {/* Logo */}
      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2">
        <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg" />
      </div>

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
