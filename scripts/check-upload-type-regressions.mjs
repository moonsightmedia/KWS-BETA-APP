// Compare this focused patch with HEAD without resetting or rewriting user files.
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const configPath = ts.findConfigFile(process.cwd(),ts.sys.fileExists,'tsconfig.app.json');
const config = ts.readConfigFile(configPath,ts.sys.readFile);
if(config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText,'\n'));
const parsed = ts.parseJsonConfigFileContent(config.config,ts.sys,path.dirname(configPath));
const changed = [
  'src/contexts/UploadContext.tsx','src/lib/authenticatedFetch.ts',
  'src/lib/sessionRecovery.ts','src/utils/resumableUpload.ts','src/utils/uploadLogger.ts',
];
const original = new Map(changed.map(file=>[path.resolve(file).toLowerCase(),execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'})]));
function diagnostics(baseline) {
  const host = ts.createCompilerHost(parsed.options);
  if(baseline) {
    const read = host.readFile;
    host.readFile = file => original.get(path.resolve(file).toLowerCase()) ?? read(file);
  }
  const program = ts.createProgram(parsed.fileNames,parsed.options,host);
  return ts.getPreEmitDiagnostics(program).map(d=>({
    key:JSON.stringify([d.file && path.relative(process.cwd(),d.file.fileName),d.code,ts.flattenDiagnosticMessageText(d.messageText,' ')]),
    text:ts.flattenDiagnosticMessageText(d.messageText,' '),
  }));
}
const baseline = diagnostics(true);
const current = diagnostics(false);
const remaining = new Map();
for(const d of baseline) remaining.set(d.key,(remaining.get(d.key)??0)+1);
const added=[];
for(const d of current) {
  const count=remaining.get(d.key)??0;
  if(count) remaining.set(d.key,count-1); else added.push(d);
}
console.log(JSON.stringify({baselineDiagnostics:baseline.length,currentDiagnostics:current.length,newDiagnostics:added.length},null,2));
for(const d of added) console.error(d.key);
if(added.length) process.exitCode=1;
