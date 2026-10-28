// ASCEND: het spierkaartje bij een oefening, het rekenwerk. Uit de primaire en secundaire
// spiergroepen van een oefening (data/exercises.ts) komen de vlakken die oplichten en de
// snede van het figuur; het tekenen staat in components/MuscleFigure.tsx. Zuiver en getest.
// Ontwerp: docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen.md.

import { MUSCLE_REGIONS, MUSCLE_SIDE, type MuscleSide } from '../data/muscleRegions';
import { MUSCLE_LABEL, type Exercise, type MuscleGroup } from '../models/exercise';

export type MuscleLevel = 'primary' | 'secondary';

export interface MuscleMark {
  group: MuscleGroup;
  level: MuscleLevel;
  side: MuscleSide;
}

type Muscles = Pick<Exercise, 'primary' | 'secondary'>;

// Hoofdspieren eerst, dan wie meehelpt. Een spier die in beide lijsten staat telt als hoofdspier.
export function muscleMarks(exercise: Muscles): MuscleMark[] {
  const marks: MuscleMark[] = [];
  const seen = new Set<MuscleGroup>();
  for (const [list, level] of [[exercise.primary, 'primary'], [exercise.secondary, 'secondary']] as const) {
    for (const group of list) {
      if (seen.has(group)) continue;
      seen.add(group);
      marks.push({ group, level, side: MUSCLE_SIDE[group] });
    }
  }
  return marks;
}

// De kanten waar iets oplicht: voor en achter naast elkaar zodra de spieren aan beide kanten zitten.
export function sidesOf(marks: MuscleMark[]): MuscleSide[] {
  return (['front', 'back'] as const).filter((side) => marks.some((m) => m.side === side));
}

// De kant met de meeste hoofdspieren (die telt dubbel); bij gelijk de voorkant. Voor het kleine kaartje.
export function mainSide(marks: MuscleMark[]): MuscleSide {
  let front = 0;
  let back = 0;
  for (const m of marks) {
    const weight = m.level === 'primary' ? 2 : 1;
    if (m.side === 'front') front += weight;
    else back += weight;
  }
  return back > front ? 'back' : 'front';
}

// De namen in een zin: "Quadriceps, bilspieren". Eerste letter groot, de rest klein zoals een zin.
export function muscleNames(groups: MuscleGroup[]): string {
  return groups.map((g, i) => (i === 0 ? MUSCLE_LABEL[g] : MUSCLE_LABEL[g].toLowerCase())).join(', ');
}

export interface Bounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// De grenzen van een pad van absolute M, C en Z-opdrachten, uit alle punten (de omhullende van de
// stuurpunten is iets ruimer dan de boog zelf, wat voor een snede geen kwaad kan).
export function pathBounds(d: string): Bounds {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    x1 = Math.min(x1, nums[i]);
    x2 = Math.max(x2, nums[i]);
    y1 = Math.min(y1, nums[i + 1]);
    y2 = Math.max(y2, nums[i + 1]);
  }
  return { x1, y1, x2, y2 };
}

export function regionPath(group: MuscleGroup, side: MuscleSide): string | undefined {
  return MUSCLE_REGIONS[side][group];
}

export interface CropOptions {
  square?: boolean;
  minW?: number;
  minH?: number;
  margin?: number;
}

const FIGURE_MID = 100;
const FIGURE_H = 440;

// De snede van het figuur om de gegeven spieren: [x, y, breedte, hoogte]. Eén snede voor beide
// kanten, symmetrisch om de middenlijn, zodat voor en achter dezelfde schaal hebben.
export function cropFor(marks: MuscleMark[], { square = false, minW = 96, minH = 84, margin = 12 }: CropOptions = {}): [number, number, number, number] {
  let x1 = 2 * FIGURE_MID;
  let y1 = FIGURE_H;
  let x2 = 0;
  let y2 = 0;
  for (const m of marks) {
    const d = regionPath(m.group, m.side);
    if (!d) continue;
    const b = pathBounds(d);
    x1 = Math.min(x1, b.x1);
    x2 = Math.max(x2, b.x2);
    y1 = Math.min(y1, b.y1);
    y2 = Math.max(y2, b.y2);
  }
  if (x2 <= x1) return [0, 0, 2 * FIGURE_MID, FIGURE_H];
  const half = Math.max(FIGURE_MID - x1, x2 - FIGURE_MID) + margin;
  let w = Math.max(2 * half, minW);
  let h = Math.max(y2 - y1 + 2 * margin, minH);
  if (square) {
    const s = Math.max(w, h);
    w = s;
    h = s;
  }
  const cy = (y1 + y2) / 2;
  const y = Math.max(-4, Math.min(cy - h / 2, FIGURE_H - h + 4));
  return [FIGURE_MID - w / 2, y, w, h];
}
