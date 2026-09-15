export type PushDeliveryReport = { accepted: number; rejected: number; unconfirmed: number; skipped?: 'disabled' | 'no_devices' };

/** A provider acknowledgement is not proof that a phone displayed the message. */
export function summarizePushResponse(response: unknown, requested: number): PushDeliveryReport {
  const results = response && typeof response === 'object' && 'results' in response && Array.isArray(response.results) ? response.results : [];
  const accepted = results.filter(row => row && typeof row === 'object' && row.success === true).length;
  const rejected = results.filter(row => row && typeof row === 'object' && row.success === false).length;
  if (accepted + rejected > requested) return { accepted: 0, rejected: 0, unconfirmed: requested };
  return { accepted, rejected, unconfirmed: Math.max(0, requested - accepted - rejected) };
}
