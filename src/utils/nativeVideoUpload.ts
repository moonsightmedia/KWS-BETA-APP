import { Capacitor } from '@capacitor/core';
import { VideoCompressor } from '@honem/native-video-compressor';
import { UploadMasterEncoder } from '@/plugins/uploadMasterEncoder';

import type { NativeVideoUploadFile, UploadFileInput } from '@/types/upload';
import { isNativeVideoUploadFile } from '@/types/upload';

export interface NativeVideoPrepareResult {
  filePath: string;
  fileSize: number;
  fileName: string;
  mimeType: string;
  compressed: boolean;
  cleanup: () => Promise<void>;
}

export interface NativeVideoPathInput {
  path: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export function isNativeVideoPipelineAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/** Video uploads always use the Hostinger video endpoint, never the All-Inkl asset API. */
export function getVideoApiBase(): string {
  const raw =
    import.meta.env.VITE_VIDEO_API_URL ||
    import.meta.env.VITE_NATIVE_VIDEO_API_URL ||
    'https://video.kletterwelt-sauerland.de';
  return raw.replace(/\/$/, '');
}

/** @deprecated Use getVideoApiBase for web and native video uploads. */
export const getNativeVideoApiBase = getVideoApiBase;

export async function deleteNativeVideoFile(path: string): Promise<void> {
  try {
    if (Capacitor.getPlatform() === 'ios') {
      await UploadMasterEncoder.deleteFile({ path });
    } else {
      await VideoCompressor.deleteFile({ path });
    }
  } catch {
    // ignore
  }
}

function toMp4FileName(fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, '_') || 'video.mov';
  return safeName.replace(/\.[^.]+$/, '') + '.mp4';
}

/** iOS accepts only a controlled writer output; Android retains the existing high preset. */
const MIN_UPLOAD_MASTER_SAVINGS = 0.1;

function isSuspiciouslySmallCompress(originalSize: number, compressedSize: number): boolean {
  return (originalSize >= 5 * 1024 * 1024 && compressedSize < 200 * 1024) ||
    (originalSize >= 1024 * 1024 && compressedSize < originalSize * 0.02);
}

/** Reject compress output that is clearly destroyed (seen: 23 MB → 0.05 MB). */
function isPlausibleUploadMaster(originalSize: number, output: Awaited<ReturnType<typeof UploadMasterEncoder.encode>>): boolean {
  return output.playable === true && Number.isFinite(output.fileSize) && output.fileSize > 0 &&
    output.fileSize <= originalSize * (1 - MIN_UPLOAD_MASTER_SAVINGS) &&
    Number.isFinite(output.durationSeconds) && output.durationSeconds > 0 &&
    Number.isFinite(output.width) && Number.isFinite(output.height) && output.width > 0 && output.height > 0 &&
    output.width % 2 === 0 && output.height % 2 === 0 && Math.max(output.width, output.height) <= 1920 &&
    output.videoTrackCount === 1 && Number.isFinite(output.averageBitrate) &&
    output.averageBitrate > 100_000 && output.averageBitrate <= 7_000_000 &&
    Number.isFinite(output.videoBitrate) && output.videoBitrate > 100_000 && output.videoBitrate <= 6_500_000 &&
    Number.isFinite(output.audioBitrate) && (output.audioTrackCount === 0 ||
      (output.audioTrackCount === 1 && output.audioBitrate >= 32_000 && output.audioBitrate <= 192_000)) &&
    Number.isFinite(output.frameRate) && output.frameRate > 0 && output.frameRate <= 30.25 &&
    Number.isFinite(output.sourceDurationSeconds) &&
    Math.abs(output.durationSeconds - output.sourceDurationSeconds) <= Math.max(0.5, output.sourceDurationSeconds * 0.03);
}

function createAbortError(): DOMException {
  return new DOMException('Video preparation was cancelled', 'AbortError');
}

/**
 * Compress an already-native video path. Avoids reading gallery videos into JS as base64.
 */
