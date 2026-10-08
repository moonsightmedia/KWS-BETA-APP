import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const source = spawn('git', ['archive', '--format=tar', 'HEAD'], { stdio: ['ignore', 'pipe', 'inherit'] });
const target = spawn('ssh.exe', ['-T', '-i', join(homedir(), '.ssh', 'id_ed25519_kws_vps_laptop'),
  '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
  '-o', `UserKnownHostsFile=${join(homedir(), '.ssh', 'known_hosts_kws')}`,
  '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'KexAlgorithms=curve25519-sha256',
  'kws-admin@187.7.70.230',
  "sudo -n bash -c 'set -Eeuo pipefail; umask 022; install -d -m 755 /opt/kws/web/source; test ! -e /opt/kws/web/source/package.json; tar -xf - -C /opt/kws/web/source; echo APP_SOURCE_TRANSFERRED'"],
  { stdio: ['pipe', 'inherit', 'inherit'] });
source.stdout.pipe(target.stdin);
target.stdin.on('error', () => source.kill());
const result = child => new Promise(resolve => child.on('close', resolve));
const codes = await Promise.all([result(source), result(target)]);
if (codes.some(code => code !== 0)) process.exitCode = 1;
