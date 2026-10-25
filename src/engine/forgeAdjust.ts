// ASCEND: bijsturen in de training (KR-8, alleen de kant van lichter). Pure; geen
// React. Haalt een afgevinkte werkset de onderkant van het bereik niet bij de
// gevraagde herhalingen in reserve (RIR), dan stelt dit een lichter gewicht voor
// de sets die nog niet gedaan zijn. Het scherm (components/forge/ForgeWorkout.tsx)
// roept alleen aan en toont de regel; niets verandert zonder een tik op "Lichter".
// Besluit: docs/beslissingen/2026-10-25-bijsturen-in-forge.md.
//
// De rekening is die van het model zelf: de kracht uit de set die je deed
// (estimateSet, herhalingen plus RIR), voor elke volgende set 3% minder door
// vermoeidheid (FATIGUE_PER_SET, tenzij de werksets gelijk staan), en het zwaarste
// gewicht van je sportschoolprofiel (candidatesFor, met de gewichten die je echt
// gebruikte) waarbij de verwachte herhalingen de onderkant nog halen. Een gewicht
// dat ver boven het bereik uitkomt (de stap van het toestel is te grof) wordt nooit
// voorgesteld: liever geen voorstel dan een set van 21 herhalingen.

import type { Exercise } from '../models/exercise';
import { exerciseOf, MAX_ROW_REPS, type WorkoutExercise, type WorkoutRow } from './forgeWorkout';
import { REPS_ROOM } from './prescriptionCheck';
import { DEFAULT_RIR, estimateSet, expectedReps, FATIGUE_PER_SET, formatWeight } from './strengthModel';
import type { GymProfile, StackWeights, WorkSetsMode } from './strengthSettings';
import { formatNumberNL } from '../utils/number';
import { candidatesFor, loadFromExternal, profileFor } from './strengthWeights';

export interface AdjustContext {
  bodyKg?: number;
  profile: GymProfile;
  workSets: WorkSetsMode;
  // Tot hoeveel herhalingen een set meetelt voor de schatting.
  maxToFailure?: number;
  // De gewichten die je eerder op deze oefening gebruikte (voor kabels en toestellen).
  usedKg?: number[];
  // Hoe streng met de gewichten van toestellen ("Gewichten van toestellen").
  stackWeights?: StackWeights;
}

export interface AdjustItem {
  rowId: string;
  weightKg: number;
}

export interface Adjustment {
  // De set die te zwaar was.
  fromRowId: string;
  items: AdjustItem[];
}

// Haalde je de onderkant niet bij het gevraagde RIR? Een aangenomen RIR is het doel
// zelf, dan beslissen de herhalingen alleen: onder de onderkant is te zwaar.
export function tooHeavy(row: WorkoutRow): boolean {
  if (row.kind !== 'work' || !row.done || row.rir === undefined) return false;
  const t = row.target;
  if (t.timedSec !== undefined || t.rir === undefined || !row.reps || row.reps <= 0) return false;
  return row.reps + row.rir < t.repsLow + t.rir;
}

// Het voorstel na het afvinken van `rowId`, of niets.
export function suggestLighter(ex: WorkoutExercise, rowId: string, ctx: AdjustContext): Adjustment | undefined {
  if (ex.timed) return undefined;
  const index = ex.rows.findIndex((r) => r.id === rowId);
  const row = ex.rows[index];
  if (!row || !tooHeavy(row) || row.weightKg === undefined) return undefined;
  const exercise = exerciseOf(ex);
  const est = estimateSet({ reps: row.reps!, weightKg: row.weightKg, rir: row.rir, kind: 'work' }, { exercise, bodyKg: ctx.bodyKg, maxToFailure: ctx.maxToFailure });
  if (!est) return undefined;
  // Begin bij het gewicht dat je echt gebruikte, ook als het toestel het nog niet kent.
  const candidates = candidatesFor(exercise, profileFor(ctx.profile, ex.dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: row.weightKg, usedKg: [...(ex.usedKg ?? []), ...(ctx.usedKg ?? []), row.weightKg], stackWeights: ctx.stackWeights });
  if (!candidates) return undefined;
  const items: AdjustItem[] = [];
  const workIds = ex.rows.filter((r) => r.kind === 'work').map((r) => r.id);
  const fromWork = workIds.indexOf(rowId);
  for (const r of ex.rows.slice(index + 1)) {
    if (r.kind !== 'work' || r.done || r.edited || r.weightKg === undefined) continue;
    const distance = workIds.indexOf(r.id) - fromWork;
    const strength = ctx.workSets === 'equal' ? est.strengthKg : est.strengthKg * (1 - FATIGUE_PER_SET) ** distance;
    const rir = r.target.rir ?? DEFAULT_RIR;
    const now = loadFromExternal(exercise, r.weightKg, ctx.bodyKg);
    if (now === undefined) continue;
    let pick = -1;
    for (let j = candidates.length - 1; j >= 0; j--) {
      if (expectedReps(strength, candidates[j].loadKg, rir) >= r.target.repsLow) {
        pick = j;
        break;
      }
    }
    if (pick < 0) continue;
    const c = candidates[pick];
    // Alleen lichter, en alleen als de herhalingen binnen het bereik blijven.
    if (c.loadKg >= now - 1e-9) continue;
    if (!r.target.failure && expectedReps(strength, c.loadKg, rir) > r.target.repsHigh + REPS_ROOM) continue;
    items.push({ rowId: r.id, weightKg: c.externalKg });
  }
  return items.length > 0 ? { fromRowId: rowId, items } : undefined;
}

// De regel bij de oefening: "Die set was zwaarder dan bedoeld. Volgende sets 62,5 kg?"
export function adjustText(adj: Adjustment, exercise: Exercise | undefined): string {
  const assisted = exercise?.resistance === 'assisted_bodyweight';
  const plain = (kg: number) => (assisted ? formatWeight(exercise, kg) : formatNumberNL(kg, 2));
  const weights = [...new Set(adj.items.map((i) => plain(i.weightKg)))];
  const joined = weights.length === 1 ? weights[0] : `${weights.slice(0, -1).join(', ')} en ${weights[weights.length - 1]}`;
  const list = assisted ? joined : `${joined} kg`;
  return `Die set was zwaarder dan bedoeld. ${adj.items.length === 1 ? 'Volgende set' : 'Volgende sets'} ${list}?`;
}

// "Lichter": het gewicht erin, alleen in rijen die nog open en onaangeraakt zijn.
// De herhalingen blijven binnen het bereik van het doel.
export function applyLighter(ex: WorkoutExercise, adj: Adjustment): WorkoutExercise {
  const byId = new Map(adj.items.map((i) => [i.rowId, i.weightKg]));
  return {
    ...ex,
    rows: ex.rows.map((r) => {
      const kg = byId.get(r.id);
      if (kg === undefined || r.done || r.edited) return r;
      const reps = r.reps === undefined || r.target.failure ? r.reps : Math.min(MAX_ROW_REPS, Math.max(r.target.repsLow, Math.min(r.target.repsHigh, r.reps)));
      return { ...r, weightKg: kg, ...(reps !== undefined ? { reps } : {}) };
    }),
  };
}

// Wat van het voorstel nog kan: rijen die intussen gedaan of aangepast zijn vallen af.
export function stillOpen(ex: WorkoutExercise, adj: Adjustment): Adjustment | undefined {
  const items = adj.items.filter((i) => {
    const r = ex.rows.find((x) => x.id === i.rowId);
    return !!r && !r.done && !r.edited && r.weightKg !== i.weightKg;
  });
  return items.length > 0 ? { ...adj, items } : undefined;
}
