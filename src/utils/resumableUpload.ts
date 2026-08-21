import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

import type { ResumableUploadSource, UploadResult } from '@/types/upload';

// Configuration
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 1000; // Start with 1s delay
const CHUNK_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_PROCESSING_POLL_INTERVAL = 5000;
const PROCESSING_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Capacitor iOS rounds `readFileInChunks` byte-buffer requests up to the next
 * multiple of three (and adds three bytes for an already aligned request).
 * Keep the request below the server's payload cap, then use the resulting
 * byte count for the native upload protocol.
 */
export function getNativeFilesystemReadChunkSize(maxChunkBytes = CHUNK_SIZE): number {
  if (!Number.isSafeInteger(maxChunkBytes) || maxChunkBytes < 3) {
    throw new Error('Native chunk limit must be at least 3 bytes');
  }

  return maxChunkBytes - (maxChunkBytes % 3) - 1;
}

/** The actual byte-buffer size emitted by Capacitor iOS for a given request. */
export function getNativeFilesystemChunkByteSize(requestedChunkSize: number): number {
  return requestedChunkSize - (requestedChunkSize % 3) + 3;
}

export function getNativeUploadChunkSize(maxChunkBytes = CHUNK_SIZE): number {
  return getNativeFilesystemChunkByteSize(
    getNativeFilesystemReadChunkSize(maxChunkBytes),
  );
}

interface UploadOptions {
  sessionId: string;
  sectorId?: string;
  /** Enables the asynchronous Boulder contract on the Hostinger video server. */
  boulderId?: string;
  authToken: string;
  onProgress?: (progress: number) => void;
  abortSignal?: AbortSignal;
}

function uploadAuthHeaders(authToken: string, boulderId?: string): Record<string, string> {
  return {
    'X-Upload-Auth': `Bearer ${authToken}`,
    ...(boulderId ? { 'X-Boulder-Id': boulderId } : {}),
  };
}

interface UploadStatus {
  session_id: string;
  uploaded_chunks: number[];
  status?: string;
  url?: string;
  urls?: { hd?: string; sd?: string; low?: string };
  job_id?: string;
  error?: string;
}

interface UploadResponse {
  url?: string;
  urls: { hd?: string; sd?: string; low?: string };
  jobId?: string;
  status?: string;
}

function parseUploadResponse(payload: unknown): UploadResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const response = payload as Record<string, unknown>;
  const responseUrls = response.urls;
  const urls =
    responseUrls && typeof responseUrls === 'object'
      ? Object.fromEntries(
          (['hd', 'sd', 'low'] as const).flatMap((quality) => {
            const value = (responseUrls as Record<string, unknown>)[quality];
            return typeof value === 'string' && value.length > 0 ? [[quality, value]] : [];
          }),
        )
      : {};
  const url = typeof response.url === 'string' && response.url.length > 0
    ? response.url
    : urls.hd ?? urls.sd ?? urls.low;
  const jobId = typeof response.job_id === 'string' && response.job_id.length > 0
    ? response.job_id
    : undefined;
  const status = typeof response.status === 'string' && response.status.length > 0
    ? response.status
    : undefined;

  return { url, urls, jobId, status };
}

export function getUploadResult(payload: unknown): UploadResult | null {
  const response = parseUploadResponse(payload);
  if (!response) return null;
  // Boulder uploads are complete from the phone's perspective once Hostinger
  // has durably queued a named job. URLs stay intentionally absent until the
  // server-side callback marks the Boulder ready.
  if (
    response.url ||
    (response.jobId && ['queued', 'processing', 'completed'].includes(response.status || ''))
  ) {
    return response;
  }
  return null;
}

// Wake Lock Helper
let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('[Upload] Wake Lock active');
    }
  } catch (err) {
    console.warn('[Upload] Wake Lock failed:', err);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().then(() => {
      wakeLock = null;
      console.log('[Upload] Wake Lock released');
    }).catch(() => {});
  }
}

function createAbortError(): DOMException {
  return new DOMException('Upload aborted', 'AbortError');
}

async function waitForNetwork(abortSignal?: AbortSignal): Promise<void> {
  if (abortSignal?.aborted) throw createAbortError();
  if (navigator.onLine) return;

  console.log('[Upload] Offline, waiting for network...');
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener('online', handleOnline);
      abortSignal?.removeEventListener('abort', handleAbort);
    };
    const handleOnline = () => {
      cleanup();
      console.log('[Upload] Online again, resuming...');
      resolve();
    };
    const handleAbort = () => {
      cleanup();
      reject(createAbortError());
    };
    window.addEventListener('online', handleOnline);
    abortSignal?.addEventListener('abort', handleAbort, { once: true });
  });
}

