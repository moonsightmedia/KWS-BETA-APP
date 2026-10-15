import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { getOpenReports, getPendingComments, moderateContent, reportReasons } from '@/lib/communitySafety';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

export function ContentModeration() {
  const { user } = useAuth(); const client = useQueryClient();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const reports = useQuery({ queryKey: ['content-reports', user?.id], queryFn: getOpenReports, enabled: !!user, refetchInterval: 60_000 });
  const comments = useQuery({ queryKey: ['pending-comments', user?.id], queryFn: getPendingComments, enabled: !!user, refetchInterval: 60_000 });
  async function act(...args: Parameters<typeof moderateContent>) {
    if (busy) return; setBusy(true); setError('');
    try { await moderateContent(...args); await Promise.all(['content-reports','pending-comments','boulder-comments','boulders','admin-boulder-comments'].map(key => client.invalidateQueries({ queryKey: [key] }))); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Aktion fehlgeschlagen.'); } finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <KwsSurface className="space-y-2 p-4"><h2 className="text-base font-semibold">Moderation</h2><p className="text-sm text-muted-foreground">Marketing prüft neue Kommentare vor der Veröffentlichung und bearbeitet Inhaltsmeldungen. Ausblenden und Sperren sind rückgängig zu machen.</p><a href="/community-rules" className="text-sm text-primary-ink underline">Community-Regeln und Kontakt</a></KwsSurface>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <KwsSurface className="space-y-3 p-4"><h3 className="text-base font-semibold">Kommentare zur Freigabe</h3>
      {comments.isLoading ? <p role="status">Kommentare werden geladen …</p> : comments.isError ? <div role="alert">Kommentare konnten nicht geladen werden. <Button variant="outline" onClick={() => comments.refetch()}>Erneut versuchen</Button></div> : comments.data?.length === 0 ? <p className="text-sm text-muted-foreground">Keine Kommentare zur Freigabe.</p> : comments.data?.map(comment => <article key={comment.id} className="space-y-2 border-t border-border py-3"><Link className="text-sm text-primary-ink underline" to={`/boulders/${comment.boulder_id}`}>Boulder ansehen</Link><p className="whitespace-pre-wrap break-words text-sm">{comment.comment}</p><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => act('comment',comment.id,'approve')}>Freigeben</Button><Button disabled={busy} variant="outline" onClick={() => act('comment',comment.id,'reject')}>Ablehnen</Button></div></article>)}
    </KwsSurface>
    <KwsSurface className="space-y-3 p-4"><h3 className="text-base font-semibold">Offene Inhaltsmeldungen</h3>
      {reports.isLoading ? <p role="status">Meldungen werden geladen …</p> : reports.isError ? <div role="alert">Meldungen konnten nicht geladen werden. <Button variant="outline" onClick={() => reports.refetch()}>Erneut versuchen</Button></div> : reports.data?.length === 0 ? <p className="text-sm text-muted-foreground">Keine offenen Meldungen.</p> : reports.data?.map(report => <article key={report.id} className="space-y-2 border-t border-border py-3"><p className="text-sm font-semibold">{report.kind === 'comment' ? 'Kommentar' : report.kind === 'profile' ? 'Profil' : 'Boulder'} · {reportReasons.find(([key]) => key === report.reason)?.[1]}</p><p className="whitespace-pre-wrap break-words rounded-lg bg-secondary p-3 text-sm">{report.content_text || 'Inhalt inzwischen entfernt.'}</p>{report.boulder_id && <Link className="text-sm text-primary-ink underline" to={`/boulders/${report.boulder_id}`}>Boulder ansehen</Link>}<p className="whitespace-pre-wrap break-words text-sm">{report.detail || 'Keine zusätzliche Beschreibung.'}</p><div className="flex flex-wrap gap-2"><Button disabled={busy} variant="outline" onClick={() => act(report.kind,report.target_id,'hide')}>Inhalt ausblenden</Button><Button disabled={busy} variant="outline" onClick={() => act(report.kind,report.target_id,'restore')}>Wieder einblenden</Button>{report.subject_user_id && <><Button disabled={busy} variant="outline" onClick={() => act('profile',report.subject_user_id!,'ban','Moderation einer Inhaltsmeldung: '+report.reason)}>Veröffentlichungen sperren</Button><Button disabled={busy} variant="outline" onClick={() => act('profile',report.subject_user_id!,'unban')}>Sperre aufheben</Button></>}<Button disabled={busy} onClick={() => act('report',report.id,'resolve')}>Als bearbeitet markieren</Button></div></article>)}
    </KwsSurface>
  </div>;
}
