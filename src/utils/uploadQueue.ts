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

export type UploadSessionsWaitResult =
  | { state: 'pending' }
  | { state: 'completed' }
  | { state: 'failed'; sessionId: string; status: string };

type TerminalUploadEntry = { status: string; expiresAt: number };

/**
 * Retains terminal outcomes independently of the visible queue. Waiters are
 * reference-counted so one overlapping wait cannot erase another's outcome.
 */
export class TerminalUploadRegistry {
  private readonly entries = new Map<string, TerminalUploadEntry>();
  private readonly waiterCounts = new Map<string, number>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  record(sessionId: string, status: string): void {
    this.entries.set(sessionId, { status, expiresAt: this.now() + this.ttlMs });
  }

  clear(sessionId: string): void {
    this.entries.delete(sessionId);
  }

  clearAll(): void {
    this.entries.clear();
    this.waiterCounts.clear();
  }

  startWaiting(sessionIds: Iterable<string>): void {
    for (const sessionId of sessionIds) {
      this.waiterCounts.set(sessionId, (this.waiterCounts.get(sessionId) ?? 0) + 1);
    }
  }

  stopWaiting(sessionIds: Iterable<string>): void {
    for (const sessionId of sessionIds) {
      const nextCount = (this.waiterCounts.get(sessionId) ?? 0) - 1;
      if (nextCount > 0) this.waiterCounts.set(sessionId, nextCount);
      else this.waiterCounts.delete(sessionId);
    }
  }

  getStatuses(): Map<string, string> {
    return new Map(Array.from(this.entries, ([sessionId, entry]) => [sessionId, entry.status]));
  }

  /** Removes only expired entries that are not still observed by a waiter. */
  pruneExpired(): string[] {
    const currentTime = this.now();
    const removed: string[] = [];
    this.entries.forEach((entry, sessionId) => {
      if (entry.expiresAt <= currentTime && !this.waiterCounts.has(sessionId)) {
        this.entries.delete(sessionId);
        removed.push(sessionId);
      }
    });
    return removed;
  }

  has(sessionId: string): boolean {
    return this.entries.has(sessionId);
  }
}

/**
 * Evaluates the requested upload sessions. Callers may include remembered
 * terminal sessions alongside the visible queue, because completed rows are
 * intentionally pruned from that queue after a short delay.
 */
export function getUploadSessionsWaitResult(
  sessions: Array<{ sessionId: string; status: string }>,
  sessionIds: string[],
): UploadSessionsWaitResult {
  const sessionsById = new Map(sessions.map((session) => [session.sessionId, session.status]));
  let allCompleted = true;

  for (const id of sessionIds) {
    const status = sessionsById.get(id);
    if (!status || !isTerminalUploadStatus(status)) {
      allCompleted = false;
      continue;
    }
    if (status !== 'completed') {
      return { state: 'failed', sessionId: id, status };
    }
  }

  return allCompleted ? { state: 'completed' } : { state: 'pending' };
}

/** @deprecated Use getUploadSessionsWaitResult so failed sessions cannot pass as success. */
export function areUploadSessionsFinished(
  sessions: Array<{ sessionId: string; status: string }>,
  sessionIds: string[],
): boolean {
  return getUploadSessionsWaitResult(sessions, sessionIds).state === 'completed';
}
