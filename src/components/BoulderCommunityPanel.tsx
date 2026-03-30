import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, Award, Check, ChevronLeft, ChevronRight, Flame, MessageSquare, Pencil, Send, Star, Target, Trash2, TrendingUp, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useBoulderComments, useBoulderCommunity, useDeleteBoulderTick, useUpsertBoulderGradeFeedback, useUpsertBoulderRating, useUpsertBoulderTick } from '@/hooks/useBoulderCommunity';
import { getBoulderAttributeHint, getBoulderAttributeIcon } from '@/lib/boulderAttributes';
import { cn } from '@/lib/utils';
import type { Boulder } from '@/types/boulder';
import type { BoulderComment, BoulderCommunityAttribute, BoulderGradeFeedback, BoulderTickStatus } from '@/types/community';

const gradeFeedbackOptions: Array<{ value: BoulderGradeFeedback; label: string; icon: LucideIcon }> = [
  { value: 'too_easy', label: 'Zu leicht', icon: ArrowDown },
  { value: 'just_right', label: 'Passt', icon: Check },
  { value: 'too_hard', label: 'Zu schwer', icon: ArrowUp },
];

const tickOptions: Array<{ value: BoulderTickStatus; label: string; icon: LucideIcon; helper: string }> = [
  { value: 'attempted', label: 'Versucht', icon: Target, helper: 'Session gestartet' },
  { value: 'top', label: 'Top', icon: Award, helper: 'Geloest' },
  { value: 'flash', label: 'Flash', icon: Zap, helper: 'Direkt im ersten Go' },
];

const compactNumber = (value: number) => Intl.NumberFormat('de-DE', { notation: 'compact' }).format(value);

function useTrackingState(boulderId: string) {
  const { user, loading } = useAuth();
  const { data: summary, isLoading: summaryLoading } = useBoulderCommunity(boulderId);
  const upsertTick = useUpsertBoulderTick(boulderId);
  const deleteTick = useDeleteBoulderTick(boulderId);
  const [tickStatus, setTickStatus] = useState<BoulderTickStatus>('attempted');
  const [attemptCount, setAttemptCount] = useState(1);
  const [tickNote, setTickNote] = useState('');

  useEffect(() => {
    if (summary?.myTick) {
      setTickStatus(summary.myTick.status);
      setAttemptCount(summary.myTick.attempt_count && summary.myTick.attempt_count > 0 ? summary.myTick.attempt_count : 1);
      setTickNote(summary.myTick.note || '');
      return;
    }
    setTickStatus('attempted');
    setAttemptCount(1);
    setTickNote('');
  }, [summary?.myTick]);

  return {
    user,
    loading,
    summary,
    summaryLoading,
    tickStatus,
    setTickStatus,
    attemptCount: tickStatus === 'flash' ? 1 : Math.max(1, attemptCount),
    setAttemptCount,
    tickNote,
    setTickNote,
    upsertTick,
    deleteTick,
  };
}

function useStatsState(boulderId: string) {
  const { user, loading } = useAuth();
  const { data: summary, isLoading: summaryLoading } = useBoulderCommunity(boulderId);
  const commentsQuery = useBoulderComments(boulderId);
  const upsertRating = useUpsertBoulderRating(boulderId);
  const upsertGradeFeedback = useUpsertBoulderGradeFeedback(boulderId);
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState('');

  return {
    user,
    loading,
    summary,
    summaryLoading,
    selectedAttributes: (summary?.attributes || []).filter((attribute) => attribute.selected),
    comments: commentsQuery.data || [],
    commentsQuery,
    upsertRating,
    upsertGradeFeedback,
    commentDraft,
    setCommentDraft,
    editingCommentId,
    setEditingCommentId,
    editingCommentValue,
    setEditingCommentValue,
  };
}

function PanelFallback({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section className="rounded-2xl border border-[#DCEEDF] bg-[linear-gradient(180deg,#FFFFFF_0%,#F5FBF6_100%)] p-4 text-center sm:rounded-2xl sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/72">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#13112B]/62">{text}</p>
    </section>
  );
}