async function delay(ms: number, abortSignal?: AbortSignal) {
  if (abortSignal?.aborted) throw createAbortError();
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      abortSignal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);
    const handleAbort = () => {
      clearTimeout(timeout);
      abortSignal?.removeEventListener('abort', handleAbort);
      reject(createAbortError());
    };
    abortSignal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function normalizeSource(source: File | ResumableUploadSource): ResumableUploadSource {
  if (typeof File !== 'undefined' && source instanceof File) {
    return { kind: 'file', file: source };
  }
  return source as ResumableUploadSource;
}

function getSourceMeta(source: ResumableUploadSource): {
  fileName: string;
  fileSize: number;
  mimeType: string;
} {
  if (source.kind === 'file') {
    return {
      fileName: source.file.name,
      fileSize: source.file.size,
      mimeType: source.file.type || 'application/octet-stream',
    };
  }
  return {
    fileName: source.fileName,
    fileSize: source.fileSize,
    mimeType: source.mimeType || 'video/mp4',
  };
}

/** Normalize file:// / capacitor paths for Filesystem full-path reads. */
export function normalizeFilesystemPath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.startsWith('file://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Sequential native file reader (5MB chunks). Yields Blobs; null terminator via done.
 * readFileInChunks has no seek — callers skip already-uploaded indices by discarding.
 */
async function* iterateNativePathChunks(
  path: string,
  mimeType: string,
  chunkSize: number,
  abortSignal?: AbortSignal,
): AsyncGenerator<Blob> {
  const normalizedPath = normalizeFilesystemPath(path);
  const queue: Array<Blob | Error | 'eof'> = [];
  let waiting: (() => void) | null = null;
  let started = false;

  const wake = () => {
    const resolve = waiting;
    waiting = null;
    resolve?.();
  };

  const waitForItem = async () => {
    while (queue.length === 0) {
      if (abortSignal?.aborted) {
        throw new DOMException('Upload aborted', 'AbortError');
      }
      await new Promise<void>((resolve) => {
        waiting = resolve;
      });
    }
    return queue.shift()!;
  };

  if (!started) {
    started = true;
    void Filesystem.readFileInChunks(
      {
        path: normalizedPath,
        chunkSize,
      },
      (chunk, err) => {
        if (err) {
          queue.push(err instanceof Error ? err : new Error(String(err)));
          wake();
          return;
        }
        const data = chunk?.data;
        if (!data || (typeof data === 'string' && data.length === 0)) {
          queue.push('eof');
          wake();
          return;
        }
        if (typeof data !== 'string') {
          queue.push(new Error('Native chunk read returned non-base64 data'));
          wake();
          return;
        }
        try {
          queue.push(base64ToBlob(data, mimeType));
        } catch (decodeError) {
          queue.push(
            decodeError instanceof Error
              ? decodeError
              : new Error(String(decodeError)),
          );
        }
        wake();
      },
    ).catch((error) => {
      queue.push(error instanceof Error ? error : new Error(String(error)));
      wake();
    });
  }

  while (true) {
    const item = await waitForItem();
    if (item === 'eof') {
      return;
    }
    if (item instanceof Error) {
      throw item;
    }
    yield item;
  }
}

async function uploadChunkBlob(
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  meta: { fileName: string; fileSize: number; mimeType: string },
  apiUrl: string,
  options: UploadOptions,
): Promise<UploadResponse | null> {
  const { sessionId, sectorId, authToken, abortSignal } = options;

  await waitForNetwork(abortSignal);

  const headers: Record<string, string> = {
    ...uploadAuthHeaders(authToken, options.boulderId),
    'X-Upload-Session-Id': sessionId,
    'X-Chunk-Number': chunkIndex.toString(),
    'X-Total-Chunks': totalChunks.toString(),
    'X-File-Name': meta.fileName,
    'X-File-Size': meta.fileSize.toString(),
    'X-File-Type': meta.mimeType,
  };

  if (sectorId) {
    headers['X-Sector-Id'] = sectorId;
  }

  const formData = new FormData();
  formData.append('chunk', chunk, meta.fileName);

  console.log(
    `[resumableUpload] Uploading chunk ${chunkIndex + 1}/${totalChunks} (${chunk.size} bytes) for session ${sessionId}...`,
  );

  const requestController = new AbortController();
  let timedOut = false;
  const forwardExternalAbort = () => requestController.abort();
  if (abortSignal?.aborted) {
    forwardExternalAbort();
  } else {
    abortSignal?.addEventListener('abort', forwardExternalAbort, { once: true });
  }
  const timeout = setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, CHUNK_UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}/upload.php`, {
      method: 'POST',
      headers,
      body: formData,
      signal: requestController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return parseUploadResponse(await response.json());
  } catch (error) {
    if (abortSignal?.aborted) throw createAbortError();
    if (timedOut) {
      throw new Error(`Upload timeout after 5 minutes for chunk ${chunkIndex}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    abortSignal?.removeEventListener('abort', forwardExternalAbort);
  }
}

