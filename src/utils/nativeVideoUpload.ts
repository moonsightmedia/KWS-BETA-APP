import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Uploader } from '@capgo/capacitor-uploader';
import { VideoCompressor } from '@honem/native-video-compressor';

export interface NativeVideoUploadOptions {
  sessionId: string;
  sectorId?: string;
  fileName: string;
  mimeType?: string;
  authToken: string;
  onProgress?: (progress: number) => void;
  abortSignal?: AbortSignal;
}

export interface NativeVideoPrepareResult {
  filePath: string;
  fileSize: number;
  fileName: string;
  mimeType: string;
  cleanup: () => Promise<void>;
}

export interface NativeVideoPathInput {
  path: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
}

export function isNativeVideoPipelineAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export function getNativeVideoApiBase(): string {
  const raw = import.meta.env.VITE_NATIVE_VIDEO_API_URL
    || import.meta.env.VITE_ALLINKL_API_URL
    || 'https://video.kletterwelt-sauerland.de';
  return raw.replace(/\/$/, '');
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Datei konnte nicht gelesen werden'));
    reader.readAsDataURL(file);
  });
}

async function ensureCacheUploadDir(): Promise<void> {
  try {
    await Filesystem.mkdir({
      path: 'kws-upload',
      directory: Directory.Cache,
      recursive: true,
    });
  } catch {
    // Directory may already exist
  }
}

async function writeFileToCache(file: File, suffix: string): Promise<{ uri: string; path: string }> {
  await ensureCacheUploadDir();
  const safeName = file.name.replace(/[^\w.-]+/g, '_') || 'video.mp4';
  const path = `kws-upload/${Date.now()}-${suffix}-${safeName}`;
  const data = await readFileAsBase64(file);
  const result = await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
  });
  return { uri: result.uri, path };
}

async function deleteCachedFile(path: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Cache });
  } catch {
    // ignore cleanup errors
  }
}

export async function deleteNativeVideoFile(path: string): Promise<void> {
  try {
    await VideoCompressor.deleteFile({ path });
  } catch {
    // ignore cleanup errors
  }
}

function toMp4FileName(fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, '_') || 'video.mov';
  return safeName.replace(/\.[^.]+$/, '') + '.mp4';
}

const LARGE_NATIVE_VIDEO_BYTES = 80 * 1024 * 1024;

function pickNativeCompressQuality(fileSize: number): 'low' | 'medium' {
  return fileSize > LARGE_NATIVE_VIDEO_BYTES ? 'low' : 'medium';
}

/**
 * Compress an already-native video path. This avoids reading large gallery
 * videos into JS memory and is the preferred iOS/Android upload path.
 */
export async function prepareNativeVideoPathForUpload(
  input: NativeVideoPathInput,
  onProgress?: (progress: number) => void,
): Promise<NativeVideoPrepareResult> {
  if (!isNativeVideoPipelineAvailable()) {
    throw new Error('Native video pipeline is only available in the Capacitor app');
  }

  onProgress?.(5);

  const quality = pickNativeCompressQuality(input.fileSize);
  console.log('[nativeVideoUpload] Compressing with quality:', quality, {
    fileSize: input.fileSize,
  });

  const compressed = await VideoCompressor.compressVideo({
    inputPath: input.path,
    quality,
    format: 'mp4',
  });

  onProgress?.(100);

  return {
    filePath: compressed.outputPath,
    fileSize: compressed.compressedSize,
    fileName: toMp4FileName(input.fileName),
    mimeType: 'video/mp4',
    cleanup: async () => {
      await deleteNativeVideoFile(compressed.outputPath);
    },
  };
}

/**
 * Compress video on-device (hardware encoder) and return native file path for upload.
 * NOTE: Do not call from upload flow with gallery File blobs — loading large videos
 * into JS memory via base64 can crash iOS. Use chunked resumableUpload instead.
 */
