// ASCEND: de Android-app werkt zijn webdeel zelf bij (docs/beslissingen/2026-11-01-android-app.md).
//
// Met de plugin Live Update van Capawesome (MIT), zonder hun cloud: geen appId, dus de plugin
// praat met niemand behalve het adres dat ASCEND hem geeft. ASCEND vraagt alleen app-versie.json
// en de zip op bij GitHub Pages; er gaat niets van jou mee. De beslissing staat in
// engine/liveUpdate.ts. In de browser doet deze laag niets: de PWA werkt zich bij via zijn
// service worker (utils/swUpdate.ts).

import { Capacitor } from '@capacitor/core';
import { isTrustedUpdateUrl, nativeLevelFromVersionName, parseAppVersion, readyOutcome, updateDecision, type UpdateDecision } from '../engine/liveUpdate';
import { withTimeout } from '../utils/withTimeout';

export interface LiveUpdatePort {
  // Of deze app zichzelf kan bijwerken (de Android-app met een adres om te kijken).
  readonly available: boolean;
  // Waar de nieuwste APK te halen is, als die bekend is.
  readonly releasesUrl: string;
  // Meldt dat deze versie goed gestart is; zonder valt de app terug op de vorige werkende versie.
  ready(): Promise<{ rolledBack: boolean }>;
  // Kijkt stil of er een nieuwere webversie is en haalt hem op voor de volgende start.
  check(enabled: boolean): Promise<UpdateDecision['kind'] | 'failed'>;
}

const FETCH_MS = 8000;
const DOWNLOAD_MS = 120_000;

const browserPort: LiveUpdatePort = {
  available: false,
  releasesUrl: '',
  async ready() {
    return { rolledBack: false };
  },
  async check() {
    return 'none';
  },
};

type Plugin = (typeof import('@capawesome/capacitor-live-update'))['LiveUpdate'];

function androidPort(updateUrl: string, releasesUrl: string, builtAt: string): LiveUpdatePort {
  let plugin: Promise<Plugin> | undefined;
  const load = () => (plugin ??= import('@capawesome/capacitor-live-update').then((m) => m.LiveUpdate));
  const base = updateUrl.endsWith('/') ? updateUrl : `${updateUrl}/`;
  return {
    available: true,
    releasesUrl,
    async ready() {
      try {
        const p = await load();
        return readyOutcome(await withTimeout(p.ready(), FETCH_MS));
      } catch {
        return { rolledBack: false };
      }
    },
    async check(enabled) {
      if (!enabled) return 'none';
      try {
        const p = await load();
        // Alleen dit ene bestand, zonder iets van jou erbij; nooit uit een cache.
        const response = await withTimeout(fetch(`${base}app-versie.json`, { cache: 'no-store', credentials: 'omit' }), FETCH_MS);
        if (!response.ok) return 'failed';
        const manifest = parseAppVersion(await response.json());
        if (!manifest) return 'failed';
        const [version, blocked, downloaded] = await Promise.all([p.getVersionName(), p.getBlockedBundles(), p.getDownloadedBundles()]);
        const decision = updateDecision({
          manifest,
          currentBuiltAt: builtAt,
          nativeLevel: nativeLevelFromVersionName(version.versionName),
          enabled,
          blocked: blocked.bundleIds,
          downloaded: downloaded.bundleIds,
          baseUrl: base,
          now: Date.now(),
        });
        if (decision.kind === 'download') {
          await withTimeout(p.downloadBundle({ bundleId: decision.bundleId, url: decision.url, checksum: decision.checksum, artifactType: 'zip' }), DOWNLOAD_MS);
          await p.setNextBundle({ bundleId: decision.bundleId });
        } else if (decision.kind === 'ready') {
          await p.setNextBundle({ bundleId: decision.bundleId });
        }
        return decision.kind;
      } catch {
        return 'failed';
      }
    },
  };
}

let current: LiveUpdatePort | undefined;

export function liveUpdatePort(): LiveUpdatePort {
  if (current) return current;
  const updateUrl = typeof __UPDATE_URL__ === 'string' ? __UPDATE_URL__ : '';
  const releasesUrl = typeof __RELEASES_URL__ === 'string' ? __RELEASES_URL__ : '';
  const builtAt = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '';
  // Alleen https op GitHub Pages; een ander adres betekent: niet bijwerken.
  current = Capacitor.getPlatform() === 'android' && isTrustedUpdateUrl(updateUrl) && builtAt ? androidPort(updateUrl, releasesUrl, builtAt) : browserPort;
  return current;
}

// Voor tests: een nagemaakte laag, of terug naar de echte met undefined.
export function setLiveUpdatePort(port: LiveUpdatePort | undefined): void {
  current = port;
}
