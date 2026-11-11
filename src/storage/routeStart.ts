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
import { locateMe, LocateError, type Position2 } from '../utils/geolocation';
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

export type StartLocation = { ok: true; point: RoutePoint } | { ok: false; reason: StartFailure };

export interface UseMyPlaceDeps {
  locate?: () => Promise<Position2>;
  // Geeft undefined in de browser; in de app de uitkomst van het venster van Android.
  askPermission?: () => Promise<unknown>;
  limitMs?: number;
  // Sluit het paneel, dan wordt er niets meer bewaard.
  signal?: AbortSignal;
  // false: alleen de plek van nu (Waar je nu bent); het vaste punt blijft zoals het is.
  persist?: boolean;
}

const PERMISSION_LIMIT_MS = 60_000;

// Gebruik waar ik nu ben, en Waar je nu bent bij elke zoektocht (met `persist: false`): één keer de
// plek van het toestel, fijn, met een grens in tijd. Het venster
// van Android heeft een eigen ruime grens; de 15 seconden gelden voor de plek zelf. Slaat het punt
// op bij een goede plek. Een ruwe plek, of een plek zonder nauwkeurigheid, telt niet.
export async function locateStartHere(deps: UseMyPlaceDeps = {}): Promise<StartLocation> {
  try {
    const perm = await withTimeout((deps.askPermission ?? requestFineAppLocationPermission)(), PERMISSION_LIMIT_MS).catch(() => undefined);
    if (perm !== undefined && perm !== 'granted') return { ok: false, reason: 'coarse' };
    const locate = deps.locate ?? (() => locateMe({ timeoutMs: 10_000, maximumAge: 30_000, precise: true, fine: true }));
    const found = await withTimeout(locate(), deps.limitMs ?? START_LOCATE_LIMIT_MS);
    if (found.accuracyM === undefined || found.accuracyM > MAX_START_ACCURACY_M) return { ok: false, reason: 'coarse' };
    const point = validStartPoint(found);
    if (!point) return { ok: false, reason: 'unavailable' };
    if (deps.signal?.aborted) return { ok: false, reason: 'timeout' };
    if (deps.persist === false) return { ok: true, point: roundExact(point) };
    const saved = await saveRouteStartPoint(point);
    if (!saved) return { ok: false, reason: 'unavailable' };
    return { ok: true, point: roundExact(point) };
  } catch (err) {
    const reason = err instanceof LocateError ? err.reason : 'timeout';
    return { ok: false, reason };
  }
}

// Een startpunt van de kaart bij Route voorstellen: een getikt punt (Start hier) geldt alleen voor deze
// zoektocht en wordt niet bewaard; Thuis verschuift niet en de instelling blijft (besluit
// 2026-11-11-route-start.md). Bewust Thuis maken gaat via saveRouteStartPoint (Maak dit Thuis). Met 'here'
// je plek van nu, met dezelfde toestemmingsvraag en grens als hierboven; dat bewaart, zoals in de instelling.
export async function startFromMap(from: { tap: RoutePoint } | 'here', deps: UseMyPlaceDeps = {}): Promise<StartLocation> {
  if (from === 'here') return locateStartHere(deps);
  const point = validStartPoint(from.tap);
  if (!point) return { ok: false, reason: 'unavailable' };
  if (deps.signal?.aborted) return { ok: false, reason: 'timeout' };
  return { ok: true, point: roundExact(point) };
}
