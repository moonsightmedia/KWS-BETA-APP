import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/Sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Profile = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-20 mb-20 md:mb-0">
        <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-6">
          <h1 className="text-3xl font-bold font-teko tracking-wide">Profil Einstellungen</h1>
          
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Laden...</p>
              </CardContent>
            </Card>
          ) : user ? (
            <Card>
              <CardHeader>
                <CardTitle>Benutzerinformationen</CardTitle>
                <CardDescription>Deine Account-Details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {user.email?.substring(0, 2).toUpperCase() || 'KS'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">E-Mail</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button variant="destructive" onClick={signOut}>
                    Abmelden
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Nicht angemeldet</CardTitle>
                <CardDescription>Du bist momentan nicht angemeldet</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/auth')}>
                  Jetzt anmelden
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>App-Einstellungen</CardTitle>
              <CardDescription>Allgemeine Einstellungen für die Anwendung</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Weitere Einstellungen werden hier in Zukunft verfügbar sein.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
