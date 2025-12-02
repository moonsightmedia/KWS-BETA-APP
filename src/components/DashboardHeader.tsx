import { Settings, User, LogOut, HelpCircle, MessageSquare, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { useOnboarding } from '@/components/Onboarding';
import { RoleTabs } from '@/components/RoleTabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Get page title based on current route
const getPageTitle = (pathname: string): string => {
  const today = new Date();
  const titleMap: Record<string, string> = {
    '/': formatDate(today, 'EEEE, dd MMM', { locale: de }),
    '/boulders': 'BOULDER',
    '/sectors': 'SEKTOREN',
    '/setter': 'SETTER',
    '/admin': 'ADMIN',
    '/competition': 'WETTKAMPF',
    '/profile': 'PROFIL',
  };
  return titleMap[pathname] || 'DASHBOARD';
};

export const DashboardHeader = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { openOnboarding } = useOnboarding();
  
  const pageTitle = getPageTitle(location.pathname);
  
  return (
    <>
      <header className="bg-white px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Avatar */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="cursor-pointer focus:outline-none">
                  <Avatar className="w-10 h-10 hover:opacity-80 transition-opacity border border-[#d4e8d4]">
                    <AvatarFallback className="bg-[#e6f2e6] text-[#6cb24a] text-sm font-semibold">
                      {user ? (
                        user.email?.substring(0, 2).toUpperCase() || 'KS'
                      ) : (
                        <HelpCircle className="w-6 h-6" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-card z-50">
                {user ? (
                  <>
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <Settings className="w-5 h-5 mr-2" />
                      Profil Einstellungen
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive">
                      <LogOut className="w-5 h-5 mr-2" />
                      Abmelden
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => navigate('/auth')}>
                    <User className="w-5 h-5 mr-2" />
                    Anmelden
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Center: Page Title */}
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold uppercase tracking-wider text-[#1a1a1a]">
              {pageTitle}
            </h1>
          </div>

          {/* Right: Info and Feedback Buttons */}
          <div className="flex items-center gap-3">
            {/* Info/Onboarding Button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-transparent"
              onClick={openOnboarding}
              aria-label="Hilfe & Informationen"
            >
              <Info className="w-6 h-6 text-[#4a4a4a]" strokeWidth={2} />
            </Button>

            {/* Feedback Button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-transparent"
              onClick={() => setFeedbackOpen(true)}
              aria-label="Feedback senden"
            >
              <MessageSquare className="w-6 h-6 text-[#4a4a4a]" strokeWidth={2} />
            </Button>
          </div>
        </div>
      </header>
      <RoleTabs />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
};
