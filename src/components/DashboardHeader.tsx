import { Settings, User, LogOut, HelpCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
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
  const titleMap: Record<string, string> = {
    '/': 'DASHBOARD',
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
      <div className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto w-full relative">
        {/* Mobile Avatar (left) */}
        <div className="w-10 flex items-center lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer focus:outline-none">
                <div className="w-8 h-8 rounded-full bg-[#E7F7E9] flex items-center justify-center text-xs font-semibold text-[#36B531]">
                  {user ? (
                    user.email?.substring(0, 2).toUpperCase() || 'KS'
                  ) : (
                    <HelpCircle className="w-4 h-4" />
                  )}
                </div>
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

        {/* Center Title */}
        <div className="absolute left-1/2 -translate-x-1/2 pt-1 flex items-center gap-3">
          <h1 className="font-heading font-semibold tracking-wide text-2xl text-[#13112B]">
            {pageTitle}
          </h1>
        </div>

        {/* Right Action */}
        <div className="flex items-center justify-end gap-2 lg:gap-4">
          <button 
            className="p-2 text-[#13112B]/70 active:scale-95 transition-transform"
            onClick={() => openOnboarding()}
            aria-label="Info"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <button 
            className="p-2 -mr-2 lg:mr-0 text-[#13112B]/70 active:scale-95 transition-transform"
            onClick={() => setFeedbackOpen(true)}
            aria-label="Feedback"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
          <div className="hidden lg:flex items-center gap-2">
            <span className="w-2 h-2 bg-[#36B531] rounded-full animate-pulse"></span>
            <span className="text-[10px] font-mono text-[#13112B]/50">LIVE</span>
          </div>
        </div>
      </div>
      <RoleTabs />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
};
