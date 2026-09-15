import type { Boulder } from '@/types/boulder';
import type { BoulderTick, BoulderTrackingSession } from '@/types/community';

export interface TrackedBoulderMetadata {
  id: string; name: string; color: string; difficulty: number | null; created_at: string;
  status?: 'haengt' | 'abgeschraubt'; thumbnail_url?: string | null;
}
export interface TrackedBoulderItem { boulder: TrackedBoulderMetadata | null; tick: BoulderTick }
export type PersonalReader = <T>(path: string) => Promise<T[]>;

/** Stable cursor, including servers with a lower row cap than our page size.
 * Fail explicitly on malformed/repeating pages; never return a partial success.
 */
export async function readPersonalRows<T extends { id: string; user_id: string }>(
  table: 'boulder_ticks' | 'boulder_tracking_sessions', owner: string, select: string,
  read: PersonalReader, limit: number | null = null,
): Promise<T[]> {
  if (!owner) throw new Error('Bitte melde dich erneut an.');
  if (limit !== null && (!Number.isInteger(limit) || limit < 0)) throw new Error('Ungültige Anzahl.');
  if (limit === 0) return [];
  const rows: T[] = []; let cursor = '';
  for (let page = 0; page < 500; page++) {
    const query = new URLSearchParams({ user_id:`eq.${owner}`, select, order:'id.asc', limit:String(Math.min(200, limit === null ? 200 : limit - rows.length)) });
    if (cursor) query.set('id', `gt.${cursor}`);
    const batch = await read<T>(`/rest/v1/${table}?${query}`);
    if (!Array.isArray(batch)) throw new Error('Trackingdaten konnten nicht vollständig gelesen werden.');
    if (!batch.length) return rows;
    for (const row of batch) {
      if (row.user_id !== owner || !row.id || row.id <= cursor) throw new Error('Tracking-Zuordnung oder Reihenfolge ist ungültig.');
      cursor = row.id; rows.push(row);
    }
    if (limit !== null && rows.length >= limit) return rows.slice(0, limit);
  }
  throw new Error('Zu viele Trackingdaten. Bitte versuche es später erneut.');
}

export async function readTrackedBoulders(owner: string, read: PersonalReader, limit: number | null = null): Promise<TrackedBoulderItem[]> {
  const ticks = await readPersonalRows<BoulderTick>('boulder_ticks', owner,
    'id,boulder_id,user_id,status,attempt_count,note,is_favorite,is_project,created_at,updated_at', read, limit);
  const ids = [...new Set(ticks.map(tick => tick.boulder_id))];
  const boulders = new Map<string, TrackedBoulderMetadata>();
  for (let index = 0; index < ids.length; index += 100) {
    const batch = ids.slice(index, index + 100);
    // Page even metadata batches: an installation can impose a cap below 100.
    let cursor = '';
    for (let page = 0; page <= batch.length; page++) {
      const query = new URLSearchParams({ id:`in.(${batch.join(',')})`, select:'id,name,color,difficulty,created_at,status,thumbnail_url', order:'id.asc', limit:'100' });
      if (cursor) query.set('and', `(id.gt.${cursor})`);
      const rows = await read<TrackedBoulderMetadata>(`/rest/v1/boulders?${query}`);
      if (!Array.isArray(rows)) throw new Error('Boulderdaten konnten nicht gelesen werden.');
      if (!rows.length) break;
      for (const row of rows) {
        if (!batch.includes(row.id) || row.id <= cursor) throw new Error('Boulderdaten sind unvollständig.');
        cursor = row.id; boulders.set(row.id, { ...row, status: row.status === 'abgeschraubt' ? 'abgeschraubt' : 'haengt' });
      }
    }
  }
  return ticks.sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).map(tick=>({tick,boulder:boulders.get(tick.boulder_id) ?? null}));
}

export function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function validSessionDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split('-').map(Number); const date = new Date(y,m-1,d,12);
  return localDay(date) === value;
}
export function isSuccessful(status: string) { return status === 'top' || status === 'flash'; }
export function hasAttempt(tick: BoulderTick) { return isSuccessful(tick.status) || (tick.attempt_count ?? 0) > 0; }
export function gradeKey(difficulty: number | null | undefined) { return difficulty != null && Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 8 ? String(difficulty) : '?'; }

/** A session row is one boulder/day, not one visit. Old tick-only successes are
 * included in Gesamt, never attributed to the date a bookmark was edited.
 */
