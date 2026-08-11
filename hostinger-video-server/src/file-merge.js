import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

async function* chunks(files) {
  for (const file of files) {
    const input = createReadStream(file);
    try { for await (const chunk of input) yield chunk; }
    finally { input.destroy(); }
  }
}

export async function mergeFiles(files, target) {
  await pipeline(chunks(files), createWriteStream(target, { flags: 'wx', mode: 0o600 }));
}
