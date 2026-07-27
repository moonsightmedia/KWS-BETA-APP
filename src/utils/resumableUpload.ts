import { Filesystem } from '@capacitor/filesystem';

import type { ResumableUploadSource } from '@/types/upload';

// Configuration
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 1000; // Start with 1s delay

interface UploadOptions {
  sessionId: string;
  sectorId?: string;
  authToken: string;
  onProgress?: (progress: number) => void;
  abortSignal?: AbortSignal;
}

function uploadAuthHeaders(authToken: string): Record<string, string> {
  return { 'X-Upload-Auth': `Bearer ${authToken}` };
}

interface UploadStatus {
  session_id: string;
  uploaded_chunks: number[];
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

async function waitForNetwork(): Promise<void> {
  if (navigator.onLine) return;

  console.log('[Upload] Offline, waiting for network...');
  return new Promise((resolve) => {
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      console.log('[Upload] Online again, resuming...');
      resolve();
    };
    window.addEventListener('online', handleOnline);
  });
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
): Promise<string | null> {
  const { sessionId, sectorId, authToken, abortSignal } = options;

  await waitForNetwork();

  const headers: Record<string, string> = {
    ...uploadAuthHeaders(authToken),
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

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Upload timeout after 60s for chunk ${chunkIndex}`)), 60000);
  });

  const response = await Promise.race([
    fetch(`${apiUrl}/upload.php`, {
      method: 'POST',
      headers,
      body: formData,
      signal: abortSignal,
    }),
    timeoutPromise,
  ]);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  if (result.url) {
    return result.url as string;
  }
  return null;
}

/**
 * Resumable chunked upload from a web File or a native filesystem path.
 * Native path path never loads the whole video into JS — only 5MB chunks at a time.
 */
export async function resumableUpload(
  sourceInput: File | ResumableUploadSource,
  apiUrl: string,
  options: UploadOptions,
): Promise<string> {
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

  const totalChunks = Math.ceil(meta.fileSize / CHUNK_SIZE);
  console.log('[resumableUpload] Total chunks:', totalChunks);

  await requestWakeLock();

  try {
    if (abortSignal?.aborted) {
      throw new DOMException('Upload aborted', 'AbortError');
    }

    const statusUrl = `${apiUrl}/upload-status.php?session_id=${sessionId}`;
    let uploadedChunks: number[] = [];

    try {
      const statusRes = await fetch(statusUrl, {
        signal: abortSignal,
        headers: uploadAuthHeaders(authToken),
      });
      if (statusRes.ok) {
        const statusData: UploadStatus = await statusRes.json();
        uploadedChunks = statusData.uploaded_chunks || [];
        console.log(
          `[Upload] Resuming session ${sessionId}, ${uploadedChunks.length}/${totalChunks} chunks already uploaded.`,
        );
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw e;
      }
      console.warn('[Upload] Could not check status, starting fresh', e);
    }

    if (onProgress) {
      onProgress((uploadedChunks.length / totalChunks) * 100);
    }

    const uploadedSet = new Set(uploadedChunks);
    let finalUrl: string | null = null;

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
            const url = await uploadChunkBlob(chunk, chunkIndex, totalChunks, meta, apiUrl, options);
            uploadedSet.add(chunkIndex);
            uploadedChunks = Array.from(uploadedSet);
            if (onProgress) {
              onProgress((uploadedSet.size / totalChunks) * 100);
            }
            if (url) {
              finalUrl = url;
            }
            break;
          } catch (error) {
            attempts++;
            console.error(`[Upload] Chunk ${chunkIndex} failed (attempt ${attempts}/${MAX_RETRIES}):`, error);
            if (attempts >= MAX_RETRIES) {
              throw new Error(`Failed to upload chunk ${chunkIndex} after ${MAX_RETRIES} attempts`);
            }
            await delay(RETRY_DELAY_BASE * Math.pow(2, attempts));
          }
        }
      }
    } else {
      let chunkIndex = 0;
      for await (const chunk of iterateNativePathChunks(
        source.path,
        meta.mimeType,
        CHUNK_SIZE,
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
            const url = await uploadChunkBlob(
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
            if (url) {
              finalUrl = url;
            }
            break;
          } catch (error) {
            attempts++;
            console.error(`[Upload] Chunk ${currentIndex} failed (attempt ${attempts}/${MAX_RETRIES}):`, error);
            if (attempts >= MAX_RETRIES) {
              throw new Error(`Failed to upload chunk ${currentIndex} after ${MAX_RETRIES} attempts`);
            }
            await delay(RETRY_DELAY_BASE * Math.pow(2, attempts));
          }
        }
      }

      if (chunkIndex < totalChunks && uploadedSet.size < totalChunks) {
        throw new Error(
          `Native file ended early (${chunkIndex}/${totalChunks} chunks read). Datei möglicherweise unvollständig.`,
        );
      }
    }

    if (finalUrl) {
      return finalUrl;
    }

    if (uploadedSet.size === totalChunks) {
      throw new Error('Upload seems complete but no URL received. Please retry.');
    }

    throw new Error('Upload finished but no URL returned');
  } finally {
    releaseWakeLock();
  }
}