export function buildPersonalProgress(entries: TrackedBoulderItem[], sessions: BoulderTrackingSession[],
  { days = null, grade = null, now = new Date() }: {days?: number | null; grade?: string | null; now?:Date} = {}) {
  const today = localDay(now); const first = new Date(now); first.setDate(first.getDate() - ((days ?? 1) - 1));
  const from = days === null ? null : localDay(first);
  const metadata = new Map(entries.filter(e=>e.boulder).map(e=>[e.tick.boulder_id,e.boulder!]));
  const daily = new Map<string,BoulderTrackingSession>();
  for (const row of sessions) {
    if (!validSessionDay(row.session_date) || row.session_date > today) continue;
    const key = `${row.boulder_id}:${row.session_date}`; const previous=daily.get(key);
    if (!previous || row.updated_at > previous.updated_at || (row.updated_at === previous.updated_at && row.id > previous.id)) daily.set(key,row);
  }
  const allSessions = [...daily.values()].filter(row=>isSuccessful(row.result) || row.attempt_count > 0);
  const periodSessions = allSessions.filter(row=>!from || row.session_date >= from);
  const succeeded = new Map<string,'top'|'flash'>();
  const addSuccess = (id:string, result:string) => {
    if (isSuccessful(result) && succeeded.get(id) !== 'flash') succeeded.set(id,result as 'top'|'flash');
  };
  periodSessions.forEach(row=>addSuccess(row.boulder_id,row.result));
  const datedSuccess = new Set(allSessions.filter(row=>isSuccessful(row.result)).map(row=>row.boulder_id));
  let legacySuccesses = 0;
  if (days === null) entries.forEach(({tick})=>{
    if (isSuccessful(tick.status) && !datedSuccess.has(tick.boulder_id)) legacySuccesses++;
    addSuccess(tick.boulder_id,tick.status);
  });
  const distribution = [...Array.from({length:8},(_,i)=>String(i+1)), '?'].map(key=>({grade:key,
    tops:[...succeeded.keys()].filter(id=>gradeKey(metadata.get(id)?.difficulty)===key).length,
    flashes:[...succeeded].filter(([id,status])=>status==='flash' && gradeKey(metadata.get(id)?.difficulty)===key).length,
  }));
  const matches = (id:string)=>!grade || gradeKey(metadata.get(id)?.difficulty)===grade;
  const scopedSuccess = [...succeeded].filter(([id])=>matches(id));
  const scopedSessions = periodSessions.filter(row=>matches(row.boulder_id));
  const climbedDays = new Set(scopedSessions.map(row=>row.session_date));
  const daysByDate = [...climbedDays].sort().map(date=>({date, entries:scopedSessions.filter(row=>row.session_date===date)}));
  const highestGrade = scopedSuccess.reduce<number|null>((max,[id])=>{
    const key=gradeKey(metadata.get(id)?.difficulty); return key==='?' ? max : Math.max(max ?? 0,Number(key));
  },null);
  return { from, today, tops:scopedSuccess.length, flashes:scopedSuccess.filter(([,result])=>result==='flash').length,
    days:climbedDays.size, attempts:scopedSessions.reduce((sum,row)=>sum+Math.max(0,row.attempt_count || 0),0), highestGrade,
    distribution, daysByDate, legacySuccesses,
    successIds:new Set(succeeded.keys()),
    recent:[...scopedSessions].sort((a,b)=>b.session_date.localeCompare(a.session_date)||b.updated_at.localeCompare(a.updated_at)||b.id.localeCompare(a.id)),
  };
}

/** Cards always get transformed display data, never raw REST tick metadata. */
export function homeFocusBoulders(entries: TrackedBoulderItem[], boulders: Boulder[], successIds: Set<string>) {
  const full = new Map(boulders.map(b=>[b.id,b]));
  return entries.filter(({tick})=>!successIds.has(tick.boulder_id) && (tick.is_project || tick.is_favorite || hasAttempt(tick)))
    .map(entry=>({...entry,boulder:full.get(entry.tick.boulder_id)}))
    .filter((entry):entry is {boulder:Boulder;tick:BoulderTick}=>Boolean(entry.boulder && entry.boulder.status !== 'abgeschraubt'))
    .sort((a,b)=>Number(b.tick.is_project)-Number(a.tick.is_project)||b.tick.updated_at.localeCompare(a.tick.updated_at));
}