export async function prepareNativeVideoPathForUpload(
  input: NativeVideoPathInput,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal,
): Promise<NativeVideoPrepareResult> {
  if (!isNativeVideoPipelineAvailable()) {
    throw new Error('Native video pipeline is only available in the Capacitor app');
  }

  if (abortSignal?.aborted) throw createAbortError();
  onProgress?.(5);
  if (Capacitor.getPlatform() !== 'ios') {
    const compressed = await VideoCompressor.compressVideo({
      inputPath: input.path,
      quality: 'high',
      format: 'mp4',
    });
    if (abortSignal?.aborted) {
      await VideoCompressor.deleteFile({ path: compressed.outputPath }).catch(() => undefined);
      throw createAbortError();
    }
    if (
      !Number.isFinite(compressed.compressedSize) ||
      compressed.compressedSize <= 0 ||
      compressed.compressedSize > input.fileSize * (1 - MIN_UPLOAD_MASTER_SAVINGS) ||
      isSuspiciouslySmallCompress(input.fileSize, compressed.compressedSize)
    ) {
      await VideoCompressor.deleteFile({ path: compressed.outputPath }).catch(() => undefined);
      throw new Error(`Android compress output rejected (${compressed.compressedSize} bytes from ${input.fileSize})`);
    }
    onProgress?.(100);
    return {
      filePath: compressed.outputPath,
      fileSize: compressed.compressedSize,
      fileName: toMp4FileName(input.fileName),
      mimeType: 'video/mp4',
      compressed: true,
      cleanup: async () => { await VideoCompressor.deleteFile({ path: compressed.outputPath }); },
    };
  }

  console.log('[nativeVideoUpload] Preparing controlled iOS upload master v1.1.0:', {
    fileSize: input.fileSize,
  });

  const operationId = globalThis.crypto?.randomUUID?.() ?? `kws-encode-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const cancelNative = () => { void UploadMasterEncoder.cancel({ operationId }).catch(() => undefined); };
  abortSignal?.addEventListener('abort', cancelNative, { once: true });
  let encoded: Awaited<ReturnType<typeof UploadMasterEncoder.encode>>;
  try {
    encoded = await UploadMasterEncoder.encode({
      inputPath: input.path,
      operationId,
      sourceDurationSeconds: input.duration,
      sourceWidth: input.width,
      sourceHeight: input.height,
    });
  } catch (error) {
    if (abortSignal?.aborted || (error as { code?: string })?.code === 'ABORT_ERR') throw createAbortError();
    throw error;
  } finally {
    abortSignal?.removeEventListener('abort', cancelNative);
  }
  if (abortSignal?.aborted) {
    if (!encoded.skipped) await deleteNativeVideoFile(encoded.path).catch(() => undefined);
    throw createAbortError();
  }

  if (encoded.skipped) {
    onProgress?.(100);
    return {
      filePath: input.path,
      fileSize: input.fileSize,
      fileName: input.fileName,
      mimeType: input.mimeType || 'video/quicktime',
      compressed: false,
      cleanup: async () => undefined,
    };
  }
  if (!isPlausibleUploadMaster(input.fileSize, encoded)) {
    console.warn('[nativeVideoUpload] Upload master rejected; falling back to original', {
      originalSize: input.fileSize,
      output: encoded,
    });
    await deleteNativeVideoFile(encoded.path).catch(() => undefined);
    throw new Error(`Upload master rejected (${encoded.fileSize} bytes from ${input.fileSize})`);
  }

  onProgress?.(100);

  return {
    filePath: encoded.path,
    fileSize: encoded.fileSize,
    fileName: toMp4FileName(input.fileName),
    mimeType: 'video/mp4',
    compressed: true,
    cleanup: async () => {
      await deleteNativeVideoFile(encoded.path);
    },
  };
}

export type PreparedChunkedVideo =
  | {
      kind: 'file';
      file: File;
      cleanup: () => Promise<void>;
      compressed: boolean;
    }
  | {
      kind: 'native-path';
      path: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      cleanup: () => Promise<void>;
      compressed: boolean;
    };

/**
 * Prepare video for chunked upload.
 * Native: compress on device, return filesystem path (never load whole file into JS).
 * Web File: return as-is for existing File chunked path.
 */
export async function prepareVideoFileForChunkedUpload(
  input: UploadFileInput,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal,
): Promise<PreparedChunkedVideo> {
  const noopCleanup = async () => undefined;

  if (!isNativeVideoPipelineAvailable()) {
    if (isNativeVideoUploadFile(input)) {
      throw new Error('Native video is only supported in the Capacitor app');
    }
    return { kind: 'file', file: input, cleanup: noopCleanup, compressed: false };
  }

  if (!isNativeVideoUploadFile(input)) {
    console.log('[nativeVideoUpload] Skipping compress for web File (no native path)');
    return { kind: 'file', file: input, cleanup: noopCleanup, compressed: false };
  }

  const source: NativeVideoUploadFile = input;
  let prepared: NativeVideoPrepareResult | null = null;
  const sourcePath = source.cached ? source.path : null;

  const withSourceCleanup = (cleanup: () => Promise<void>) => async () => {
    await cleanup().catch(() => undefined);
    if (sourcePath) {
      await deleteNativeVideoFile(sourcePath).catch(() => undefined);
    }
  };

  try {
    prepared = await prepareNativeVideoPathForUpload(
      {
        path: source.path,
        fileName: source.name,
        fileSize: source.size,
        mimeType: source.mimeType,
        duration: source.duration,
        width: source.width,
        height: source.height,
      },
      (p) => onProgress?.(Math.min(40, Math.floor(p * 0.4))),
      abortSignal,
    );

    return {
      kind: 'native-path',
      path: prepared.filePath,
      fileName: prepared.fileName,
      fileSize: prepared.fileSize,
      mimeType: prepared.mimeType,
      compressed: prepared.compressed,
      cleanup: withSourceCleanup(prepared.cleanup),
    };
  } catch (error) {
    if (abortSignal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      if (sourcePath) await deleteNativeVideoFile(sourcePath).catch(() => undefined);
      throw createAbortError();
    }
    console.warn('[nativeVideoUpload] Compress failed, fail-open to original native path:', error);
    if (prepared) {
      await prepared.cleanup().catch(() => undefined);
    }

    // Fail-open: upload original path in chunks (still no full JS File load).
    return {
      kind: 'native-path',
      path: source.path,
      fileName: source.name,
      fileSize: source.size,
      mimeType: source.mimeType || 'video/quicktime',
      compressed: false,
      cleanup: withSourceCleanup(noopCleanup),
    };
  }
}

/**
 * Capgo background upload remains optional / unwired.
 * Native path + Filesystem chunked upload is the foreground architecture.
 */
export function isNativeBackgroundUploadEnabled(): boolean {
  return import.meta.env.VITE_NATIVE_BACKGROUND_UPLOAD === 'true';
}
