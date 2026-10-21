import {defineConfig} from 'vite';
import base from './thumbnail-setter.vite.config';
export default defineConfig({...base,cacheDir:'node_modules/.vite-thumbnail-setter-disabled',
 define:{...base.define,'import.meta.env.VITE_THUMBNAIL_FOCUS':JSON.stringify('false')},
 server:{host:'127.0.0.1',port:5245,strictPort:true},
});
