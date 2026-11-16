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

// De plugin gooit een fout met een code (OS-PLUG-GLOC-0003 geweigerd, -0010 te laat) en een Engelse tekst;
// de code die locateMe verwacht is die van de browser (1 geweigerd, 2 niet beschikbaar, 3 te laat). Eerst
// de code van de plugin, de tekst alleen als terugval.
export function errorCode(err: unknown): 1 | 2 | 3 {
  const code = String((err as { code?: unknown } | undefined)?.code ?? '');
  if (/GLOC-0003$/.test(code)) return 1;
  if (/GLOC-0010$/.test(code)) return 3;
  const text = String((err as { message?: unknown } | undefined)?.message ?? err).toLowerCase();
  if (/denied|permission|toestemming/.test(text)) return 1;
  if (/timeout|timed out|in time/.test(text)) return 3;
  return 2;
}

const toPositionError = (err: unknown) => ({ code: errorCode(err), message: String((err as Error | undefined)?.message ?? '') }) as unknown as GeolocationPositionError;

// Een volgende plek: de plugin geeft zijn eigen id pas later (een belofte), de browser meteen een getal.
// Daarom een eigen getal per volgen, zodat stoppen ook werkt voordat de plugin antwoordde.
let nextWatch = 1;
const appWatches = new Map<number, Promise<string | undefined>>();

// Past op de vorm van de browser, zodat locateMe en watchFine voor beide dezelfde weg nemen.
const appGeolocation: Pick<Geolocation, 'getCurrentPosition' | 'watchPosition' | 'clearWatch'> = {
  getCurrentPosition(success: Callback[0], failure?: Callback[1], options?: Callback[2]) {
    void load()
      .then((m) => m.Geolocation.getCurrentPosition({ enableHighAccuracy: options?.enableHighAccuracy === true, timeout: options?.timeout, maximumAge: options?.maximumAge }))
      .then(
        (pos) => success({ coords: pos.coords, timestamp: pos.timestamp } as unknown as GeolocationPosition),
        (err) => failure?.(toPositionError(err)),
      );
  },
  // Elke seconde een nieuwe plek (de plugin wacht anders 5 s): binnen de grens van 15 s telt elke fix.
  watchPosition(success: Callback[0], failure?: Callback[1], options?: Callback[2]): number {
    const handle = nextWatch++;
    const id: Promise<string | undefined> = load()
      .then((m) =>
        m.Geolocation.watchPosition(
          { enableHighAccuracy: options?.enableHighAccuracy === true, timeout: options?.timeout, maximumAge: options?.maximumAge, interval: 1000, minimumUpdateInterval: 1000 },
          (pos, err) => {
            // Na stoppen telt niets meer. Komt er toch nog een plek, dan begon het volgen pas na het stoppen
            // (het venster van Android stond nog open, of clearWatch was net eerder): de plugin kende het id
            // toen nog niet. Dan stopt deze plek het volgen nog een keer (Warden, I-61).
            if (!appWatches.has(handle)) {
              void id.then((cid) => (cid === undefined ? undefined : load().then((m) => m.Geolocation.clearWatch({ id: cid })))).catch(() => undefined);
              return;
            }
            if (pos) success({ coords: pos.coords, timestamp: pos.timestamp } as unknown as GeolocationPosition);
            else failure?.(toPositionError(err));
          },
        ),
      )
      .then(
        (cid) => cid,
        (err) => {
          if (appWatches.has(handle)) failure?.(toPositionError(err));
          return undefined;
        },
      );
    appWatches.set(handle, id);
    return handle;
  },
  clearWatch(handle: number) {
    const id = appWatches.get(handle);
    appWatches.delete(handle);
    void id
      ?.then((cid) => (cid === undefined ? undefined : load().then((m) => m.Geolocation.clearWatch({ id: cid }))))
      .catch(() => undefined);
  },
};

// Undefined in de browser: daar gebruikt locateMe zelf navigator.geolocation.
export function appGeolocationOrUndefined(): Pick<Geolocation, 'getCurrentPosition' | 'watchPosition' | 'clearWatch'> | undefined {
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

// Wat Android zegt na de vraag om je fijne plek. `approximate`: je koos "Bij benadering", dan geeft de
// telefoon alleen een ruwe plek en wordt die nooit scherp genoeg voor een startpunt.
export type FineLocationAccess = LocationPermission | 'approximate';

// `location` is bij de plugin alleen granted met precieze toegang; alleen `coarseLocation` granted
// betekent: bij benadering. Een vraag die gooit of 'prompt' geeft is geen weigering: dan probeert de
// app de plek gewoon, en zegt Android zelf of het mag.
export const fineAccessOf = (status: { location?: string; coarseLocation?: string }): FineLocationAccess =>
  status.location === 'granted' ? 'granted' : status.coarseLocation === 'granted' ? 'approximate' : status.location === 'denied' ? 'denied' : mapState(status.location);

// Voor een startpunt van een lus (Waar je nu bent of Vast punt) is een ruwe plek te grof: dan vraagt de
// app de fijne plek, alleen na een tik van de gebruiker (Route voorstellen of Gebruik waar ik nu ben). Het manifest heeft beide rechten
// al. Kiest de gebruiker "ongeveer", dan zegt ASCEND dat (besluit 2026-11-15-waar-je-nu-bent-scherp.md).
export async function requestFineAppLocationPermission(): Promise<FineLocationAccess | undefined> {
  if (!isApp()) return undefined;
  try {
    return fineAccessOf(await (await load()).Geolocation.requestPermissions({ permissions: ['location'] }));
  } catch {
    return 'unknown';
  }
}

// Zonder venster: wat Android nu weet over je fijne plek, vlak voor het volgen (na een antwoord dat geen
// ja of nee was). Undefined in de browser; 'unknown' als de plugin gooit.
export async function checkFineAppLocationPermission(): Promise<FineLocationAccess | undefined> {
  if (!isApp()) return undefined;
  try {
    return fineAccessOf(await (await load()).Geolocation.checkPermissions());
  } catch {
    return 'unknown';
  }
}
