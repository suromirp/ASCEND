import type { CapacitorConfig } from '@capacitor/cli';

// ASCEND als Android-app (docs/beslissingen/2026-11-01-android-app.md). Dezelfde Vite-build als
// de PWA, maar met basis "/" en zonder service worker (`npm run android:sync`). De webview laadt
// de gebundelde bestanden van https://localhost; die herkomst (schema en hostnaam) bepaalt waar de
// gegevens van de app staan, dus verander hem nooit, anders begint de app leeg.
const config: CapacitorConfig = {
  appId: 'app.ascend.training',
  appName: 'ASCEND',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
