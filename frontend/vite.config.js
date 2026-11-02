import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import legacy from '@vitejs/plugin-legacy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy({
      // CRITICAL: Explicitly target iOS 9 Safari (iPad Mini 1st Gen)
      targets: ['ios >= 9', 'safari >= 9', 'chrome >= 49'],
      // Inject essential runtimes and polyfills for iOS 9 Safari
      additionalLegacyPolyfills: [
        'regenerator-runtime/runtime',
        'proxy-polyfill'
      ],
      // Polyfill modern JS constructs in the modern/legacy builds
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
