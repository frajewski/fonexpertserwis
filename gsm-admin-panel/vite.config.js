import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { existsSync, readFileSync } from 'node:fs'

// Push na Androidzie wymaga android/app/google-services.json. Bez niego
// PushNotifications.register() wysypuje aplikację – więc aplikacja wie
// już przy buildzie, czy może w ogóle próbować rejestracji.
const PUSH_FIREBASE_CONFIGURED = existsSync(new URL('./android/app/google-services.json', import.meta.url))

// Wersja panelu = package.json (ta sama trafia do Androida przez build.gradle)
// + czas builda – widoczne w „Moje konto → Informacje o aplikacji”.
const APP_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
const APP_BUILD_TIME = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

export default defineConfig({
  define: {
    __FX_PUSH_CONFIGURED__: JSON.stringify(PUSH_FIREBASE_CONFIGURED),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_BUILD_TIME__: JSON.stringify(APP_BUILD_TIME),
  },

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      // Rejestracja SW jest w src/registerServiceWorker.js – pomijana
      // w aplikacji Android (Capacitor), bez zmian w przeglądarce/PWA.
      injectRegister: false,

      includeAssets: [
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
      ],

      manifest: {
        name: 'FonExpert – Panel serwisowy',
        short_name: 'FonExpert',
        description: 'Panel obsługi napraw i serwisu GSM',

        theme_color: '#ffffff',
        background_color: '#ffffff',

        display: 'standalone',
        start_url: '/',
        scope: '/',

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],

  server: {
    port: 5174,
  },

  resolve: {
    preserveSymlinks: false,
  },

  optimizeDeps: {
    exclude: ['@gsm/shared-core'],
  },
})
