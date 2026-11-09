// ASCEND: calisthenics in Forge, de regels achter de rij voor een stap (docs/beslissingen/2026-11-09-calisthenics-forge-rij.md).
// Puur; geen React, geen opslag. ExerciseBlock.tsx toont wat hier staat, ForgeWorkout.tsx roept het aan.
//
// Wat dit bestand beslist:
// - de drie regels bij een oefening op een ladder ("Stap 4 van 7", de toets, de uitleg) en welke stap lichter of
//   zwaarder is (de tik zelf gaat via Ruilen, `swap` in ForgeWorkout.tsx);
// - de stille regel met het voorstel van engine/skillLadder.ts#ladderState, zonder knop;
// - de rijen van een houding (seconden) en van een stap waar je naartoe tikte (het doel van die stap zelf);
// - wanneer "Ging het netjes?" komt, de band van de open sets, en de regel "Telt voor ..." bij extra gewicht.
// Niets hier verandert de planning, een template of een log.

import { exerciseById } from '../data/exercises';
import { LADDER_PLACE, SKILL_FLOOR_REPS, SKILL_FLOOR_SECONDS, skillLadderById, type SkillLadder, type SkillLadderStep } from '../data/skillLadders';
import type { Exercise } from '../models/exercise';
import { SET_BANDS, type SetBand, type SetLog } from '../models/training';
import { formatNumberNL } from '../utils/number';
import type { LadderState } from './skillLadder';
import type { RowTarget, WorkoutExercise, WorkoutRow } from './forgeWorkout';
import { isWorkSet } from './workSets';

// Minder en Meer bij een houding gaan in stappen van 5 seconden; een houding duurt hoogstens een uur (zoals het log).
export const SECONDS_STEP = 5;
export const MAX_ROW_SECONDS = 3600;
export const secondsBounds = { min: 0, max: MAX_ROW_SECONDS };

interface Place {
  ladder: SkillLadder;
  // Telt vanaf 1.
  step: number;
  at: SkillLadderStep;
}

function placeOf(exercise: Pick<Exercise, 'id'> | undefined): Place | undefined {
  const place = exercise ? LADDER_PLACE.get(exercise.id) : undefined;
  const ladder = place ? skillLadderById(place.id) : undefined;
  const at = ladder?.steps[(place?.step ?? 0) - 1];
  return place && ladder && at ? { ladder, step: place.step, at } : undefined;
}

// Het extra gewicht dat een stap vraagt (de stappen met extra gewicht), anders undefined.
export function addedKgOf(exercise: Pick<Exercise, 'id'> | undefined): number | undefined {
  const at = placeOf(exercise)?.at;
  return at?.test.kind === 'reps' ? at.test.addedKg : undefined;
}

export interface LadderStepLink {
  exerciseId: string;
  name: string;
}

export interface LadderLines {
  // "Stap 4 van 7": het tweede getal is het aantal stappen van de ladder.
  step: string;
  // "Toets: 3 keer 8", "Toets: 3 keer 30 seconden", "Toets: 3 keer 8 met 2,5 kg extra".
  test: string;
  // De uitleg bij die getallen.
  explain: string;
  // De stap ervoor en erna; op stap 1 is er geen lichtere, op de laatste geen zwaardere.
  lighter?: LadderStepLink;
  harder?: LadderStepLink;
}

const linkAt = (ladder: SkillLadder, step: number): LadderStepLink | undefined => {
  const id = ladder.steps[step - 1]?.exerciseId;
  const e = id ? exerciseById(id) : undefined;
  return e ? { exerciseId: e.id, name: e.name } : undefined;
};

// Eén keer per oefening (de ladders zijn vaste gegevens), zodat een oefening in Forge niet bij elke tik opnieuw tekent.
const LINES = new Map<string, LadderLines | undefined>();

export function ladderLines(exercise: Pick<Exercise, 'id'> | undefined): LadderLines | undefined {
  if (!exercise) return undefined;
  if (!LINES.has(exercise.id)) LINES.set(exercise.id, makeLines(exercise));
  return LINES.get(exercise.id);
}

