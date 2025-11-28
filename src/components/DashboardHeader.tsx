import { Settings, User, LogOut, HelpCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const DashboardHeader = () => {
  const today = new Date();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  return (
    <header className="bg-muted/30 border-b border-border px-4 md:px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Center: Date */}
        <div className="text-sm font-medium text-primary">
          {formatDate(today, 'EEEE, dd MMM', { locale: de })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-4">

          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hidden md:flex"
            onClick={() => navigate('/profile')}
          >
            <Settings className="w-5 h-5" />
          </Button>

          {/* Profile Dropdown - Mobile only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer focus:outline-none md:hidden">
                <Avatar className="w-9 h-9 hover:opacity-80 transition-opacity">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user ? (
                      user.email?.substring(0, 2).toUpperCase() || 'KS'
                    ) : (
                      <HelpCircle className="w-5 h-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card z-50">
              {user ? (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{user.email}</p>
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
      </div>
    </header>
  );
};
