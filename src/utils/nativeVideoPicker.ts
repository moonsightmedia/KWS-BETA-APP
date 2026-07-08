import { Directory, Filesystem } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';

import type { NativeVideoUploadFile } from '@/types/upload';
import { isNativeVideoPipelineAvailable } from '@/utils/nativeVideoUpload';

function sanitizeFileName(name: string): string {
  return (name || 'video.mov').replace(/[^\w.-]+/g, '_');
}

function normalizeVideoFileName(name: string): string {
  const cleanName = sanitizeFileName(name);
  return cleanName.includes('.') ? cleanName : `${cleanName}.mov`;
}

export async function pickNativeVideoForUpload(): Promise<NativeVideoUploadFile | null> {
  if (!isNativeVideoPipelineAvailable()) {
    return null;
  }

  const result = await FilePicker.pickVideos({
    limit: 1,
    readData: false,
    skipTranscoding: true,
  });
  const selected = result.files[0];

  if (!selected?.path) {
    return null;
  }

  await Filesystem.mkdir({
    directory: Directory.Cache,
    path: 'kws-upload/native-source',
    recursive: true,
  }).catch(() => undefined);

  const fileName = normalizeVideoFileName(selected.name);
  const cachePath = `kws-upload/native-source/${Date.now()}-${fileName}`;
  const destination = await Filesystem.getUri({
    directory: Directory.Cache,
    path: cachePath,
  });

  try {
    await FilePicker.copyFile({
      from: selected.path,
      to: destination.uri,
      overwrite: true,
    });

    return {
      kind: 'native-video',
      path: destination.uri,
      name: fileName,
      mimeType: selected.mimeType || 'video/quicktime',
      size: selected.size,
      duration: selected.duration,
      width: selected.width,
      height: selected.height,
      cached: true,
    };
  } catch (error) {
    console.warn('[nativeVideoPicker] Could not copy selected video into app cache, using picked path:', error);
    return {
      kind: 'native-video',
      path: selected.path,
      name: fileName,
      mimeType: selected.mimeType || 'video/quicktime',
      size: selected.size,
      duration: selected.duration,
      width: selected.width,
      height: selected.height,
      cached: false,
    };
  }
}
