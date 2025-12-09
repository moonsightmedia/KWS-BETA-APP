import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCompetitionBoulders } from '@/hooks/useCompetitionBoulders';
import { useCompetitionParticipant, useCreateCompetitionParticipant } from '@/hooks/useCompetitionParticipant';
import { useCompetitionResults } from '@/hooks/useCompetitionResults';
import { CompetitionOnboardingProvider, useCompetitionOnboarding } from '@/components/CompetitionOnboarding';
import { ResultInput } from '@/components/competition/ResultInput';
import { Leaderboard } from '@/components/competition/Leaderboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, List, Loader2, Home, ArrowLeft, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { useColors } from '@/hooks/useColors';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

const TEXT_ON_COLOR: Record<string, string> = {
  'Grün': 'text-white',
  'Gelb': 'text-black',
  'Blau': 'text-white',
  'Orange': 'text-black',
  'Rot': 'text-white',
  'Schwarz': 'text-white',
  'Weiß': 'text-black',
  'Lila': 'text-white',
};

const CompetitionContent = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { data: competitionBoulders, isLoading: isLoadingBoulders } = useCompetitionBoulders(!authLoading);
  const { data: participant, isLoading: isLoadingParticipant } = useCompetitionParticipant();
  const { data: results } = useCompetitionResults(participant?.id || null);
  const { data: colors } = useColors();
  const createParticipant = useCreateCompetitionParticipant();
  const { openCompetitionOnboarding } = useCompetitionOnboarding();
  
  // Log when component is mounted
  useEffect(() => {
    console.log('[Competition] Component mounted');
    
    // Debug: Check environment variables in production
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    console.log('[Competition] Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
      keyPreview: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING',
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD,
      dev: import.meta.env.DEV,
    });
  }, []);
  
  // Refetch-Logik entfernt - React Query macht das automatisch mit refetchOnMount: true

  // For guests, default to leaderboard. For logged-in users, default to boulders
  const [activeTab, setActiveTab] = useState<'boulders' | 'leaderboard'>(user ? 'boulders' : 'leaderboard');
  const [selectedBoulder, setSelectedBoulder] = useState<number | null>(null);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestGender, setGuestGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [showParticipateDialog, setShowParticipateDialog] = useState(false);
  const [participantGender, setParticipantGender] = useState<'male' | 'female' | 'other' | null>(null);

  // Dialog wird NICHT automatisch beim Laden gezeigt
  // Er wird nur gezeigt, wenn User versucht, einen Boulder einzutragen (handleBoulderClick)

  const handleParticipateConfirm = async () => {
    // Geschlecht ist verpflichtend
    if (!participantGender) {
      return; // Button sollte disabled sein, aber zur Sicherheit
    }
    
    try {
      console.log('[Competition] Creating participant with gender:', participantGender);
      // Warte auf die Mutation, bevor der Dialog geschlossen wird
      await createParticipant.mutateAsync({
        gender: participantGender,
      });
      
      console.log('[Competition] Participant created successfully');
      
      // Dialog schließen
      setShowParticipateDialog(false);
      setParticipantGender(null); // Reset für nächstes Mal
      
      // WICHTIG: selectedBoulder NICHT zurücksetzen!
      // Wenn ein Boulder ausgewählt wurde, wird der ResultInput-Dialog automatisch geöffnet
      // sobald der participant-State aktualisiert wurde (durch Query-Invalidierung)
      // selectedBoulder bleibt gesetzt, damit ResultInput geöffnet werden kann
    } catch (error) {
      // Fehler wird bereits vom Hook behandelt, Dialog bleibt offen
      console.error('[Competition] Error creating participant:', error);
      // selectedBoulder bleibt gesetzt, damit User es erneut versuchen kann
    }
  };

  const handleParticipateCancel = () => {
    setShowParticipateDialog(false);
    setSelectedBoulder(null); // Reset selected boulder when canceling
    setParticipantGender(null); // Reset gender selection
    // Don't store declined state - allow user to change their mind by clicking a boulder again
  };


  const handleBoulderClick = (boulderNumber: number) => {
    console.log('[Competition] Boulder clicked:', boulderNumber, { user, participant, showParticipateDialog, showGuestDialog, isCreating: createParticipant.isPending });
    
    // Guests cannot enter results - they should only see leaderboard
    if (!user) {
      console.log('[Competition] No user, ignoring click');
      return;
    }

    // Don't show dialog if mutation is in progress or participant is loading
    if (createParticipant.isPending || isLoadingParticipant) {
      console.log('[Competition] Participant creation/loading in progress, ignoring click');
      return;
    }

    // Always set selectedBoulder first
    setSelectedBoulder(boulderNumber);
    console.log('[Competition] selectedBoulder set to:', boulderNumber);

    if (!participant) {
      // User is logged in but no participant yet - show participation dialog
      // Allow user to participate even if they declined before (they can change their mind)
      // BUT: Don't show if we're already creating a participant
      if (!createParticipant.isPending && !showParticipateDialog) {
        console.log('[Competition] No participant, showing participate dialog');
        setShowParticipateDialog(true);
      } else {
        console.log('[Competition] No participant, but dialog already open or creation in progress');
      }
      return;
    }

    // Verify participant has gender before allowing result entry
    if (!participant.gender) {
      // Participant exists but has no gender - show error or update dialog
      console.log('[Competition] Participant has no gender');
      alert('Bitte gib deine Klasse (M oder W) an, bevor du Ergebnisse eintragen kannst.');
      return;
    }

    // Participant exists and has gender - result input will open automatically via conditional render
    console.log('[Competition] Opening result input for boulder:', boulderNumber);
  };

  const handleGuestSubmit = async () => {
    if (!guestName.trim() || !guestGender) return; // Geschlecht ist verpflichtend

    const newParticipant = await createParticipant.mutateAsync({
      guest_name: guestName.trim(),
      gender: guestGender,
    });

    setShowGuestDialog(false);
    setGuestName(''); // Reset form
    setGuestGender(null);
    // selectedBoulder is already set, ResultInput will open when participant is loaded via query invalidation
    // The mutation's onSuccess will invalidate queries and update participant
  };

  // Create results map
  const resultsMap = new Map(
    (results || []).map((r) => [r.boulder_number, r])
  );

  const getThumbnailUrl = (boulder: any) => {
    if (!boulder?.boulder?.thumbnail_url) return null;
    let url = boulder.boulder.thumbnail_url;
    if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
      url = url.replace('/uploads/videos/', '/uploads/');
    }
    return url.startsWith('http') ? url : `https://cdn.rokt.com/${url}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex-1 flex flex-col mb-20 md:mb-0 overflow-x-hidden w-full min-w-0">
        <div 
          className="w-full min-w-0 md:px-8" 
          style={{ 
            paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 2rem), 3rem)',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingBottom: '2rem'
          }}
        >
          {/* Navigation zurück */}
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(user ? '/' : '/guest')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {user ? 'Zurück zum Dashboard' : 'Zurück zur Boulder-Ansicht'}
            </Button>
          </div>
          
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2 font-teko tracking-wide">
                Nikolaus Wettkampf
              </h1>
              <p className="text-muted-foreground">
                {user 
                  ? 'Trage deine Ergebnisse ein und verfolge die Live-Rangliste'
                  : 'Verfolge die Live-Rangliste des Wettkampfs'}
              </p>
            </div>
            {/* Info Button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl flex-shrink-0"
              onClick={openCompetitionOnboarding}
              aria-label="Hilfe & Informationen zum Wettkampf"
            >
              <Info className="w-6 h-6" />
            </Button>
          </div>

          {/* For guests: Only show leaderboard tab */}
          {!user ? (
            <div className="mb-6">
              <Card className="bg-muted/50 border-primary/20">
                <CardContent className="p-6 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Teilnahme am Wettkampf</h3>
                  <p className="text-muted-foreground mb-4">
                    Um am Wettkampf teilzunehmen und deine Ergebnisse einzutragen, musst du dich anmelden.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/auth'}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    Jetzt anmelden
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
            <TabsList className={cn(
              "grid w-full mb-6",
              user ? "grid-cols-2" : "grid-cols-1"
            )}>
              {user && (
                <TabsTrigger value="boulders" className="text-sm">
                  <List className="w-5 h-5 mr-2" />
                  Boulder
                </TabsTrigger>
              )}
              <TabsTrigger value="leaderboard" className="text-sm">
                <Trophy className="w-5 h-5 mr-2" />
                Rangliste
              </TabsTrigger>
            </TabsList>

            {user && (
              <TabsContent value="boulders" className="mt-0">
              {isLoadingBoulders ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !competitionBoulders || competitionBoulders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <p>Noch keine Wettkampf-Boulder vorhanden.</p>
                    <p className="text-sm mt-2">Setter/Admins können Boulder für den Wettkampf hinzufügen.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
                  {competitionBoulders.map((cb) => {
                    const result = resultsMap.get(cb.boulder_number);
                    const thumbnailUrl = getThumbnailUrl(cb);

                    return (
                      <Card
                        key={cb.id}
                        className={cn(
                          'cursor-pointer transition-all hover:bg-muted/50',
                          result && 'ring-2 ring-primary'
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleBoulderClick(cb.boulder_number);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBoulderClick(cb.boulder_number);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            {thumbnailUrl ? (
                              <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                                <img
                                  src={thumbnailUrl}
                                  alt={`Boulder ${cb.boulder_number}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "w-16 h-16 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-xl",
                                  TEXT_ON_COLOR[cb.color] || 'text-white'
                                )}
                                style={getColorBackgroundStyle(cb.color, colors || [])}
                              >
                                {cb.boulder_number}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-base">
                                Boulder {cb.boulder_number}
                              </div>
                              <div className="text-sm text-muted-foreground">{cb.color}</div>
                              {result && (
                                <div className="mt-1">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      result.result_type === 'flash' && 'bg-green-100 text-green-800',
                                      result.result_type === 'top' && 'bg-blue-100 text-blue-800',
                                      result.result_type === 'zone' && 'bg-yellow-100 text-yellow-800',
                                      result.result_type === 'none' && 'bg-gray-100 text-gray-800'
                                    )}
                                  >
                                    {result.result_type === 'flash' && 'Flash'}
                                    {result.result_type === 'top' && `Top (${result.attempts} Versuche)`}
                                    {result.result_type === 'zone' && 'Zone'}
                                    {result.result_type === 'none' && 'Nicht geschafft'}
                                  </Badge>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {result.points} Punkte
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              </TabsContent>
            )}

            <TabsContent value="leaderboard" className="mt-0">
              <Leaderboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Participate Dialog (for logged-in users) */}
      <Dialog open={showParticipateDialog} onOpenChange={setShowParticipateDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>In welcher Klasse möchtest du deine Ergebnisse eintragen?</DialogTitle>
            <DialogDescription>
              Wähle deine Klasse, um Ergebnisse für die {competitionBoulders?.length || 0} Wettkampf-Boulder eintragen zu können.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="participant-gender">Klasse *</Label>
              <Select
                value={participantGender || ''}
                onValueChange={(v) =>
                  setParticipantGender(v as 'male' | 'female')
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Klasse wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">M (Männer)</SelectItem>
                  <SelectItem value="female">W (Frauen)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleParticipateCancel}
                className="flex-1 h-12"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleParticipateConfirm}
                disabled={createParticipant.isPending || !participantGender}
                className="flex-1 h-12"
              >
                {createParticipant.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Speichere...
                  </>
                ) : (
                  'Bestätigen'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Name Dialog */}
      <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
        <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] p-6">
          <DialogHeader>
            <DialogTitle>Name eingeben</DialogTitle>
            <DialogDescription>
              Gib deinen Namen ein, um am Wettkampf teilzunehmen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Name *</Label>
              <Input
                id="guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Dein Name"
                className="h-12"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-gender">Klasse *</Label>
              <Select
                value={guestGender || ''}
                onValueChange={(v) =>
                  setGuestGender(v as 'male' | 'female')
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Klasse wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">M (Männer)</SelectItem>
                  <SelectItem value="female">W (Frauen)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGuestSubmit}
              disabled={!guestName.trim() || !guestGender || createParticipant.isPending}
              size="lg"
              className="w-full h-12"
            >
              {createParticipant.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                'Weiter'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Input Dialog - Only show if participant has gender and participate dialog is closed */}
      {selectedBoulder && participant && participant.gender && !showGuestDialog && !showParticipateDialog && (
        <ResultInput
          boulderNumber={selectedBoulder}
          boulderColor={
            competitionBoulders?.find((cb) => cb.boulder_number === selectedBoulder)?.color || ''
          }
          participantId={participant.id}
          currentResult={resultsMap.get(selectedBoulder) || null}
          onClose={async () => {
            // Refetch results after closing to ensure UI is updated
            if (participant?.id) {
              await queryClient.refetchQueries({
                queryKey: ['competition_results', participant.id],
              });
              await queryClient.refetchQueries({
                queryKey: ['competition_leaderboard'],
              });
            }
            setSelectedBoulder(null);
          }}
        />
      )}
    </div>
  );
};

const Competition = () => {
  return (
    <CompetitionOnboardingProvider>
      <CompetitionContent />
    </CompetitionOnboardingProvider>
  );
};

export default Competition;

