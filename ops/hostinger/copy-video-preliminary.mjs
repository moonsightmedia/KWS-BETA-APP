import { spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const stage=process.argv.includes('--final')?'final':'precopy';
if(process.argv.slice(2).some(arg=>arg!=='--final'))throw new Error('Usage: node copy-video-preliminary.mjs [--final]');
if(stage==='final') {
  const result=spawnSync('ssh.exe',['-T','-i',join(homedir(),'.ssh','id_ed25519_kws_vps_laptop'),'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',`UserKnownHostsFile=${join(homedir(),'.ssh','known_hosts_kws')}`,'-o','HostKeyAlgorithms=ssh-ed25519','-o','KexAlgorithms=curve25519-sha256','kws-admin@187.7.70.230',
    "sudo -n python3 -c 'import json;from pathlib import Path;p=Path(\"/var/backups/kws/migration\");g=json.loads((p/\"SOURCE-MAINTENANCE-GATE.json\").read_text());v=json.loads((p/\"SOURCE-VIDEO-FROZEN.json\").read_text());assert g[\"active\"] and g[\"api_rejection_verified\"] and v[\"stopped\"] and v[\"drained\"]'"],{stdio:'ignore'});
  if(result.status!==0)throw new Error('Final transfer requires verified source freeze');
}
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const archive = `/var/backups/kws/migration/video-${stage}-${stamp}.tar.age`;
const source = spawn('ssh.exe', ['-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', 'vps',
  (stage==='final'?"test \"$(docker inspect -f '{{.State.Running}}' kws-video-server-video-server-1)\" = false && ":'')+'tar -C /opt/kws-video-server/data -cf - .'], { stdio: ['ignore', 'pipe', 'pipe'] });
const targetCommand = `sudo -n bash -c 'set -Eeuo pipefail; umask 077; recipient=$(age-keygen -y /root/.config/kws-migration/age-key.txt); age -r "$recipient" -o ${archive}.partial; mv -- ${archive}.partial ${archive}; sha256sum ${archive} > ${archive}.sha256; echo ENCRYPTED_VIDEO_PRECOPY=${archive}'`;
const target = spawn('ssh.exe', ['-T', '-i', join(homedir(), '.ssh', 'id_ed25519_kws_vps_laptop'),
  '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
  '-o', `UserKnownHostsFile=${join(homedir(), '.ssh', 'known_hosts_kws')}`,
  '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'KexAlgorithms=curve25519-sha256',
  'kws-admin@187.7.70.230', targetCommand], { stdio: ['pipe', 'inherit', 'pipe'] });
let transferred = 0;
let sourceWarning = false;
source.stdout.on('data', chunk => { transferred += chunk.length; });
source.stderr.on('data', () => { sourceWarning = true; });
target.stderr.on('data', () => { /* Never forward an unexpected server error verbatim. */ });
source.on('error', () => target.kill());
target.on('error', () => source.kill());
target.stdin.on('error', () => source.kill());
source.stdout.pipe(target.stdin);
const timer = setInterval(() => console.log(`VIDEO_${stage.toUpperCase()}_TRANSFERRED_BYTES=${transferred}`), 30000);
const exit = child => new Promise(resolve => child.on('close', (code, signal) => resolve({code, signal})));
const [s, t] = await Promise.all([exit(source), exit(target)]);
clearInterval(timer);
if (s.code !== 0 || t.code !== 0) {
  console.error(`Preliminary copy failed (source=${s.code}, target=${t.code}); source remains intact. Do not use this archive for final restore.`);
  process.exitCode = 1;
} else {
  console.log(`VIDEO_${stage.toUpperCase()}_COMPLETE_BYTES=${transferred}`);
  console.log(`SOURCE_WARNING_PRESENT=${sourceWarning}`);
  console.log(stage==='final'?'FINAL_COPY_REQUIRES_DECRYPT_RESTORE_AND_FROZEN_SOURCE_HASH_COMPARISON':'PRELIMINARY_COPY_ONLY_FINAL_FREEZE_AND_COMPARE_REQUIRED');
}
