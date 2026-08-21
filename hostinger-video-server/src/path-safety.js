import path from 'node:path';
import { promises as fs } from 'node:fs';

export function inside(root, ...segments) {
  const base = path.resolve(root);
  const target = path.resolve(base, ...segments);
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) throw new Error('path escapes managed root');
  return target;
}

export async function assertNoSymlinkAncestors(root, target, { allowMissing = true } = {}) {
  const base = path.resolve(root); const resolved = inside(base, path.relative(base, path.resolve(target)));
  for (const current of [base, ...path.relative(base, resolved).split(path.sep).filter(Boolean).map((_, i, parts) => path.join(base, ...parts.slice(0, i + 1)))]) {
    const stat = await fs.lstat(current).catch((error) => {
      if (allowMissing && error.code === 'ENOENT') return null;
      throw error;
    });
    if (stat?.isSymbolicLink()) throw new Error('symlinked managed path is forbidden');
  }
  return resolved;
}

export async function readManagedJson(root, file) {
  try {
    await assertNoSymlinkAncestors(root, file, { allowMissing: false });
    const stat = await fs.lstat(file); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('managed JSON is not a regular file');
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function managedBytes(root) {
  let total = 0;
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) total += (await fs.stat(full)).size;
    }
  }
  await walk(root); return total;
}
