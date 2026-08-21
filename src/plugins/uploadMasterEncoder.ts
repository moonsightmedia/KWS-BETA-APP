import { registerPlugin } from '@capacitor/core';

/** Native contract for KWS Upload Master Encoder v1.1.0 (iOS only). */
export interface UploadMasterEncodeResult {
  path: string; fileSize: number; durationSeconds: number; width: number; height: number;
  videoTrackCount: number; audioTrackCount: number; averageBitrate: number;
  videoBitrate: number; audioBitrate: number; frameRate: number; sourceDurationSeconds: number;
  playable: boolean; skipped: boolean; encoderVersion: string;
}
export interface UploadMasterEncoderPlugin {
  encode(options: {
    inputPath: string;
    operationId: string;
    sourceDurationSeconds?: number;
    sourceWidth?: number;
    sourceHeight?: number;
  }): Promise<UploadMasterEncodeResult>;
  cancel(options: { operationId: string }): Promise<void>;
  deleteFile(options: { path: string }): Promise<void>;
}
export const UploadMasterEncoder = registerPlugin<UploadMasterEncoderPlugin>('UploadMasterEncoder');
