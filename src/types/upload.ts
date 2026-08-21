export interface NativeVideoUploadFile {
  kind: 'native-video';
  path: string;
  name: string;
  mimeType: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  cached?: boolean;
}

export type UploadFileInput = File | NativeVideoUploadFile;

export interface UploadRenditionUrls {
  hd?: string;
  sd?: string;
  low?: string;
}

/** Final response returned by both the Hostinger and legacy All-Inkl upload APIs. */
export interface UploadResult {
  /**
   * Primary URL returned by the upload API (normally the HD rendition).
   * A boulder video acknowledged as `queued` deliberately has no public URL
   * yet: the Hostinger worker publishes it only after all renditions exist.
   */
  url?: string;
  /** Server-generated renditions, absent until queued processing is ready. */
  urls?: UploadRenditionUrls;
  /** Hostinger processing job for queued video uploads. */
  jobId?: string;
  /** Upload or processing status returned by the selected storage service. */
  status?: string;
}

/** Byte source for resumable chunked upload (avoids loading whole native videos into JS). */
export type ResumableUploadSource =
  | { kind: 'file'; file: File }
  | {
      kind: 'native-path';
      path: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    };

export type UploadStatus =
  | 'pending'
  | 'queued'
  | 'compressing'
  | 'waiting_network'
  | 'uploading'
  | 'retrying'
  | 'completed'
  | 'error'
  | 'failed'
  | 'restoring'
  | 'cancelled';

export function isNativeVideoUploadFile(
  file: UploadFileInput | null | undefined,
): file is NativeVideoUploadFile {
  return Boolean(file && typeof file === 'object' && 'kind' in file && file.kind === 'native-video');
}

export function getUploadInputName(file: UploadFileInput): string {
  return isNativeVideoUploadFile(file) ? file.name : file.name;
}

export function getUploadInputSize(file: UploadFileInput): number {
  return isNativeVideoUploadFile(file) ? file.size : file.size;
}
