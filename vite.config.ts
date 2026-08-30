import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Set this to match your GitHub repository name so assets resolve correctly
// on GitHub Pages, e.g. https://username.github.io/ascend/ -> '/ascend/'.
// Using a custom domain or username.github.io root? Set this to '/'.
const BASE_PATH = process.env.ASCEND_BASE_PATH || '/ascend/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: BASE_PATH,
        name: 'ASCEND — Discipline, Progressie, Avontuur',
        short_name: 'ASCEND',
        description: 'Persoonlijk training- en avontuur-commandocentrum: kracht, cardio en bergcapaciteit die samen opbouwen naar een groter doel.',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        background_color: '#0D0D0F',
        theme_color: '#0D0D0F',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
});
