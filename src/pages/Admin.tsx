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
import { BoulderManagement } from "@/components/admin/BoulderManagement";
import { SectorManagement } from "@/components/admin/SectorManagement";

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
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8">
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
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
        <DashboardHeader />
        
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-teko tracking-wide">Admin Panel</h1>
            </div>
            <p className="text-muted-foreground">Verwalte Benutzer, Boulder und Sektoren</p>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-auto">
              <TabsTrigger value="users" className="text-xs sm:text-sm">Benutzer</TabsTrigger>
              <TabsTrigger value="boulders" className="text-xs sm:text-sm">Boulder</TabsTrigger>
              <TabsTrigger value="sectors" className="text-xs sm:text-sm">Sektoren</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-0">
              <UserManagement />
            </TabsContent>

            <TabsContent value="boulders" className="mt-0">
              <BoulderManagement />
            </TabsContent>

            <TabsContent value="sectors" className="mt-0">
              <SectorManagement />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Admin;
