import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from "@vitejs/plugin-react-swc";
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  base: process.env.BASE_URL??"/",
  plugins: [
    viteCompression(),
    react({
      jsxImportSource: '@emotion/react',
    }),
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
