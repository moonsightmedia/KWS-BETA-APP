import type { Boulder } from '@/types/boulder';

export const formatDifficulty = (difficulty: number | null) =>
  difficulty === null ? '?' : String(difficulty);

export const getTextClassForHex = (hex?: string) => {
  if (!hex) return 'text-white';

  const value = hex.replace('#', '');
  const r = Number.parseInt(value.substring(0, 2), 16);
  const g = Number.parseInt(value.substring(2, 4), 16);
  const b = Number.parseInt(value.substring(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.6 ? 'text-black' : 'text-white';
};

export const getThumbnailUrl = (boulder: Pick<Boulder, 'thumbnailUrl'>) => {
  if (!boulder.thumbnailUrl) return null;

  if (boulder.thumbnailUrl.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
    return boulder.thumbnailUrl.replace('/uploads/videos/', '/uploads/');
  }

  return boulder.thumbnailUrl;
};

export const combineDateAndTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10));
  const next = new Date(date);
  next.setHours(hours);
  next.setMinutes(minutes);
  next.setSeconds(0);
  next.setMilliseconds(0);
  return next;
};
