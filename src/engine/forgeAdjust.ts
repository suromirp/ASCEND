// ASCEND: bijsturen in de training (KR-8, alleen de kant van lichter). Pure; geen
// React. Haalt een afgevinkte werkset de onderkant van het bereik niet bij de
// gevraagde herhalingen in reserve (RIR), dan stelt dit een lichter gewicht voor
// de sets die nog niet gedaan zijn. Het scherm (components/forge/ForgeWorkout.tsx)
// roept alleen aan en toont de regel; niets verandert zonder een tik op "Lichter".
// Besluit: docs/beslissingen/2026-10-25-bijsturen-in-forge.md.
//
// De rekening is die van het model zelf: de kracht uit de set die je deed
// (estimateSet, herhalingen plus RIR), voor elke volgende set minder door
// vermoeidheid (de daling van de oefening, anders FATIGUE_PER_SET van 3%, tenzij de werksets gelijk staan), en het zwaarste
// gewicht van je sportschoolprofiel (candidatesFor, met de gewichten die je echt
// gebruikte) waarbij de verwachte herhalingen de onderkant nog halen. Een gewicht
// dat ver boven het bereik uitkomt (de stap van het toestel is te grof) wordt nooit
// voorgesteld: liever geen voorstel dan een set van 21 herhalingen.

import type { Exercise } from '../models/exercise';
import { exerciseOf, MAX_ROW_REPS, type WorkoutExercise, type WorkoutRow } from './forgeWorkout';
import { hasStack } from './machineWeights';
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
  // De daling per set als de oefening die zelf kent (WorkoutExercise.fatiguePerSet wint).
  fatiguePerSet?: number;
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
  const est = estimateSet({ reps: row.reps!, weightKg: row.weightKg, rir: row.rir, kind: 'work' }, { exercise, bodyKg: ctx.bodyKg, maxToFailure: ctx.maxToFailure, dumbbellTotal: ex.dumbbellTotal });
  if (!est) return undefined;
  // Begin bij het gewicht dat je echt gebruikte, ook als het toestel het nog niet kent.
  const candidates = candidatesFor(exercise, profileFor(ctx.profile, ex.dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: row.weightKg, usedKg: [...(ex.usedKg ?? []), ...(ctx.usedKg ?? []), row.weightKg], stackWeights: ctx.stackWeights, dumbbellTotal: ex.dumbbellTotal });
  if (!candidates) return undefined;
  const fatigue = ex.fatiguePerSet ?? ctx.fatiguePerSet ?? FATIGUE_PER_SET;
  const items: AdjustItem[] = [];
  const workIds = ex.rows.filter((r) => r.kind === 'work').map((r) => r.id);
  const fromWork = workIds.indexOf(rowId);
  for (const r of ex.rows.slice(index + 1)) {
    if (r.kind !== 'work' || r.done || r.edited || r.weightKg === undefined) continue;
    const distance = workIds.indexOf(r.id) - fromWork;
    const strength = ctx.workSets === 'equal' ? est.strengthKg : est.strengthKg * (1 - fatigue) ** distance;
    const rir = r.target.rir ?? DEFAULT_RIR;
    const now = loadFromExternal(exercise, r.weightKg, ctx.bodyKg, ex.dumbbellTotal);
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
    if (!r.target.failure && !r.target.open && expectedReps(strength, c.loadKg, rir) > r.target.repsHigh + REPS_ROOM) continue;
    items.push({ rowId: r.id, weightKg: c.externalKg });
  }
  return items.length > 0 ? { fromRowId: rowId, items } : undefined;
}

export interface NoFit {
  // De set die te zwaar was.
  fromRowId: string;
  repsLow: number;
  repsHigh: number;
  // Het lichtste gewicht dat ASCEND van dit toestel kent, en wat je daarmee naar
  // verwachting haalt bij de eerste set die het bereik niet haalt.
  lightestKg: number;
  expectedReps: number;
  // De eerste open set die niet past: welke het is (rij, nummer van de werkset) en met welk gewicht,
  // zodat de regel zegt welke set het is en verdwijnt zodra je die set zelf aanpaste.
  rowId?: string;
  setNo?: number;
  weightKg?: number;
}