function makeLines(exercise: Pick<Exercise, 'id'>): LadderLines | undefined {
  const place = placeOf(exercise);
  if (!place) return undefined;
  const { ladder, step, at } = place;
  const total = ladder.steps.length;
  const t = at.test;
  const test =
    t.kind === 'hold'
      ? `Toets: ${t.sets} keer ${t.seconds} seconden`
      : t.addedKg !== undefined
        ? `Toets: ${t.sets} keer ${t.reps} met ${formatNumberNL(t.addedKg, 2)} kg extra`
        : `Toets: ${t.sets} keer ${t.reps}`;
  const last = step === total;
  const lighter = step > 1 ? linkAt(ladder, step - 1) : undefined;
  const harder = !last ? linkAt(ladder, step + 1) : undefined;
  return {
    step: `Stap ${step} van ${total}`,
    test,
    explain: last ? 'Dit is de zwaarste stap.' : 'Haal je dat met nette vorm, dan kan de volgende stap.',
    ...(lighter ? { lighter } : {}),
    ...(harder ? { harder } : {}),
  };
}

// De stille regel met het voorstel van de ladder (F4d maakt er later een voorstel met Akkoord van). Alleen op de
// oefening op de huidige stap (zwaarder) of op de stap boven het voorstel (lichter); staat de oefening al op de
// voorgestelde stap, dan geen regel.
export function ladderHint(exercise: Pick<Exercise, 'id'> | undefined, state: LadderState | null | undefined): string | undefined {
  const place = placeOf(exercise);
  const proposal = state?.proposal;
  if (!place || !state || !proposal || state.ladderId !== place.ladder.id || place.step === proposal.step) return undefined;
  const name = exerciseById(proposal.exerciseId)?.name;
  if (!name) return undefined;
  if (proposal.kind === 'harder' && state.current === place.step) return `Toets gehaald. Volgende stap: ${name}.`;
  if (proposal.kind === 'lighter' && place.step === proposal.step + 1) return `Drie trainingen onder de onderkant. Lichtere stap: ${name}.`;
  return undefined;
}

// --- de rijen -----------------------------------------------------------------------------------

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

// De band van de laatste werkset van je vorige keer op deze oefening, anders geen.
export function lastBand(previous: readonly SetLog[] | undefined): SetBand | undefined {
  const work = (previous ?? []).filter((s) => s && isWorkSet(s));
  const band = work.at(-1)?.band;
  return band !== undefined && (SET_BANDS as readonly string[]).includes(band) ? band : undefined;
}

export interface LadderRowsInput {
  slotId: string;
  exercise: Exercise;
  setCount: number;
  // De sets van je laatste training op deze oefening (deze stap).
  previous?: readonly SetLog[];
  // De reserve uit het plan; een houding heeft er geen.
  rir?: number;
  // De band van je vorige keer klaarzetten (Band bij optrekken en dip, alleen bij `assist: 'band'`).
  band: boolean;
}

// De rijen van een houding, of van een stap waar je naartoe tikte. Het aantal werksets blijft; het doel komt van
// de stap zelf: je laatste keer op die stap (een houding hoogstens de toets), anders de onderkant (5 herhalingen,
// 10 seconden). Herhalingen van een andere stap gaan niet mee. Extra gewicht: je laatste keer, anders `addedKg`.
export function ladderRows(input: LadderRowsInput): { rows: WorkoutRow[]; hold: boolean } {
  const { slotId, exercise, setCount, previous, rir, band } = input;
  const bandNow = band && exercise.assist === 'band' ? lastBand(previous) : undefined;
  // Het doel komt uit sets met dezelfde band als nu klaarstaat (zonder band: alleen sets zonder band).
  const work = (previous ?? []).filter((s) => s && isWorkSet(s) && s.band === bandNow);
  const test = placeOf(exercise)?.at.test;
  const hold = exercise.measure === 'hold';
  const added = addedKgOf(exercise);
  let target: RowTarget;
  let row: Pick<WorkoutRow, 'weightKg' | 'reps' | 'seconds'>;
  if (hold) {
    const done = work.map((s) => s.seconds).filter((n): n is number => finite(n) && n > 0);
    const top = test?.kind === 'hold' ? test.seconds : MAX_ROW_SECONDS;
    const seconds = done.length > 0 ? Math.min(top, Math.max(...done)) : SKILL_FLOOR_SECONDS;
    target = { repsLow: 1, repsHigh: 1, holdSec: seconds };
    row = { reps: 1, seconds };
  } else {
    const counted = added !== undefined ? work.filter((s) => finite(s.weightKg) && s.weightKg >= added) : work;
    const done = counted.map((s) => s.reps).filter((n) => finite(n) && n > 0);
    const reps = done.length > 0 ? Math.max(...done) : SKILL_FLOOR_REPS;
    const weightKg = added !== undefined ? Math.max(added, ...counted.map((s) => s.weightKg).filter(finite)) : undefined;
    target = { ...(weightKg !== undefined ? { weightKg } : {}), repsLow: reps, repsHigh: reps, ...(rir !== undefined ? { rir } : {}) };
    row = { ...(weightKg !== undefined ? { weightKg } : {}), reps };
  }
  const rows: WorkoutRow[] = Array.from({ length: Math.max(1, setCount) }, (_, i) => ({
    id: `${slotId}:s${i}`,
    kind: 'work',
    target,
    ...row,
    ...(hold ? {} : { forgeReps: row.reps }),
    ...(bandNow ? { band: bandNow } : {}),
    done: false,
  }));
  return { rows, hold };
}

