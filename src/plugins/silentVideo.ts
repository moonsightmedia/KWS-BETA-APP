import { registerPlugin } from '@capacitor/core';

export const SilentVideo = registerPlugin<{
  stripAudio(options: { inputPath: string }): Promise<{
    path: string; fileSize: number; audioTrackCount: number; skipped: boolean;
  }>;
}>('SilentVideo');