// Past er op dit toestel geen enkel gewicht meer? Alleen bij een kabel of toestel met een
// gewichtstapel, na een te zware set, en alleen als `suggestLighter` niets voorstelt omdat
// zelfs het lichtste gewicht dat ASCEND kent de onderkant van het bereik niet haalt. Dan weet
// ASCEND niet of er lichtere gewichten zijn; de regel vraagt of je ze invult.
export function suggestOwnWeights(ex: WorkoutExercise, rowId: string, ctx: AdjustContext): NoFit | undefined {
  if (ex.timed) return undefined;
  const exercise = exerciseOf(ex);
  if (!hasStack(exercise)) return undefined;
  const index = ex.rows.findIndex((r) => r.id === rowId);
  const row = ex.rows[index];
  if (!row || !tooHeavy(row) || row.weightKg === undefined) return undefined;
  const est = estimateSet({ reps: row.reps!, weightKg: row.weightKg, rir: row.rir, kind: 'work' }, { exercise, bodyKg: ctx.bodyKg, maxToFailure: ctx.maxToFailure, dumbbellTotal: ex.dumbbellTotal });
  if (!est) return undefined;
  const candidates = candidatesFor(exercise, profileFor(ctx.profile, ex.dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: row.weightKg, usedKg: [...(ex.usedKg ?? []), ...(ctx.usedKg ?? []), row.weightKg], stackWeights: ctx.stackWeights, dumbbellTotal: ex.dumbbellTotal });
  if (!candidates) return undefined;
  const lightest = candidates[0].loadKg;
  const lightestKg = candidates[0].externalKg;
  // Dezelfde daling per set als het bijsturen (suggestLighter), zodat beide hetzelfde beslissen.
  const fatigue = ex.fatiguePerSet ?? ctx.fatiguePerSet ?? FATIGUE_PER_SET;
  const workIds = ex.rows.filter((r) => r.kind === 'work').map((r) => r.id);
  const fromWork = workIds.indexOf(rowId);
  for (const r of ex.rows.slice(index + 1)) {
    if (r.kind !== 'work' || r.done || r.edited || r.weightKg === undefined) continue;
    const distance = workIds.indexOf(r.id) - fromWork;
    const strength = ctx.workSets === 'equal' ? est.strengthKg : est.strengthKg * (1 - fatigue) ** distance;
    const rir = r.target.rir ?? DEFAULT_RIR;
    const reps = expectedReps(strength, lightest, rir);
    if (reps < r.target.repsLow) return { fromRowId: rowId, repsLow: r.target.repsLow, repsHigh: r.target.repsHigh, lightestKg, expectedReps: Math.max(0, reps), rowId: r.id, setNo: workIds.indexOf(r.id) + 1, weightKg: r.weightKg };
  }
  return undefined;
}

// De regel bij de oefening als geen gewicht past.
export function noFitText(fit: NoFit, hasList = false): string {
  const reps = fit.repsLow === fit.repsHigh ? `${fit.repsLow}` : `${fit.repsLow} tot ${fit.repsHigh}`;
  const tail = `${hasList ? 'aanpassen' : 'invullen'}?`;
  if (fit.setNo !== undefined) return `Set ${fit.setNo}: geen gewicht van dit toestel past bij ${reps} herhalingen. Gewichten van dit toestel ${tail}`;
  return `Geen gewicht van dit toestel past bij ${reps} herhalingen. Gewichten van dit toestel ${tail}`;
}

// Past de set nog steeds niet? Zodra je die set zelf aanpaste, afvinkte of weghaalde is de melding
// opgelost en verdwijnt hij. Een melding zonder set (uit een oud concept) blijft staan tot de oefening klaar is.
export function fitStillOpen(ex: WorkoutExercise, fit: { rowId?: string; weightKg?: number }): boolean {
  if (fit.rowId === undefined) return true;
  const r = ex.rows.find((x) => x.id === fit.rowId);
  return !!r && !r.done && !r.edited && (fit.weightKg === undefined || r.weightKg === fit.weightKg);
}

