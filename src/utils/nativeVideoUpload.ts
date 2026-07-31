import { Capacitor } from '@capacitor/core';
import { VideoCompressor } from '@honem/native-video-compressor';

import type { NativeVideoUploadFile, UploadFileInput } from '@/types/upload';
import { isNativeVideoUploadFile } from '@/types/upload';

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
  const raw =
    import.meta.env.VITE_NATIVE_VIDEO_API_URL ||
    import.meta.env.VITE_ALLINKL_API_URL ||
    'https://video.kletterwelt-sauerland.de';
  return raw.replace(/\/$/, '');
}

export async function deleteNativeVideoFile(path: string): Promise<void> {
  try {
    await VideoCompressor.deleteFile({ path });
  } catch {
    // ignore
  }
}

function toMp4FileName(fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, '_') || 'video.mov';
  return safeName.replace(/\.[^.]+$/, '') + '.mp4';
}

/**
 * iOS `medium`/`low` map to AVAssetExportPresetMedium/LowQuality — Apple's old
 * MMS-grade presets. They ignore the documented bitrate and routinely crush
 * ~20 MB phone videos to ~50 KB. Only `high` uses HighestQuality and is usable.
 */
const NATIVE_COMPRESS_QUALITY = 'high' as const;

/** Reject compress output that is clearly destroyed (seen: 23 MB → 0.05 MB). */
function isSuspiciouslySmallCompress(originalSize: number, compressedSize: number): boolean {
  if (compressedSize <= 0) return true;
  if (originalSize >= 5 * 1024 * 1024 && compressedSize < 200 * 1024) return true;
  if (originalSize >= 1024 * 1024 && compressedSize < originalSize * 0.02) return true;
  return false;
}

/**
 * Compress an already-native video path. Avoids reading gallery videos into JS as base64.
 */
export async function prepareNativeVideoPathForUpload(
  input: NativeVideoPathInput,
  onProgress?: (progress: number) => void,
): Promise<NativeVideoPrepareResult> {
  if (!isNativeVideoPipelineAvailable()) {
    throw new Error('Native video pipeline is only available in the Capacitor app');
  }

  onProgress?.(5);
  console.log('[nativeVideoUpload] Compressing with quality:', NATIVE_COMPRESS_QUALITY, {
    fileSize: input.fileSize,
  });

  const compressed = await VideoCompressor.compressVideo({
    inputPath: input.path,
    quality: NATIVE_COMPRESS_QUALITY,
    format: 'mp4',
  });

  if (isSuspiciouslySmallCompress(input.fileSize, compressed.compressedSize)) {
    console.warn('[nativeVideoUpload] Compress output unusable, falling back to original', {
      originalSize: input.fileSize,
      compressedSize: compressed.compressedSize,
      outputPath: compressed.outputPath,
    });
    await deleteNativeVideoFile(compressed.outputPath).catch(() => undefined);
    throw new Error(
      `Compress output too small (${compressed.compressedSize} bytes from ${input.fileSize})`,
    );
  }

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

export type PreparedChunkedVideo =
  | {
      kind: 'file';
      file: File;
      cleanup: (deleteSource?: boolean) => Promise<void>;
      compressed: boolean;
    }
  | {
      kind: 'native-path';
      path: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      cleanup: (deleteSource?: boolean) => Promise<void>;
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
): Promise<PreparedChunkedVideo> {
  const noopCleanup = async (_deleteSource = false) => undefined;

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

  const withSourceCleanup = (cleanup: () => Promise<void>) => async (deleteSource = false) => {
    await cleanup().catch(() => undefined);
    if (deleteSource && sourcePath) {
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
      },
      (p) => onProgress?.(Math.min(40, Math.floor(p * 0.4))),
    );

    return {
      kind: 'native-path',
      path: prepared.filePath,
      fileName: prepared.fileName,
      fileSize: prepared.fileSize,
      mimeType: prepared.mimeType,
      compressed: true,
      cleanup: withSourceCleanup(prepared.cleanup),
    };
  } catch (error) {
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
