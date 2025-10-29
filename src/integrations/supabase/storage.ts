import { supabase } from './client';

const DEFAULT_BUCKET = 'beta-videos';

function getFileExt(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx + 1) : '';
}

function randomId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export async function uploadBetaVideo(file: File): Promise<string> {
  const ext = getFileExt(file.name) || 'mp4';
  const objectPath = `uploads/${randomId()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(DEFAULT_BUCKET)
    .upload(objectPath, file, { cacheControl: '3600', upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(DEFAULT_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

