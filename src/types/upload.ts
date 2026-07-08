export interface WebUploadFile {
  kind: 'web';
  file: File;
}

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

export function isNativeVideoUploadFile(file: UploadFileInput | null | undefined): file is NativeVideoUploadFile {
  return Boolean(file && typeof file === 'object' && 'kind' in file && file.kind === 'native-video');
}

export function getUploadInputName(file: UploadFileInput): string {
  return isNativeVideoUploadFile(file) ? file.name : file.name;
}

export function getUploadInputSize(file: UploadFileInput): number {
  return isNativeVideoUploadFile(file) ? file.size : file.size;
}
