import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

function withEnv(values, callback) {
  const names = Object.keys(values);
  const prior = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const [name, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    return callback();
  } finally {
    for (const name of names) {
      if (prior[name] === undefined) delete process.env[name];
      else process.env[name] = prior[name];
    }
  }
}

test('default 6 MiB chunks can represent a 512 MiB upload', () => { const names = ['MAX_CHUNK_BYTES', 'MAX_UPLOAD_BYTES', 'MAX_TOTAL_CHUNKS']; const prior = Object.fromEntries(names.map((name) => [name, process.env[name]])); try { for (const name of names) delete process.env[name]; const config = loadConfig(); assert.equal(Math.ceil(config.maxUploadBytes / config.maxChunkBytes), 86); assert.ok(config.maxTotalChunks >= 86); } finally { for (const name of names) prior[name] === undefined ? delete process.env[name] : process.env[name] = prior[name]; } });

test('configuration rejects an insufficient total chunk count', () => { const prior = { chunk: process.env.MAX_CHUNK_BYTES, upload: process.env.MAX_UPLOAD_BYTES, total: process.env.MAX_TOTAL_CHUNKS }; try { process.env.MAX_CHUNK_BYTES = '5242880'; process.env.MAX_UPLOAD_BYTES = '536870912'; process.env.MAX_TOTAL_CHUNKS = '102'; assert.throws(() => loadConfig(), /cannot represent/); } finally { prior.chunk === undefined ? delete process.env.MAX_CHUNK_BYTES : process.env.MAX_CHUNK_BYTES = prior.chunk; prior.upload === undefined ? delete process.env.MAX_UPLOAD_BYTES : process.env.MAX_UPLOAD_BYTES = prior.upload; prior.total === undefined ? delete process.env.MAX_TOTAL_CHUNKS : process.env.MAX_TOTAL_CHUNKS = prior.total; } });

test('accepts JWT and sb_secret_ service-role key formats without changing them', () => {
  withEnv({
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test_key-123',
  }, () => {
    const config = loadConfig();
    assert.equal(config.supabaseUrl, 'https://example.supabase.co');
    assert.equal(config.supabaseServiceRoleKey, 'sb_secret_test_key-123');
  });
  withEnv({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature_123',
  }, () => assert.match(loadConfig().supabaseServiceRoleKey, /^eyJ[^ ]+\.[^ ]+\./));
});

test('rejects whitespace or control characters in Supabase configuration', () => {
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    const values = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test_key-123',
    };
    values[key] += '\n';
    withEnv(values, () => assert.throws(() => loadConfig(), new RegExp(`${key} contains whitespace or control characters`)));
  }
});

test('rejects malformed service-role keys instead of repairing them', () => {
  for (const value of ['sb_secret_', 'sb_secret_test.key', 'not-a-key', 'a.b']) {
    withEnv({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: value }, () => {
      assert.throws(() => loadConfig(), /SUPABASE_SERVICE_ROLE_KEY must be a JWT or an sb_secret_ key/);
    });
  }
});
