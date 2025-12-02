import { useState } from 'react';
import { useCompetitionLeaderboard, LeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParticipantDetails } from './ParticipantDetails';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useDeleteCompetitionParticipant } from '@/hooks/useCompetitionParticipant';
import { toast } from 'sonner';
import { AdminResultEditDialog } from './AdminResultEditDialog';

export const Leaderboard = () => {
  const [selectedParticipant, setSelectedParticipant] = useState<LeaderboardEntry | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<LeaderboardEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'male' | 'female'>('all');
  const { isAdmin } = useIsAdmin();
  const deleteParticipant = useDeleteCompetitionParticipant();

  const { data: allEntries, isLoading: isLoadingAll } = useCompetitionLeaderboard();
  const { data: maleEntries, isLoading: isLoadingMale } = useCompetitionLeaderboard('male');
  const { data: femaleEntries, isLoading: isLoadingFemale } = useCompetitionLeaderboard('female');

  const handleDelete = async (entry: LeaderboardEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Möchtest du den Teilnehmer "${entry.name}" wirklich löschen? Alle Ergebnisse werden ebenfalls gelöscht.`)) {
      return;
    }

    try {
      await deleteParticipant.mutateAsync(entry.participant_id);
      toast.success('Teilnehmer gelöscht');
      // Close any open dialogs
      setSelectedParticipant(null);
      setEditingParticipant(null);
    } catch (error: any) {
      toast.error('Fehler beim Löschen: ' + error.message);
    }
  };

  const handleEdit = (entry: LeaderboardEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingParticipant(entry);
  };

  // Debug logs
  if (import.meta.env.DEV) {
    console.log('[Leaderboard Component] All entries:', allEntries?.length || 0, 'Male:', maleEntries?.length || 0, 'Female:', femaleEntries?.length || 0);
  }

  const renderEntry = (entry: LeaderboardEntry, rank: number) => (
    <Card
      key={entry.participant_id}
      className={cn(
        'cursor-pointer transition-all hover:bg-muted/50',
        rank <= 3 && 'ring-2 ring-primary'
      )}
      onClick={() => setSelectedParticipant(entry)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
              {rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base truncate">{entry.name}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {entry.flash_count} Flash
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {entry.top_count} Top
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {entry.zone_count} Zone
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleEdit(entry, e)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => handleDelete(entry, e)}
                  className="h-8 w-8 p-0"
                  disabled={deleteParticipant.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{entry.total_points}</div>
              <div className="text-xs text-muted-foreground">Punkte</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderList = (entries: LeaderboardEntry[] | undefined, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      );
    }

    if (!entries || entries.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Noch keine Teilnehmer</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {entries.map((entry, index) => renderEntry(entry, index + 1))}
      </div>
    );
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="all" className="text-sm">Gesamt</TabsTrigger>
          <TabsTrigger value="male" className="text-sm">Männer</TabsTrigger>
          <TabsTrigger value="female" className="text-sm">Frauen</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          {renderList(allEntries, isLoadingAll)}
        </TabsContent>

        <TabsContent value="male" className="mt-0">
          {renderList(maleEntries, isLoadingMale)}
        </TabsContent>

        <TabsContent value="female" className="mt-0">
          {renderList(femaleEntries, isLoadingFemale)}
        </TabsContent>
      </Tabs>

      {selectedParticipant && (
        <ParticipantDetails
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
          isAdmin={isAdmin}
        />
      )}

      {editingParticipant && (
        <AdminResultEditDialog
          participant={editingParticipant}
          onClose={() => setEditingParticipant(null)}
        />
      )}
    </>
  );
};

