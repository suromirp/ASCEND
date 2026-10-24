// ASCEND: learning from you what to wear. After an outdoor training you can
// tap once "Te warm", "Goed" or "Te koud". Every tap moves your personal
// bonus half a degree for that sport: "te warm" adds to it (the advice dresses
// lighter), "te koud" takes from it. Limited to plus or minus four degrees,
// separately for running, walking and cycling. "Goed" changes nothing.
//
// Pure. The value lives in AppSettings.clothingAdjust: optional, absent means
// 0 everywhere, so older settings and backups need no migration step; it
// travels with the settings in a backup and is read defensively on import.
// Design: docs/onderzoek/Kleding bij het weer.md ("Wat nog onzeker is").

import type { Sport } from './sports';

export type ClothingFeel = 'too_warm' | 'good' | 'too_cold';
export type ClothingAdjust = Partial<Record<Sport, number>>;

export const CLOTHING_FEEL_LABEL: Record<ClothingFeel, string> = { too_warm: 'Te warm', good: 'Goed', too_cold: 'Te koud' };

export const FEEDBACK_STEP_C = 0.5;
export const MAX_ADJUST_C = 4;
const SPORTS: Sport[] = ['running', 'hiking', 'cycling'];
const SPORT_WORD: Record<Sport, string> = { running: 'hardlopen', hiking: 'wandelen', cycling: 'fietsen' };

const snap = (n: number) => Math.round(Math.max(-MAX_ADJUST_C, Math.min(MAX_ADJUST_C, n)) / FEEDBACK_STEP_C) * FEEDBACK_STEP_C;

// Reads what is stored, whatever it is: only finite numbers for a known sport
// count, snapped to half degrees; a value outside the range is refused. Zero is not stored.
// `skipped` is how many entries were rejected or had to be repaired.
export function cleanClothingAdjust(raw: unknown): { value: ClothingAdjust; skipped: number } {
  const value: ClothingAdjust = {};
  let skipped = 0;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { value, skipped: raw === undefined ? 0 : 1 };
  const r = raw as Record<string, unknown>;
  for (const key of Object.keys(r)) {
    if (!(SPORTS as string[]).includes(key)) { skipped++; continue; }
    const v = r[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) { skipped++; continue; }
    // Out of range is refused, not cut off; only a stray half degree is set right.
    if (Math.abs(v) > MAX_ADJUST_C) { skipped++; continue; }
    const fixed = snap(v);
    if (fixed !== v) skipped++;
    if (fixed !== 0) value[key as Sport] = fixed;
  }
  return { value, skipped };
}

export const readClothingAdjust = (raw: unknown): ClothingAdjust => cleanClothingAdjust(raw).value;

// Degrees for one sport (0 when never nudged).
export const adjustFor = (raw: unknown, sport: Sport | undefined): number => (sport ? readClothingAdjust(raw)[sport] ?? 0 : 0);

// The new value after one tap. Returns a new object; the old one is untouched.
export function applyClothingFeedback(raw: unknown, sport: Sport, feel: ClothingFeel): ClothingAdjust {
  const current = readClothingAdjust(raw);
  if (feel === 'good') return current;
  const next = snap((current[sport] ?? 0) + (feel === 'too_warm' ? FEEDBACK_STEP_C : -FEEDBACK_STEP_C));
  const out = { ...current };
  if (next === 0) delete out[sport];
  else out[sport] = next;
  return out;
}

export const hasClothingAdjust = (raw: unknown): boolean => Object.keys(readClothingAdjust(raw)).length > 0;

const degrees = (n: number) => String(Math.abs(n)).replace('.', ',');

// "Nu: Hardlopen 1,5 graden lichter, fietsen 0,5 graden warmer." or the standard.
export function clothingAdjustSummary(raw: unknown): string {
  const adjust = readClothingAdjust(raw);
  const parts = SPORTS.flatMap((sport) => {
    const v = adjust[sport];
    if (!v) return [];
    return [`${SPORT_WORD[sport]} ${degrees(v)} ${Math.abs(v) === 1 ? 'graad' : 'graden'} ${v > 0 ? 'lichter' : 'warmer'}`];
  });
  if (parts.length === 0) return 'Nu: de standaard.';
  const text = parts.join(', ');
  return `Nu: ${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
