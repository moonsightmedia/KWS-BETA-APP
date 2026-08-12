import path from 'node:path';

function positiveInt(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export function loadConfig() {
  const port = positiveInt('PORT', 3000);
  if (port > 65535) throw new Error('PORT must be <= 65535');
  const dataDir = path.resolve(process.env.DATA_DIR || 'data');
  const maxChunkBytes = positiveInt('MAX_CHUNK_BYTES', 6 * 1024 * 1024);
  const maxUploadBytes = positiveInt('MAX_UPLOAD_BYTES', 512 * 1024 * 1024);
  const maxTotalChunks = positiveInt('MAX_TOTAL_CHUNKS', 1024);
  if (maxTotalChunks < Math.ceil(maxUploadBytes / maxChunkBytes)) {
    throw new Error('MAX_TOTAL_CHUNKS cannot represent MAX_UPLOAD_BYTES at MAX_CHUNK_BYTES');
  }
  return Object.freeze({
    port, dataDir,
    publicBaseUrl: (process.env.PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
    maxChunkBytes, maxUploadBytes, maxTotalChunks,
    maxQueueJobs: positiveInt('MAX_QUEUE_JOBS', 8),
    maxDataBytes: positiveInt('MAX_DATA_BYTES', 20 * 1024 * 1024 * 1024),
    minFreeBytes: positiveInt('MIN_FREE_BYTES', 2 * 1024 * 1024 * 1024),
    maxMultipartConcurrency: positiveInt('MAX_MULTIPART_CONCURRENCY', 4),
    maxActiveSessionsPerUser: positiveInt('MAX_ACTIVE_SESSIONS_PER_USER', 4),
    tempSessionMaxAgeMs: positiveInt('TEMP_SESSION_MAX_AGE_MS', 24 * 60 * 60 * 1000),
  });
}
