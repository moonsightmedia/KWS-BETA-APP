// Signing material is supplied through the environment; never print its values.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
for (const name of ['KWS_ANDROID_KEYSTORE', 'KWS_ANDROID_STORE_PASSWORD', 'KWS_ANDROID_KEY_ALIAS', 'KWS_ANDROID_KEY_PASSWORD']) {
  assert(process.env[name]?.trim(), `Missing ${name}`);
}
assert(existsSync(process.env.KWS_ANDROID_KEYSTORE), 'Play upload keystore is missing');

const env = { ...process.env, KWS_NATIVE_RELEASE_CHANNEL: 'play' };
const run = (command, args, cwd = root) => new Promise((resolveRun, reject) => {
  const child = spawn(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolveRun() : reject(new Error(`Build step failed (${code})`)));
});

await run(process.execPath, ['scripts/build-hostinger-android.mjs']);
if (process.platform === 'win32') {
  // cmd is required for the checked-in Gradle batch wrapper. No user text or secrets enter its arguments.
  await run('cmd.exe', ['/d', '/s', '/c', 'gradlew.bat --no-daemon bundleRelease -PkwsPlayRelease=true'], resolve(root, 'android'));
} else {
  await run('./gradlew', ['--no-daemon', 'bundleRelease', '-PkwsPlayRelease=true'], resolve(root, 'android'));
}
console.log('Signed Play bundle: android/app/build/outputs/bundle/release/app-release.aab');
