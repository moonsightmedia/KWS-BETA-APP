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
  const raw = import.meta.env.VITE_NATIVE_VIDEO_API_URL
    || import.meta.env.VITE_ALLINKL_API_URL
    || 'https://video.kletterwelt-sauerland.de';
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

const LARGE_NATIVE_VIDEO_BYTES = 80 * 1024 * 1024;

function pickNativeCompressQuality(fileSize: number): 'low' | 'medium' {
  return fileSize > LARGE_NATIVE_VIDEO_BYTES ? 'low' : 'medium';
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
  const quality = pickNativeCompressQuality(input.fileSize);
  console.log('[nativeVideoUpload] Compressing with quality:', quality, { fileSize: input.fileSize });

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

async function nativePathToFile(path: string, fileName: string, mimeType: string): Promise<File> {
  const src = Capacitor.convertFileSrc(path);
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Compressed video konnte nicht gelesen werden (${response.status})`);
  }
  const blob = await response.blob();
  return new File([blob], fileName, { type: mimeType || blob.type || 'video/mp4' });
}

export type PreparedChunkedVideo = {
  file: File;
  cleanup: () => Promise<void>;
  compressed: boolean;
};

/**
 * Phase 1: optional on-device compress, then return a File for existing chunked upload.
 * Fail-open: any compress error returns the original web File when available.
 */
export async function prepareVideoFileForChunkedUpload(
  input: UploadFileInput,
  onProgress?: (progress: number) => void,
): Promise<PreparedChunkedVideo> {
  const noopCleanup = async () => undefined;

  if (!isNativeVideoPipelineAvailable()) {
    if (isNativeVideoUploadFile(input)) {
      throw new Error('Native video is only supported in the Capacitor app');
    }
    return { file: input, cleanup: noopCleanup, compressed: false };
  }

  if (!isNativeVideoUploadFile(input)) {
    // Web File without a native path: skip compress (no base64 copy) — keep working chunked path.
    console.log('[nativeVideoUpload] Skipping compress for web File (no native path)');
    return { file: input, cleanup: noopCleanup, compressed: false };
  }

  const source: NativeVideoUploadFile = input;
  let prepared: NativeVideoPrepareResult | null = null;

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

    const file = await nativePathToFile(prepared.filePath, prepared.fileName, prepared.mimeType);
    const preparedCleanup = prepared.cleanup;
    const sourcePath = source.cached ? source.path : null;

    return {
      file,
      compressed: true,
      cleanup: async () => {
        await preparedCleanup();
        if (sourcePath) {
          // Best-effort: cached copy under app cache may be file:// URI — ignore failures.
          try {
            await deleteNativeVideoFile(sourcePath);
          } catch {
            // ignore
          }
        }
      },
    };
  } catch (error) {
    console.warn('[nativeVideoUpload] Compress failed, fail-open to original path read:', error);
    if (prepared) {
      await prepared.cleanup().catch(() => undefined);
    }
    try {
      const file = await nativePathToFile(source.path, source.name, source.mimeType);
      return {
        file,
        compressed: false,
        cleanup: async () => {
          if (source.cached) {
            await deleteNativeVideoFile(source.path).catch(() => undefined);
          }
        },
      };
    } catch (readError) {
      console.error('[nativeVideoUpload] Could not read original native video either:', readError);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

/**
 * Phase 3 Capgo background upload is intentionally not wired yet.
 * Keep chunked foreground upload until Phase 1+2 are proven on device.
 * Enable later behind VITE_NATIVE_BACKGROUND_UPLOAD=true.
 */
export function isNativeBackgroundUploadEnabled(): boolean {
  return import.meta.env.VITE_NATIVE_BACKGROUND_UPLOAD === 'true';
}
