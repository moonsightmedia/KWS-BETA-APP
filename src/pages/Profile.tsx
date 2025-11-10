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
import { toast } from 'sonner';

const Profile = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) {
        console.log('[Profile] Kein Benutzer gefunden');
        return;
      }
      
      console.log('[Profile] Lade Profildaten für Benutzer:', user.id);
      
      // First try to load from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name,last_name,birth_date,full_name')
        .eq('id', user.id)
        .maybeSingle();
      
      console.log('[Profile] Profildaten aus DB:', profileData, 'Fehler:', profileError);
      
      // Also get user_metadata as fallback
      const meta = (user.user_metadata || {}) as any;
      console.log('[Profile] User Metadata:', meta);
      
      if (profileData && !profileError) {
        // Data exists in profiles table - use it
        console.log('[Profile] Verwende Daten aus profiles-Tabelle');
        setFirstName(profileData.first_name || '');
        setLastName(profileData.last_name || '');
        // Format birth_date for date input (YYYY-MM-DD)
        if (profileData.birth_date) {
          const date = typeof profileData.birth_date === 'string' 
            ? new Date(profileData.birth_date) 
            : profileData.birth_date;
          if (!isNaN(date.getTime())) {
            setBirthDate(date.toISOString().split('T')[0]);
          } else {
            setBirthDate('');
          }
        } else {
          setBirthDate('');
        }
      } else {
        // Fallback to user_metadata if not in profiles table yet
        console.log('[Profile] Verwende Fallback auf user_metadata');
        setFirstName(meta.first_name || meta.firstName || '');
        setLastName(meta.last_name || meta.lastName || '');
        if (meta.birth_date || meta.birthDate) {
          const dateStr = meta.birth_date || meta.birthDate;
          const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
          if (!isNaN(date.getTime())) {
            setBirthDate(date.toISOString().split('T')[0]);
          } else {
            setBirthDate('');
          }
        } else {
          setBirthDate('');
        }
        
        // Try to sync metadata to profiles table in background (only if we have data)
        if (meta.first_name || meta.last_name || meta.birth_date) {
          console.log('[Profile] Starte Sync von Metadata zu Profiles-Tabelle');
          const payload: any = {};
          if (meta.first_name) payload.first_name = meta.first_name;
          if (meta.last_name) payload.last_name = meta.last_name;
          if (meta.full_name) payload.full_name = meta.full_name;
          if (meta.birth_date) payload.birth_date = meta.birth_date;
          
          // Check if profile exists first
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();
          
          if (existingProfile) {
            const { error: syncError } = await supabase
              .from('profiles')
              .update(payload)
              .eq('id', user.id);
            
            if (syncError) {
              console.error('[Profile] Fehler beim Sync der Profildaten:', syncError);
              toast.error('Fehler beim Synchronisieren der Profildaten: ' + syncError.message);
            } else {
              console.log('[Profile] Profildaten erfolgreich synchronisiert');
              // Reload profile data after sync
              const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('first_name,last_name,birth_date')
                .eq('id', user.id)
                .maybeSingle();
              
              if (updatedProfile) {
                setFirstName(updatedProfile.first_name || '');
                setLastName(updatedProfile.last_name || '');
                if (updatedProfile.birth_date) {
                  const date = typeof updatedProfile.birth_date === 'string' 
                    ? new Date(updatedProfile.birth_date) 
                    : updatedProfile.birth_date;
                  if (!isNaN(date.getTime())) {
                    setBirthDate(date.toISOString().split('T')[0]);
                  }
                }
              }
            }
          } else {
            // Profile doesn't exist, create it
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email || null,
                ...payload
              });
            
            if (insertError) {
              console.error('[Profile] Fehler beim Erstellen des Profils:', insertError);
              toast.error('Fehler beim Erstellen des Profils: ' + insertError.message);
            } else {
              console.log('[Profile] Profil erfolgreich erstellt');
              // Reload profile data after creation
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('first_name,last_name,birth_date')
                .eq('id', user.id)
                .maybeSingle();
              
              if (newProfile) {
                setFirstName(newProfile.first_name || '');
                setLastName(newProfile.last_name || '');
                if (newProfile.birth_date) {
                  const date = typeof newProfile.birth_date === 'string' 
                    ? new Date(newProfile.birth_date) 
                    : newProfile.birth_date;
                  if (!isNaN(date.getTime())) {
                    setBirthDate(date.toISOString().split('T')[0]);
                  }
                }
              }
            }
          }
        }
      }
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || null;
    const { error } = await supabase.from('profiles').update({ 
      first_name: firstName || null, 
      last_name: lastName || null, 
      full_name: fullName,
      birth_date: birthDate || null 
    }).eq('id', user.id);
    
    if (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern: ' + error.message);
    } else {
      toast.success('Profil erfolgreich gespeichert!');
    }
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
