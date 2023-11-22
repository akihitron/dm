import type { UserConfig } from '@farmfe/core';
import { resolve } from 'path';

function defineConfig(config: UserConfig) {
  return config;
}


export default defineConfig({
  root: process.cwd(), 
  compilation: {
    input: {
      index: './index_farm.html',
    },
    
  },
  server: {
    port: 4050,
    cors: false,
    proxy: {
      '/api/': {
        target: 'http://localhost:3050',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // '/api/ws/': {
      //   ws: true,
      //   target: 'http://localhost:3100',
      //   changeOrigin: true,
      //   secure: false,
      //   rewrite: (path) => path.replace(/^\/api\/ws/, ''),
      //   xfwd: true
      // },
    },
    hmr: true,
    //...
  },
  plugins: ['@farmfe/plugin-react'],

});
