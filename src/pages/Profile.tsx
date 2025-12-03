import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Trophy, Calendar, Award } from 'lucide-react';
import { useCompetitionParticipant } from '@/hooks/useCompetitionParticipant';
import { useCompetitionResults } from '@/hooks/useCompetitionResults';
import { useCompetitionLeaderboard } from '@/hooks/useCompetitionLeaderboard';
import { toast } from 'sonner';

const Profile = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Competition data
  const { data: participant } = useCompetitionParticipant();
  const { data: competitionResults } = useCompetitionResults(participant?.id || null);
  const { data: leaderboard } = useCompetitionLeaderboard(participant?.gender || null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      console.log('[Profile] Lade Profildaten für User:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, birth_date')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('[Profile] Fehler beim Laden:', error);
        return;
      }
      
      if (data) {
        console.log('[Profile] Profildaten geladen:', data);
        // Use first_name/last_name if available, otherwise try to parse from full_name
        const profile = data as any;
        setFirstName(profile.first_name || (profile.full_name ? profile.full_name.split(' ')[0] : '') || '');
        setLastName(profile.last_name || (profile.full_name ? profile.full_name.split(' ').slice(1).join(' ') : '') || '');
        
        // Format birth_date for HTML date input (YYYY-MM-DD)
        if (profile.birth_date) {
          const date = new Date(profile.birth_date);
          if (!isNaN(date.getTime())) {
            const formattedDate = date.toISOString().split('T')[0];
            setBirthDate(formattedDate);
          } else {
            setBirthDate('');
          }
        } else {
          setBirthDate('');
        }
      } else {
        console.log('[Profile] Keine Profildaten gefunden');
      }
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) {
      toast.error('Fehler', {
        description: 'Du bist nicht angemeldet.',
      });
      return;
    }
    
    setSaving(true);
    console.log('[Profile] Starte Speichern:', { userId: user.id, firstName, lastName, birthDate });
    
    try {
      // Calculate full_name from first_name and last_name
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim() || null;
      
      const updatePayload = { 
        first_name: firstName.trim() || null, 
        last_name: lastName.trim() || null, 
        full_name: fullName,
        birth_date: birthDate || null 
      };
      
      console.log('[Profile] Update Payload:', updatePayload);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Zeitüberschreitung beim Speichern. Bitte versuche es erneut.'));
        }, 10000); // 10 seconds timeout
      });
      
      // Update without select to avoid potential RLS issues
      const updatePromise = supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);
      
      const { error } = await Promise.race([updatePromise, timeoutPromise]);
      
      if (error) {
        console.error('[Profile] Fehler beim Speichern:', error);
        toast.error('Fehler beim Speichern', {
          description: error.message || 'Die Änderungen konnten nicht gespeichert werden.',
        });
        return;
      }
      
      console.log('[Profile] Update erfolgreich, lade Profildaten neu...');
      
      // Reload profile data separately to reflect changes
      const { data: updatedData, error: reloadError } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, birth_date')
        .eq('id', user.id)
        .maybeSingle();
      
      if (reloadError) {
        console.error('[Profile] Fehler beim Neuladen:', reloadError);
        // Still show success, as the update worked
      } else if (updatedData) {
        console.log('[Profile] Aktualisierte Daten erhalten:', updatedData);
        setFirstName(updatedData.first_name || '');
        setLastName(updatedData.last_name || '');
        if (updatedData.birth_date) {
          const date = new Date(updatedData.birth_date);
          if (!isNaN(date.getTime())) {
            setBirthDate(date.toISOString().split('T')[0]);
          }
        } else {
          setBirthDate('');
        }
      }
      
      console.log('[Profile] Profil erfolgreich gespeichert');
      toast.success('Profil gespeichert', {
        description: 'Deine Änderungen wurden erfolgreich gespeichert.',
      });
    } catch (error: any) {
      console.error('[Profile] Unerwarteter Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern', {
        description: error.message || 'Ein unerwarteter Fehler ist aufgetreten.',
      });
    } finally {
      setSaving(false);
      console.log('[Profile] Speichern abgeschlossen, saving auf false gesetzt');
    }
  };

  // Calculate competition stats
  const competitionStats = competitionResults ? {
    totalPoints: competitionResults.reduce((sum, r) => sum + Number(r.points || 0), 0),
    flashCount: competitionResults.filter(r => r.result_type === 'flash').length,
    topCount: competitionResults.filter(r => r.result_type === 'top').length,
    zoneCount: competitionResults.filter(r => r.result_type === 'zone').length,
    completedBoulders: competitionResults.filter(r => r.result_type !== 'none').length,
  } : null;

  // Get user's rank in leaderboard
  const userRank = leaderboard && participant ? leaderboard.findIndex(entry => entry.participant_id === participant.id) + 1 : null;

  return (
    <div className="flex min-h-screen bg-[#F9FAF9]">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
        <DashboardHeader />
        <main className="flex-1">
          <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-heading font-bold tracking-wide text-[#13112B]">Profil Einstellungen</h1>
          
          {loading ? (
            <Card className="bg-white border border-[#E7F7E9] rounded-2xl">
              <CardContent className="p-6">
                <p className="text-[#13112B]/60">Laden...</p>
              </CardContent>
            </Card>
          ) : user ? (
            <>
              {/* Benutzerinformationen */}
              <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-heading font-bold text-[#13112B]">Benutzerinformationen</CardTitle>
                  <CardDescription className="text-sm text-[#13112B]/60">Deine Account-Details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20 rounded">
                      <AvatarFallback className="bg-[#36B531] text-white text-2xl font-semibold rounded">
                        {user.email?.substring(0, 2).toUpperCase() || 'KS'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-[#13112B]/60 mb-1">E-Mail</p>
                      <p className="font-medium text-[#13112B]">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#13112B]">Vorname</Label>
                      <Input 
                        value={firstName} 
                        onChange={(e)=>setFirstName(e.target.value)}
                        className="h-11 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#13112B]">Nachname</Label>
                      <Input 
                        value={lastName} 
                        onChange={(e)=>setLastName(e.target.value)}
                        className="h-11 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#13112B]">Geburtsdatum</Label>
                      <Input 
                        type="date" 
                        value={birthDate || ''} 
                        onChange={(e)=>setBirthDate(e.target.value)}
                        className="h-11 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#E7F7E9] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <Button 
                      onClick={saveProfile} 
                      disabled={saving}
                      className="h-11 rounded-xl bg-[#36B531] hover:bg-[#2da029] text-white"
                    >
                      {saving ? 'Speichere…' : 'Speichern'}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={signOut}
                      className="h-11 rounded-xl"
                    >
                      Abmelden
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Teilgenommene Wettkämpfe */}
              {participant && (
                <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-[#36B531]" />
                      <CardTitle className="text-xl font-heading font-bold text-[#13112B]">Teilgenommene Wettkämpfe</CardTitle>
                    </div>
                    <CardDescription className="text-sm text-[#13112B]/60">Deine Wettkampf-Statistiken</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {competitionStats ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="bg-[#F9FAF9] border border-[#E7F7E9] rounded-xl p-4">
                            <p className="text-xs text-[#13112B]/60 mb-1">Gesamtpunkte</p>
                            <p className="text-2xl font-bold text-[#13112B]">{competitionStats.totalPoints}</p>
                          </div>
                          <div className="bg-[#F9FAF9] border border-[#E7F7E9] rounded-xl p-4">
                            <p className="text-xs text-[#13112B]/60 mb-1">Flash</p>
                            <p className="text-2xl font-bold text-[#36B531]">{competitionStats.flashCount}</p>
                          </div>
                          <div className="bg-[#F9FAF9] border border-[#E7F7E9] rounded-xl p-4">
                            <p className="text-xs text-[#13112B]/60 mb-1">Top</p>
                            <p className="text-2xl font-bold text-[#13112B]">{competitionStats.topCount}</p>
                          </div>
                          <div className="bg-[#F9FAF9] border border-[#E7F7E9] rounded-xl p-4">
                            <p className="text-xs text-[#13112B]/60 mb-1">Zone</p>
                            <p className="text-2xl font-bold text-[#13112B]">{competitionStats.zoneCount}</p>
                          </div>
                        </div>
                        {userRank && userRank > 0 && (
                          <div className="flex items-center justify-between p-4 bg-[#E7F7E9] rounded-xl">
                            <div className="flex items-center gap-2">
                              <Award className="w-5 h-5 text-[#36B531]" />
                              <span className="text-sm font-medium text-[#13112B]">Aktueller Rang</span>
                            </div>
                            <span className="text-xl font-bold text-[#36B531]">#{userRank}</span>
                          </div>
                        )}
                        <Button 
                          onClick={() => navigate('/competition')}
                          className="w-full h-11 rounded-xl bg-[#36B531] hover:bg-[#2da029] text-white"
                        >
                          Zum Wettkampf
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Trophy className="w-12 h-12 text-[#13112B]/20 mx-auto mb-3" />
                        <p className="text-sm text-[#13112B]/60 mb-4">Du nimmst noch an keinem Wettkampf teil.</p>
                        <Button 
                          onClick={() => navigate('/competition')}
                          className="h-11 rounded-xl bg-[#36B531] hover:bg-[#2da029] text-white"
                        >
                          Jetzt teilnehmen
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* App-Einstellungen */}
              <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-heading font-bold text-[#13112B]">App-Einstellungen</CardTitle>
                  <CardDescription className="text-sm text-[#13112B]/60">Allgemeine Einstellungen für die Anwendung</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-[#13112B]/60">
                    Weitere Einstellungen werden hier in Zukunft verfügbar sein.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-heading font-bold text-[#13112B]">Nicht angemeldet</CardTitle>
                <CardDescription className="text-sm text-[#13112B]/60">Du bist momentan nicht angemeldet</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/auth')}
                  className="h-11 rounded-xl bg-[#36B531] hover:bg-[#2da029] text-white"
                >
                  Jetzt anmelden
                </Button>
              </CardContent>
            </Card>
          )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
