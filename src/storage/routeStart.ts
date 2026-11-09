// ASCEND: het eigen startpunt van een lus (Startpunt van je lus, Precies). Het punt staat alleen op
// dit toestel, onder een eigen sleutel in de meta-opslag: nooit in de export, nooit in een back-up,
// nooit in een log. Een back-up of import raakt de sleutel niet (de back-up schrijft en wist alleen
// de sleutels die hij kent). Wissen is één tik in de instelling. Docs:
// docs/beslissingen/2026-11-09-startpunt-lus.md.
//
// Het punt bepalen heeft een grens in tijd en geeft altijd een punt of een reden; het gooit nooit.

import { MetaRepo } from './database';
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
  return (await getRouteStartPoint()) === undefined;
}

export type StartLocation = { ok: true; point: RoutePoint } | { ok: false; reason: StartFailure };

export interface UseMyPlaceDeps {
  locate?: () => Promise<Position2>;
  askPermission?: () => Promise<unknown>;
  limitMs?: number;
}

// Gebruik waar ik nu ben: één keer de plek van het toestel, fijn, met een grens in tijd. Slaat het
// punt op bij een goede plek. Een ruwe plek (nauwkeurigheid boven de 250 m) telt niet.
export async function locateStartHere(deps: UseMyPlaceDeps = {}): Promise<StartLocation> {
  try {
    const locate = deps.locate ?? (() => locateMe({ timeoutMs: 10_000, maximumAge: 30_000, precise: true, fine: true }));
    const found = await withTimeout(
      (async () => {
        // In de Android-app de fijne toestemming; in de browser komt het venster bij de plek zelf.
        await (deps.askPermission ?? requestFineAppLocationPermission)().catch(() => undefined);
        return locate();
      })(),
      deps.limitMs ?? START_LOCATE_LIMIT_MS,
    );
    if (found.accuracyM !== undefined && found.accuracyM > MAX_START_ACCURACY_M) return { ok: false, reason: 'coarse' };
    const point = validStartPoint(found);
    if (!point) return { ok: false, reason: 'unavailable' };
    const saved = await saveRouteStartPoint(point);
    if (!saved) return { ok: false, reason: 'unavailable' };
    return { ok: true, point: roundExact(point) };
  } catch (err) {
    const reason = err instanceof LocateError ? err.reason : 'timeout';
    return { ok: false, reason };
  }
}
