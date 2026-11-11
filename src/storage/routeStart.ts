// ASCEND: het eigen startpunt van een lus (Startpunt van je lus, Precies). Het punt staat alleen op
// dit toestel, onder een eigen sleutel in de meta-opslag: nooit in de export, nooit in een back-up,
// nooit in een log. Een back-up of import raakt de sleutel niet (de back-up schrijft en wist alleen
// de sleutels die hij kent). Wissen is één tik in de instelling. Docs:
// docs/beslissingen/2026-11-09-startpunt-lus.md.
//
// Het punt bepalen heeft een grens in tijd en geeft altijd een punt of een reden; het gooit nooit.

import { MetaRepo } from './database';
import { clearExactTerrain } from './nearbyTerrain';
import { MAX_START_ACCURACY_M, roundExact, validStartPoint, type StartFailure } from '../engine/routeStart';
import type { RoutePoint } from '../models/route';
import { locateMe, LocateError, type Position2 } from '../utils/geolocation';
import { withTimeout } from '../utils/withTimeout';
import { requestFineAppLocationPermission } from '../integrations/geolocation';

const KEY = 'routeStartPoint';
export const START_LOCATE_LIMIT_MS = 15_000;

export async function getRouteStartPoint(): Promise<RoutePoint | undefined> {
  try {
    return validStartPoint(await MetaRepo.get<unknown>(KEY));
  } catch {
    return undefined;
  }
}

export async function saveRouteStartPoint(point: RoutePoint): Promise<boolean> {
  const valid = validStartPoint(point);
  if (!valid) return false;
  try {
    await MetaRepo.set(KEY, roundExact(valid));
    // De heuvels rond het vorige punt horen niet te blijven staan.
    await clearExactTerrain();
    return true;
  } catch {
    return false;
  }
}

// Wissen lukt of er was niets: de uitkomst is of het punt nu weg is.
export async function clearRouteStartPoint(): Promise<boolean> {
  try {
    await MetaRepo.delete(KEY);
  } catch {
    // Dan hieronder: staat het er nog, dan is het niet gelukt.
  }
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
}

const PERMISSION_LIMIT_MS = 60_000;

// Gebruik waar ik nu ben: één keer de plek van het toestel, fijn, met een grens in tijd. Het venster
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
    const saved = await saveRouteStartPoint(point);
    if (!saved) return { ok: false, reason: 'unavailable' };
    return { ok: true, point: roundExact(point) };
  } catch (err) {
    const reason = err instanceof LocateError ? err.reason : 'timeout';
    return { ok: false, reason };
  }
}

// Een startpunt van de kaart bij Route voorstellen: een getikt punt (Start hier) of je plek (Gebruik
// waar ik nu ben, met dezelfde toestemmingsvraag en grens als hierboven). Het wordt je Precies-startpunt,
// net als in de instelling; de aanroeper zet de keuze op Precies. Docs: docs/beslissingen/2026-11-11-route-kaart.md.
export async function startFromMap(from: { tap: RoutePoint } | 'here', deps: UseMyPlaceDeps = {}): Promise<StartLocation> {
  if (from === 'here') return locateStartHere(deps);
  const point = validStartPoint(from.tap);
  if (!point) return { ok: false, reason: 'unavailable' };
  if (deps.signal?.aborted) return { ok: false, reason: 'timeout' };
  const saved = await withTimeout(saveRouteStartPoint(point), START_LOCATE_LIMIT_MS).catch(() => false);
  return saved ? { ok: true, point: roundExact(point) } : { ok: false, reason: 'unavailable' };
}
