// Opschonen van de routes per geplande training bij het inlezen (een back-up, en de opslag van het toestel zelf).
// Besluit docs/beslissingen/2026-11-24-route-per-training.md, I-160; vorm in models/sessionRoute.ts.
//
// `sessionRoutes` is nieuw, optioneel en aanvullend: een back-up van daarvoor heeft het niet en leest gelijk (dan
// houdt het toestel zijn eigen routes). Daarom geen hogere schemaversie, net als `places`, `savedRoutes` en
// `skillGoals`. Wat wel kan: een kapotte waarde. Die valt weg en telt mee in wat er is overgeslagen, nooit de hele
// back-up en nooit een fout:
// - een route zonder geplande training, soort, afstand, hoogtemeters of echte dag valt weg, en ook een route met
//   minder dan twee punten, meer dan 800 punten of één kapot punt (een lijn met een gat is geen route).
// - een route met een onbekende bron valt weg: de bron zegt welke kaart de lus koos.
// - twee routes voor dezelfde geplande training: de eerste blijft.

import { ROUTE_MAX_POINTS } from '../models/place';
import type { RoutePoint } from '../models/route';
import type { SessionRoute } from '../models/sessionRoute';
import { readPoint } from './migrationsPlaces';
import { fin, isObj, ISO_DAY } from './migrationsShared';

const isId = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;

export function readSessionRoute(raw: unknown): SessionRoute | undefined {
  if (!isObj(raw)) return undefined;
  if (!isId(raw.plannedSessionId) || typeof raw.chosenAt !== 'string' || !ISO_DAY.test(raw.chosenAt)) return undefined;
  if (raw.style !== 'simple' && raw.style !== 'adventure') return undefined;
  if (raw.source !== 'brouter' && raw.source !== 'valhalla') return undefined;
  if (!fin(raw.distanceM) || raw.distanceM <= 0 || !fin(raw.ascentM) || raw.ascentM < 0) return undefined;
  if (!Array.isArray(raw.points) || raw.points.length < 2 || raw.points.length > ROUTE_MAX_POINTS) return undefined;
  const points: RoutePoint[] = [];
  for (const p of raw.points) {
    const point = readPoint(p);
    if (!point) return undefined;
    points.push(point);
  }
  const repeats = fin(raw.repeats) && raw.repeats > 1 && raw.repeats <= 100 ? Math.round(raw.repeats) : undefined;
  const footStartM = fin(raw.footStartM) && raw.footStartM > 0 && raw.footStartM <= 200000 ? Math.round(raw.footStartM) : undefined;
  return {
    plannedSessionId: raw.plannedSessionId,
    style: raw.style,
    source: raw.source,
    distanceM: Math.round(raw.distanceM),
    ascentM: Math.round(raw.ascentM),
    ...(repeats !== undefined ? { repeats } : {}),
    ...(footStartM !== undefined ? { footStartM } : {}),
    points,
    chosenAt: raw.chosenAt,
  };
}

export interface SessionRoutesRead {
  // Undefined: er stond niets (een oudere back-up); het toestel houdt dan het zijne.
  list: SessionRoute[] | undefined;
  skipped: number;
}

export function migrateSessionRoutes(raw: unknown): SessionRoutesRead {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  let skipped = 0;
  const list: SessionRoute[] = [];
  const ids = new Set<string>();
  for (const item of raw) {
    const read = readSessionRoute(item);
    if (!read || ids.has(read.plannedSessionId)) { skipped++; continue; }
    ids.add(read.plannedSessionId);
    list.push(read);
  }
  return { list, skipped };
}

// Het toestel zelf: altijd een lijst, ook als er nog niets of iets kapots staat.
export const readSessionRouteList = (raw: unknown): SessionRoute[] => migrateSessionRoutes(raw).list ?? [];
