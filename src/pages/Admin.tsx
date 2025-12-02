import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardHeader } from "@/components/DashboardHeader";
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

  if (loading) {
    return (
      <div className="min-h-screen flex bg-background overflow-x-hidden">
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
    <div className="min-h-screen flex bg-background overflow-x-hidden">
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0 overflow-x-hidden w-full min-w-0">
        <DashboardHeader />
        
        <main className="flex-1 p-4 md:p-8 w-full min-w-0 overflow-x-hidden">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-teko tracking-wide">Admin Panel</h1>
            </div>
            <p className="text-muted-foreground">Verwalte Benutzer, Farben und Sektoren</p>
          </div>

          <Tabs 
            value={searchParams.get('tab') || 'users'} 
            onValueChange={(value) => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.set('tab', value);
              setSearchParams(newSearchParams, { replace: true });
            }}
            className="w-full min-w-0 hidden md:block"
          >
            <TabsList className="grid w-full grid-cols-5 mb-6 h-auto min-w-0">
              <TabsTrigger value="users" className="text-xs sm:text-sm min-w-0">Benutzer</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm min-w-0">Einstellungen</TabsTrigger>
              <TabsTrigger value="competition" className="text-xs sm:text-sm min-w-0">Wettkampf</TabsTrigger>
              <TabsTrigger value="feedback" className="text-xs sm:text-sm min-w-0">Feedback</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs sm:text-sm min-w-0">Logs</TabsTrigger>
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
                <TabsList className="grid w-full grid-cols-2 mb-6 h-auto min-w-0">
                  <TabsTrigger value="sectors" className="text-xs sm:text-sm min-w-0">Sektoren</TabsTrigger>
                  <TabsTrigger value="colors" className="text-xs sm:text-sm min-w-0">Farben</TabsTrigger>
                </TabsList>
                <TabsContent value="sectors" className="mt-0">
                  <SectorManagement />
                </TabsContent>
                <TabsContent value="colors" className="mt-0">
                  <ColorManagement />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="competition" className="mt-0">
              <CompetitionBoulderManagement />
            </TabsContent>

            <TabsContent value="feedback" className="mt-0">
              <FeedbackManagement />
            </TabsContent>

            <TabsContent value="logs" className="mt-0">
              <BoulderOperationLogs />
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
                  <TabsList className="grid w-full grid-cols-2 mb-6 h-auto min-w-0">
                    <TabsTrigger value="sectors" className="text-xs sm:text-sm min-w-0">Sektoren</TabsTrigger>
                    <TabsTrigger value="colors" className="text-xs sm:text-sm min-w-0">Farben</TabsTrigger>
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
            {searchParams.get('tab') === 'competition' && (
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
