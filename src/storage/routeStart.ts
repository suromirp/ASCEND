// ASCEND: het eigen startpunt van een lus (Startpunt van je lus, Vast punt). Sinds Plekken is dat punt de
// plek Thuis (storage/places.ts): dit bestand leest en zet Thuis, en de instelling houdt de waarde `exact`.
// Thuis gaat mee in de back-up, als plek. De oude sleutel `routeStartPoint` wordt bij de eerste start
// Thuis (places.ts#migrateStartPointToHome); zolang dat nog niet gelukt is, leest dit bestand hem nog,
// zodat Vast punt blijft werken. Wissen is één tik in de instelling. Docs:
// docs/beslissingen/2026-11-09-startpunt-lus.md, docs/beslissingen/2026-11-11-plekken-opslag.md.
//
// Het punt bepalen heeft een grens in tijd en geeft altijd een punt of een reden; het gooit nooit.

import { MetaRepo } from './database';
import { clearExactTerrain } from './nearbyTerrain';
import { OLD_START_POINT_KEY, clearHome, loadPlaces, setHomePoint } from './places';
import { homeOf, placePoint } from '../engine/places';
import type { PlaceSource } from '../models/place';
import { MAX_START_ACCURACY_M, roundExact, validStartPoint, type StartFailure } from '../engine/routeStart';
import type { RoutePoint } from '../models/route';
import { watchFine, type Position2, type WatchFn } from '../utils/geolocation';
import { withTimeout } from '../utils/withTimeout';
import { requestFineAppLocationPermission } from '../integrations/geolocation';

export const START_LOCATE_LIMIT_MS = 15_000;

export async function getRouteStartPoint(): Promise<RoutePoint | undefined> {
  try {
    const home = homeOf(await loadPlaces());
    if (home) return validStartPoint(placePoint(home));
    // Nog niet verhuisd (de migratie loopt bij de start): het oude punt geldt tot het Thuis is.
    return validStartPoint(await MetaRepo.get<unknown>(OLD_START_POINT_KEY));
  } catch {
    return undefined;
  }
}

// Zet het punt van Thuis. `source` zegt waar een nieuwe Thuis vandaan komt (je plek van nu of de kaart);
// een bestaande Thuis verhuist alleen.
export async function saveRouteStartPoint(point: RoutePoint, source: PlaceSource = 'here'): Promise<boolean> {
  const valid = validStartPoint(point);
  if (!valid) return false;
  try {
    if (!(await setHomePoint(roundExact(valid), source))) return false;
    // De heuvels rond het vorige punt horen niet te blijven staan.
    await clearExactTerrain();
    return true;
  } catch {
    return false;
  }
}

// Wissen lukt of er was niets: de uitkomst is of het punt nu weg is.
export async function clearRouteStartPoint(): Promise<boolean> {
  // Thuis, zijn routes en de oude sleutel in één keer; lukt het niet, dan zegt de regel hieronder dat.
  await clearHome();
  // Ook de heuvels die rond dit punt bewaard zijn: daar staat het punt op vier decimalen in.
  await clearExactTerrain();
  return (await getRouteStartPoint()) === undefined;
}

// `rough`: de laatste grove plek van het volgen, alleen in het geheugen; het midden van de kaart zonder lus.
export type StartLocation = { ok: true; point: RoutePoint } | { ok: false; reason: StartFailure; rough?: RoutePoint };

export interface UseMyPlaceDeps {
  // Volgt je plek; standaard het toestel (utils/geolocation.ts#watchFine).
  watch?: WatchFn;
  // Geeft undefined in de browser; in de app de uitkomst van het venster van Android.
  askPermission?: () => Promise<unknown>;
  limitMs?: number;
  // Sluit het paneel, dan stopt het volgen en wordt er niets meer bewaard.
  signal?: AbortSignal;
  // false: alleen de plek van nu (Waar je nu bent); het vaste punt blijft zoals het is.
  persist?: boolean;
}

const PERMISSION_LIMIT_MS = 60_000;

type Followed = { ok: true; pos: Position2 } | { ok: false; reason: StartFailure; rough?: RoutePoint };

