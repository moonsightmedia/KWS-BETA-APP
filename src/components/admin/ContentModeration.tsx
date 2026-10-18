import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { AdminViewBar } from '@/components/admin/AdminViewBar';
import { moderateContent, reportReasons } from '@/lib/communitySafety';
import { useAuth } from '@/hooks/useAuth';
import { useModerationQueues } from '@/hooks/useModerationQueues';

export function ContentModeration() {
  const { user } = useAuth();
  const client = useQueryClient();
  const { comments, reports } = useModerationQueues(user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('moderationView') === 'reports' ? 'reports' : 'comments';
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const current = view === 'comments' ? comments : reports;
  const refresh = () => { void Promise.all([comments.refetch(), reports.refetch()]); };
  const changeView = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('moderationView', value);
    setSearchParams(next);
  };
  async function act(...args: Parameters<typeof moderateContent>) {
    if (busyRef.current) return;
    busyRef.current = true;
    const trigger = document.activeElement;
    setBusy(true); setError('');
    try {
      await moderateContent(...args);
      await Promise.all(['content-reports', 'pending-comments', 'boulder-comments', 'boulders', 'admin-boulder-comments'].map(key => client.invalidateQueries({ queryKey: [key] })));
      if (trigger && !trigger.isConnected) panel.current?.focus();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Aktion fehlgeschlagen.');
    } finally { busyRef.current = false; setBusy(false); }
  }
  return <div className="space-y-4">
    <AdminViewBar refreshing={comments.isFetching || reports.isFetching} onRefresh={refresh} disabled={busy}>
      <KwsSegmentedControl value={view} onValueChange={changeView} ariaLabel="Moderationsansicht" options={[
        { value: 'comments', label: `Kommentare${comments.data ? ` (${comments.data.length})` : ''}` },
        { value: 'reports', label: `Meldungen${reports.data ? ` (${reports.data.length})` : ''}` },
      ]} />
    </AdminViewBar>
    <details className="text-sm text-muted-foreground">
      <summary className="w-fit cursor-pointer rounded-kws-control py-2 text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Hinweise zur Moderation</summary>
      <p className="mt-1 max-w-3xl">Marketing prüft Kommentare vor der Veröffentlichung und bearbeitet Inhaltsmeldungen. Ausblenden und Sperren lassen sich rückgängig machen. <Link to="/community-rules" className="text-primary-ink underline">Community-Regeln und Kontakt</Link></p>
    </details>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <KwsSurface ref={panel} role="region" aria-label={view === 'comments' ? 'Kommentare zur Freigabe' : 'Offene Inhaltsmeldungen'} tabIndex={-1} className="space-y-3 p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <h2 className="text-base font-semibold">{view === 'comments' ? 'Kommentare zur Freigabe' : 'Offene Inhaltsmeldungen'}</h2>
      {current.isLoading ? <p role="status" className="text-sm">{view === 'comments' ? 'Kommentare werden geladen …' : 'Meldungen werden geladen …'}</p> : current.isError ? <div role="alert" className="text-sm">{view === 'comments' ? 'Kommentare konnten nicht geladen werden.' : 'Meldungen konnten nicht geladen werden.'} <Button variant="outline" disabled={current.isFetching || busy} onClick={() => void current.refetch()}>Erneut versuchen</Button></div> : view === 'comments' ?
        comments.data?.length === 0 ? <p className="text-sm text-muted-foreground">Keine Kommentare zur Freigabe.</p> : comments.data?.map(comment => <article key={comment.id} className="space-y-2 border-t border-border py-3"><Link className="text-sm text-primary-ink underline" to={`/boulders/${comment.boulder_id}`}>Boulder ansehen</Link><p className="whitespace-pre-wrap break-words text-sm">{comment.comment}</p><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => act('comment', comment.id, 'approve')}>Freigeben</Button><Button disabled={busy} variant="outline" onClick={() => act('comment', comment.id, 'reject')}>Ablehnen</Button></div></article>) :
        reports.data?.length === 0 ? <p className="text-sm text-muted-foreground">Keine offenen Meldungen.</p> : reports.data?.map(report => <article key={report.id} className="space-y-2 border-t border-border py-3"><p className="text-sm font-semibold">{report.kind === 'comment' ? 'Kommentar' : report.kind === 'profile' ? 'Profil' : 'Boulder'} · {reportReasons.find(([key]) => key === report.reason)?.[1]}</p><p className="whitespace-pre-wrap break-words rounded-kws-control bg-secondary p-3 text-sm">{report.content_text || 'Inhalt inzwischen entfernt.'}</p>{report.boulder_id && <Link className="text-sm text-primary-ink underline" to={`/boulders/${report.boulder_id}`}>Boulder ansehen</Link>}<p className="whitespace-pre-wrap break-words text-sm">{report.detail || 'Keine zusätzliche Beschreibung.'}</p><div className="flex flex-wrap gap-2"><Button disabled={busy} variant="outline" onClick={() => act(report.kind, report.target_id, 'hide')}>Inhalt ausblenden</Button><Button disabled={busy} variant="outline" onClick={() => act(report.kind, report.target_id, 'restore')}>Wieder einblenden</Button>{report.subject_user_id && <><Button disabled={busy} variant="outline" onClick={() => act('profile', report.subject_user_id!, 'ban', 'Moderation einer Inhaltsmeldung: ' + report.reason)}>Veröffentlichungen sperren</Button><Button disabled={busy} variant="outline" onClick={() => act('profile', report.subject_user_id!, 'unban')}>Sperre aufheben</Button></>}<Button disabled={busy} onClick={() => act('report', report.id, 'resolve')}>Als bearbeitet markieren</Button></div></article>)}
    </KwsSurface>
  </div>;
}