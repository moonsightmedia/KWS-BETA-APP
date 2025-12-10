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
import { Trophy, Calendar, Award, Trash2, Info, RefreshCw, Bell, BellOff, Mountain, MessageSquare, Megaphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { requestPermission, initializePushNotifications } from '@/utils/pushNotifications';
import { useCompetitionParticipant } from '@/hooks/useCompetitionParticipant';
import { useCompetitionResults } from '@/hooks/useCompetitionResults';
import { useCompetitionLeaderboard } from '@/hooks/useCompetitionLeaderboard';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { clearAllCaches } from '@/utils/cacheUtils';

const Profile = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Notification preferences
  const { data: notificationPreferences } = useNotificationPreferences();
  const updateNotificationPreferences = useUpdateNotificationPreferences();
  
  // Competition data
  const { data: participant } = useCompetitionParticipant();
  const { data: competitionResults } = useCompetitionResults(participant?.id || null);
  const { data: leaderboard } = useCompetitionLeaderboard(participant?.gender || null);

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }
    
    let cancelled = false;
    setLoadingProfile(true);
    setProfileError(null);
    console.log('[Profile] Lade Profildaten für User:', user.id);
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('[Profile] Timeout beim Laden der Profildaten');
        setProfileError('Zeitüberschreitung beim Laden der Profildaten');
        setLoadingProfile(false);
      }
    }, 10000); // 10 seconds timeout
    
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, full_name, birth_date, email')
          .eq('id', user.id)
          .maybeSingle();
        
        if (cancelled) return;
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('[Profile] Fehler beim Laden:', error);
          setProfileError(error.message || 'Fehler beim Laden der Profildaten');
          setLoadingProfile(false);
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
          console.log('[Profile] Keine Profildaten gefunden - Profile wird möglicherweise noch erstellt');
          // Profile might not exist yet - that's okay, user can still fill in the form
          setFirstName('');
          setLastName('');
          setBirthDate('');
        }
        
        setLoadingProfile(false);
      } catch (error: any) {
        if (cancelled) return;
        
        clearTimeout(timeoutId);
        console.error('[Profile] Unerwarteter Fehler beim Laden:', error);
        setProfileError(error.message || 'Ein unerwarteter Fehler ist aufgetreten');
        setLoadingProfile(false);
      }
    })();
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
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
          <div className="container max-w-4xl mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold tracking-wide text-[#13112B] pt-2 md:pt-0">Profil Einstellungen</h1>
          
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
                <CardContent className="space-y-3 sm:space-y-4 md:space-y-5">
                  {loadingProfile && !firstName && !lastName && !birthDate ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#36B531] mx-auto"></div>
                        <p className="text-sm text-[#13112B]/60">Lade Profildaten...</p>
                      </div>
                    </div>
                  ) : profileError && !firstName && !lastName && !birthDate ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-[#E74C3C] mb-2">{profileError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProfileError(null);
                          setLoadingProfile(true);
                          // Force re-run useEffect by updating user dependency
                          if (user) {
                            // This will trigger the useEffect
                          }
                        }}
                        className="mt-2"
                      >
                        Erneut versuchen
                      </Button>
                    </div>
                  ) : (
                    <>
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                    <Avatar className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded">
                      <AvatarFallback className="bg-[#36B531] text-white text-lg sm:text-xl md:text-2xl font-semibold rounded">
                        {user.email?.substring(0, 2).toUpperCase() || 'KS'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#13112B]/60 mb-0.5 sm:mb-1">E-Mail</p>
                      <p className="text-sm sm:text-base font-medium text-[#13112B] truncate">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
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
                  <div className="pt-2 sm:pt-3 md:pt-4 border-t border-[#E7F7E9] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
                    <Button 
                      onClick={saveProfile} 
                      disabled={saving || loadingProfile}
                      className="h-10 sm:h-11 rounded-xl bg-[#36B531] hover:bg-[#2da029] text-white text-sm sm:text-base"
                    >
                      {saving ? 'Speichere…' : 'Speichern'}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={signOut}
                      className="h-10 sm:h-11 rounded-xl text-sm sm:text-base"
                    >
                      Abmelden
                    </Button>
                  </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Teilgenommene Wettkämpfe - Temporarily hidden */}
              {false && participant && (
                <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-[#36B531]" />
                      <CardTitle className="text-xl font-heading font-bold text-[#13112B]">Teilgenommene Wettkämpfe</CardTitle>
                    </div>
                    <CardDescription className="text-sm text-[#13112B]/60">Deine Wettkampf-Statistiken</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 md:space-y-4">
                    {competitionStats ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                          <div className="bg-[#F9FAF9] border border-[#E7F7E9] rounded-xl p-3 sm:p-4">
                            <p className="text-xs text-[#13112B]/60 mb-0.5 sm:mb-1">Gesamtpunkte</p>
                            <p className="text-xl sm:text-2xl font-bold text-[#13112B]">{competitionStats.totalPoints}</p>
                          </div>
                          <div className="bg-[#F9FAF9] border border-[#E7F7E9] rounded-xl p-3 sm:p-4">
                            <p className="text-xs text-[#13112B]/60 mb-0.5 sm:mb-1">Flash</p>
                            <p className="text-xl sm:text-2xl font-bold text-[#36B531]">{competitionStats.flashCount}</p>
                          </div>
                          <div className="bg-[#F9FAF9] border border-[#E7F7E9] rounded-xl p-3 sm:p-4">
                            <p className="text-xs text-[#13112B]/60 mb-0.5 sm:mb-1">Top</p>
                            <p className="text-xl sm:text-2xl font-bold text-[#13112B]">{competitionStats.topCount}</p>
                          </div>
                          <div className="bg-[#F9FAF9] border border-[#E7F7E9] rounded-xl p-3 sm:p-4">
                            <p className="text-xs text-[#13112B]/60 mb-0.5 sm:mb-1">Zone</p>
                            <p className="text-xl sm:text-2xl font-bold text-[#13112B]">{competitionStats.zoneCount}</p>
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
                  {/* Benachrichtigungen */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-[#13112B]">Benachrichtigungen</Label>
                    
                    {/* In-App Benachrichtigungen */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9]">
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-[#13112B]/60" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#13112B]">In-App Benachrichtigungen</span>
                          <span className="text-xs text-[#13112B]/60">Benachrichtigungen innerhalb der App</span>
                        </div>
                      </div>
                      <Switch
                        checked={notificationPreferences?.in_app_enabled ?? true}
                        onCheckedChange={(checked) => {
                          updateNotificationPreferences.mutate({ in_app_enabled: checked });
                        }}
                      />
                    </div>

                    {/* Push-Benachrichtigungen */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9]">
                      <div className="flex items-center gap-3">
                        <BellOff className="w-5 h-5 text-[#13112B]/60" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#13112B]">Push-Benachrichtigungen</span>
                          <span className="text-xs text-[#13112B]/60">Benachrichtigungen auch wenn App geschlossen ist</span>
                        </div>
                      </div>
                      <Switch
                        checked={notificationPreferences?.push_enabled ?? false}
                        onCheckedChange={async (checked) => {
                          if (checked) {
                            try {
                              // Use browser Notification API
                              const granted = await requestPermission();
                              if (granted) {
                                updateNotificationPreferences.mutate({ push_enabled: true });
                                toast.success('Push-Benachrichtigungen aktiviert');
                                // Re-initialize push notifications after permission granted
                                initializePushNotifications().catch(console.error);
                              } else {
                                toast.error('Push-Benachrichtigungen wurden nicht erlaubt');
                              }
                            } catch (error) {
                              console.error('[Profile] Error requesting push permission:', error);
                              toast.error('Fehler beim Aktivieren der Push-Benachrichtigungen');
                            }
                          } else {
                            updateNotificationPreferences.mutate({ push_enabled: false });
                            toast.success('Push-Benachrichtigungen deaktiviert');
                          }
                        }}
                        disabled={!('Notification' in window)}
                      />
                    </div>
                    
                    {!('Notification' in window) && (
                      <p className="text-xs text-[#13112B]/60 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Push-Benachrichtigungen sind nur in nativen Apps verfügbar
                      </p>
                    )}

                    {/* Benachrichtigungstypen */}
                    <div className="pt-4 border-t border-[#E7F7E9] space-y-3">
                      <Label className="text-sm font-medium text-[#13112B]">Benachrichtigungstypen</Label>
                      
                      {/* Neue Boulder */}
                      <div className="flex items-center justify-between p-3 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9]">
                        <div className="flex items-center gap-3">
                          <Mountain className="w-5 h-5 text-[#13112B]/60" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#13112B]">Neue Boulder</span>
                            <span className="text-xs text-[#13112B]/60">Benachrichtigung bei neuen Bouldern</span>
                          </div>
                        </div>
                        <Switch
                          checked={notificationPreferences?.boulder_new ?? true}
                          onCheckedChange={(checked) => {
                            updateNotificationPreferences.mutate({ boulder_new: checked });
                          }}
                        />
                      </div>

                      {/* Wettkampf-Updates - Temporarily hidden */}
                      {false && (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9]">
                          <div className="flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-[#13112B]/60" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[#13112B]">Wettkampf-Updates</span>
                              <span className="text-xs text-[#13112B]/60">Neue Ergebnisse und Ranglistenänderungen</span>
                            </div>
                          </div>
                          <Switch
                            checked={notificationPreferences?.competition_update ?? true}
                            onCheckedChange={(checked) => {
                              updateNotificationPreferences.mutate({ competition_update: checked });
                            }}
                          />
                        </div>
                      )}

                      {/* Feedback-Antworten */}
                      <div className="flex items-center justify-between p-3 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9]">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-5 h-5 text-[#13112B]/60" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#13112B]">Feedback-Antworten</span>
                            <span className="text-xs text-[#13112B]/60">Antworten auf dein Feedback</span>
                          </div>
                        </div>
                        <Switch
                          checked={notificationPreferences?.feedback_reply ?? true}
                          onCheckedChange={(checked) => {
                            updateNotificationPreferences.mutate({ feedback_reply: checked });
                          }}
                        />
                      </div>

                      {/* Admin-Benachrichtigungen */}
                      <div className="flex items-center justify-between p-3 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9]">
                        <div className="flex items-center gap-3">
                          <Megaphone className="w-5 h-5 text-[#13112B]/60" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#13112B]">Admin-Benachrichtigungen</span>
                            <span className="text-xs text-[#13112B]/60">Wichtige Ankündigungen</span>
                          </div>
                        </div>
                        <Switch
                          checked={notificationPreferences?.admin_announcement ?? true}
                          onCheckedChange={(checked) => {
                            updateNotificationPreferences.mutate({ admin_announcement: checked });
                          }}
                        />
                      </div>

                      {/* Schraubtermine */}
                      <div className="flex items-center justify-between p-3 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9]">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-[#13112B]/60" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#13112B]">Schraubtermine</span>
                            <span className="text-xs text-[#13112B]/60">Erinnerungen für Schraubtermine</span>
                          </div>
                        </div>
                        <Switch
                          checked={notificationPreferences?.schedule_reminder ?? true}
                          onCheckedChange={(checked) => {
                            updateNotificationPreferences.mutate({ schedule_reminder: checked });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cache-Verwaltung */}
                  <div className="space-y-2 pt-4 border-t border-[#E7F7E9]">
                    <Label className="text-sm font-medium text-[#13112B]">Cache-Verwaltung</Label>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!confirm('Möchtest du wirklich alle Caches leeren? Die App wird danach neu geladen.')) return;
                        setClearingCache(true);
                        try {
                          await clearAllCaches(queryClient);
                          toast.success('Cache geleert', {
                            description: 'Die App wird jetzt neu geladen.',
                          });
                          setTimeout(() => {
                            window.location.reload();
                          }, 500);
                        } catch (error: any) {
                          toast.error('Fehler beim Leeren des Caches', {
                            description: error.message || 'Ein Fehler ist aufgetreten.',
                          });
                        } finally {
                          setClearingCache(false);
                        }
                      }}
                      disabled={clearingCache}
                      className="w-full h-11 border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] rounded-xl"
                    >
                      {clearingCache ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Leere Cache...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Cache leeren
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Über die App */}
                  <div className="space-y-2 pt-4 border-t border-[#E7F7E9]">
                    <Label className="text-sm font-medium text-[#13112B]">Über die App</Label>
                    <div className="space-y-2 text-sm text-[#13112B]/60">
                      <div className="flex items-center justify-between">
                        <span>Version:</span>
                        <span className="font-medium">1.0.0</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Build:</span>
                        <span className="font-medium">{new Date().toLocaleDateString('de-DE')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Info className="w-4 h-4 text-[#13112B]/60" />
                      <span className="text-xs text-[#13112B]/60">
                        Kletterwelt Sauerland Beta App
                      </span>
                    </div>
                  </div>
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