function AttributeTiles({ attributes, compact = false }: { attributes: BoulderCommunityAttribute[]; compact?: boolean }) {
  if (attributes.length === 0) {
    return <div className="rounded-2xl border border-dashed border-[#DCEEDF] bg-white/70 px-3 py-4 text-center text-xs text-[#13112B]/56 sm:px-4 sm:py-6 sm:text-sm">Noch keine Setter-Merkmale hinterlegt.</div>;
  }

  return (
    <div className={cn('grid gap-2.5 sm:gap-3', compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2')}>
      {attributes.map((attribute) => {
        const Icon = getBoulderAttributeIcon(attribute);
        return (
          <div key={attribute.id} className="relative overflow-hidden rounded-2xl border border-[#DCEEDF] bg-[linear-gradient(180deg,#FFFFFF_0%,#F2FAF3_100%)] p-3 sm:rounded-2xl sm:p-4">
            <div className="absolute right-0 top-0 h-16 w-16 rounded-full bg-[radial-gradient(circle,rgba(54,181,49,0.15),transparent_65%)] sm:h-20 sm:w-20" />
            <div className="relative flex items-start gap-2.5 sm:gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EFF7F0] text-[#36B531] sm:h-11 sm:w-11 sm:rounded-2xl"><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></span>
              <div>
                <p className="text-[13px] font-semibold leading-4 text-[#13112B] sm:text-sm">{attribute.label}</p>
                {!compact && <p className="mt-1 text-[11px] leading-4 text-[#13112B]/56 sm:text-xs sm:leading-5">{getBoulderAttributeHint(attribute.key)}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommentsFeed({ comments, currentUserId, editingCommentId, editingCommentValue, setEditingCommentId, setEditingCommentValue, commentsQuery }: { comments: BoulderComment[]; currentUserId: string; editingCommentId: string | null; editingCommentValue: string; setEditingCommentId: (value: string | null) => void; setEditingCommentValue: (value: string) => void; commentsQuery: ReturnType<typeof useBoulderComments>; }) {
  if (comments.length === 0) {
    return <div className="rounded-2xl border border-dashed border-[#DCEEDF] bg-white/70 px-3 py-4 text-center text-xs text-[#13112B]/56 sm:px-4 sm:py-6 sm:text-sm">Noch keine Rückmeldungen.</div>;
  }

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {comments.map((comment) => {
        const isOwnComment = comment.user_id === currentUserId;
        const isEditing = editingCommentId === comment.id;
        return (
          <article key={comment.id} className="rounded-2xl border border-[#DCEEDF] bg-white/92 p-3 sm:rounded-2xl sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#13112B]">{comment.author_name}</p>
                <p className="text-xs text-[#13112B]/48">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: de })}{comment.edited ? ' · geändert' : ''}</p>
              </div>
              {isOwnComment && !isEditing && (
                <div className="flex gap-1">
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-xl text-[#13112B]/56 transition hover:bg-[#F4F8F5] sm:h-9 sm:w-9 sm:rounded-2xl" onClick={() => { setEditingCommentId(comment.id); setEditingCommentValue(comment.comment); }}><Pencil className="h-4 w-4" /></button>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-xl text-[#D44C4C] transition hover:bg-[#FFF2F2] sm:h-9 sm:w-9 sm:rounded-2xl" onClick={() => commentsQuery.deleteComment.mutate(comment.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </div>
            {isEditing ? (
              <div className="mt-3 space-y-2">
                <Textarea rows={3} value={editingCommentValue} onChange={(event) => setEditingCommentValue(event.target.value)} className="resize-none rounded-2xl border-[#DCEEDF] bg-[#FBFDFB]" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="rounded-2xl bg-[#36B531] text-white hover:bg-[#2D9A29]" onClick={() => commentsQuery.updateComment.mutate({ id: comment.id, comment: editingCommentValue }, { onSuccess: () => { setEditingCommentId(null); setEditingCommentValue(''); } })} disabled={!editingCommentValue.trim()}>Speichern</Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-2xl border-[#DCEEDF]" onClick={() => { setEditingCommentId(null); setEditingCommentValue(''); }}>Abbrechen</Button>
                </div>
              </div>
            ) : (
              <p className="mt-2.5 whitespace-pre-wrap text-sm leading-5 text-[#13112B]/74 sm:mt-3 sm:leading-6">{comment.comment}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function BoulderBetaPreview({ boulder }: { boulder: Boulder }) {
  const { data: summary, isLoading } = useBoulderCommunity(boulder.id);
  const attributes = useMemo(() => (summary?.attributes || []).filter((attribute) => attribute.selected), [summary?.attributes]);

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-[#DCEEDF] bg-[linear-gradient(140deg,#FFFFFF_0%,#F2FAF3_100%)] p-3.5 shadow-[0_18px_40px_rgba(19,17,43,0.06)] sm:rounded-2xl sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#17641D]/70">Route DNA</p>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-[1.5rem] leading-none text-[#13112B] sm:text-[2rem]">Setter Focus</h3>
            <p className="mt-1.5 text-[13px] leading-5 text-[#13112B]/62 sm:mt-2 sm:text-sm sm:leading-6">Die Video-Beta bleibt im Fokus. Hier steht nur der Bewegungscharakter.</p>
          </div>
          <span className="rounded-full border border-[#DCEEDF] bg-white px-3 py-1 text-xs font-medium text-[#13112B]/58">{attributes.length} Merkmale</span>
        </div>
        <div className="mt-3.5 sm:mt-5">{isLoading ? <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">{[0, 1, 2, 3].map((item) => <div key={item} className="h-[84px] animate-pulse rounded-2xl bg-white/80 sm:h-[108px] sm:rounded-2xl" />)}</div> : <AttributeTiles attributes={attributes} compact />}</div>
      </section>
      <section className="grid gap-3 sm:gap-4">
        <div className="rounded-2xl border border-[#DCEEDF] bg-[#13112B] p-3.5 text-white sm:rounded-2xl sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/54">Setter Note</p>
          <p className="mt-2 text-[13px] leading-5 text-white/76 sm:mt-3 sm:text-sm sm:leading-6">{boulder.note?.trim() || 'Noch keine Setter-Notiz hinterlegt.'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div className="rounded-2xl border border-[#DCEEDF] bg-white/88 p-3 sm:rounded-2xl sm:p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/70 sm:text-[11px]">Flow</p><p className="mt-1.5 text-sm font-semibold text-[#13112B] sm:mt-2 sm:text-lg">{attributes[0]?.label || 'Video first'}</p></div>
          <div className="rounded-2xl border border-[#DCEEDF] bg-white/88 p-3 sm:rounded-2xl sm:p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/70 sm:text-[11px]">Tendenz</p><p className="mt-1.5 text-sm font-semibold text-[#13112B] sm:mt-2 sm:text-lg">{attributes[1]?.label || 'Noch offen'}</p></div>
        </div>
      </section>
    </div>
  );
}

export function BoulderTrackingPanel({ boulder }: { boulder: Boulder }) {
  const { user, loading, summary, summaryLoading, tickStatus, setTickStatus, attemptCount, setAttemptCount, tickNote, setTickNote, upsertTick, deleteTick } = useTrackingState(boulder.id);
  if (!user) {
    return <PanelFallback title="Tracking" text={loading ? 'Tracking wird geladen...' : 'Tracking ist nur sichtbar, wenn du angemeldet bist.'} />;
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="overflow-hidden rounded-2xl border border-[#DCEEDF] bg-[linear-gradient(180deg,#FFFFFF_0%,#F2FAF3_100%)] shadow-[0_18px_40px_rgba(19,17,43,0.06)] sm:rounded-2xl">
        <div className="border-b border-[#E7F7E9] px-3.5 py-3.5 sm:px-5 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#17641D]/72">Privates Logbook</p>
          <h3 className="mt-2 font-heading text-[1.7rem] leading-none text-[#13112B] sm:mt-3 sm:text-[2rem]">Tracking</h3>
          <p className="mt-1.5 text-[13px] leading-5 text-[#13112B]/62 sm:mt-2 sm:text-sm sm:leading-6">Nur für dich. Keine öffentlichen Namen, keine Community hier.</p>
        </div>
        <div className="grid gap-3.5 px-3.5 py-3.5 sm:gap-5 sm:px-5 sm:py-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {tickOptions.map((option) => {
              const Icon = option.icon;
              const isActive = tickStatus === option.value;
              return <button key={option.value} type="button" onClick={() => setTickStatus(option.value)} className={cn('rounded-xl border p-3 text-left transition-all sm:rounded-2xl sm:p-4', isActive ? 'border-[#36B531] bg-[#36B531] text-white shadow-[0_16px_30px_rgba(54,181,49,0.24)]' : 'border-[#DCEEDF] bg-white hover:-translate-y-0.5')}><span className={cn('grid h-8 w-8 place-items-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl', isActive ? 'bg-white/16' : 'bg-[#EFF7F0] text-[#36B531]')}><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></span><p className="mt-2.5 text-sm font-semibold sm:mt-4 sm:text-base">{option.label}</p><p className={cn('mt-1 text-[11px] leading-4 sm:text-sm', isActive ? 'text-white/78' : 'text-[#13112B]/56')}>{option.helper}</p></button>;
            })}
          </div>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-2xl bg-[#13112B] p-4 text-white sm:rounded-2xl sm:p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/54">Versuche</p><div className="mt-3 flex items-center justify-between gap-3 sm:mt-4 sm:gap-4"><button type="button" onClick={() => setAttemptCount(Math.max(1, attemptCount - 1))} disabled={tickStatus === 'flash'} className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/18 disabled:opacity-40 sm:h-12 sm:w-12 sm:rounded-2xl"><ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /></button><div className="text-center"><p className="text-3xl font-semibold leading-none sm:text-4xl">{tickStatus === 'flash' ? 1 : attemptCount}</p><p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-white/54 sm:mt-2 sm:text-xs">Attempts</p></div><button type="button" onClick={() => setAttemptCount(attemptCount + 1)} disabled={tickStatus === 'flash'} className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/18 disabled:opacity-40 sm:h-12 sm:w-12 sm:rounded-2xl"><ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" /></button></div></div>
            <div className="rounded-2xl border border-[#DCEEDF] bg-white/92 p-4 sm:rounded-2xl sm:p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/72">Session Note</p><Textarea rows={4} value={tickNote} onChange={(event) => setTickNote(event.target.value)} placeholder="Wie hat sich die Beta angefuehlt?" className="mt-3 resize-none rounded-xl border-[#DCEEDF] bg-[#FBFDFB] text-sm sm:mt-4 sm:rounded-2xl" /></div>
          </div>
        </div>
        <div className="border-t border-[#E7F7E9] bg-white/88 px-3.5 py-3 sm:px-5 sm:py-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[13px] text-[#13112B]/58 sm:text-sm">{summary?.myTick ? 'Dein Track ist privat gespeichert.' : 'Noch kein privater Track vorhanden.'}</p><div className="flex gap-2">{summary?.myTick && <Button type="button" variant="outline" className="h-10 rounded-xl border-[#F0D4D4] bg-white px-3 text-[#D44C4C] hover:bg-[#FFF5F5] sm:rounded-2xl" onClick={() => deleteTick.mutate()} disabled={deleteTick.isPending}>Entfernen</Button>}<Button type="button" className="h-10 rounded-xl bg-[#36B531] px-4 text-white hover:bg-[#2D9A29] sm:rounded-2xl" onClick={() => upsertTick.mutate({ status: tickStatus, attemptCount, note: tickNote })} disabled={upsertTick.isPending}>{upsertTick.isPending ? 'Speichert...' : summary?.myTick ? 'Aktualisieren' : 'Speichern'}</Button></div></div></div>
      </section>
      <section className="grid gap-3 sm:gap-4">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">{[{ label: 'Flash', value: summary?.tickSummary.flash_count ?? 0, icon: Zap }, { label: 'Top', value: summary?.tickSummary.top_count ?? 0, icon: Award }, { label: 'Versucht', value: summary?.tickSummary.attempted_count ?? 0, icon: Target }].map((card) => { const Icon = card.icon; return <div key={card.label} className="rounded-2xl border border-[#DCEEDF] bg-white/88 p-3 text-center sm:rounded-2xl sm:p-4"><span className="mx-auto grid h-8 w-8 place-items-center rounded-xl bg-[#EFF7F0] text-[#36B531] sm:h-10 sm:w-10 sm:rounded-2xl"><Icon className="h-4 w-4" /></span><p className="mt-2 text-xl font-semibold leading-none text-[#13112B] sm:mt-3 sm:text-2xl">{summaryLoading ? '…' : compactNumber(card.value)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[#13112B]/52 sm:text-xs">{card.label}</p></div>; })}</div>
        <div className="rounded-2xl border border-[#DCEEDF] bg-[linear-gradient(180deg,#13112B_0%,#211A3F_100%)] p-4 text-white sm:rounded-2xl sm:p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/54">Dein Status</p><p className="mt-2 text-xl font-semibold sm:mt-3 sm:text-2xl">{summary?.myTick ? tickOptions.find((option) => option.value === summary.myTick?.status)?.label : 'Noch nichts gespeichert'}</p><p className="mt-1.5 text-[13px] leading-5 text-white/72 sm:mt-2 sm:text-sm sm:leading-6">{summary?.myTick ? `Versuche: ${summary.myTick.attempt_count ?? 1}${summary.myTick.note ? ' · Notiz vorhanden' : ''}` : 'Sobald du trackst, erscheint hier dein privater Snapshot.'}</p></div>
      </section>
    </div>
  );
}

export function BoulderStatsPanel({ boulder }: { boulder: Boulder }) {
  const { user, loading, summary, summaryLoading, selectedAttributes, comments, commentsQuery, upsertRating, upsertGradeFeedback, commentDraft, setCommentDraft, editingCommentId, setEditingCommentId, editingCommentValue, setEditingCommentValue } = useStatsState(boulder.id);
  if (!user) {
    return <PanelFallback title="Stats" text={loading ? 'Stats werden geladen...' : 'Stats und Kommentare sind nur sichtbar, wenn du angemeldet bist.'} />;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 sm:gap-3">{[{ label: 'Rating', value: summary?.averageRating ? `${summary.averageRating.toFixed(1)}` : '–', icon: Star }, { label: 'Votes', value: summary?.ratingCount ?? 0, icon: TrendingUp }, { label: 'Kommentare', value: comments.length, icon: MessageSquare }, { label: 'Sends', value: summary?.tickSummary.total_ticks ?? 0, icon: Flame }].map((card, index) => { const Icon = card.icon; return <div key={card.label} className={cn('rounded-2xl border p-3 sm:rounded-2xl sm:p-4', index === 0 ? 'border-[#DCEEDF] bg-[linear-gradient(180deg,#FFFFFF_0%,#F1FAF2_100%)]' : 'border-[#E7F7E9] bg-white/88')}><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/70 sm:text-[11px]">{card.label}</p><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#EFF7F0] text-[#36B531] sm:h-10 sm:w-10 sm:rounded-2xl"><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-semibold leading-none text-[#13112B] sm:mt-5 sm:text-3xl">{summaryLoading ? '…' : card.value}</p></div>; })}</section>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="grid gap-4">
          <div className="rounded-2xl border border-[#DCEEDF] bg-[linear-gradient(180deg,#FFFFFF_0%,#F6FBF7_100%)] p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/72">Community Signal</p><h3 className="mt-2 font-heading text-[2rem] leading-none text-[#13112B]">Bewertung</h3><div className="mt-5 flex items-center gap-3">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onClick={() => upsertRating.mutate(star)} className={cn('grid h-12 w-12 place-items-center rounded-2xl border transition-all', (summary?.myRating ?? 0) >= star ? 'border-[#36B531] bg-[#36B531] text-white' : 'border-[#DCEEDF] bg-white text-[#36B531] hover:-translate-y-0.5')}><Star className="h-5 w-5" fill="currentColor" /></button>)}</div><p className="mt-4 text-sm leading-6 text-[#13112B]/60">Community-Durchschnitt: <span className="font-semibold text-[#13112B]">{summary?.averageRating ? summary.averageRating.toFixed(1) : 'Noch offen'}</span></p></div>
          <div className="rounded-2xl border border-[#DCEEDF] bg-white/92 p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/72">Grade Fit</p><h3 className="mt-2 font-heading text-[2rem] leading-none text-[#13112B]">Wie fuehlt sich der Grad an?</h3><div className="mt-5 grid gap-3 sm:grid-cols-3">{gradeFeedbackOptions.map((option) => { const Icon = option.icon; const isActive = summary?.myGradeFeedback === option.value; const count = summary?.gradeFeedbackCounts[option.value] ?? 0; return <button key={option.value} type="button" onClick={() => upsertGradeFeedback.mutate(option.value)} className={cn('rounded-2xl border p-4 text-left transition-all', isActive ? 'border-[#36B531] bg-[#36B531] text-white' : 'border-[#DCEEDF] bg-white hover:-translate-y-0.5')}><div className="flex items-center justify-between gap-3"><span className={cn('grid h-11 w-11 place-items-center rounded-2xl', isActive ? 'bg-white/16' : 'bg-[#EFF7F0] text-[#36B531]')}><Icon className="h-5 w-5" /></span><span className={cn('text-2xl font-semibold leading-none', isActive ? 'text-white' : 'text-[#13112B]')}>{compactNumber(count)}</span></div><p className="mt-4 text-sm font-semibold">{option.label}</p></button>; })}</div></div>
        </section>
        <section className="grid gap-4">
          <div className="rounded-2xl border border-[#DCEEDF] bg-[linear-gradient(180deg,#FFFFFF_0%,#F2FAF3_100%)] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/72">Setter DNA</p><h3 className="mt-2 font-heading text-[2rem] leading-none text-[#13112B]">Boulder-Merkmale</h3></div><span className="rounded-full border border-[#DCEEDF] bg-white px-3 py-1 text-xs font-medium text-[#13112B]/58">read-only</span></div><div className="mt-5"><AttributeTiles attributes={selectedAttributes} /></div></div>
          <div className="rounded-2xl border border-[#DCEEDF] bg-[linear-gradient(180deg,#13112B_0%,#211A3F_100%)] p-5 text-white"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/54">Session Echo</p><div className="mt-4 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-white/8 p-4 text-center"><p className="text-2xl font-semibold">{summary?.tickSummary.flash_count ?? 0}</p><p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/50">Flash</p></div><div className="rounded-2xl bg-white/8 p-4 text-center"><p className="text-2xl font-semibold">{summary?.tickSummary.top_count ?? 0}</p><p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/50">Top</p></div><div className="rounded-2xl bg-white/8 p-4 text-center"><p className="text-2xl font-semibold">{summary?.tickSummary.attempted_count ?? 0}</p><p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/50">Versucht</p></div></div></div>
        </section>
      </div>
      <section className="rounded-2xl border border-[#DCEEDF] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FBF8_100%)] p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/72">Kommentar Feed</p><h3 className="mt-2 font-heading text-[2rem] leading-none text-[#13112B]">Was sagen andere dazu?</h3></div><span className="rounded-full border border-[#DCEEDF] bg-white px-3 py-1 text-xs font-medium text-[#13112B]/58">{comments.length} Eintr?ge</span></div><div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]"><div className="rounded-2xl border border-[#DCEEDF] bg-white/92 p-4"><Textarea rows={4} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Kurze Beta, Crux oder Eindruck hinterlassen..." className="resize-none rounded-2xl border-[#DCEEDF] bg-[#FBFDFB]" /><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-[#13112B]/48">Kommentare sind f?r angemeldete Nutzer sichtbar.</p><Button type="button" className="rounded-2xl bg-[#36B531] text-white hover:bg-[#2D9A29]" onClick={() => commentsQuery.addComment.mutate(commentDraft, { onSuccess: () => setCommentDraft('') })} disabled={!commentDraft.trim() || commentsQuery.addComment.isPending}><Send className="mr-2 h-4 w-4" />Senden</Button></div></div><CommentsFeed comments={comments} currentUserId={user.id} editingCommentId={editingCommentId} editingCommentValue={editingCommentValue} setEditingCommentId={setEditingCommentId} setEditingCommentValue={setEditingCommentValue} commentsQuery={commentsQuery} /></div></section>
    </div>
  );
}

