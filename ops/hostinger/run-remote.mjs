import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const asRoot = args[0] === '--root';
if (asRoot) args.shift();
if (args.length !== 1) throw new Error('Usage: node run-remote.mjs [--root] script.sh');
const result = spawnSync('ssh.exe', [
  '-T', '-i', join(homedir(), '.ssh', 'id_ed25519_kws_vps_laptop'),
  '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
  '-o', 'StrictHostKeyChecking=yes', '-o', `UserKnownHostsFile=${join(homedir(), '.ssh', 'known_hosts_kws')}`,
  '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'KexAlgorithms=curve25519-sha256',
  '-o', 'ConnectTimeout=10', `${asRoot ? 'root' : 'kws-admin'}@187.7.70.230`,
  // Read the full script before executing so nested commands cannot consume it.
  asRoot ? 'bash -c \'script=$(cat); bash -c "$script"\'' : 'sudo -n bash -c \'script=$(cat); bash -c "$script"\'',
], { input: readFileSync(args[0], 'utf8').replace(/\r\n/g, '\n'), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
if (result.error) throw result.error;
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.exitCode = result.status ?? 1;
