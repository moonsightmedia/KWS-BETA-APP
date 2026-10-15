const fs = require('node:fs');
const ts = require('typescript');

// Use the existing TypeScript dependency; no test-runner installation required.
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};
require('../src/features/training/planBuilder.test.ts');
require('../src/features/training/trainingHistory.test.ts');
