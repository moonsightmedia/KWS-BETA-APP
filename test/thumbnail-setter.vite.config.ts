import { defineConfig } from 'vite';
import base from './mobile-maps.vite.config';
export default defineConfig({
 ...base,cacheDir:'node_modules/.vite-thumbnail-setter',
 define:{...base.define,'import.meta.env.VITE_THUMBNAIL_FOCUS':JSON.stringify('true'),'import.meta.env.VITE_THUMBNAIL_API_PATH':JSON.stringify('/qa-thumbnail')},
 server:{host:'127.0.0.1',port:5244,strictPort:true},
 optimizeDeps:{entries:['test/fixtures/thumbnail-setter.html']},
});