// Een regel met de set erbij: "Set 3: ook 35 kg is nog te zwaar."
function withSet(text: string, setNo: number | undefined): string {
  return setNo === undefined ? text : `Set ${setNo}: ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

// Na het invullen van de gewichten: past er nog steeds niets, dan alleen een korte, stille
// tip onder de oefening, zonder knoppen ("Ook 35 kg is nog te zwaar, naar verwachting 8 herhalingen.").
export function stillHeavyTip(fit: NoFit): string {
  const kg = formatNumberNL(fit.lightestKg, 2);
  if (fit.expectedReps <= 0) return withSet(`Ook ${kg} kg is nog te zwaar voor deze set.`, fit.setNo);
  return withSet(`Ook ${kg} kg is nog te zwaar, naar verwachting ${fit.expectedReps} ${fit.expectedReps === 1 ? 'herhaling' : 'herhalingen'}.`, fit.setNo);
}

export interface TooBigStep {
  // De set die te zwaar was.
  fromRowId: string;
  // Het eerstvolgende lichtere gewicht dat de onderkant haalt, en wat je daarmee naar
  // verwachting haalt: ver boven het bereik.
  stepKg: number;
  expectedReps: number;
  // De open set waar het om gaat (zie NoFit).
  rowId?: string;
  setNo?: number;
  weightKg?: number;
}

// Na het invullen van de gewichten: `suggestLighter` zwijgt omdat het eerstvolgende lichtere
// gewicht ver boven het bereik uitkomt (de stap is te groot), terwijl `suggestOwnWeights` ook
// zwijgt omdat het lichtste gewicht de onderkant wel haalt. Dezelfde rekening en dezelfde
// vermoeidheid per set als `suggestLighter`; alleen de eerste open set die zo uitkomt telt.
export function suggestTooBigStep(ex: WorkoutExercise, rowId: string, ctx: AdjustContext): TooBigStep | undefined {
  if (ex.timed) return undefined;
  if (suggestLighter(ex, rowId, ctx)) return undefined;
  const index = ex.rows.findIndex((r) => r.id === rowId);
  const row = ex.rows[index];
  if (!row || !tooHeavy(row) || row.weightKg === undefined) return undefined;
  const exercise = exerciseOf(ex);
  const est = estimateSet({ reps: row.reps!, weightKg: row.weightKg, rir: row.rir, kind: 'work' }, { exercise, bodyKg: ctx.bodyKg, maxToFailure: ctx.maxToFailure, dumbbellTotal: ex.dumbbellTotal });
  if (!est) return undefined;
  const candidates = candidatesFor(exercise, profileFor(ctx.profile, ex.dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: row.weightKg, usedKg: [...(ex.usedKg ?? []), ...(ctx.usedKg ?? []), row.weightKg], stackWeights: ctx.stackWeights, dumbbellTotal: ex.dumbbellTotal });
  if (!candidates) return undefined;
  const fatigue = ex.fatiguePerSet ?? ctx.fatiguePerSet ?? FATIGUE_PER_SET;
  const workIds = ex.rows.filter((r) => r.kind === 'work').map((r) => r.id);
  const fromWork = workIds.indexOf(rowId);
  for (const r of ex.rows.slice(index + 1)) {
    if (r.kind !== 'work' || r.done || r.edited || r.weightKg === undefined || r.target.failure) continue;
    const distance = workIds.indexOf(r.id) - fromWork;
    const strength = ctx.workSets === 'equal' ? est.strengthKg : est.strengthKg * (1 - fatigue) ** distance;
    const rir = r.target.rir ?? DEFAULT_RIR;
    const now = loadFromExternal(exercise, r.weightKg, ctx.bodyKg, ex.dumbbellTotal);
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
    if (c.loadKg >= now - 1e-9) continue;
    const reps = expectedReps(strength, c.loadKg, rir);
    if (reps > r.target.repsHigh + REPS_ROOM) return { fromRowId: rowId, stepKg: c.externalKg, expectedReps: reps, rowId: r.id, setNo: workIds.indexOf(r.id) + 1, weightKg: r.weightKg };
  }
  return undefined;
}

// De stille regel als de stap te groot is ("35 kg is een te grote stap: naar verwachting 16 herhalingen.").
export function tooBigStepTip(step: TooBigStep): string {
  const kg = formatNumberNL(step.stepKg, 2);
  // Een getal ver boven elk bereik (de omrekening is daar ook het minst zeker) zegt niets meer.
  if (step.expectedReps > 30) return withSet(`${kg} kg is een te grote stap: veel te veel herhalingen.`, step.setNo);
  return withSet(`${kg} kg is een te grote stap: naar verwachting ${step.expectedReps} ${step.expectedReps === 1 ? 'herhaling' : 'herhalingen'}.`, step.setNo);
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
      // Een open set ("7+") heeft geen bovenkant: een getypt aantal erboven blijft staan.
      const reps = r.reps === undefined || r.target.failure ? r.reps : r.target.open ? Math.min(MAX_ROW_REPS, Math.max(r.target.repsLow, r.reps)) : Math.min(MAX_ROW_REPS, Math.max(r.target.repsLow, Math.min(r.target.repsHigh, r.reps)));
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
