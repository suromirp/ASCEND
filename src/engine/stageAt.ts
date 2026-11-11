// ASCEND: in welke GR5-etappe en op welk punt van het spoor een plek ligt. Puur: de etappes (met hun
// coordinaten) en een plek gaan erin, de etappe, het punt en de kilometers komen eruit. Geen opslag,
// geen netwerk. De regel op je etappe gebruikt dit later (besluit 2026-11-11-gr5-uit-osm.md).
//
// - Een etappe met spoor (`coords.path`) wordt langs het spoor gemeten; een etappe met alleen begin
//   en eind als een rechte lijn daartussen. Een etappe zonder (geldige) coordinaten doet niet mee.
// - De plek hoort bij de etappe waarvan het spoor het dichtst bij ligt. Ligt hij precies op een grens,
//   dan is het de etappe die daar begint, en `endsHere` noemt de etappe die daar eindigt.
// - Verder dan `maxOffKm` van elk spoor is buiten de route: undefined.

import type { GeoPoint, StageCoords } from '../models/geo';
import { distanceKm } from './stagePosition';

export interface StageAtStage {
  id: string;
  coords?: StageCoords;
}

export interface StageAt {
  stageId: string;
  // Plaats van de etappe in de gegeven lijst.
  index: number;
  method: 'path' | 'straight';
  // Het punt van het spoor dat het dichtst bij de plek ligt (0 is het begin).
  pointIndex: number;
  // De plek op het spoor gezet.
  onRoute: GeoPoint;
  kmFromStart: number;
  kmToEnd: number;
  // Hoe ver de plek van het spoor af ligt.
  offKm: number;
  // Op een grens: de etappe die hier eindigt.
  endsHere?: string;
}

// Verder dan dit van het spoor ben je niet op de route. Een kilometer laat ruimte voor een hut die
// even van het pad af ligt (het refuge du Thabor ligt ongeveer 600 m van het spoor).
export const OFF_ROUTE_KM = 1;
// Dichter dan dit bij een grens ben je op de grens; ook de marge waarbinnen twee etappes even dichtbij zijn.
const SAME_KM = 0.001;

const valid = (p: GeoPoint | undefined): p is GeoPoint => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

function geometry(c: StageCoords | undefined): { line: GeoPoint[]; method: 'path' | 'straight' } | undefined {
  if (!c || !valid(c.start) || !valid(c.end)) return undefined;
  if (c.path && c.path.length >= 2 && c.path.every(valid)) return { line: c.path, method: 'path' };
  return { line: [c.start, c.end], method: 'straight' };
}

interface Projection {
  offKm: number;
  kmFromStart: number;
  totalKm: number;
  pointIndex: number;
  onRoute: GeoPoint;
}

// De plek op het dichtstbijzijnde stuk van de lijn, in een vlakke benadering rond de plek.
function project(line: readonly GeoPoint[], pos: GeoPoint): Projection {
  const kmLat = (Math.PI / 180) * 6371;
  const kmLon = kmLat * Math.cos((pos.lat * Math.PI) / 180);
  const xy = (p: GeoPoint) => ({ x: (p.lon - pos.lon) * kmLon, y: (p.lat - pos.lat) * kmLat });
  let walked = 0;
  let best: Projection = { offKm: Infinity, kmFromStart: 0, totalKm: 0, pointIndex: 0, onRoute: line[0] };
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const p = xy(a);
    const q = xy(b);
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(p.x * dx + p.y * dy) / len2));
    const off = Math.hypot(p.x + t * dx, p.y + t * dy);
    const seg = distanceKm(a, b);
    // Gelijk telt het latere stuk niet: zo wint bij een knik het eerste stuk, net als in stagePosition.
    if (off < best.offKm) {
      best = { offKm: off, kmFromStart: walked + t * seg, totalKm: 0, pointIndex: t < 0.5 ? i : i + 1, onRoute: { lat: a.lat + t * (b.lat - a.lat), lon: a.lon + t * (b.lon - a.lon) } };
    }
    walked += seg;
  }
  return { ...best, totalKm: walked };
}

export function stageAt(stages: readonly StageAtStage[], pos: GeoPoint, maxOffKm = OFF_ROUTE_KM): StageAt | undefined {
  if (!valid(pos)) return undefined;
  let best: (Projection & { index: number; method: 'path' | 'straight' }) | undefined;
  stages.forEach((stage, index) => {
    const g = geometry(stage.coords);
    if (!g) return;
    const p = project(g.line, pos);
    // Dichterbij wint. Even dichtbij: de latere etappe alleen als de plek op zijn begin ligt (een
    // grens: je bent aan het begin van de volgende); anders blijft de eerste staan.
    const closer = !best || p.offKm < best.offKm - SAME_KM;
    const tieAtStart = !!best && Math.abs(p.offKm - best.offKm) <= SAME_KM && p.kmFromStart <= SAME_KM;
    if (closer || tieAtStart) best = { ...p, index, method: g.method };
  });
  if (!best || best.offKm > maxOffKm) return undefined;
  const stage = stages[best.index];
  const previous = best.index > 0 ? stages[best.index - 1] : undefined;
  const prevEnd = previous?.coords?.end;
  const atBoundary = best.kmFromStart <= SAME_KM && !!previous && valid(prevEnd) && distanceKm(prevEnd, stage.coords!.start) <= SAME_KM;
  return {
    stageId: stage.id,
    index: best.index,
    method: best.method,
    pointIndex: best.pointIndex,
    onRoute: best.onRoute,
    kmFromStart: best.kmFromStart,
    kmToEnd: Math.max(0, best.totalKm - best.kmFromStart),
    offKm: best.offKm,
    ...(atBoundary ? { endsHere: previous.id } : {}),
  };
}
