import { useEffect, useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  BadgeCheck,
  Check,
  Clock,
  Heart,
  Lock,
  Minus,
  Pencil,
  Play,
  Plus,
  Send,
  Star,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import {
  useBoulderComments,
  useBoulderCommunity,
  useBoulderTrackingSessions,
  useDeleteBoulderTick,
  useUpsertBoulderGradeFeedback,
  useUpsertBoulderRating,
  useUpsertBoulderTrackingSession,
  useUpsertBoulderTick,
} from '@/hooks/useBoulderCommunity';
import { getBoulderAttributeIcon } from '@/lib/boulderAttributes';
import { cn } from '@/lib/utils';
import type { Boulder } from '@/types/boulder';
import type {
  BoulderComment,
  BoulderCommunityAttribute,
  BoulderGradeFeedback,
  BoulderTick,
  BoulderTickStatus,
  BoulderTrackingSession,
} from '@/types/community';

const difficultyOptions: Array<{ value: BoulderGradeFeedback; label: string }> = [
  { value: 'too_easy', label: 'Zu leicht' },
  { value: 'just_right', label: 'Passt' },
  { value: 'too_hard', label: 'Zu schwer' },
];

const quickTrackActions: Array<{
  key: 'attempt' | 'top' | 'flash';
  label: string;
  icon: LucideIcon;
}> = [
  {
    key: 'attempt',
    label: 'Versuch +1',
    icon: Plus,
  },
  {
    key: 'top',
    label: 'Top',
    icon: BadgeCheck,
  },
  {
    key: 'flash',
    label: 'Flash',
    icon: Zap,
  },
];

const sessionResultLabels: Record<BoulderTickStatus, string> = {
  attempted: 'Probiert',
  top: 'Getoppt',
  flash: 'Geflasht',
};

const EMPTY_TRACKING_SESSIONS: BoulderTrackingSession[] = [];

type SessionSheetDraft = {
  result: BoulderTickStatus;
  attemptCount: number;
  note: string;
};

function createDefaultSessionDraft(): SessionSheetDraft {
  return {
    result: 'attempted',
    attemptCount: 1,
    note: '',
  };
}

function createSessionDraft(session: BoulderTrackingSession | null | undefined): SessionSheetDraft {
  if (!session) {
    return createDefaultSessionDraft();
  }

  return {
    result: session.result,
    attemptCount: Math.max(1, session.attempt_count),
    note: session.note ?? '',
  };
}

function hasDraftChanges(current: SessionSheetDraft, base: SessionSheetDraft) {
  return current.result !== base.result
    || current.attemptCount !== base.attemptCount
    || current.note.trim() !== base.note.trim();
}

function isMarkerOnlyTick(tick: BoulderTick | null | undefined) {
  return !!tick
    && tick.status === 'attempted'
    && tick.attempt_count === null
    && !tick.note
    && (tick.is_favorite || tick.is_project);
}

function getReadableErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallback;
  }

  return error.message;
}

