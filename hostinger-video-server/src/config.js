import path from 'node:path';

function positiveInt(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

function containsWhitespaceOrControlCharacters(value) {
  return /\s|[\u0000-\u001F\u007F-\u009F]/u.test(value);
}

function validateSupabaseUrl(rawValue) {
  const value = String(rawValue || '');
  if (!value) return '';
  if (containsWhitespaceOrControlCharacters(value)) {
    throw new Error('SUPABASE_URL contains whitespace or control characters');
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('SUPABASE_URL must be a valid HTTP(S) URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error('SUPABASE_URL must be a valid HTTP(S) URL');
  }
  return value.replace(/\/+$/, '');
}

function validateSupabaseServiceRoleKey(rawValue) {
  const value = String(rawValue || '');
  if (!value) return '';
  if (containsWhitespaceOrControlCharacters(value)) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY contains whitespace or control characters');
  }

  const isSecretKey = /^sb_secret_[A-Za-z0-9_-]+$/u.test(value);
  const jwtParts = value.split('.');
  const isJwt = jwtParts.length === 3 && jwtParts.every((part) => /^[A-Za-z0-9_-]+$/u.test(part));
  if (!isSecretKey && !isJwt) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be a JWT or an sb_secret_ key');
  }
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
    supabaseUrl: validateSupabaseUrl(process.env.SUPABASE_URL),
    supabaseServiceRoleKey: validateSupabaseServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY),
    publisherRetryBaseMs: positiveInt('PUBLISHER_RETRY_BASE_MS', 1000),
    publisherRetryMaxMs: positiveInt('PUBLISHER_RETRY_MAX_MS', 60000),
    maxChunkBytes, maxUploadBytes, maxTotalChunks,
    maxQueueJobs: positiveInt('MAX_QUEUE_JOBS', 8),
    maxDataBytes: positiveInt('MAX_DATA_BYTES', 20 * 1024 * 1024 * 1024),
    minFreeBytes: positiveInt('MIN_FREE_BYTES', 2 * 1024 * 1024 * 1024),
    maxMultipartConcurrency: positiveInt('MAX_MULTIPART_CONCURRENCY', 4),
    maxActiveSessionsPerUser: positiveInt('MAX_ACTIVE_SESSIONS_PER_USER', 4),
    tempSessionMaxAgeMs: positiveInt('TEMP_SESSION_MAX_AGE_MS', 24 * 60 * 60 * 1000),
  });
}
