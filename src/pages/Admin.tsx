import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

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
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-8 ml-16 lg:ml-64">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 ml-16 lg:ml-64">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Admin Panel</h1>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">Benutzer</TabsTrigger>
              <TabsTrigger value="boulders">Boulder</TabsTrigger>
              <TabsTrigger value="sectors">Sektoren</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Benutzerverwaltung</CardTitle>
                  <CardDescription>
                    Verwalte Benutzer und deren Rollen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Benutzerverwaltung kommt bald...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="boulders" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Boulder Verwaltung</CardTitle>
                  <CardDescription>
                    Boulder hinzufügen, bearbeiten oder löschen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Boulder-Verwaltung kommt bald...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sectors" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sektoren Verwaltung</CardTitle>
                  <CardDescription>
                    Sektoren und Schraubtermine verwalten
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sektoren-Verwaltung kommt bald...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;
