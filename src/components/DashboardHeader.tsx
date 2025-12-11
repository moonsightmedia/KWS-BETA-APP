import { Settings, User, LogOut, HelpCircle, MessageSquare, RefreshCw, Bell } from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { useOnboarding } from '@/components/Onboarding';
import { RoleTabs } from '@/components/RoleTabs';
import { useQueryClient } from '@tanstack/react-query';
import { refreshAllData } from '@/utils/cacheUtils';
import { toast } from 'sonner';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { sendPushNotification } from '@/services/pushNotifications';
import { Capacitor } from '@capacitor/core';
import { useNotifications } from '@/hooks/useNotifications';
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
    // '/competition': 'WETTKAMPF', // Temporarily hidden
    '/profile': 'PROFIL',
  };
  return titleMap[pathname] || 'DASHBOARD';
};

export const DashboardHeader = () => {
  const location = useLocation();
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const { openOnboarding } = useOnboarding();
  const { tabTitle: setterTabTitle } = useContext(SetterTabTitleContext);
  const { tabTitle: adminTabTitle } = useContext(AdminTabTitleContext);
  const queryClient = useQueryClient();
  const { isAdmin } = useIsAdmin();
  
  // CRITICAL: Use useNotifications here to ensure Realtime subscription is always active
  // This ensures push notifications are sent when new notifications are created
  // even if the NotificationCenter popover is not open
  useNotifications();
  
  const pageTitle = getPageTitle(location.pathname, setterTabTitle, adminTabTitle);
  
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshAllData(queryClient);
      toast.success('Daten aktualisiert');
    } catch (error) {
      console.error('[DashboardHeader] Refresh error:', error);
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSendTestPush = async () => {
    if (!user || isSendingTest) return;
    
    setIsSendingTest(true);
    try {
      console.log('[DashboardHeader] 🚀 Starting test push notification...');
      // Sendet Push-Benachrichtigung über FCM an alle registrierten Geräte (Handys)
      // Funktioniert sowohl vom Browser als auch von nativen Apps
      await sendPushNotification(user.id, {
        title: 'Test-Benachrichtigung',
        body: 'Dies ist eine Test-Push-Benachrichtigung vom Dashboard',
        data: {
          test: true,
          timestamp: new Date().toISOString(),
        },
        action_url: '/',
      }, session);
      console.log('[DashboardHeader] ✅ Test push notification sent successfully');
      
      // Note: Invalid tokens are automatically deleted by sendPushNotification
      // If no error was thrown, the notification was sent (even if some tokens were invalid)
      toast.success('Test-Benachrichtigung gesendet!', {
        description: 'Die Benachrichtigung wurde an alle registrierten Geräte (Handys) gesendet. Ungültige Tokens wurden automatisch gelöscht.',
      });
    } catch (error: any) {
      console.error('[DashboardHeader] ❌ Test push error:', error);
      console.error('[DashboardHeader] ❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      
      const errorMessage = error?.message || '';
      if (errorMessage.includes('UNREGISTERED') || errorMessage.includes('INVALID_ARGUMENT')) {
        toast.warning('Ungültiges Token', {
          description: 'Das Token wurde automatisch gelöscht. Bitte öffne die App auf dem Handy und aktiviere Push-Benachrichtigungen erneut.',
        });
      } else {
        toast.error('Fehler beim Senden', {
          description: error?.message || 'Unbekannter Fehler. Bitte Console-Logs prüfen.',
        });
      }
    } finally {
      setIsSendingTest(false);
    }
  };
  
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
          {/* Test Push Button - only visible for admins, sends to registered devices (phones) */}
          {isAdmin && (
            <button 
              className="p-1.5 text-[#13112B]/70 active:scale-95 transition-transform flex-shrink-0"
              onClick={handleSendTestPush}
              disabled={isSendingTest}
              aria-label="Test-Push senden"
              title="Test-Push-Benachrichtigung an registrierte Geräte (Handys) senden"
            >
              <Bell className={`w-5 h-5 ${isSendingTest ? 'animate-pulse' : ''}`} />
            </button>
          )}
          {/* Refresh button - only visible on desktop (mobile has pull-to-refresh) */}
          <button 
            className="hidden lg:flex p-1.5 text-[#13112B]/70 active:scale-95 transition-transform flex-shrink-0"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Aktualisieren"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
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
