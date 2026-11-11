// ASCEND: waar ben je op je etappe (docs/beslissingen/2026-11-02-locatie.md). Puur: een plek van nu
// en de coordinaten van de etappe van vandaag gaan erin, "nog zoveel kilometer tot het eind en de
// volgende plek" komt eruit. Geen spoor, geen route, geen opslag van posities: de aanroeper houdt
// de plek alleen in het geheugen.
//
// Hoe er gemeten wordt:
// - Heeft de etappe punten langs de route (`path`), dan is het "langs de route": de plek wordt op
//   het dichtstbijzijnde stuk van die lijn gezet en de rest van de lijn wordt opgeteld.
// - Heeft hij alleen een begin en een eind, dan is het "in een rechte lijn" tot het eind. Dat is
//   korter dan wat je loopt, en de tekst zegt dat erbij.
// - Zonder coordinaten zegt de engine niets: undefined. De etappes van de bundel hebben begin en eind
//   uit OpenStreetMap; het spoor komt apart (data/gr5Tracks.ts, besluit 2026-11-11-gr5-uit-osm.md).
//
// Op een dag van twee samengevoegde etappes is "de volgende plek" het eind van de eerste etappe
// zolang je daar nog niet voorbij bent.

import type { GeoPoint, StageCoords } from '../models/geo';
import { formatNumberNL } from '../utils/number';

export type { GeoPoint, StageCoords };

export interface StageLike {
  to: string;
  coords?: StageCoords;
}

const EARTH_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
// Dichterbij dan dit is "je bent er".
const ARRIVED_KM = 0.5;
// Verder dan dit van de etappe af zegt een getal niets: je bent niet op je etappe.
const MAX_OFF_STAGE_KM = 15;
// Nauwkeuriger dan dit is een plek van GPS; grover zegt de tekst erbij.
export const COARSE_M = 500;

const valid = (p: GeoPoint | undefined): p is GeoPoint => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthKm(path: readonly GeoPoint[]): number {
  let km = 0;
  for (let i = 1; i < path.length; i++) km += distanceKm(path[i - 1], path[i]);
  return km;
}

// Een etappe heeft coordinaten als begin en eind kloppen.
export function stageHasCoords(stage: StageLike): boolean {
  return valid(stage.coords?.start) && valid(stage.coords?.end);
}

const geometry = (c: StageCoords): GeoPoint[] => (c.path && c.path.length >= 2 && c.path.every(valid) ? c.path : [c.start, c.end]);

interface OnPath {
  // Kilometers van de projectie op de lijn tot het eind van de lijn.
  remainingKm: number;
  // Hoe ver de plek van de lijn af ligt.
  offKm: number;
}

// De plek wordt op het dichtstbijzijnde stuk van de lijn gezet, in een vlakke benadering rond de
// plek zelf (genoeg voor etappes van enkele tientallen kilometers).
function projectOnPath(path: readonly GeoPoint[], pos: GeoPoint): OnPath {
  const kmLat = (Math.PI / 180) * EARTH_KM;
  const kmLon = kmLat * Math.cos(rad(pos.lat));
  const xy = (p: GeoPoint) => ({ x: (p.lon - pos.lon) * kmLon, y: (p.lat - pos.lat) * kmLat });
  let best: OnPath = { remainingKm: pathLengthKm(path), offKm: Infinity };
  for (let i = 0; i < path.length - 1; i++) {
    const p = xy(path[i]);
    const q = xy(path[i + 1]);
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(p.x * dx + p.y * dy) / len2));
    const off = Math.hypot(p.x + t * dx, p.y + t * dy);
    if (off < best.offKm) {
      const rest = pathLengthKm(path.slice(i + 1));
      best = { remainingKm: (1 - t) * distanceKm(path[i], path[i + 1]) + rest, offKm: off };
    }
  }
  return best;
}

export function remainingAlongPath(path: readonly GeoPoint[], pos: GeoPoint): number {
  return projectOnPath(path, pos).remainingKm;
}