export async function prepareNativeVideoForUpload(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<NativeVideoPrepareResult> {
  if (!isNativeVideoPipelineAvailable()) {
    throw new Error('Native video pipeline is only available in the Capacitor app');
  }

  onProgress?.(2);
  const source = await writeFileToCache(file, 'src');
  onProgress?.(8);

  const compressed = await VideoCompressor.compressVideo({
    inputPath: source.uri,
    quality: pickNativeCompressQuality(file.size),
    format: 'mp4',
  });

  onProgress?.(100);

  const mimeType = 'video/mp4';
  const fileName = file.name.replace(/\.[^.]+$/, '') + '.mp4';

  return {
    filePath: compressed.outputPath,
    fileSize: compressed.compressedSize,
    fileName,
    mimeType,
    cleanup: async () => {
      await deleteCachedFile(source.path);
      try {
        await VideoCompressor.deleteFile({ path: compressed.outputPath });
      } catch {
        // ignore
      }
    },
  };
}

async function waitForUploadResult(
  apiBase: string,
  sessionId: string,
  authToken: string,
  signal?: AbortSignal,
): Promise<{ url: string; urls?: { hd?: string; sd?: string; low?: string } }> {
  const statusUrl = `${apiBase}/upload-status.php?session_id=${encodeURIComponent(sessionId)}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Upload aborted', 'AbortError');
    }
    const res = await fetch(statusUrl, {
      headers: { 'X-Upload-Auth': `Bearer ${authToken}` },
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'completed' && data.url) {
        return { url: data.url, urls: data.urls };
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Upload abgeschlossen, aber Server-Antwort fehlt');
}

/**
 * Background-capable single-chunk upload via native uploader plugin.
 * Works when the screen is locked (OS-level upload task).
 */
export async function nativeBackgroundVideoUpload(
  prepared: NativeVideoPrepareResult,
  options: NativeVideoUploadOptions,
): Promise<string> {
  const apiBase = getNativeVideoApiBase();
  const uploadUrl = `${apiBase}/upload.php`;
  const {
    sessionId,
    sectorId,
    authToken,
    onProgress,
    abortSignal,
  } = options;

  const headers: Record<string, string> = {
    'X-Upload-Auth': `Bearer ${authToken}`,
    'X-Upload-Session-Id': sessionId,
    'X-Chunk-Number': '0',
    'X-Total-Chunks': '1',
    'X-File-Name': prepared.fileName,
    'X-File-Size': String(prepared.fileSize),
    'X-File-Type': prepared.mimeType,
  };
  if (sectorId) {
    headers['X-Sector-Id'] = sectorId;
  }

  const uploadPromise = new Promise<string>((resolve, reject) => {
    let uploadId = '';
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const succeed = (url: string) => {
      if (settled) return;
      settled = true;
      resolve(url);
    };

    void (async () => {
      const listener = await Uploader.addListener('events', (event) => {
        if (event.id !== uploadId) return;

        if (event.name === 'uploading' && typeof event.payload.percent === 'number') {
          onProgress?.(event.payload.percent);
        }

        if (event.name === 'failed') {
          listener.remove().catch(() => undefined);
          fail(new Error(event.payload.error || 'Native Upload fehlgeschlagen'));
        }

        if (event.name === 'completed') {
          listener.remove().catch(() => undefined);
          if (event.payload.statusCode && event.payload.statusCode >= 400) {
            fail(new Error(`Native Upload HTTP ${event.payload.statusCode}`));
            return;
          }
          void waitForUploadResult(apiBase, sessionId, authToken, abortSignal)
            .then((result) => succeed(result.url))
            .catch(fail);
        }
      });

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          if (uploadId) {
            Uploader.removeUpload({ id: uploadId }).catch(() => undefined);
          }
          listener.remove().catch(() => undefined);
          fail(new DOMException('Upload aborted', 'AbortError'));
        }, { once: true });
      }

      const started = await Uploader.startUpload({
        filePath: prepared.filePath,
        serverUrl: uploadUrl,
        headers,
        method: 'POST',
        uploadType: 'multipart',
        fileField: 'chunk',
        mimeType: prepared.mimeType,
        maxRetries: 3,
      });
      uploadId = started.id;
    })().catch(fail);
  });

  try {
    return await uploadPromise;
  } finally {
    await prepared.cleanup();
  }
}
