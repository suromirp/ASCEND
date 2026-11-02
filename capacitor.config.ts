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
  plugins: {
    // Het kleine teken in de statusbalk (android/app/src/main/res/drawable/ic_stat_ascend.xml).
    // Kleuren uit het thema (src/index.css): het marine van --color-bg achter het openingsscherm,
    // de lucht van --color-sky-top achter de statusbalk tot de app hem zelf zet
    // (src/integrations/deviceShell.ts). Het openingsscherm gaat weg zodra de app er is, en
    // anders na drie seconden vanzelf.
    SplashScreen: {
      backgroundColor: '#0b1733',
      launchShowDuration: 3000,
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#dcebf8',
      style: 'LIGHT',
    },
    // Edge-to-edge (Android 15 en hoger): de app loopt onder de statusbalk en de gebarenbalk door.
    // SystemBars geeft de ruimte onderaan door als env(safe-area-inset-bottom) en als
    // --safe-area-inset-bottom; src/index.css maakt daar --rand-onder van, die elk blad, de tabbalk
    // en de knoppenbalken gebruiken. De hint 'cover' (zoals de viewport-meta in index.html) voorkomt
    // dat de eerste afbeelding eerst met en dan zonder opvulling staat.
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_ascend',
    },
    // Live update zonder cloud: geen appId, dus de plugin praat nooit met de dienst van de maker;
    // ASCEND haalt zelf een zip van GitHub Pages (src/integrations/liveUpdate.ts). Meldt een nieuwe
    // bundel zich niet binnen 20 seconden als gezond (ready), dan valt de app terug op de vorige
    // werkende versie en wordt die bundel nooit meer geladen.
    LiveUpdate: {
      autoUpdateStrategy: 'none',
      readyTimeout: 20000,
      autoBlockRolledBackBundles: true,
      autoDeleteBundles: true,
    },
  },
};

export default config;