function CommentItem({
  comment,
  currentUserId,
  editingCommentId,
  editingCommentValue,
  setEditingCommentId,
  setEditingCommentValue,
  commentsQuery,
}: {
  comment: BoulderComment;
  currentUserId: string;
  editingCommentId: string | null;
  editingCommentValue: string;
  setEditingCommentId: (value: string | null) => void;
  setEditingCommentValue: (value: string) => void;
  commentsQuery: ReturnType<typeof useBoulderComments>;
}) {
  const isEditing = editingCommentId === comment.id;
  const isOwn = comment.user_id === currentUserId;

  return (
    <div className="flex gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-kws-control bg-accent text-xs font-bold text-accent-foreground">
        {comment.author_name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{comment.author_name}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: de })}
          </span>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              rows={3}
              value={editingCommentValue}
              onChange={(event) => setEditingCommentValue(event.target.value)}
              className="resize-none rounded-kws-control bg-secondary"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-kws-control bg-primary text-primary-foreground"
                disabled={!editingCommentValue.trim()}
                onClick={() =>
                  commentsQuery.updateComment.mutate(
                    { id: comment.id, comment: editingCommentValue },
                    {
                      onSuccess: () => {
                        setEditingCommentId(null);
                        setEditingCommentValue('');
                      },
                    },
                  )
                }
              >
                Speichern
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-kws-control"
                onClick={() => {
                  setEditingCommentId(null);
                  setEditingCommentValue('');
                }}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/90">{comment.comment}</p>
        )}

        {!isEditing && isOwn && (
          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground"
              onClick={() => {
                setEditingCommentId(comment.id);
                setEditingCommentValue(comment.comment);
              }}
            >
              <Pencil className="h-3 w-3" />
              Bearbeiten
            </button>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground"
              onClick={() => commentsQuery.deleteComment.mutate(comment.id)}
            >
              <Trash2 className="h-3 w-3" />
              Löschen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionSheet({
  open,
  onOpenChange,
  session,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: BoulderTrackingSession | null;
  onSave: (payload: { result: BoulderTickStatus; attemptCount: number; note: string }) => Promise<void>;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<SessionSheetDraft>(() => createSessionDraft(session));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClosingWithSave, setIsClosingWithSave] = useState(false);
  const draftRef = useRef<SessionSheetDraft>(createSessionDraft(session));
  const baseDraftRef = useRef<SessionSheetDraft>(createSessionDraft(session));

  const baseDraft = useMemo(() => createSessionDraft(session), [session]);
  const isDirty = hasDraftChanges(draft, baseDraft);
  const isBusy = isSaving || isClosingWithSave;

  useEffect(() => {
    const nextDraft = createSessionDraft(session);
    draftRef.current = nextDraft;
    baseDraftRef.current = nextDraft;
    setDraft(nextDraft);
    setErrorMessage(null);
  }, [open, session]);

  const updateDraft = (updater: (current: SessionSheetDraft) => SessionSheetDraft) => {
    const nextDraft = updater(draftRef.current);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  };

  const persistAndClose = async () => {
    if (isBusy) {
      return;
    }

    const currentDraft = draftRef.current;
    const currentBaseDraft = baseDraftRef.current;

    if (!hasDraftChanges(currentDraft, currentBaseDraft)) {
      onOpenChange(false);
      return;
    }

    setErrorMessage(null);
    setIsClosingWithSave(true);
    try {
      await onSave({
        result: currentDraft.result,
        attemptCount: currentDraft.attemptCount,
        note: currentDraft.note,
      });
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(getReadableErrorMessage(error, 'Session konnte nicht gespeichert werden.'));
    } finally {
      setIsClosingWithSave(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }

        void persistAndClose();
      }}
    >
      <DrawerContent className="mx-auto max-w-lg rounded-t-kws-card border-border/80 bg-[#F9FAF9] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-[0_-10px_34px_rgba(19,17,43,0.16)] [&>div:first-child]:mt-3 [&>div:first-child]:h-1 [&>div:first-child]:w-10 [&>div:first-child]:rounded-kws-badge [&>div:first-child]:bg-muted-foreground/20">
        <DrawerHeader className="gap-3 border-b border-border/80 bg-white px-4 pb-4 pt-3 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DrawerTitle className="font-sans text-lg font-semibold leading-tight tracking-[-0.02em] text-[#192436]">Heutige Session</DrawerTitle>
              <DrawerDescription className="text-xs leading-5">Ergebnis, Versuche und Notiz für heute.</DrawerDescription>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-10 rounded-kws-control px-3.5 text-xs font-semibold"
              disabled={isBusy}
              onClick={() => {
                void persistAndClose();
              }}
            >
              {isBusy ? 'Speichert...' : 'Fertig'}
            </Button>
          </div>
        </DrawerHeader>
        <div className="grid gap-5 px-4 pb-4 pt-4">
          {errorMessage ? (
            <p className="rounded-kws-control border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-[#192436]">Datum</label>
            <div className="rounded-kws-control bg-secondary px-3.5 py-3 text-sm font-medium text-[#192436]">
              {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-[#192436]">Ergebnis</label>
            <div className="grid grid-cols-3 gap-2">
              {(['attempted', 'top', 'flash'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    if (option === 'flash' && draftRef.current.attemptCount > 1) {
                      setErrorMessage('Flash ist nur im ersten Versuch möglich. Reduziere erst die Versuche auf 1.');
                      return;
                    }

                    updateDraft((current) => ({
                      ...current,
                      result: option,
                    }));
                    setErrorMessage(null);
                  }}
                  className={cn(
                    'min-h-11 rounded-kws-control px-2 py-2.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50',
                    draft.result === option ? 'bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(54,181,49,0.18)]' : 'bg-secondary text-[#192436] hover:bg-secondary/75',
                  )}
                  aria-pressed={draft.result === option}
                >
                  {sessionResultLabels[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-[#192436]">Versuche</label>
            <div className="flex items-center justify-between rounded-kws-card bg-white p-2 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-11 w-11 rounded-kws-control text-[#192436]"
                  disabled={draft.result === 'flash'}
                  aria-label="Einen Versuch abziehen"
                  onClick={() => {
                    updateDraft((current) => ({
                      ...current,
                      attemptCount: Math.max(1, current.attemptCount - 1),
                    }));
                    setErrorMessage(null);
                  }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="min-w-20 text-center">
                  <p className="text-2xl font-semibold leading-none text-[#192436]">{draft.result === 'flash' ? 1 : draft.attemptCount}</p>
                  <p className="mt-1 text-[10px] font-medium text-muted-foreground">{(draft.result === 'flash' ? 1 : draft.attemptCount) === 1 ? 'Versuch' : 'Versuche'}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-11 w-11 rounded-kws-control text-[#192436]"
                  disabled={draft.result === 'flash'}
                  aria-label="Einen Versuch hinzufügen"
                  onClick={() => {
                    updateDraft((current) => ({
                      ...current,
                      attemptCount: current.attemptCount + 1,
                    }));
                    setErrorMessage(null);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-[#192436]">Notiz</label>
            <Textarea
              rows={3}
              value={draft.note}
              onChange={(event) => {
                updateDraft((current) => ({ ...current, note: event.target.value }));
                setErrorMessage(null);
              }}
              placeholder="Was möchtest du dir merken?"
              className="resize-none rounded-kws-control border-border bg-white text-sm focus-visible:ring-[#192436]/25"
            />
          </div>

          <p className="px-1 text-xs font-medium text-muted-foreground">
            Änderungen werden beim Schließen oder über „Fertig“ automatisch gespeichert.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function AttributeGrid({ attributes }: { attributes: BoulderCommunityAttribute[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
      {attributes.map((attribute) => {
        const Icon = getBoulderAttributeIcon(attribute);
        return (
          <span key={attribute.id} className="flex flex-col items-center gap-1.5 rounded-kws-control bg-secondary px-3 py-2.5 text-center text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span className="text-[10px] font-semibold text-foreground">{attribute.label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function BoulderInfoTab({ boulder }: { boulder: Boulder }) {
  const { user } = useAuth();
  const { data: summary } = useBoulderCommunity(boulder.id);
  const commentsQuery = useBoulderComments(boulder.id);
  const upsertRating = useUpsertBoulderRating(boulder.id);
  const upsertGradeFeedback = useUpsertBoulderGradeFeedback(boulder.id);
  const [userRatingHover, setUserRatingHover] = useState(0);
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState('');

  const attributes = (summary?.attributes || []).filter((attribute) => attribute.selected);
  const comments = commentsQuery.data || [];

  if (!user) {
    return (
      <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
        <p className="text-sm text-muted-foreground">Attribute, Bewertung und Kommentare sind für angemeldete Nutzer aktiv.</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {attributes.length > 0 ? (
        <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attribute</h4>
          <AttributeGrid attributes={attributes} />
        </section>
      ) : null}
      <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bewertung</h4>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-3xl font-bold text-foreground">{summary?.averageRating ? summary.averageRating.toFixed(1) : '–'}</span>
          <div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn('h-4 w-4', star <= Math.round(summary?.averageRating || 0) ? 'fill-primary text-primary' : 'text-muted-foreground/30')}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{summary?.ratingCount ?? 0} Bewertungen</span>
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs text-muted-foreground">Deine Bewertung</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setUserRatingHover(star)}
                onMouseLeave={() => setUserRatingHover(0)}
                onClick={() => upsertRating.mutate(star)}
                className="p-1"
              >
                <Star
                  className={cn(
                    'h-6 w-6 transition-colors',
                    star <= (userRatingHover || summary?.myRating || 0) ? 'fill-primary text-primary' : 'text-muted-foreground/30',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schwierigkeitseinschätzung</h4>
        <div className="mb-4 flex gap-2">
          {difficultyOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => upsertGradeFeedback.mutate(option.value)}
              className={cn(
                'flex-1 rounded-kws-control py-2 text-xs font-semibold transition-all',
                summary?.myGradeFeedback === option.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {difficultyOptions.map((option) => {
            const count = summary?.gradeFeedbackCounts[option.value] ?? 0;
            const total = Object.values(summary?.gradeFeedbackCounts || {}).reduce((sum, value) => sum + value, 0);
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={option.value} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-muted-foreground">{option.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-[2px] bg-secondary">
                  <div className="h-full rounded-[2px] bg-primary" style={{ width: `${percentage}%` }} />
                </div>
                <span className="w-10 text-right text-xs font-semibold text-foreground">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kommentare ({comments.length})</h4>

        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Noch keine Kommentare. Sei der Erste.</p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={user.id}
                editingCommentId={editingCommentId}
                editingCommentValue={editingCommentValue}
                setEditingCommentId={setEditingCommentId}
                setEditingCommentValue={setEditingCommentValue}
                commentsQuery={commentsQuery}
              />
            ))
          )}
        </div>

        <div className="mt-4 border-t border-border/80 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kws-control bg-primary/[0.15] text-xs font-bold text-primary">Du</div>
            <form
              className="flex min-w-0 flex-1 items-center gap-1 rounded-kws-card bg-secondary p-1"
              onSubmit={(event) => {
                event.preventDefault();
                if (!commentDraft.trim() || commentsQuery.addComment.isPending) return;
                commentsQuery.addComment.mutate(commentDraft, { onSuccess: () => setCommentDraft('') });
              }}
            >
              <Input
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Kommentar schreiben …"
                aria-label="Kommentar schreiben"
                className="h-10 min-w-0 rounded-kws-control border-0 bg-transparent px-2.5 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#192436]/20 focus-visible:ring-offset-0"
              />
              <button
                type="submit"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kws-control bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(54,181,49,0.18)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-1 disabled:bg-primary/[0.35] disabled:shadow-none"
                disabled={!commentDraft.trim() || commentsQuery.addComment.isPending}
                aria-label={commentsQuery.addComment.isPending ? 'Kommentar wird gesendet' : 'Kommentar senden'}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

/*
export function BoulderTrackTab({ boulder }: { boulder: Boulder }) {
  const { user } = useAuth();
  const { data: summary } = useBoulderCommunity(boulder.id);
  const sessionsQuery = useBoulderTrackingSessions(boulder.id);
  const addSession = useAddBoulderTrackingSession(boulder.id);
  const upsertTick = useUpsertBoulderTick(boulder.id);
  const deleteTick = useDeleteBoulderTick(boulder.id);
  const [status, setStatus] = useState<BoulderTickStatus | 'none'>('none');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isProject, setIsProject] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [pendingAction, setPendingAction] = useState<'status' | 'favorite' | 'project' | null>(null);
  const currentTick = summary?.myTick ?? null;

  useEffect(() => {
    const nextState = getTrackStateFromTick(currentTick);
    setStatus(nextState.status);
    setIsFavorite(nextState.isFavorite);
    setIsProject(nextState.isProject);
  }, [currentTick]);

  if (!user) {
    return <div className="rounded-kws-card bg-card p-4 text-sm text-muted-foreground shadow-[0_3px_14px_rgba(19,17,43,0.07)]">Track ist privat und nur für angemeldete Nutzer sichtbar.</div>;
  }

  const sessions = sessionsQuery.data || [];
  const isTrackSaving = upsertTick.isPending || deleteTick.isPending;

  const saveTrackState = async (nextState: BoulderTrackState, action: 'status' | 'favorite' | 'project') => {
    if (isTrackSaving) {
      return;
    }

    const previousState: BoulderTrackState = {
      status,
      isFavorite,
      isProject,
    };

    setStatus(nextState.status);
    setIsFavorite(nextState.isFavorite);
    setIsProject(nextState.isProject);
    setPendingAction(action);

    try {
      const payload = getPersistedTickPayload(nextState, currentTick);
      if (payload) {
        await upsertTick.mutateAsync(payload);
      } else {
        await deleteTick.mutateAsync();
      }
    } catch {
      setStatus(previousState.status);
      setIsFavorite(previousState.isFavorite);
      setIsProject(previousState.isProject);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 px-1">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Privater Bereich – nur für dich sichtbar</span>
      </div>

      <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</h4>
        <div className="grid grid-cols-4 gap-1.5">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={isTrackSaving}
              onClick={() => {
                if (option.value === status) {
                  return;
                }

                void saveTrackState({
                  status: option.value,
                  isFavorite: option.value === 'none' ? false : isFavorite,
                  isProject: option.value === 'none' ? false : isProject,
                }, 'status');
              }}
              className={cn(
                'flex flex-col items-center gap-1 rounded-kws-control py-2.5 text-[10px] font-semibold transition-all disabled:pointer-events-none disabled:opacity-70',
                status === option.value ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground',
                pendingAction === 'status' && status === option.value && 'ring-2 ring-primary/25',
              )}
            >
              <span className="text-sm">{option.short}</span>
              {option.label}
            </button>
          ))}
        </div>
        {pendingAction === 'status' ? (
          <p className="mt-3 px-1 text-xs font-medium text-muted-foreground">Status wird gespeichert...</p>
        ) : null}
      </section>

      <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
        <div className="mb-3">
          <h3 className="font-sans text-sm font-semibold text-[#192436]">Markierungen</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Ordne den Boulder für später ein.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isTrackSaving}
            onClick={() => {
              void saveTrackState({
                status,
                isFavorite: !isFavorite,
                isProject,
              }, 'favorite');
            }}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-kws-control px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-55',
              isFavorite ? 'bg-primary text-primary-foreground' : 'bg-secondary text-[#192436] hover:bg-secondary/75',
              pendingAction === 'favorite' && 'ring-2 ring-primary/25',
            )}
            aria-pressed={isFavorite}
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-primary-foreground')} />
            Favorit
          </button>
          <button
            type="button"
            disabled={isTrackSaving}
            onClick={() => {
              void saveTrackState({
                status,
                isFavorite,
                isProject: !isProject,
              }, 'project');
            }}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-kws-control px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-55',
              isProject ? 'bg-primary text-primary-foreground' : 'bg-secondary text-[#192436] hover:bg-secondary/75',
              pendingAction === 'project' && 'ring-2 ring-primary/25',
            )}
            aria-pressed={isProject}
          >
            <Target className="h-4 w-4" />
            Projekt
          </button>
        </div>
        {pendingAction === 'favorite' || pendingAction === 'project' ? (
          <p className="mt-3 px-1 text-xs font-medium text-muted-foreground">Markierung wird gespeichert...</p>
        ) : null}
      </section>

      <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sessions ({sessions.length})</h4>
          <button
            type="button"
            onClick={() => setShowAddSession(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Hinzufügen
          </button>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((session: BoulderTrackingSession) => (
              <div key={session.id} className="flex items-center justify-between rounded-kws-control bg-secondary px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{format(new Date(session.session_date), 'dd. MMM yyyy', { locale: de })}</span>
                  <span className="text-xs text-muted-foreground">
                    {session.attempt_count} {session.attempt_count === 1 ? 'Versuch' : 'Versuche'}
                  </span>
                </div>
                <span
                  className={cn(
                    'rounded-kws-badge px-2.5 py-0.5 text-[10px] font-bold',
                    session.result === 'flash'
                      ? 'bg-primary text-primary-foreground'
                      : session.result === 'top'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {sessionResultLabels[session.result]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Noch keine Sessions. Starte dein Tracking.</p>
        )}
      </section>

      {pendingAction === 'status' && pendingAction === 'favorite' && (


        <p className="px-1 text-xs font-medium text-muted-foreground">Ungespeicherte Änderungen bleiben beim Tabwechsel erhalten.</p>

      )}

      <SessionSheet
        open={showAddSession}
        onOpenChange={setShowAddSession}
        isSaving={addSession.isPending}
        onSave={async (payload) => {
          await addSession.mutateAsync(payload);
          await upsertTick.mutateAsync({
            status: payload.result,
            attemptCount: payload.attemptCount,
            note: payload.note,
            isFavorite,
            isProject,
          });
        }}
      />
    </div>
  );
}

*/

export function BoulderTrackTab({ boulder }: { boulder: Boulder }) {
  const { user } = useAuth();
  const communityQuery = useBoulderCommunity(boulder.id);
  const summary = communityQuery.data;
  const sessionsQuery = useBoulderTrackingSessions(boulder.id);
  const upsertSession = useUpsertBoulderTrackingSession(boulder.id);
  const upsertTick = useUpsertBoulderTick(boulder.id);
  const deleteTick = useDeleteBoulderTick(boulder.id);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isProject, setIsProject] = useState(false);
  const [showSessionSheet, setShowSessionSheet] = useState(false);
  const [pendingAction, setPendingAction] = useState<'attempt' | 'top' | 'flash' | 'favorite' | 'project' | 'session' | null>(null);
  const [optimisticTodaySession, setOptimisticTodaySession] = useState<BoulderTrackingSession | null | undefined>(undefined);

  const currentTick = summary?.myTick ?? null;
  const todaySessionDate = format(new Date(), 'yyyy-MM-dd');
  const sessions = sessionsQuery.data ?? EMPTY_TRACKING_SESSIONS;
  const todaySession = useMemo(
    () => sessions.find((session) => session.session_date === todaySessionDate) ?? null,
    [sessions, todaySessionDate],
  );
  const effectiveTodaySession = optimisticTodaySession === undefined ? todaySession : optimisticTodaySession;
  const isMutationPending = upsertSession.isPending || upsertTick.isPending || deleteTick.isPending;
  const trackingNote = effectiveTodaySession?.note ?? currentTick?.note ?? '';

  useEffect(() => {
    setIsFavorite(currentTick?.is_favorite ?? false);
    setIsProject(currentTick?.is_project ?? false);
  }, [currentTick?.id, currentTick?.is_favorite, currentTick?.is_project, currentTick?.updated_at]);

  useEffect(() => {
    setOptimisticTodaySession(undefined);
  }, [todaySession?.id, todaySession?.updated_at, todaySession?.result, todaySession?.attempt_count, todaySession?.note]);

  if (!user) {
    return <div className="rounded-kws-card bg-card p-4 text-sm text-muted-foreground shadow-[0_3px_14px_rgba(19,17,43,0.07)]">Track ist privat und nur für angemeldete Nutzer sichtbar.</div>;
  }

  const buildOptimisticTodaySession = (payload: { result: BoulderTickStatus; attemptCount: number; note?: string }) => ({
    id: effectiveTodaySession?.id ?? `local-${boulder.id}-${todaySessionDate}`,
    boulder_id: boulder.id,
    user_id: user.id,
    session_date: todaySessionDate,
    result: payload.result,
    attempt_count: payload.attemptCount,
    note: payload.note?.trim() || null,
    created_at: effectiveTodaySession?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const persistTodaySession = async (
    payload: { result: BoulderTickStatus; attemptCount: number; note?: string },
    action: 'attempt' | 'top' | 'flash' | 'session',
  ) => {
    const normalizedAttemptCount = payload.result === 'flash' ? 1 : Math.max(1, payload.attemptCount);

    if (payload.result === 'flash' && payload.attemptCount > 1) {
      throw new Error('Flash ist nur im ersten Versuch möglich.');
    }

    const previousSession = effectiveTodaySession;
    setOptimisticTodaySession(buildOptimisticTodaySession({
      result: payload.result,
      attemptCount: normalizedAttemptCount,
      note: payload.note,
    }));
    setPendingAction(action);

    try {
      await upsertSession.mutateAsync({
        sessionDate: todaySessionDate,
        result: payload.result,
        attemptCount: normalizedAttemptCount,
        note: payload.note,
      });

      await upsertTick.mutateAsync({
        status: payload.result,
        attemptCount: normalizedAttemptCount,
        note: payload.note,
        isFavorite,
        isProject,
      });

      await Promise.all([communityQuery.refetch(), sessionsQuery.refetch()]);
    } catch (error) {
      setOptimisticTodaySession(previousSession);
      await Promise.allSettled([communityQuery.refetch(), sessionsQuery.refetch()]);
      throw error;
    } finally {
      setPendingAction(null);
    }
  };

  const persistMarkers = async (
    nextMarkers: { isFavorite: boolean; isProject: boolean },
    action: 'favorite' | 'project',
  ) => {
    if (isMutationPending) {
      return;
    }

    const previousMarkers = { isFavorite, isProject };
    setIsFavorite(nextMarkers.isFavorite);
    setIsProject(nextMarkers.isProject);
    setPendingAction(action);

    const shouldDeleteTick = !nextMarkers.isFavorite
      && !nextMarkers.isProject
      && !effectiveTodaySession
      && (!currentTick || isMarkerOnlyTick(currentTick));

    try {
      if (shouldDeleteTick) {
        if (currentTick) {
          await deleteTick.mutateAsync();
        }
        await communityQuery.refetch();
        return;
      }

      await upsertTick.mutateAsync({
        status: effectiveTodaySession?.result ?? currentTick?.status ?? 'attempted',
        attemptCount: effectiveTodaySession?.attempt_count ?? currentTick?.attempt_count ?? null,
        note: effectiveTodaySession?.note ?? currentTick?.note ?? undefined,
        isFavorite: nextMarkers.isFavorite,
        isProject: nextMarkers.isProject,
      });

      await communityQuery.refetch();
    } catch {
      setIsFavorite(previousMarkers.isFavorite);
      setIsProject(previousMarkers.isProject);
      await communityQuery.refetch();
    } finally {
      setPendingAction(null);
    }
  };

  const handleAttemptIncrement = () => {
    if (isMutationPending) {
      return;
    }

    void persistTodaySession(
      {
        result: 'attempted',
        attemptCount: (effectiveTodaySession?.attempt_count ?? 0) + 1,
        note: trackingNote,
      },
      'attempt',
    ).catch(() => {});
  };

  const handleTop = () => {
    if (isMutationPending) {
      return;
    }

    void persistTodaySession(
      {
        result: 'top',
        attemptCount: Math.max(effectiveTodaySession?.attempt_count ?? 1, 1),
        note: trackingNote,
      },
      'top',
    ).catch(() => {});
  };

  const handleFlash = () => {
    if (isMutationPending) {
      return;
    }

    if ((effectiveTodaySession?.attempt_count ?? 0) > 1) {
      toast.error('Flash ist nur im ersten Versuch möglich.');
      return;
    }

    void persistTodaySession(
      {
        result: 'flash',
        attemptCount: 1,
        note: trackingNote,
      },
      'flash',
    ).catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-kws-control bg-secondary px-3 py-2 text-muted-foreground">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-kws-badge bg-white text-primary shadow-[0_2px_8px_rgba(19,17,43,0.08)]">
          <Lock className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-medium">Privat · nur für dich sichtbar</span>
      </div>

      <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-sans text-sm font-semibold text-[#192436]">Heute</h3>
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
              {format(new Date(), 'EEEE, dd. MMMM', { locale: de })}
            </p>
          </div>
          {effectiveTodaySession ? (
            <span className="rounded-kws-badge bg-primary/[0.15] px-2.5 py-1 text-[10px] font-semibold text-primary">
              {sessionResultLabels[effectiveTodaySession.result]}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-kws-control bg-secondary p-3">
          <div className="min-w-0">
            {effectiveTodaySession ? (
              <>
                <p className="text-sm font-semibold text-[#192436]">
                  {effectiveTodaySession.attempt_count} {effectiveTodaySession.attempt_count === 1 ? 'Versuch' : 'Versuche'}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {effectiveTodaySession.note || 'Noch keine Notiz hinterlegt.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[#192436]">Noch kein Eintrag</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Starte deine Session für diesen Boulder.</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowSessionSheet(true)}
            className={cn(
              'flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-kws-control px-3 text-xs font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              effectiveTodaySession ? 'bg-white text-[#192436] shadow-[0_2px_8px_rgba(19,17,43,0.08)]' : 'bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(54,181,49,0.18)]',
            )}
          >
            {effectiveTodaySession ? <Pencil className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {effectiveTodaySession ? 'Bearbeiten' : 'Heute starten'}
          </button>
        </div>

        <div className="mt-4 border-t border-border/80 pt-4">
          <p className="mb-2.5 text-xs font-semibold text-[#192436]">Schnell erfassen</p>
          <div className="grid grid-cols-3 gap-2">
            {quickTrackActions.map((action) => {
            const Icon = action.icon;
            const isActive = action.key === 'attempt'
              ? effectiveTodaySession?.result === 'attempted'
              : action.key === 'top'
                ? effectiveTodaySession?.result === 'top'
                : effectiveTodaySession?.result === 'flash';

            const onClick = action.key === 'attempt'
              ? handleAttemptIncrement
              : action.key === 'top'
                ? handleTop
                : handleFlash;

            return (
              <button
                key={action.key}
                type="button"
                disabled={isMutationPending}
                onClick={onClick}
                className={cn(
                  'flex min-h-12 items-center justify-center gap-1.5 rounded-kws-control px-2 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-55',
                  isActive ? 'bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(54,181,49,0.18)]' : 'bg-secondary text-[#192436] hover:bg-secondary/75',
                  pendingAction === action.key && 'ring-2 ring-primary/25',
                )}
                aria-pressed={isActive}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{action.label}</span>
              </button>
            );
            })}
          </div>
        </div>

        {pendingAction === 'attempt' || pendingAction === 'top' || pendingAction === 'flash' ? (
          <p className="mt-3 px-1 text-[11px] font-medium text-muted-foreground">Tracking wird gespeichert …</p>
        ) : null}
      </section>

      <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
        <div className="mb-3">
          <h3 className="font-sans text-sm font-semibold text-[#192436]">Markierungen</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Ordne den Boulder für später ein.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isMutationPending}
            onClick={() => {
              void persistMarkers({
                isFavorite: !isFavorite,
                isProject,
              }, 'favorite');
            }}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-kws-control px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-55',
              isFavorite ? 'bg-primary text-primary-foreground' : 'bg-secondary text-[#192436] hover:bg-secondary/75',
              pendingAction === 'favorite' && 'ring-2 ring-primary/25',
            )}
            aria-pressed={isFavorite}
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-primary-foreground')} />
            Favorit
          </button>
          <button
            type="button"
            disabled={isMutationPending}
            onClick={() => {
              void persistMarkers({
                isFavorite,
                isProject: !isProject,
              }, 'project');
            }}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-kws-control px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-55',
              isProject ? 'bg-primary text-primary-foreground' : 'bg-secondary text-[#192436] hover:bg-secondary/75',
              pendingAction === 'project' && 'ring-2 ring-primary/25',
            )}
            aria-pressed={isProject}
          >
            <Target className="h-4 w-4" />
            Projekt
          </button>
        </div>
        {pendingAction === 'favorite' || pendingAction === 'project' ? (
          <p className="mt-3 px-1 text-[11px] font-medium text-muted-foreground">Markierung wird gespeichert …</p>
        ) : null}
      </section>

      <section className="rounded-kws-card bg-card p-4 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-sans text-sm font-semibold text-[#192436]">Sessionverlauf</h3>
          <span className="rounded-kws-badge bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{sessions.length}</span>
        </div>

        {sessions.length > 0 ? (
          <div className="divide-y divide-border/80">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'py-3 first:pt-1 last:pb-1',
                  session.session_date === todaySessionDate && 'border-l-2 border-primary pl-3',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-[#192436]">{format(new Date(session.session_date), 'dd. MMMM yyyy', { locale: de })}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {session.attempt_count} {session.attempt_count === 1 ? 'Versuch' : 'Versuche'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-kws-badge px-2.5 py-0.5 text-[10px] font-bold',
                      session.result === 'flash'
                        ? 'bg-primary text-primary-foreground'
                        : session.result === 'top'
                          ? 'bg-primary/[0.14] text-primary'
                          : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {sessionResultLabels[session.result]}
                  </span>
                </div>
                {session.note ? (
                  <p className="mt-2 text-xs leading-5 text-foreground/80">{session.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-kws-control bg-secondary p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-kws-control bg-white text-primary shadow-[0_2px_8px_rgba(19,17,43,0.08)]">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-[#192436]">Noch keine Sessions</p>
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">Deine Einträge erscheinen hier chronologisch.</p>
            </div>
          </div>
        )}
      </section>

      <SessionSheet
        open={showSessionSheet}
        onOpenChange={setShowSessionSheet}
        session={effectiveTodaySession}
        isSaving={pendingAction === 'session' || upsertSession.isPending || upsertTick.isPending}
        onSave={(payload) => persistTodaySession(payload, 'session')}
      />
    </div>
  );
}

export function BoulderBetaTab({ boulder }: { boulder: Boulder }) {
  const videoUrl = boulder.betaVideoUrls?.hd || boulder.betaVideoUrls?.sd || boulder.betaVideoUrls?.low || boulder.betaVideoUrl;

  const betaCards = [
    { id: 'official', user: 'Offiziell', duration: videoUrl ? 'Live' : '–', isOfficial: true, isInteractive: !!videoUrl },
    { id: 'slot-1', user: 'Coming soon', duration: '–', isOfficial: false },
    { id: 'slot-2', user: 'Coming soon', duration: '–', isOfficial: false },
    { id: 'slot-3', user: 'Coming soon', duration: '–', isOfficial: false },
    { id: 'slot-4', user: 'Coming soon', duration: '–', isOfficial: false },
    { id: 'slot-5', user: 'Coming soon', duration: '–', isOfficial: false },
  ];

  const handleOfficialVideoCardClick = () => {
    const videoElement = document.querySelector('video');
    if (!(videoElement instanceof HTMLVideoElement)) {
      return;
    }

    videoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    void videoElement.play().catch(() => {
      // Manche Browser blockieren autoplay trotz Nutzergeste bei Navigationsübergängen.
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Beta Videos</h4>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-4 xl:grid-cols-5">
          {betaCards.map((beta) => (
            <div
              key={beta.id}
              className={cn(
                'group relative aspect-[9/16] overflow-hidden rounded-kws-card bg-secondary',
                beta.isInteractive && 'transition-transform active:scale-95',
              )}
            >
              {beta.isOfficial ? (
                beta.isInteractive ? (
                  <button
                    type="button"
                    onClick={handleOfficialVideoCardClick}
                    className="absolute inset-0 z-[1] opacity-15"
                    style={{ background: `linear-gradient(135deg, ${boulder.colorHex || '#36B531'}66, transparent)` }}
                    aria-label="Offizielles Beta-Video abspielen"
                  />
                ) : (
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{ background: `linear-gradient(135deg, ${boulder.colorHex || '#36B531'}66, transparent)` }}
                  />
                )
              ) : (
                <div className="absolute inset-0 bg-muted/30" />
              )}

              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-kws-control', beta.isOfficial ? 'bg-primary/90 shadow-md' : 'bg-foreground/20 backdrop-blur-sm')}>
                  <Play className={cn('ml-0.5 h-4 w-4', beta.isOfficial ? 'text-primary-foreground' : 'text-foreground')} />
                </div>
              </div>

              <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-background/70 px-1.5 py-0.5 backdrop-blur-sm">
                {beta.isOfficial && <BadgeCheck className="h-2.5 w-2.5 text-primary" />}
                <span className="text-[8px] font-bold text-foreground">{beta.user}</span>
              </div>

              <div className="absolute bottom-1.5 left-1.5 right-1.5">
                <span className="flex items-center gap-1 text-[9px] font-medium text-foreground/80">
                  <Clock className="h-2.5 w-2.5" />
                  {beta.duration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



