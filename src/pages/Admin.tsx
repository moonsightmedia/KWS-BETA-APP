import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardHeader, AdminTabTitleProvider } from "@/components/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";
import { UserManagement } from "@/components/admin/UserManagement";
import { ColorManagement } from "@/components/admin/ColorManagement";
import { SectorManagement } from "@/components/admin/SectorManagement";
import { BoulderOperationLogs } from "@/components/admin/BoulderOperationLogs";
import { CompetitionBoulderManagement } from "@/components/competition/CompetitionBoulderManagement";
import { FeedbackManagement } from "@/components/admin/FeedbackManagement";
import { PushNotificationTest } from "@/components/admin/PushNotificationTest";

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  // Timeout for admin loading - if it takes too long, show error or fallback
  useEffect(() => {
    if (!loading) return;

    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('[Admin] Admin check loading timeout - taking too long');
        // Don't set loading to false here - let the hook handle it
        // But log for debugging
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Map tab to title
  const getTabTitle = (tab: string): string => {
    const titleMap: Record<string, string> = {
      'users': 'BENUTZER',
      'settings': 'EINSTELLUNGEN',
      // 'competition': 'WETTKAMPF', // Temporarily hidden
      'feedback': 'FEEDBACK',
      'logs': 'LOGS',
      'tests': 'TESTS',
    };
    return titleMap[tab] || 'ADMIN';
  };

  const currentTab = searchParams.get('tab') || 'users';
  const tabTitle = getTabTitle(currentTab);

  if (loading) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9] overflow-x-hidden">
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0 overflow-x-hidden w-full min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8 w-full min-w-0 overflow-x-hidden">
            <Skeleton className="h-12 w-64 mb-8" />
            <Skeleton className="h-96 w-full" />
          </main>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminTabTitleProvider tabTitle={tabTitle}>
      <div className="min-h-screen flex bg-[#F9FAF9] overflow-x-hidden">
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0 overflow-x-hidden w-full min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8 w-full min-w-0 overflow-x-hidden">

          <Tabs 
            value={searchParams.get('tab') || 'users'} 
            onValueChange={(value) => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.set('tab', value);
              setSearchParams(newSearchParams, { replace: true });
            }}
            className="w-full min-w-0 hidden md:block"
          >
            <TabsList className="grid w-full grid-cols-6 mb-6 h-auto min-w-0 bg-[#F9FAF9] p-1 rounded-xl">
              <TabsTrigger value="users" className="text-xs sm:text-sm min-w-0 h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Benutzer</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm min-w-0 h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Einstellungen</TabsTrigger>
              {/* <TabsTrigger value="competition" className="text-xs sm:text-sm min-w-0 h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Wettkampf</TabsTrigger> */}
              <TabsTrigger value="feedback" className="text-xs sm:text-sm min-w-0 h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Feedback</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs sm:text-sm min-w-0 h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Logs</TabsTrigger>
              <TabsTrigger value="tests" className="text-xs sm:text-sm min-w-0 h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Tests</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-0">
              <UserManagement />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <Tabs 
                value={searchParams.get('settingsTab') || 'sectors'} 
                onValueChange={(value) => {
                  const newSearchParams = new URLSearchParams(searchParams);
                  newSearchParams.set('settingsTab', value);
                  setSearchParams(newSearchParams, { replace: true });
                }}
                className="w-full min-w-0"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6 h-auto min-w-0 bg-[#F9FAF9] p-1 rounded-xl">
                  <TabsTrigger value="sectors" className="text-xs sm:text-sm min-w-0 h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Sektoren</TabsTrigger>
                  <TabsTrigger value="colors" className="text-xs sm:text-sm min-w-0 h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Farben</TabsTrigger>
                </TabsList>
                <TabsContent value="sectors" className="mt-0">
                  <SectorManagement />
                </TabsContent>
                <TabsContent value="colors" className="mt-0">
                  <ColorManagement />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Temporarily hidden */}
            {false && (
              <TabsContent value="competition" className="mt-0">
                <CompetitionBoulderManagement />
              </TabsContent>
            )}

            <TabsContent value="feedback" className="mt-0">
              <FeedbackManagement />
            </TabsContent>

            <TabsContent value="logs" className="mt-0">
              <BoulderOperationLogs />
            </TabsContent>

            <TabsContent value="tests" className="mt-0">
              <div className="space-y-6">
                <PushNotificationTest />
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Mobile: Show content based on URL param without tabs */}
          <div className="md:hidden">
            {(!searchParams.get('tab') || searchParams.get('tab') === 'users') && (
              <div className="mt-0">
                <UserManagement />
              </div>
            )}
            {searchParams.get('tab') === 'settings' && (
              <div className="mt-0">
                <Tabs 
                  value={searchParams.get('settingsTab') || 'sectors'} 
                  onValueChange={(value) => {
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.set('settingsTab', value);
                    setSearchParams(newSearchParams, { replace: true });
                  }}
                  className="w-full min-w-0"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-6 h-auto min-w-0 bg-[#F9FAF9] p-1 rounded-xl">
                    <TabsTrigger value="sectors" className="text-xs sm:text-sm min-w-0 h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Sektoren</TabsTrigger>
                    <TabsTrigger value="colors" className="text-xs sm:text-sm min-w-0 h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Farben</TabsTrigger>
                  </TabsList>
                  <TabsContent value="sectors" className="mt-0">
                    <SectorManagement />
                  </TabsContent>
                  <TabsContent value="colors" className="mt-0">
                    <ColorManagement />
                  </TabsContent>
                </Tabs>
              </div>
            )}
            {/* Temporarily hidden */}
            {false && searchParams.get('tab') === 'competition' && (
              <div className="mt-0">
                <CompetitionBoulderManagement />
              </div>
            )}
            {searchParams.get('tab') === 'feedback' && (
              <div className="mt-0">
                <FeedbackManagement />
              </div>
            )}
            {searchParams.get('tab') === 'logs' && (
              <div className="mt-0">
                <BoulderOperationLogs />
              </div>
            )}
            {searchParams.get('tab') === 'tests' && (
              <div className="mt-0">
                <PushNotificationTest />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </AdminTabTitleProvider>
  );
};

export default Admin;
