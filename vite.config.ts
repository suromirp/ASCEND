import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// Which build this is — shown in Settings so a user can see whether they
// run the newest version. GitHub Actions provides GITHUB_SHA; locally the
// git HEAD is used; without git it simply says 'dev'.
function buildVersion(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

// Set this to match your GitHub repository name so assets resolve correctly
// on GitHub Pages, e.g. https://username.github.io/ascend/ -> '/ascend/'.
// Using a custom domain or username.github.io root? Set this to '/'.
const BASE_PATH = process.env.ASCEND_BASE_PATH || '/ascend/';

export default defineConfig({
  base: BASE_PATH,
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': a new build waits; utils/swUpdate.ts activates it itself at
      // a quiet moment (cold start, or back after ~30 min away, never with a
      // sheet or form open), and BIJWERKEN (components/UpdatePrompt.tsx) is
      // the safety net — no silent second reload + splash.
      registerType: 'prompt',
      manifest: {
        id: BASE_PATH,
        name: 'ASCEND: train, bouw op, ga op pad',
        short_name: 'ASCEND',
        lang: 'nl',
        description: 'Je persoonlijke trainingsapp: kracht, conditie en bergcapaciteit die samen opbouwen naar je doel.',
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
        // Lang drukken op het app-icoon (Android). De adressen zijn
        // HashRouter-adressen; "afvinken" opent Vandaag met het invullen van
        // de training van vandaag (src/engine/shortcutAction.ts).
        shortcuts: [
          { name: 'Vandaag', url: BASE_PATH, icons: [{ src: 'shortcut-vandaag.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Week', url: `${BASE_PATH}#/week`, icons: [{ src: 'shortcut-week.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Logboek', url: `${BASE_PATH}#/history`, icons: [{ src: 'shortcut-logboek.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Training afvinken', url: `${BASE_PATH}#/?actie=afvinken`, icons: [{ src: 'shortcut-afvinken.png', sizes: '96x96', type: 'image/png' }] },
        ],
        // "Delen, ASCEND" for a MacroFactor export on Android (Chrome, Edge,
        // Samsung Internet). Android POSTs the file to `action`; the service
        // worker script public/share-target-sw.js catches that, keeps the
        // file in a cache, and redirects to the "MacroFactor inlezen" screen.
        // Both the action and the field name must equal that script.
        share_target: {
          action: `${BASE_PATH}delen/macrofactor`,
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [
              {
                name: 'bestand',
                accept: [
                  'text/csv',
                  'text/comma-separated-values',
                  'application/csv',
                  'application/vnd.ms-excel',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  '.csv',
                  '.xlsx',
                ],
              },
            ],
          },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The generated service worker keeps everything it does (precache,
        // offline fallback); two small scripts are added to it: one answers
        // the share POST, the other shows the morning notice on a periodic
        // sync (public/morning-notice-sw.js). They are not precached: the
        // browser stores imported scripts with the service worker itself.
        importScripts: ['share-target-sw.js', 'morning-notice-sw.js'],
        globIgnores: ['share-target-sw.js', 'morning-notice-sw.js'],
      },
    }),
  ],
});