async function waitForProcessedUpload(
  apiUrl: string,
  options: UploadOptions,
): Promise<UploadResult> {
  const { sessionId, authToken, abortSignal } = options;
  const statusUrl = `${apiUrl}/upload-status.php?session_id=${sessionId}`;
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
  let attempt = 0;

  while (Date.now() < deadline) {
    if (abortSignal?.aborted) throw createAbortError();
    const pollInterval = Math.min(
      RETRY_DELAY_BASE * Math.pow(2, attempt),
      MAX_PROCESSING_POLL_INTERVAL,
    );
    await delay(Math.min(pollInterval, Math.max(0, deadline - Date.now())), abortSignal);
    if (Date.now() >= deadline) break;
    await waitForNetwork(abortSignal);
    let response: Response;
    try {
      response = await fetch(statusUrl, {
        signal: abortSignal,
        headers: uploadAuthHeaders(authToken, options.boulderId),
      });
    } catch (error) {
      if (abortSignal?.aborted) throw createAbortError();
      console.warn('[Upload] Processing status request failed; retrying', error);
      attempt++;
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      console.warn(`[Upload] Processing status returned ${response.status}; retrying`);
      attempt++;
      continue;
    }
    if (!response.ok) {
      throw new Error(`Upload status failed: ${response.status} ${response.statusText}`);
    }

    const payload: UploadStatus = await response.json();
    const result = getUploadResult(payload);
    if (payload.status === 'completed') {
      if (result) return result;
      throw new Error('Video processing completed but no URL was returned');
    }
    if (payload.status === 'failed' || payload.status === 'error') {
      throw new Error(`Video processing ${payload.status}`);
    }
    attempt++;
  }

  throw new Error('Video processing did not complete in time');
}

/**
 * Resumable chunked upload from a web File or a native filesystem path.
 * Native path path never loads the whole video into JS — only 5MB chunks at a time.
 */
