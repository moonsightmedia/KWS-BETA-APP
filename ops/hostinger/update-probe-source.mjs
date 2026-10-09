import { spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
const revision = spawnSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
if (!/^[a-f0-9]{12}$/.test(revision)) throw new Error('Invalid revision');
const source = spawn('git', ['archive', '--format=tar', 'HEAD'], { stdio: ['ignore', 'pipe', 'inherit'] });
const target = spawn('ssh.exe', ['-T', '-i', join(homedir(), '.ssh', 'id_ed25519_kws_vps_laptop'),
  '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
  '-o', `UserKnownHostsFile=${join(homedir(), '.ssh', 'known_hosts_kws')}`,
  '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'KexAlgorithms=curve25519-sha256',
  'kws-admin@187.7.70.230',
  `sudo -n bash -c 'set -Eeuo pipefail; umask 022; test ! -e /opt/kws/probe-web/releases/${revision}/source/package.json; install -d -m 755 /opt/kws/probe-web/releases/${revision}/source; tar -xf - -C /opt/kws/probe-web/releases/${revision}/source; printf "${revision}" > /opt/kws/probe-web/release-to-build; echo PROBE_RELEASE_SOURCE_TRANSFERRED'`],
  { stdio: ['pipe', 'inherit', 'inherit'] });
source.stdout.pipe(target.stdin);
target.stdin.on('error', () => source.kill());
const result = child => new Promise(resolve => child.on('close', resolve));
const codes = await Promise.all([result(source), result(target)]);
if (codes.some(code => code !== 0)) process.exitCode = 1;
