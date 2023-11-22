import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from "@vitejs/plugin-react-swc";
import { liveReload } from 'vite-plugin-live-reload';
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.BASE_URL??"/",
  plugins: [
    viteCompression(),
    // crossOriginIsolation(),
    react({
      jsxImportSource: '@emotion/react',
    }),
    // liveReload(["src/**/*.tsx", "src/**/*.ts","src/**/*.jsx", "src/**/*.js", "public/metaverse/meta.js"]),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  
  server : {
    host: '0.0.0.0',
    port: 4050,
    // https: {
    //   key: fs.readFileSync(resolve(__dirname, '../backend/ssl/server.key')),
    //   cert: fs.readFileSync(resolve(__dirname, '../backend/ssl/server.crt')),
    // },
    cors:false,

    proxy: {
      '/api/': {
        target: 'http://localhost:3050',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        xfwd: true
      },
      '/api/ws/': {
        ws: true,
        target: 'http://localhost:3100',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/ws/, ''),
        xfwd: true
      },
    }
  }
})