export interface StagePosition {
  method: 'path' | 'straight';
  // Tot het eind van de dag.
  kmToEnd: number;
  endName: string;
  // Tot de volgende plek: het eind van de etappe waar je nu op zit (gelijk aan het eind van de dag bij een enkele etappe).
  kmToNext: number;
  nextName: string;
  arrived: boolean;
  // Voorbij het eind van de laatste etappe (de plek ligt voorbij het eindpunt).
  pastEnd: boolean;
  // Hoe nauwkeurig je plek is, in meters, als dat bekend is.
  accuracyM?: number;
}

// De etappes van een dag (een, of twee samengevoegd) en de plek van nu. Undefined als een van de
// etappes geen coordinaten heeft of als de plek niet bij de etappe past.
export function stagePosition(stages: readonly StageLike[], pos: GeoPoint, accuracyM?: number): StagePosition | undefined {
  if (stages.length === 0 || !valid(pos) || !stages.every(stageHasCoords)) return undefined;
  const coords = stages.map((s) => s.coords as StageCoords);
  const last = stages.length - 1;
  const offKm = Math.min(...coords.map((c) => projectOnPath(geometry(c), pos).offKm));
  if (offKm > MAX_OFF_STAGE_KM) return undefined;

  // Het eind van etappe k is gepasseerd als het eind van de dag nu dichterbij is dan vanaf dat punt.
  // Met een pad voor elke etappe is de etappe waar je het dichtst bij ligt de huidige (een route die
  // terugbuigt zou de regel hieronder in de war brengen); de eerste wint bij gelijke afstand.
  // Zonder pad geldt de regel dat het eind van de dag dichterbij komt.
  const hasPath = (c: StageCoords) => !!c.path && c.path.length >= 2 && c.path.every(valid);
  let current = 0;
  if (coords.every(hasPath)) {
    const offs = coords.map((c) => projectOnPath(geometry(c), pos).offKm);
    offs.forEach((o, k) => { if (o < offs[current] - 0.05) current = k; });
  } else {
    while (current < last && distanceKm(pos, coords[last].end) < distanceKm(coords[current].end, coords[last].end)) current++;
  }

  const usesPath = coords.slice(current).every(hasPath);
  const inStage = (c: StageCoords) => (usesPath ? projectOnPath(geometry(c), pos).remainingKm : distanceKm(pos, c.end));
  const whole = (c: StageCoords) => (usesPath ? pathLengthKm(geometry(c)) : distanceKm(c.start, c.end));
  const kmToNext = inStage(coords[current]);
  let kmToEnd = kmToNext;
  for (let k = current + 1; k <= last; k++) kmToEnd += whole(coords[k]);
  // Voorbij het eind: op de laatste etappe valt de plek op het eindpunt van de lijn en ligt er verder af dan "je bent er".
  const final = projectOnPath(geometry(coords[last]), pos);
  const pastEnd = current === last && final.remainingKm < 1e-6 && final.offKm > ARRIVED_KM;
  return {
    method: usesPath ? 'path' : 'straight',
    kmToEnd,
    endName: stages[last].to,
    kmToNext,
    nextName: stages[current].to,
    arrived: !pastEnd && kmToEnd < ARRIVED_KM,
    pastEnd,
    ...(accuracyM !== undefined && Number.isFinite(accuracyM) ? { accuracyM } : {}),
  };
}

const km = (value: number) => formatNumberNL(value, value < 10 ? 1 : 0);

// "Nog ongeveer 3,9 km in een rechte lijn tot Dorp B." Het droge feit eerst, de manier van meten erbij.
export function stagePositionText(p: StagePosition): string {
  if (p.pastEnd) return `Je bent voorbij ${p.endName}, het eind van deze etappe.`;
  if (p.arrived) return `Je bent bij ${p.endName}.`;
  const how = p.method === 'path' ? 'langs de route' : 'in een rechte lijn';
  let text = p.nextName === p.endName
    ? `Nog ongeveer ${km(p.kmToEnd)} km ${how} tot ${p.endName}.`
    : `Nog ongeveer ${km(p.kmToNext)} km ${how} tot ${p.nextName}. Het eind van de dag, ${p.endName}, is nog ongeveer ${km(p.kmToEnd)} km ver.`;
  // Een grove plek (de Android-app vraagt de ruwe plek) zegt eerlijk dat het ongeveer is.
  if (p.accuracyM !== undefined && p.accuracyM > COARSE_M) text += ` Je plek is op ongeveer ${km(p.accuracyM / 1000)} km na bekend.`;
  return text;
}
