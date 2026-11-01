// ASCEND: de Android-app werkt zijn webdeel zelf bij (docs/beslissingen/2026-11-01-android-app.md).
//
// De app heeft altijd een eigen kopie van de webbuild bij zich. De deploy-workflow zet naast de site
// een zip van dezelfde build (voor de app) en een klein app-versie.json op GitHub Pages. Bij het
// openen kijkt de app stil of daar een nieuwere versie staat, haalt die op de achtergrond binnen en
// gebruikt hem bij de volgende start. Hier staat alleen de beslissing; het ophalen en klaarzetten doet
// integrations/liveUpdate.ts.
//
// Puur: geen React, geen netwerk.

export interface AppVersion {
  // De korte commit van de build; ook de naam van de bundel in de app.
  version: string;
  // Wanneer hij gebouwd is (ISO); dat bepaalt welke nieuwer is.
  builtAt: string;
  // Het native niveau dat deze webversie nodig heeft (android/native-level.txt). Een nieuwe plugin
  // of toestemming hoogt het op, en vraagt dus een nieuwe APK.
  minNative: number;
  // Het pad van de zip, ten opzichte van de site.
  bundle: string;
  // SHA-256 van de zip, in hex; de app controleert hem voor hij hem gebruikt.
  sha256: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// Leest defensief: wat niet klopt, wordt niet gevolgd. Een bundel buiten de eigen site nooit.
export function parseAppVersion(raw: unknown): AppVersion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const ok =
    typeof r.version === 'string' && /^[A-Za-z0-9._-]{1,40}$/.test(r.version) && r.version !== 'public' &&
    typeof r.builtAt === 'string' && ISO.test(r.builtAt) &&
    typeof r.minNative === 'number' && Number.isInteger(r.minNative) && r.minNative >= 0 &&
    typeof r.bundle === 'string' && /^[A-Za-z0-9/_.-]+\.zip$/.test(r.bundle) && !r.bundle.includes('..') && !r.bundle.startsWith('/') &&
    typeof r.sha256 === 'string' && /^[0-9a-f]{64}$/.test(r.sha256);
  return ok ? { version: r.version as string, builtAt: r.builtAt as string, minNative: r.minNative as number, bundle: r.bundle as string, sha256: r.sha256 as string } : null;
}

export type UpdateDecision =
  | { kind: 'none' }
  // Ophalen en klaarzetten voor de volgende start.
  | { kind: 'download'; bundleId: string; url: string; checksum: string }
  // Al binnen: alleen klaarzetten.
  | { kind: 'ready'; bundleId: string }
  // Deze webversie heeft een nieuwere app nodig: niet laden, wel één rustige regel.
  | { kind: 'needs-app'; version: string };

export function updateDecision(p: {
  manifest: AppVersion;
  // De bouwtijd van de webversie die nu draait.
  currentBuiltAt: string;
  // Het native niveau van de geïnstalleerde app.
  nativeLevel: number;
  enabled: boolean;
  // Bundels die bij het starten misgingen (de app viel terug); nooit opnieuw.
  blocked: string[];
  downloaded: string[];
  // De basis van de site, met een / aan het eind.
  baseUrl: string;
}): UpdateDecision {
  const m = p.manifest;
  if (!p.enabled || m.builtAt <= p.currentBuiltAt || p.blocked.includes(m.version)) return { kind: 'none' };
  if (m.minNative > p.nativeLevel) return { kind: 'needs-app', version: m.version };
  if (p.downloaded.includes(m.version)) return { kind: 'ready', bundleId: m.version };
  return { kind: 'download', bundleId: m.version, url: new URL(m.bundle, p.baseUrl).toString(), checksum: m.sha256 };
}

// Na het starten: viel de app terug op de vorige werkende versie, en welke bundel ging mis?
export function readyOutcome(r: { rollback: boolean; previousBundleId: string | null; currentBundleId: string | null }): { rolledBack: boolean; failed?: string } {
  return r.rollback ? { rolledBack: true, ...(r.previousBundleId ? { failed: r.previousBundleId } : {}) } : { rolledBack: false };
}

// De versienaam van de app is "<native niveau>.<run>" (android/app/build.gradle).
export function nativeLevelFromVersionName(name: string): number {
  const m = /^(\d+)\./.exec(name);
  return m ? Number(m[1]) : 0;
}
