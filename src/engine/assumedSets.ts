// ASCEND: "Afvinken telt als het doel". Een werkset die je afvinkte zonder zelf een RIR te kiezen
// (SetLog.rirAssumed) heet hier "bevestigd" als hij ging zoals gevraagd. Puur; geen React, geen opslag.
// Het log verandert nooit: dit is een regel bij het lezen, ook voor oude logs.
// Bron: docs/onderzoek/RIR en RPE in krachtapps.md, hoofdstuk 4 ("Advies", regel 1 tot 8) en
// hoofdstuk 6 (bouwvoorstel, stap 1 tot 5). Besluit: docs/beslissingen/2026-11-08-forge-afvinken-doel.md.

import type { SetLog } from '../models/training';
import { isWorkSet } from './workSets';

// --- drempels -------------------------------------------------------------------------------------
// Alle drempels hieronder zijn een gok uit het verslag, nog niet getoetst ("Wat nog onzeker is").
// Te toetsen met de stille vergelijking "raak" (engine/prescriptionCheck.ts).

// Regel 3: haalt de volgende werkset van dezelfde oefening zoveel herhalingen minder dan gevraagd,
// dan was de set ervoor waarschijnlijk zwaarder dan het doel en telt hij weer als aangenomen.
export const CONFIRM_NEXT_SHORT_REPS = 2;
// Regel 2: zoveel herhalingen boven de bovenkant van het bereik is twijfel ("ruim meer").
export const DOUBT_OVER_TOP_REPS = 2;
// Regel 2: de eerste zoveel trainingen van een oefening vraagt Forge na elke werkset.
export const DOUBT_FIRST_TRAININGS = 3;
// Regel 4: dit deel van de herhalingen boven het gevraagde telt als echte winst.
export const EXTRA_REPS_SHARE = 0.5;
// Regel 5: zo vaak achter elkaar haalt de topset de bovenkant voor een stap zwaarder op bevestigde sets
// (tenzij alle werksets de bovenkant haalden).
export const CONFIRMED_TOP_TRAININGS = 2;

const KG_EPS = 1e-6;

export interface ConfirmContext {
  // De onderkant van het bereik van die dag: het gevraagde aantal voor een oud log zonder `repsAsked`.
  rangeLow?: number;
  // De last van een set (lichaamsgewicht en hulp meegerekend), om "niet lichter dan voorgeschreven"
  // ook op een toestel met hulp goed te lezen. Zonder: het gewicht zelf.
  loadOf?: (set: SetLog) => number | undefined;
}

// Hoeveel herhalingen er gevraagd waren: wat Forge in het vak zette, of bij een oud log de onderkant
// van het bereik.
export function askedReps(set: SetLog, rangeLow: number | undefined): number | undefined {
  // Alleen een afgevinkte set zonder eigen RIR draagt een gevraagd aantal dat telt; een set met eigen RIR heeft
  // sinds 9 november ook `repsAsked` (Hoe goed kent Forge je), maar regel 3 leest hem zoals altijd met het bereik.
  return set.rirAssumed ? (set.repsAsked ?? rangeLow) : rangeLow;
}

// Lichter dan dit gewicht (met lichaamsgewicht en hulp meegerekend als `loadOf` er is)?
function lighterThan(set: SetLog, kg: number, ctx: ConfirmContext): boolean {
  const asked: SetLog = { ...set, weightKg: kg };
  const done = ctx.loadOf ? ctx.loadOf(set) : set.weightKg;
  const want = ctx.loadOf ? ctx.loadOf(asked) : kg;
  if (done === undefined || want === undefined) return true;
  return done < want - KG_EPS;
}

// Was het gewicht lichter dan Forge vroeg? Wat Forge in de rij zette na een bijstelling (`forgeKg`, ook na
// Lichter), anders het voorschrift. Zonder beide in het log: nee (een oud log).
function lighterThanAsked(set: SetLog, ctx: ConfirmContext): boolean {
  const kg = set.forgeKg ?? set.weightKgAsked;
  return kg !== undefined && lighterThan(set, kg, ctx);
}

// Was het gewicht lichter dan het voorschrift zelf (Forge zette het tijdens de training lager)? Dan is een
// bevestigde set geen bewijs dat je kracht gelijk bleef: hij telt als meting, niet als ondergrens.
// Zonder voorschrift in het log: nee (een oud log).
export function belowPrescription(set: SetLog, ctx: ConfirmContext): boolean {
  return set.weightKgAsked !== undefined && lighterThan(set, set.weightKgAsked, ctx);
}

// Regel 1 en 3. Bevestigd: een werkset, afgevinkt zonder eigen RIR, niet lichter dan Forge vroeg, met
// minstens de gevraagde herhalingen, en de volgende werkset van de oefening viel niet 2 of meer tekort.
export function confirmedAssumed(set: SetLog, next: SetLog | undefined, ctx: ConfirmContext): boolean {
  if (!isWorkSet(set) || !set.rirAssumed || set.rir === undefined || set.reps <= 0) return false;
  const asked = askedReps(set, ctx.rangeLow);
  if (asked === undefined || set.reps < asked) return false;
  if (lighterThanAsked(set, ctx)) return false;
  if (next) {
    const nextAsked = askedReps(next, ctx.rangeLow);
    if (nextAsked !== undefined && next.reps <= nextAsked - CONFIRM_NEXT_SHORT_REPS) return false;
  }
  return true;
}

// Per set van één oefening in één training: bevestigd of niet. De volgende set is de eerstvolgende werkset.
export function confirmedFlags(sets: SetLog[], ctx: ConfirmContext): boolean[] {
  return sets.map((s, i) => confirmedAssumed(s, sets.slice(i + 1).find(isWorkSet), ctx));
}

// Regel 4: de RIR waarmee een bevestigde set telt. Precies de gevraagde herhalingen: het doel. Meer: het
// doel min de helft van het verschil, de RIR naar boven afgerond (de mildste lezing), niet onder 0.
export function confirmedRir(set: SetLog, rangeLow: number | undefined): number {
  const rir = set.rir ?? 0;
  const asked = askedReps(set, rangeLow) ?? set.reps;
  const extra = Math.max(0, set.reps - asked);
  return Math.max(0, Math.ceil(rir - EXTRA_REPS_SHARE * extra - 1e-9));
}
