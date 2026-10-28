import type { MotionMode } from '../engine/motionSettings';
import type { Rect } from './growPlan';

// Een verplaatste training schuift naar zijn nieuwe dag (docs/visie/Vloeiende overgangen.md, onderdeel 1b,
// en docs/beslissingen/2026-10-28-vloeiende-overgangen-uitgroei.md). Alleen de rekensom, zonder DOM:
// het meten en afspelen zit in utils/flipDom.ts. De rechthoeken staan in paginaruimte (inclusief de
// scrol van de pagina), zodat scrollen geen valse verschuiving geeft.

export type { Rect };

export interface FlipDelta {
  dx: number;
  dy: number;
}

// Een verschuiving kleiner dan dit telt niet.
export const FLIP_MIN_PX = 4;
export const FLIP_MIN_MS = 220;
export const FLIP_MAX_MS = 400;
// Vanaf deze afstand duurt het schuiven het langst: ongeveer een heel scherm.
const FLIP_FULL_AT_PX = 640;
export const FLIP_FADE_MS = 150;
// Zo lang blijft een voorbereiding geldig; een synchronisatie die later de gegevens aanpast animeert nooit.
export const FLIP_ARM_MS = 1000;
// Zo lang wacht het afspelen op een blad dat nog over de pagina ligt.
export const FLIP_WAIT_MS = 600;

// Per id hoeveel de rij omgekeerd moet worden teruggezet: oude plek min nieuwe plek. Een id die nieuw
// is of verdween krijgt niets, een verschuiving onder `minPx` ook niet.
export function flipDeltas(before: Map<string, Rect>, after: Map<string, Rect>, minPx = FLIP_MIN_PX): Map<string, FlipDelta> {
  const out = new Map<string, FlipDelta>();
  for (const [id, now] of after) {
    const was = before.get(id);
    if (!was) continue;
    const dx = was.left - now.left;
    const dy = was.top - now.top;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < minPx) continue;
    out.set(id, { dx, dy });
  }
  return out;
}

// 220 ms voor een korte stap, oplopend tot 400 ms voor een afstand van een heel scherm; stijgt alleen.
export function flipDuration(distancePx: number): number {
  const d = Number.isFinite(distancePx) ? Math.max(0, Math.abs(distancePx)) : 0;
  const t = Math.min(1, d / FLIP_FULL_AT_PX);
  return Math.round(FLIP_MIN_MS + (FLIP_MAX_MS - FLIP_MIN_MS) * t);
}

// De rij die je losliet begint waar de zwevende rij was, niet op zijn oude plek.
export function applyOverride(before: Map<string, Rect>, id: string, top: number): Map<string, Rect> {
  const was = before.get(id);
  if (!was) return before;
  const next = new Map(before);
  next.set(id, { ...was, top });
  return next;
}

export type FlipStyle = 'slide' | 'fade' | 'none';

// Normaal schuift, Rustig laat alleen de verplaatste rij kort verschijnen, Uit doet niets.
export function flipStyle(mode: MotionMode): FlipStyle {
  return mode === 'full' ? 'slide' : mode === 'calm' ? 'fade' : 'none';
}

// Is een voorbereiding van `armedAt` op `now` nog geldig?
export function isArmed(armedAt: number | null, now: number): boolean {
  return armedAt !== null && now >= armedAt && now - armedAt <= FLIP_ARM_MS;
}
