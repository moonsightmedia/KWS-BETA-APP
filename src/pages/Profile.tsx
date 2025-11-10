import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/Sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data, error } = await supabase.from('profiles').select('first_name,last_name,birth_date').eq('id', user.id).maybeSingle();
      if (data && !error) {
        setFirstName((data as any).first_name || '');
        setLastName((data as any).last_name || '');
        setBirthDate((data as any).birth_date || '');
      } else {
        const meta = (user.user_metadata || {}) as any;
        setFirstName(meta.first_name || meta.firstName || '');
        setLastName(meta.last_name || meta.lastName || '');
        setBirthDate(meta.birth_date || meta.birthDate || '');
      }
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ first_name: firstName, last_name: lastName, birth_date: birthDate || null }).eq('id', user.id);
    setSaving(false);
  };

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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div>
                    <Label>Vorname</Label>
                    <Input value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Nachname</Label>
                    <Input value={lastName} onChange={(e)=>setLastName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Geburtsdatum</Label>
                    <Input type="date" value={birthDate || ''} onChange={(e)=>setBirthDate(e.target.value)} />
                  </div>
                </div>
                <div className="pt-4 border-t flex items-center justify-between">
                  <Button onClick={saveProfile} disabled={saving}>{saving ? 'Speichere…' : 'Speichern'}</Button>
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
