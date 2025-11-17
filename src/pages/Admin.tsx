import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";
import { UserManagement } from "@/components/admin/UserManagement";
import { ColorManagement } from "@/components/admin/ColorManagement";
import { SectorManagement } from "@/components/admin/SectorManagement";
import { BoulderManagement } from "@/components/admin/BoulderManagement";
import { UploadLogViewer } from "@/components/admin/UploadLogViewer";

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();

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
        <Sidebar />
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
      <Sidebar />
      
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

          <Tabs defaultValue="users" className="w-full min-w-0">
            <TabsList className="grid w-full grid-cols-5 mb-6 h-auto min-w-0">
              <TabsTrigger value="users" className="text-xs sm:text-sm min-w-0">Benutzer</TabsTrigger>
              <TabsTrigger value="colors" className="text-xs sm:text-sm min-w-0">Farben</TabsTrigger>
              <TabsTrigger value="sectors" className="text-xs sm:text-sm min-w-0">Sektoren</TabsTrigger>
              <TabsTrigger value="boulders" className="text-xs sm:text-sm min-w-0">Boulder</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs sm:text-sm min-w-0">Upload-Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-0">
              <UserManagement />
            </TabsContent>

            <TabsContent value="colors" className="mt-0">
              <ColorManagement />
            </TabsContent>

            <TabsContent value="sectors" className="mt-0">
              <SectorManagement />
            </TabsContent>

            <TabsContent value="boulders" className="mt-0">
              <BoulderManagement />
            </TabsContent>

            <TabsContent value="logs" className="mt-0">
              <UploadLogViewer />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Admin;
