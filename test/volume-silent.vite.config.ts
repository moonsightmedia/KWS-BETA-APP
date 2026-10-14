import { defineConfig, mergeConfig } from 'vite';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import appConfig from '../vite.config';

export default defineConfig(env => mergeConfig(appConfig(env), {
  server: { fs: { allow: [resolve('.'), realpathSync(resolve('node_modules'))] } },
}));
