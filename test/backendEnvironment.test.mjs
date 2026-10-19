import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/backendEnvironment.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext} }).outputText;
const {resolveBackendConfig, environmentStorageKey} = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const env = {VITE_SUPABASE_URL:'https://beta-api.kletterwelt-sauerland.de',VITE_SUPABASE_PUBLISHABLE_KEY:'production-public',VITE_VIDEO_API_URL:'https://video.kletterwelt-sauerland.de',VITE_STORE_REVIEW_ENABLED:'true',VITE_STORE_REVIEW_ANON_KEY:'separate-review-public'};

test('default and unknown choices keep existing production endpoints and auth-storage name',()=>{
  for(const choice of [null,'production','https://attacker.invalid','REVIEW']) {
    const config=resolveBackendConfig(env,choice);
    assert.equal(config.environment,'production');
    assert.equal(config.supabaseUrl,env.VITE_SUPABASE_URL);
    assert.equal(config.publicKey,env.VITE_SUPABASE_PUBLISHABLE_KEY);
    assert.equal(config.authStorageKey,'sb-beta-api-auth-token');
  }
});
test('review API, media and session storage stay separate from production',()=>{
  const config=resolveBackendConfig(env,'review');
  assert.equal(config.environment,'review');
  assert.equal(config.supabaseUrl,'https://review-api.kletterwelt-sauerland.de');
  assert.equal(config.videoUrl,'https://review-video.kletterwelt-sauerland.de');
  assert.equal(config.publicKey,'separate-review-public');
  assert.notEqual(config.authStorageKey,resolveBackendConfig(env,null).authStorageKey);
  for(const key of ['pendingFeedback','nav_userId','kws_open_upload_sessions']) {
    assert.equal(environmentStorageKey(key,'production'),key);
    assert.notEqual(environmentStorageKey(key,'review'),key);
  }
});
test('persisted demo choice fails closed when disabled, missing or accidentally using real keys',()=>{
  for(const changed of [{VITE_STORE_REVIEW_ENABLED:'false'},{VITE_STORE_REVIEW_ANON_KEY:''},{VITE_STORE_REVIEW_ANON_KEY:'production-public'}]) {
    const config=resolveBackendConfig({...env,...changed},'review');
    assert.equal(config.environment,'review');
    assert.equal(new URL(config.supabaseUrl).hostname,'review-unavailable.invalid');
    assert.notEqual(config.publicKey,env.VITE_SUPABASE_PUBLISHABLE_KEY);
    assert.equal(config.authStorageKey,'sb-kws-store-review-auth-token');
  }
});
