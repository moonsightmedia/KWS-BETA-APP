import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pythonScript = path.join(__dirname, 'generate_hall_map_region_proposals.py');

const candidates = [
  ['python', [pythonScript]],
  ['py', ['-3', pythonScript]],
];

let lastError = null;

for (const [command, args] of candidates) {
  const result = spawnSync(command, args, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: false,
  });

  if (!result.error && result.status === 0) {
    process.exit(0);
  }

  lastError = result.error ?? new Error(`${command} exited with status ${result.status ?? 'unknown'}`);
}

console.error('Failed to run hall map proposal generator.', lastError);
process.exit(1);
