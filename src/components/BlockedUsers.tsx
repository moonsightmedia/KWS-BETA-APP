import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { blockUser, getBlockedUsers } from '@/lib/communitySafety';
import { readDisplayProfiles } from '@/lib/displayProfiles';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
export function BlockedUsers() {
  const { user, session } = useAuth(); const client = useQueryClient();
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const query=useQuery({queryKey:['blocked-users',user?.id],enabled:!!user,queryFn:async()=>{
    const rows=await getBlockedUsers(); const profiles=await readDisplayProfiles(rows.map(row=>row.blocked_id),session?.access_token);
    return rows.map(row=>({...row,name:profiles.find(profile=>profile.id===row.blocked_id)?.full_name || 'Nutzer'}));
  }});
  async function unblock(id:string){setBusy(true);setError('');try{await blockUser(id,false);await client.invalidateQueries({queryKey:['blocked-users']});await client.invalidateQueries({queryKey:['boulder-comments']});}catch(failure){setError(failure instanceof Error?failure.message:'Sperre konnte nicht aufgehoben werden.');}finally{setBusy(false);}}
  return <KwsSurface className="space-y-3 p-4"><h2 className="text-base font-semibold">Blockierte Nutzer</h2><p className="text-sm text-muted-foreground">Persönliche Sperren blenden Kommentare für dich aus.</p>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{query.isLoading?<p role="status">Sperren werden geladen …</p>:query.isError?<div role="alert">Sperren konnten nicht geladen werden. <Button variant="outline" onClick={()=>query.refetch()}>Erneut versuchen</Button></div>:query.data?.length===0?<p className="text-sm text-muted-foreground">Du hast keine Nutzer blockiert.</p>:query.data?.map(row=><div key={row.blocked_id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><span className="min-w-0 break-words text-sm">{row.name}</span><Button variant="outline" disabled={busy} onClick={()=>unblock(row.blocked_id)}>Sperre aufheben</Button></div>)}</KwsSurface>;
}