export async function resumableUpload(
  sourceInput: File | ResumableUploadSource,
  apiUrl: string,
  options: UploadOptions,
): Promise<UploadResult> {
  const source = normalizeSource(sourceInput);
  const meta = getSourceMeta(source);
  const { sessionId, authToken, onProgress, abortSignal } = options;

  console.log('[resumableUpload] Starting resumable upload:', {
    kind: source.kind,
    fileName: meta.fileName,
    fileSize: meta.fileSize,
    sessionId,
    sectorId: options.sectorId,
    apiUrl,
  });

  if (!authToken) {
    throw new Error('Upload-Authentifizierung fehlt. Bitte erneut anmelden.');
  }

  if (!meta.fileSize || meta.fileSize <= 0) {
    throw new Error('Ungültige Dateigröße für Upload.');
  }

  // iOS emits a slightly larger byte buffer than requested. Its actual chunk
  // size must drive both the read request and X-Total-Chunks, otherwise exact
  // 5 MiB boundaries can exceed the server limit or drop a final chunk.
  const usesIosFilesystemChunks = source.kind === 'native-path' && Capacitor.getPlatform() === 'ios';
  const nativeReadChunkSize = usesIosFilesystemChunks
    ? getNativeFilesystemReadChunkSize()
    : CHUNK_SIZE;
  const uploadChunkSize = usesIosFilesystemChunks
    ? getNativeFilesystemChunkByteSize(nativeReadChunkSize)
    : CHUNK_SIZE;
  const totalChunks = Math.ceil(meta.fileSize / uploadChunkSize);
  console.log('[resumableUpload] Total chunks:', totalChunks);

  await requestWakeLock();

  try {
    if (abortSignal?.aborted) {
      throw new DOMException('Upload aborted', 'AbortError');
    }

    const statusUrl = `${apiUrl}/upload-status.php?session_id=${sessionId}`;
    let uploadedChunks: number[] = [];

    let statusData: UploadStatus | null = null;
    try {
      const statusRes = await fetch(statusUrl, {
        signal: abortSignal,
        headers: uploadAuthHeaders(authToken, options.boulderId),
      });
      if (statusRes.ok) {
        statusData = await statusRes.json();
      } else {
        console.warn('[Upload] Could not check status, starting fresh', statusRes.status);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw e;
      }
      console.warn('[Upload] Could not check status, starting fresh', e);
    }

    if (statusData) {
      const completedResult = getUploadResult(statusData);
      if (statusData.status === 'completed' && completedResult) {
        return completedResult;
      }
      if (statusData.status === 'failed' || statusData.status === 'error') {
        throw new Error(`Upload status is ${statusData.status}`);
      }
      const pendingResult = parseUploadResponse(statusData);
      if (
        (pendingResult?.status === 'queued' || pendingResult?.status === 'processing') &&
        pendingResult.jobId
      ) {
        if (options.boulderId) return pendingResult;
        return waitForProcessedUpload(apiUrl, options);
      }
      uploadedChunks = statusData.uploaded_chunks || [];
      console.log(
        `[Upload] Resuming session ${sessionId}, ${uploadedChunks.length}/${totalChunks} chunks already uploaded.`,
      );
    }

    if (onProgress) {
      onProgress((uploadedChunks.length / totalChunks) * 100);
    }

    const uploadedSet = new Set(uploadedChunks);
    let finalResponse: UploadResponse | null = null;

    if (source.kind === 'file') {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (abortSignal?.aborted) {
          throw new DOMException('Upload aborted', 'AbortError');
        }
        if (uploadedSet.has(chunkIndex)) {
          continue;
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, meta.fileSize);
        const chunk = source.file.slice(start, end);

        let attempts = 0;
        while (attempts < MAX_RETRIES) {
          if (abortSignal?.aborted) {
            throw new DOMException('Upload aborted', 'AbortError');
          }
          try {
            const result = await uploadChunkBlob(chunk, chunkIndex, totalChunks, meta, apiUrl, options);
            uploadedSet.add(chunkIndex);
            uploadedChunks = Array.from(uploadedSet);
            if (onProgress) {
              onProgress((uploadedSet.size / totalChunks) * 100);
            }
            if (result) {
              finalResponse = result;
            }
            break;
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') throw error;
            attempts++;
            console.error(`[Upload] Chunk ${chunkIndex} failed (attempt ${attempts}/${MAX_RETRIES}):`, error);
            if (attempts >= MAX_RETRIES) {
              throw new Error(`Failed to upload chunk ${chunkIndex} after ${MAX_RETRIES} attempts`);
            }
            await delay(RETRY_DELAY_BASE * Math.pow(2, attempts), abortSignal);
          }
        }
      }
    } else {
      let chunkIndex = 0;
      for await (const chunk of iterateNativePathChunks(
        source.path,
        meta.mimeType,
        nativeReadChunkSize,
        abortSignal,
      )) {
        if (abortSignal?.aborted) {
          throw new DOMException('Upload aborted', 'AbortError');
        }

        const currentIndex = chunkIndex;
        chunkIndex += 1;

        if (currentIndex >= totalChunks) {
          console.warn('[resumableUpload] Native reader returned more chunks than expected; stopping');
          break;
        }

        if (uploadedSet.has(currentIndex)) {
          console.log(`[resumableUpload] Skipping already uploaded chunk ${currentIndex}`);
          continue;
        }

        let attempts = 0;
        while (attempts < MAX_RETRIES) {
          if (abortSignal?.aborted) {
            throw new DOMException('Upload aborted', 'AbortError');
          }
          try {
            const result = await uploadChunkBlob(
              chunk,
              currentIndex,
              totalChunks,
              meta,
              apiUrl,
              options,
            );
            uploadedSet.add(currentIndex);
            if (onProgress) {
              onProgress((uploadedSet.size / totalChunks) * 100);
            }
            if (result) {
              finalResponse = result;
            }
            break;
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') throw error;
            attempts++;
            console.error(`[Upload] Chunk ${currentIndex} failed (attempt ${attempts}/${MAX_RETRIES}):`, error);
            if (attempts >= MAX_RETRIES) {
              throw new Error(`Failed to upload chunk ${currentIndex} after ${MAX_RETRIES} attempts`);
            }
            await delay(RETRY_DELAY_BASE * Math.pow(2, attempts), abortSignal);
          }
        }
      }

      if (chunkIndex < totalChunks && uploadedSet.size < totalChunks) {
        throw new Error(
          `Native file ended early (${chunkIndex}/${totalChunks} chunks read). Datei möglicherweise unvollständig.`,
        );
      }
    }

    if (finalResponse?.status === 'queued' || finalResponse?.status === 'processing') {
      if (!finalResponse.jobId) {
        throw new Error('Video processing was queued without a job ID');
      }
      if (options.boulderId) return finalResponse;
      return waitForProcessedUpload(apiUrl, options);
    }

    if (options.boulderId && finalResponse?.status === 'completed' && finalResponse.jobId) {
      return finalResponse;
    }

    if (finalResponse?.status === 'failed' || finalResponse?.status === 'error') {
      throw new Error(`Upload status is ${finalResponse.status}`);
    }

    if (finalResponse?.url) {
      return { ...finalResponse, url: finalResponse.url };
    }

    if (uploadedSet.size === totalChunks) {
      throw new Error('Upload seems complete but no URL received. Please retry.');
    }

    throw new Error('Upload finished but no URL returned');
  } finally {
    releaseWakeLock();
  }
}
