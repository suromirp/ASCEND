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
      // 'prompt': a new build waits until the user taps BIJWERKEN
      // (components/UpdatePrompt.tsx) — no silent second reload + splash.
      registerType: 'prompt',
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
