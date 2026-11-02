import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import legacy from '@vitejs/plugin-legacy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy({
      // Explicitly target iOS 9 Safari (iPad Mini 1st Gen) and older browsers
      targets: ['ios_saf >= 9', 'safari >= 9', 'chrome >= 49', 'ie >= 11'],
      // Core polyfills for Safari 9 (Promise, Symbol, Map, Set, Object.assign, etc.)
      additionalLegacyPolyfills: [
        'regenerator-runtime/runtime',
        'core-js/stable',
        'proxy-polyfill'
      ],
      modernPolyfills: true,
      renderModernChunks: true
    })
  ],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      safari10: true
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
