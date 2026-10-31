// ASCEND: de beginnersstart zonder doel (docs/visie/Zonder doel.md, 2.7 en 3.4). Wie de acht weken
// voor zijn richting gemiddeld minder dan twee keer per week sportte, of het zelf zegt, begint
// rustig: de eerste vier weken geen harde training. Het loopt vanzelf af, want het is afgeleid uit
// de startmaandag van je richting en je logs, nooit als vlag opgeslagen.
//
// Het ontwerp noemt twee weken alleen rustig en de eerste pittige training na vier weken. Omdat de
// enige harde training in een week zonder doel de heuvelloop is, valt dat samen: vier weken zonder
// heuvelloop, die is dan een herstelloop (engine/programLayout.ts, fase "Rustig beginnen").
//
// Puur: geen React, geen IndexedDB.

import type { SessionLog } from '../models/training';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';

export type BeginnerStartChoice = 'auto' | 'ja' | 'nee';
export const BEGINNER_START_CHOICES: BeginnerStartChoice[] = ['auto', 'ja', 'nee'];

// Vier weken zonder harde training (expert).
export const BEGINNER_WEEKS = 4;
// Gemeten over acht weken voor de start: minder dan twee keer per week is een beginnersstart (afgeleid).
export const LOOKBACK_WEEKS = 8;
export const MIN_PER_WEEK = 2;

export function parseBeginnerStart(raw: unknown): BeginnerStartChoice {
  return BEGINNER_START_CHOICES.find((c) => c === raw) ?? 'auto';
}

// Geldt de beginnersstart voor een richting die op `start` begon?
export function isBeginnerStart(choice: unknown, logs: readonly SessionLog[], start: string | undefined): boolean {
  if (!start) return false;
  const c = parseBeginnerStart(choice);
  if (c !== 'auto') return c === 'ja';
  const first = mondayOfWeek(start);
  const from = addDays(first, -7 * LOOKBACK_WEEKS);
  const trained = new Set(
    logs
      .filter((l) => l.type !== 'recovery' && l.completedDate >= from && l.completedDate < first)
      .map((l) => `${l.completedDate}|${l.templateId}`),
  ).size;
  return trained / LOOKBACK_WEEKS < MIN_PER_WEEK;
}

// De start beslaat hele golven: bij golven van drie of zes weken zijn het er zes.
export function beginnerWeeksFor(waveLength: number): number {
  return Math.ceil(BEGINNER_WEEKS / waveLength) * waveLength;
}

const WEEKS_WORD: Record<number, string> = { 4: 'vier', 6: 'zes' };

// De zin voor het voorstel, zolang de beginnersstart loopt.

export function beginnerStartLine(start: string, today: string, waveLength = BEGINNER_WEEKS): string | undefined {
  const weeks = beginnerWeeksFor(waveLength);
  const since = Math.floor(daysBetween(mondayOfWeek(start), mondayOfWeek(today)) / 7);
  if (since < 0 || since >= weeks) return undefined;
  return `Je begint rustig: de eerste ${WEEKS_WORD[weeks] ?? weeks} weken alleen makkelijk, de eerste pittige training pas daarna. Zo went je lichaam eerst aan het ritme.`;
}
