import type { MonitoringEvent } from './monitoringClient';

type Receipt = { accepted_ids: string[]; rejected_ids: string[] };
type Identity = { id: string; token: string } | null;

/** Diagnostics carry no account authority. Keep delivery separate from usage
 * so delivery cannot depend on the very login/session failure being reported.
 * Queue eligibility remains account-bound in MonitoringClient. */
export function createMonitoringTransport({ url, publicKey, identity, request = fetch }: {
  url: string; publicKey: string; identity: () => Identity; request?: typeof fetch;
}) {
  return async (events: MonitoringEvent[], owner: string | null): Promise<Receipt> => {
    if (!url || !publicKey || (owner && identity()?.id !== owner)) throw new Error('Monitoring session unavailable');
    const diagnostics = events.filter(event => event.name === 'app_error').map(event => ({
      ...event, consent: 'denied', boulder_id: null,
    }));
    const usage = events.filter(event => event.name !== 'app_error');
    const receipt: Receipt = { accepted_ids: [], rejected_ids: [] };
    const send = async (batch: typeof diagnostics | MonitoringEvent[], token: string) => {
      if (!batch.length) return;
      const response = await request(`${url}/functions/v1/monitoring-events`, {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { apikey: publicKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      });
      if (!response.ok) throw new Error('Monitoring was not acknowledged');
      const value = await response.json();
      const ids = new Set(batch.map(event => event.event_id));
      if (!Array.isArray(value.accepted_ids) || !Array.isArray(value.rejected_ids) ||
        [...value.accepted_ids, ...value.rejected_ids].some(id => !ids.has(id)) ||
        new Set([...value.accepted_ids, ...value.rejected_ids]).size !== value.accepted_ids.length + value.rejected_ids.length) throw new Error('Invalid monitoring acknowledgement');
      receipt.accepted_ids.push(...value.accepted_ids); receipt.rejected_ids.push(...value.rejected_ids);
    };
    await send(diagnostics, publicKey);
    // Do not transmit another account's queued usage if an account switch happened.
    const current = identity();
    if (owner && current?.id !== owner) return receipt;
    try { await send(usage, owner ? current!.token : publicKey); }
    catch (failure) { if (!receipt.accepted_ids.length && !receipt.rejected_ids.length) throw failure; }
    return receipt;
  };
}