// De band van je vorige keer op de open werksets van een oefening die het model plande (Pull-Up, Dip).
export function withLastBand(rows: WorkoutRow[], previous: readonly SetLog[] | undefined): WorkoutRow[] {
  const band = lastBand(previous);
  return band ? rows.map((r) => (r.kind === 'work' ? { ...r, band } : r)) : rows;
}

// --- de band in de rij --------------------------------------------------------------------------

export const BAND_LABEL: Record<SetBand, string> = { licht: 'Licht', middel: 'Middel', zwaar: 'Zwaar' };

// De band die de keuze toont: die van de eerste open werkset, of als alles gedaan is die van de laatste werkset.
export function bandOf(ex: Pick<WorkoutExercise, 'rows'>): SetBand | null {
  const work = ex.rows.filter((r) => r.kind === 'work');
  const row = work.find((r) => !r.done) ?? work.at(-1);
  return row?.band ?? null;
}

// Een keuze geldt voor de open werksets; een gedane set houdt wat erop stond.
export function withBand(ex: WorkoutExercise, band: SetBand | null): WorkoutExercise {
  return {
    ...ex,
    rows: ex.rows.map((r) => {
      if (r.kind !== 'work' || r.done) return r;
      if (band) return { ...r, band };
      const { band: _gone, ...rest } = r;
      void _gone;
      return rest;
    }),
  };
}

// --- Ging het netjes? ---------------------------------------------------------------------------

// Na het afvinken van een werkset op een ladderstap, alleen als de set de onderkant haalt (5 herhalingen of 10
// seconden) en zonder band: eronder, of met hulp, verandert het antwoord niets aan de uitkomst.
export function asksClean(ex: WorkoutExercise, rowId: string, exercise: Exercise | undefined): boolean {
  if (!exercise?.ladder) return false;
  const row = ex.rows.find((r) => r.id === rowId);
  if (!row || row.kind !== 'work' || !row.done || row.band !== undefined) return false;
  if (exercise.measure === 'hold') return finite(row.seconds) && row.seconds >= SKILL_FLOOR_SECONDS;
  return finite(row.reps) && row.reps >= SKILL_FLOOR_REPS;
}

// Ja is `clean: true`, Nee `clean: false`, niets (of "weet ik niet") laat het leeg.
export function withClean(ex: WorkoutExercise, rowId: string, clean: boolean | undefined): WorkoutExercise {
  return {
    ...ex,
    rows: ex.rows.map((r) => {
      if (r.id !== rowId) return r;
      if (clean !== undefined) return { ...r, clean };
      const { clean: _gone, ...rest } = r;
      void _gone;
      return rest;
    }),
  };
}

// --- extra gewicht ------------------------------------------------------------------------------

// "Telt voor Pull-Up With Added Weight." onder een werkset van Pull-Up of Dip met minstens het extra gewicht van
// de stap erboven, zonder band. Dezelfde regel als engine/skillLadder.ts bij het lezen van je logs.
export function countsForLine(exercise: Exercise | undefined, row: Pick<WorkoutRow, 'kind' | 'weightKg' | 'band'>): string | undefined {
  const place = placeOf(exercise);
  if (!place || exercise?.resistance !== 'bodyweight' || row.kind !== 'work' || row.band !== undefined) return undefined;
  const next = place.ladder.steps[place.step];
  if (!next || next.test.kind !== 'reps' || next.test.addedKg === undefined) return undefined;
  if (!finite(row.weightKg) || row.weightKg < next.test.addedKg) return undefined;
  const name = exerciseById(next.exerciseId)?.name;
  return name ? `Telt voor ${name}.` : undefined;
}
