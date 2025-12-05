import { Settings, User, LogOut, HelpCircle, MessageSquare } from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
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

// Context for Setter tab title
const SetterTabTitleContext = createContext<{ tabTitle?: string }>({});

export const SetterTabTitleProvider = ({ children, tabTitle }: { children: React.ReactNode; tabTitle?: string }) => {
  return (
    <SetterTabTitleContext.Provider value={{ tabTitle }}>
      {children}
    </SetterTabTitleContext.Provider>
  );
};

// Context for Admin tab title
const AdminTabTitleContext = createContext<{ tabTitle?: string }>({});

export const AdminTabTitleProvider = ({ children, tabTitle }: { children: React.ReactNode; tabTitle?: string }) => {
  return (
    <AdminTabTitleContext.Provider value={{ tabTitle }}>
      {children}
    </AdminTabTitleContext.Provider>
  );
};

// Get page title based on current route
const getPageTitle = (pathname: string, setterTabTitle?: string, adminTabTitle?: string): string => {
  // If we're on /setter and have a tab title, use it
  if (pathname === '/setter' && setterTabTitle) {
    return setterTabTitle;
  }
  
  // If we're on /admin and have a tab title, use it
  if (pathname === '/admin' && adminTabTitle) {
    return adminTabTitle;
  }
  
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
  const { tabTitle: setterTabTitle } = useContext(SetterTabTitleContext);
  const { tabTitle: adminTabTitle } = useContext(AdminTabTitleContext);
  
  const pageTitle = getPageTitle(location.pathname, setterTabTitle, adminTabTitle);
  
  return (
    <>
      <div 
        className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto w-full relative bg-white"
        style={{ 
          paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
          minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))'
        }}
      >
        {/* Mobile Avatar (left) */}
        <div className="w-10 flex items-center lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer focus:outline-none">
                <div className="w-8 h-8 rounded bg-[#E7F7E9] flex items-center justify-center text-xs font-semibold text-[#36B531]">
                  {user ? (
                    user.email?.substring(0, 2).toUpperCase() || 'KS'
                  ) : (
                    <HelpCircle className="w-4 h-4" />
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 z-50">
              {user ? (
                <>
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-medium text-[#13112B] truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Settings className="w-4 h-4 mr-2 text-[#13112B]/70" />
                    Profil Einstellungen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-[#E74C3C] data-[highlighted]:bg-red-50 data-[highlighted]:text-[#E74C3C]">
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

        {/* Center Title */}
        <div className="absolute left-1/2 -translate-x-1/2 pt-1 flex items-center gap-3">
          <h1 className="font-heading font-semibold tracking-wide text-2xl text-[#13112B]">
            {pageTitle}
          </h1>
        </div>

        {/* Right Action */}
        <div className="flex items-center justify-end gap-1 lg:gap-4">
          <button 
            className="p-1.5 text-[#13112B]/70 active:scale-95 transition-transform flex-shrink-0"
            onClick={() => openOnboarding()}
            aria-label="Info"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          {user && (
            <div className="flex-shrink-0">
              <NotificationCenter />
            </div>
          )}
          <button 
            className="p-1.5 -mr-1.5 lg:mr-0 text-[#13112B]/70 active:scale-95 transition-transform flex-shrink-0"
            onClick={() => setFeedbackOpen(true)}
            aria-label="Feedback"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
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
