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