// Volgt je plek tot hij scherp is (hoogstens 50 m) en neemt de eerste goede. Binnen is de eerste plek vaak
// grof (wifi of zendmast) en wordt hij in een paar seconden scherper; daarom niet de eerste plek afkeuren.
// Stopt altijd: bij een goede plek, bij de grens, bij Sluiten en bij een fout. Na de grens met alleen
// grove plekken: `coarse`; zonder enige plek: `timeout`. Een plek na de grens telt niet.
function followUntilSharp(watch: WatchFn, limitMs: number, signal?: AbortSignal): Promise<Followed> {
  return new Promise<Followed>((resolve) => {
    let done = false;
    let rough: RoutePoint | undefined;
    let stop: (() => void) | undefined;
    const onAbort = () => finish({ ok: false, reason: 'timeout' });
    const timer = setTimeout(() => finish(rough ? { ok: false, reason: 'coarse', rough } : { ok: false, reason: 'timeout' }), limitMs);
    function finish(out: Followed) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      stop?.();
      resolve(out);
    }
    if (signal?.aborted) {
      finish({ ok: false, reason: 'timeout' });
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      stop = watch(
        (pos) => {
          if (done) return;
          if (pos.accuracyM !== undefined && pos.accuracyM <= MAX_START_ACCURACY_M) finish({ ok: true, pos });
          else rough = validStartPoint(pos) ?? rough;
        },
        (reason) => {
          // Een time-out van het toestel zelf: de eigen grens beslist. Een andere fout stopt meteen;
          // was er al een grove plek, dan is dat de reden die je verder helpt.
          if (reason === 'timeout') return;
          finish(rough && reason === 'unavailable' ? { ok: false, reason: 'coarse', rough } : { ok: false, reason });
        },
      );
    } catch {
      finish({ ok: false, reason: 'unavailable' });
    }
    // Een fout of plek die al kwam tijdens watch(): de stop bestond toen nog niet.
    if (done) stop?.();
  });
}

// Gebruik waar ik nu ben, en Waar je nu bent bij elke zoektocht (met `persist: false`): de fijne plek van
// het toestel, gevolgd tot hij scherp is, met een grens in tijd. Het venster van Android heeft een eigen
// ruime grens; de 15 seconden gelden voor de plek zelf. Slaat het punt op bij een goede plek. Toegang
// geweigerd: `denied`; alleen bij benadering toegestaan: `approximate`, zonder te wachten. Een vraag om
// toegang die zelf faalt, telt niet als weigering: dan probeert de app de plek gewoon.
export async function locateStartHere(deps: UseMyPlaceDeps = {}): Promise<StartLocation> {
  try {
    const perm = await withTimeout((deps.askPermission ?? requestFineAppLocationPermission)(), PERMISSION_LIMIT_MS).catch(() => undefined);
    if (perm === 'denied') return { ok: false, reason: 'denied' };
    if (perm === 'approximate') return { ok: false, reason: 'approximate' };
    const watch = deps.watch ?? watchFine({ timeoutMs: deps.limitMs ?? START_LOCATE_LIMIT_MS });
    const found = await followUntilSharp(watch, deps.limitMs ?? START_LOCATE_LIMIT_MS, deps.signal);
    if (!found.ok) return found;
    const point = validStartPoint(found.pos);
    if (!point) return { ok: false, reason: 'unavailable' };
    if (deps.signal?.aborted) return { ok: false, reason: 'timeout' };
    if (deps.persist === false) return { ok: true, point: roundExact(point) };
    const saved = await saveRouteStartPoint(point);
    if (!saved) return { ok: false, reason: 'unavailable' };
    return { ok: true, point: roundExact(point) };
  } catch {
    return { ok: false, reason: 'timeout' };
  }
}

// Een startpunt van de kaart bij Route voorstellen: een getikt punt (Start hier) geldt alleen voor deze
// zoektocht en wordt niet bewaard; Thuis verschuift niet en de instelling blijft (besluit
// 2026-11-11-route-start.md). Bewust Thuis maken gaat via saveRouteStartPoint (Maak dit Thuis).
export async function startFromMap(from: { tap: RoutePoint }, deps: Pick<UseMyPlaceDeps, 'signal'> = {}): Promise<StartLocation> {
  const point = validStartPoint(from.tap);
  if (!point) return { ok: false, reason: 'unavailable' };
  if (deps.signal?.aborted) return { ok: false, reason: 'timeout' };
  return { ok: true, point: roundExact(point) };
}
