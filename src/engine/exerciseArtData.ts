// ASCEND: de tekeningen bij oefeningen, het rekenwerk. Een tekening is een bestand
// public/exercise-art/<slug>.json met één viewBox en drie paden (begin, midden, eind). Hier
// staat wat een bestand moet zijn om te mogen tonen, welke tekeningen bij je trainingen horen
// en de aanwijzingen van een oefening in Doen, Let op en Vaak fout. Zuiver en getest.
// Ontwerp: docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen.md.

import { exerciseArt } from '../data/exerciseArt';
import { exerciseById } from '../data/exercises';
import { matchExercise } from './exerciseMatch';

export interface ExerciseDrawing {
  viewBox: [number, number, number, number];
  frames: [string, string, string];
}

// Leest een bestand defensief: alles wat niet klopt is "geen tekening", nooit een leeg of kapot vlak.
export function parseDrawing(raw: unknown): ExerciseDrawing | null {
  if (!raw || typeof raw !== 'object') return null;
  const { v, d } = raw as { v?: unknown; d?: unknown };
  if (!Array.isArray(v) || v.length !== 4 || !v.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  const [, , w, h] = v as number[];
  // Een zinnige viewBox: een positief formaat dat in het vlak van 512 bij 512 past, met wat marge.
  if (w < 40 || h < 40 || w > 560 || h > 560) return null;
  if (!Array.isArray(d) || d.length !== 3) return null;
  if (!d.every((p) => typeof p === 'string' && p.length > 40 && /^[Mm]/.test(p) && /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s-]+$/.test(p))) return null;
  return { viewBox: v as [number, number, number, number], frames: d as [string, string, string] };
}

export const drawingUrl = (base: string, slug: string) => `${base.replace(/\/?$/, '/')}exercise-art/${slug}.json`;

// De tekeningen die bij de oefeningen van je eigen trainingen horen, zonder dubbelen, in volgorde.
export function artSlugsForNames(names: string[]): string[] {
  const slugs: string[] = [];
  for (const name of names) {
    const id = matchExercise(name);
    const link = id ? exerciseArt(id) : undefined;
    if (link && !slugs.includes(link.slug)) slugs.push(link.slug);
  }
  return slugs;
}

export function artSlugForId(id: string): string | undefined {
  return exerciseById(id) ? exerciseArt(id)?.slug : undefined;
}

export const CUE_LABELS = ['Doen', 'Let op', 'Vaak fout'] as const;
export type CueLabel = (typeof CUE_LABELS)[number];

export interface Cue {
  label: CueLabel | null;
  text: string;
}

// "Doen: stang op je bovenrug." wordt { label: 'Doen', text: 'Stang op je bovenrug.' }. Een regel
// zonder bekend voorvoegsel blijft een gewone regel zonder kopje.
export function splitCues(cues: string[]): Cue[] {
  return cues.map((line) => {
    for (const label of CUE_LABELS) {
      if (line.startsWith(`${label}:`)) {
        const text = line.slice(label.length + 1).trim();
        return { label, text: text.charAt(0).toUpperCase() + text.slice(1) };
      }
    }
    return { label: null, text: line };
  });
}
