// ASCEND: waar een voorgestelde lus begint. Twee keuzes: Ongeveer (je plaats, afgerond op twee
// decimalen, ongeveer een kilometer; de standaard) en Precies (een eigen startpunt dat alleen op dit
// toestel staat). Bij Precies gaat het startpunt precies naar de routeplanner, en ook de zoektocht
// naar heuvels en paden bij OpenStreetMap ligt om dat punt (besluit 2026-11-11-route-verfijnen.md).
// Puur: de opslag en de locatievraag staan in storage/routeStart.ts. Docs: docs/beslissingen/2026-11-09-startpunt-lus.md.

import type { RoutePoint } from '../models/route';

export type RouteStartMode = 'approx' | 'exact';

export const resolveRouteStart = (raw: unknown): RouteStartMode => (raw === 'exact' ? 'exact' : 'approx');

// Een punt dat bruikbaar is: twee eindige getallen binnen de grenzen van de aarde. Alles anders (een
// kapotte of oude waarde op het toestel) telt als geen punt.
export function validStartPoint(raw: unknown): RoutePoint | undefined {
  const p = raw as { lat?: unknown; lon?: unknown } | null | undefined;
  if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number') return undefined;
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return undefined;
  if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) return undefined;
  return { lat: p.lat, lon: p.lon };
}

// Een plek van het toestel die ruwer is dan dit telt niet als startpunt. Het was 250 m: daarmee
// kon "precies" een paar straten naast je deur liggen. Buiten bij de deur geeft een telefoon
// meestal 5 tot 20 m, binnen via wifi tot ongeveer 40 m (besluit 2026-11-11-route-verfijnen.md).
export const MAX_START_ACCURACY_M = 50;

// Een bewaard punt heeft vijf decimalen (ongeveer een meter): genoeg voor een deur, geen schijnprecisie.
export const roundExact = (p: RoutePoint): RoutePoint => ({ lat: Math.round(p.lat * 1e5) / 1e5, lon: Math.round(p.lon * 1e5) / 1e5 });

export type StartChoice =
  | { kind: 'approx' }
  | { kind: 'exact'; point: RoutePoint }
  // Precies gekozen, maar er is nog geen punt op dit toestel.
  | { kind: 'needs-point' };

export function chooseStart(mode: RouteStartMode, saved: unknown): StartChoice {
  if (mode !== 'exact') return { kind: 'approx' };
  const point = validStartPoint(saved);
  return point ? { kind: 'exact', point } : { kind: 'needs-point' };
}

export type StartFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'coarse';

export function startFailureReason(reason: StartFailure): string {
  switch (reason) {
    case 'denied':
      return 'ASCEND mag je locatie niet gebruiken.';
    case 'timeout':
      return 'Je locatie kwam niet op tijd.';
    case 'coarse':
      return 'ASCEND krijgt je precieze plek niet.';
    default:
      return 'Je locatie is nu niet beschikbaar.';
  }
}

export const startFailureLine = (reason: StartFailure): string => `${startFailureReason(reason)} De lus begint bij je plek, afgerond op ongeveer een kilometer.`;

// De regel bovenaan het paneel Route voorstellen.
export const START_LINE_EXACT = 'De lus begint bij je startpunt.';
export const START_LINE_APPROX = 'De lus begint bij je plek, afgerond op ongeveer een kilometer.';
