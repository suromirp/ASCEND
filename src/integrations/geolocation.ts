// ASCEND: je plek van nu op het toestel (docs/beslissingen/2026-11-02-locatie.md). In de browser is
// dat navigator.geolocation; in de Android-app de plugin Geolocation, zodat Android de toestemming
// zelf vraagt. De rest van de app kent alleen utils/geolocation.ts (locateMe) en dit bestand voor de
// toestemming; niemand vraagt het platform rechtstreeks. Alleen de ruwe plek (coarse) wordt gevraagd:
// ASCEND rondt toch af op twee decimalen.

import { Capacitor } from '@capacitor/core';
import type { LocationPermission } from '../engine/weatherLocation';

type Callback = Parameters<Geolocation['getCurrentPosition']>;

const isApp = () => Capacitor.getPlatform() === 'android';

// De module in een belofte, nooit de plugin zelf: een plugin is een Proxy met een methode `then`.
const load = () => import('@capacitor/geolocation');

// De plugin gooit een gewone fout met een tekst; de code die locateMe verwacht is die van de browser
// (1 geweigerd, 2 niet beschikbaar, 3 te laat).
function errorCode(err: unknown): 1 | 2 | 3 {
  const text = String((err as { message?: unknown } | undefined)?.message ?? err).toLowerCase();
  if (/denied|permission|toestemming/.test(text)) return 1;
  if (/timeout|timed out/.test(text)) return 3;
  return 2;
}

// Past op Pick<Geolocation, 'getCurrentPosition'>, zodat locateMe voor beide dezelfde weg neemt.
const appGeolocation: Pick<Geolocation, 'getCurrentPosition'> = {
  getCurrentPosition(success: Callback[0], failure?: Callback[1], options?: Callback[2]) {
    void load()
      .then((m) => m.Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: options?.timeout, maximumAge: options?.maximumAge }))
      .then(
        (pos) => success({ coords: pos.coords, timestamp: pos.timestamp } as unknown as GeolocationPosition),
        (err) => failure?.({ code: errorCode(err), message: String((err as Error | undefined)?.message ?? '') } as unknown as GeolocationPositionError),
      );
  },
};

// Undefined in de browser: daar gebruikt locateMe zelf navigator.geolocation.
export function appGeolocationOrUndefined(): Pick<Geolocation, 'getCurrentPosition'> | undefined {
  return isApp() ? appGeolocation : undefined;
}

const mapState = (state: string | undefined): LocationPermission => (state === 'granted' || state === 'denied' || state === 'prompt' ? state : 'unknown');

// Zonder venster: alleen lezen wat Android al weet. Undefined in de browser.
export async function appLocationPermission(): Promise<LocationPermission | undefined> {
  if (!isApp()) return undefined;
  try {
    const status = await (await load()).Geolocation.checkPermissions();
    return mapState(status.coarseLocation === 'granted' ? 'granted' : status.location);
  } catch {
    return 'unknown';
  }
}

// Het venster van Android, alleen als je Je locatie aanzet. Undefined in de browser (daar komt het
// venster bij de eerste vraag naar je plek).
export async function requestAppLocationPermission(): Promise<LocationPermission | undefined> {
  if (!isApp()) return undefined;
  try {
    const status = await (await load()).Geolocation.requestPermissions({ permissions: ['coarseLocation'] });
    return mapState(status.coarseLocation === 'granted' ? 'granted' : status.location);
  } catch {
    return 'unknown';
  }
}
