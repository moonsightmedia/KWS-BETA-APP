/**
 * Upload queue concurrency helpers.
 *
 * Native video uploads spend most of their time in statuses like `queued` /
 * `compressing`, which must still count as occupying a slot. Gate on the
 * processing-set size instead of a status allowlist.
 */

export function canStartUploadSlot(
  processingCount: number,
  maxConcurrent: number,
): boolean {
  return processingCount < maxConcurrent;
}

export function getProcessingCount(processingIds: Iterable<string>): number {
  return processingIds instanceof Set
    ? processingIds.size
    : new Set(processingIds).size;
}

const TERMINAL_UPLOAD_STATUSES = new Set([
  'completed',
  'failed',
  'error',
  'cancelled',
  'restoring',
]);

export function isTerminalUploadStatus(status: string): boolean {
  return TERMINAL_UPLOAD_STATUSES.has(status);
}

/** True when every sessionId is present and in a terminal status. */
export function areUploadSessionsFinished(
  sessions: Array<{ sessionId: string; status: string }>,
  sessionIds: string[],
): boolean {
  if (sessionIds.length === 0) return true;
  return sessionIds.every((id) => {
    const match = sessions.find((s) => s.sessionId === id);
    return Boolean(match && isTerminalUploadStatus(match.status));
  });
}
