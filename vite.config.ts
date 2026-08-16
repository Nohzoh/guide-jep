import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Base path must match the GitHub Pages repo path (https://<user>.github.io/<repo>/).
// Override at build time with VITE_BASE if the repo is renamed.
const base = process.env.VITE_BASE || '/guide-jep/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        id: base,
        scope: base,
        start_url: base,
        name: 'JEP Planner',
        short_name: 'JEP Planner',
        description: "Planifie ton week-end des Journées Européennes du Patrimoine : choisis tes événements et tes créneaux horaires.",
        theme_color: '#7c3aed',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://api.openagenda.com',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openagenda-api',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://cdn.openagenda.com' || url.origin === 'https://img.openagenda.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'openagenda-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
})
