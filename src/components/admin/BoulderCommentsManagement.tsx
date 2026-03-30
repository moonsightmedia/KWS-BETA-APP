import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAdminBoulderComments } from '@/hooks/useBoulderCommunity';

export function BoulderCommentsManagement() {
  const { data: comments, isLoading, deleteComment } = useAdminBoulderComments();

  if (isLoading) {
    return <p className="text-sm text-[#13112B]/60">Kommentare werden geladen…</p>;
  }

  if (!comments || comments.length === 0) {
    return (
      <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
        <CardContent className="p-6 text-sm text-[#13112B]/60">
          Keine Community-Kommentare vorhanden.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <Card key={comment.id} className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div>
                  <p className="font-semibold text-[#13112B]">{comment.boulder_name || 'Unbekannter Boulder'}</p>
                  <p className="text-xs text-[#13112B]/60">
                    {comment.author_name}
                    {comment.author_email ? ` · ${comment.author_email}` : ''}
                    {' · '}
                    {format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-[#13112B]/78">{comment.comment}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[#E7F7E9] text-[#D44C4C] hover:bg-red-50"
                onClick={() => deleteComment.mutate(comment.id)}
                disabled={deleteComment.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
