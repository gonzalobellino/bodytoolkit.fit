import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

// HTTPS configuration for camera access
// The camera API requires a secure context (HTTPS or localhost)
// For development, we use SSL certificates from conf/certs
// Host/access filtering delegated to Vercel in production
const certPath = path.resolve(import.meta.dirname, 'conf/certs');
const httpsConfig = (() => {
  try {
    const cert = path.join(certPath, 'umbrel.local.crt');
    const key = path.join(certPath, 'umbrel.local.key');
    if (fs.existsSync(cert) && fs.existsSync(key)) {
      return {
        cert: fs.readFileSync(cert),
        key: fs.readFileSync(key),
      };
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('SSL certificates not found, using HTTP (localhost still works for camera)');
  }
  return undefined;
})();

export default defineConfig({
  plugins: [
    {
      // pose-detection imports a named export from MediaPipe's global script.
      // Rolldown needs that export declared explicitly for production bundles.
      name: 'mediapipe-pose-global-export',
      enforce: 'pre',
      apply: 'build',
      transform(code, id) {
        if (!id.endsWith('/@mediapipe/pose/pose.js')) return;
        return `${code}\nexport const Pose = globalThis.Pose;`;
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      // generateSW (default) - Plugin generates service worker automatically
      registerType: 'autoUpdate',
      filename: 'service-worker.js',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Corrective Exercise Toolkit',
        short_name: 'CES Toolkit',
        description: 'PWA for training in movement pattern identification and corrective exercise',
        theme_color: '#1a1a2e',
        background_color: '#0f0f1e',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['health', 'fitness', 'education'],
      },
      workbox: {
        // Precaching configuration
        globPatterns: ['**/*.{js,css,html,json,png,svg,ico,jpg,jpeg}'],
        // Exclude Vite source files from precache (they don't exist in production)
        globIgnores: ['**/src/**', '**/@/**', '**/_/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB

        // Cache management
        cleanupOutdatedCaches: true,

        // Service worker update strategy
        skipWaiting: true,
        clientsClaim: true,

        // SPA navigation fallback
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/_/,
          /^\/src\//,
          /^\/@/,
          /^\/node_modules\//,
          /^\/robots\.txt$/,
          /^\/sitemap\.xml$/,
          /^\/(learn|exercises|assessments|conditions|about|field)\//,
        ],

        // Runtime caching for dynamic content only
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/umbrel\.local\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallbackAllowlist: [/^\/$/],
      },
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rolldownOptions: {
      treeshake: {
        manualPureFunctions: ['console.log', 'console.debug', 'console.info', 'console.warn'],
      },
      output: {
        // No manual chunks for node_modules: avoids multiple React instances (useLayoutEffect error in production).
        // Only split app routes for lazy-loading.
        manualChunks: (id) => {
          if (id.includes('src/components/FieldToolsSection')) return 'field-tools';
          if (id.includes('src/components/PracticeSection')) return 'practice';
          if (id.includes('src/components/LearnSection')) return 'learn';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: false,
    https: httpsConfig,
    watch: {
      ignored: [
        '**/downloads/**',
        '**/docs/**',
        '**/api/**',
        '**/scripts/**',
        '**/conf/**',
        '**/rules/**',
      ],
    },
    // When accessing via umbrel.local, HMR must use the same host so the WebSocket connects correctly
    hmr: {
      host: 'umbrel.local',
      port: 5173,
      protocol: httpsConfig ? 'wss' : 'ws',
    },
    fs: {
      strict: false,
    },
  },
  publicDir: 'public',
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tensorflow/tfjs',
      '@tensorflow-models/pose-detection',
    ],
    exclude: [],
  },
});
