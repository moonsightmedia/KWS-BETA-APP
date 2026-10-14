import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { resolve, relative } from 'node:path';

// Compare against Git HEAD without resetting or altering the checkout.
const config = ts.readConfigFile('tsconfig.app.json', ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
const tracked = new Set(execFileSync('git', ['ls-files', 'src'], { encoding: 'utf8' }).trim().split(/\r?\n/).map(p => resolve(p).toLowerCase()));
const changed = execFileSync('git', ['diff', '--name-only', '--', 'src'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
const originals = new Map(changed.map(file => {
  const bytes = execFileSync('git', ['show', `HEAD:${file}`]);
  return [resolve(file).toLowerCase(), bytes[0] === 255 && bytes[1] === 254 ? bytes.subarray(2).toString('utf16le') : bytes.toString('utf8')];
}));
function check(baseline) {
  const host = ts.createCompilerHost(parsed.options);
  const getSourceFile = host.getSourceFile;
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) => {
    const original = baseline && originals.get(resolve(file).toLowerCase());
    return typeof original === 'string' ? ts.createSourceFile(file, original, languageVersion, true) : getSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile);
  };
  const files = baseline ? parsed.fileNames.filter(file => tracked.has(resolve(file).toLowerCase())) : parsed.fileNames;
  const program = ts.createProgram(files, parsed.options, host);
  // Match the error code, offending expression and root message, not the
  // expanded generic type dump. Adding a DB column changes those dumps even
  // for untouched, pre-existing unknown-table errors.
  return ts.getPreEmitDiagnostics(program).map(d => {
    const message = (typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText)
      .replace(/(does not exist on type).*/, '$1');
    const expression = d.file && d.start !== undefined ? d.file.text.slice(d.start, d.start + (d.length || 0)) : '';
    return `${d.file ? relative('.', d.file.fileName).replaceAll('\\', '/') : ''}: TS${d.code} ${expression}: ${message}`;
  });
}
const before = check(true), after = check(false);
const known = new Map(); before.forEach(d => known.set(d, (known.get(d) || 0) + 1));
const added = after.filter(d => { if (!known.get(d)) return true; known.set(d, known.get(d) - 1); return false; });
console.log(`TypeScript: baseline ${before.length}, current ${after.length}, introduced ${added.length}`);
if (added.length) { console.error(added.join('\n')); process.exitCode = 1; }
