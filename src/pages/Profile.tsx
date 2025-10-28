import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/Sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Profile = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-20 mb-20 md:mb-0">
        <div className="container max-w-4xl mx-auto p-6 space-y-6">
          <h1 className="text-3xl font-bold">Profil Einstellungen</h1>
          
          <Card>
            <CardHeader>
              <CardTitle>Benutzerinformationen</CardTitle>
              <CardDescription>Deine Account-Details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {user?.email?.substring(0, 2).toUpperCase() || 'KS'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">E-Mail</p>
                  <p className="font-medium">{user?.email || 'Nicht angemeldet'}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button variant="destructive" onClick={signOut}>
                  Abmelden
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
