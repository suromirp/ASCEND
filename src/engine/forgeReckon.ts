// ASCEND: "Forge rekent mee", tijdens en tussen trainingen. Pure; geen React. Het scherm
// (components/forge/ForgeWorkout.tsx) roept aan en toont het resultaat.
// Besluit: docs/beslissingen/2026-11-03-forge-rekent-mee.md.
//
// Drie dingen, met één rekenregel: die van het voorschrift zelf. De geschatte kracht (Epley, KR-1)
// min de vermoeidheid per eerdere werkset (tenzij de werksets gelijk staan), en `expectedReps` voor
// het gewicht en de gevraagde RIR (engine/strengthModel.ts). Geen tweede formule.
// - Een ander gewicht in een open werkset: het vak Herh. krijgt wat je daarbij waarschijnlijk haalt
//   (`reckonWeight`), ook in de sets waar het gewicht naartoe doorschoof (carryChange, applyWeight).
// - Na het afvinken van een werkset die anders ging dan gevraagd: de eerstvolgende open werkset die je
//   niet zelf aanpaste krijgt de herhalingen (en zo nodig het gewicht) die Forge nu verwacht
//   (`reckonAfterTick`), met de net gehaalde set als schatting van je kracht van vandaag. Het lichtere
//   gewicht kiest hetzelfde als "Lichter" (forgeAdjust.ts#lighterPick), zodat de twee nooit iets anders zeggen.
// - De stap omhoog na de bovenkant van het bereik staat in het voorschrift zelf (strengthModel.ts#prescribe,
//   `raised`); hier alleen het terugzetten (`undoRaise`).
// Herhalingen die je zelf invulde worden nooit overschreven; een bestaand log wordt nooit aangeraakt.

import { exerciseOf, MAX_ROW_KG, type RowTarget, type WorkoutExercise, type WorkoutRow } from './forgeWorkout';
import { lighterPick, type AdjustContext } from './forgeAdjust';
import { DEFAULT_RIR, estimateSet, expectedReps, FATIGUE_PER_SET } from './strengthModel';
import { candidatesFor, loadFromExternal, profileFor } from './strengthWeights';
import { r2 } from '../utils/round';

// Een redelijk bereik voor een geschat aantal: daarbuiten zegt de omrekening niets meer.
export const RECKON_MIN_REPS = 1;
export const RECKON_MAX_REPS = 30;

// `on`: de instelling "Forge rekent mee". Uit doet niets van dit alles.
export type ReckonContext = AdjustContext & { on: boolean };

// De gevraagde reserve van een set: het doel, 0 bij een set tot falen, anders het advies.
const rirAim = (t: RowTarget): number => t.rir ?? (t.failure ? 0 : DEFAULT_RIR);

const clampReps = (n: number) => Math.min(RECKON_MAX_REPS, Math.max(RECKON_MIN_REPS, Math.floor(n)));

// Zijn de herhalingen van deze rij van Forge (nog niet door jou getypt)?
export const repsAreForge = (r: WorkoutRow): boolean => !r.edited || !!r.repsEstimated;

const measuredRir = (r: WorkoutRow): boolean => r.rir !== undefined && !r.rirAssumed;

// Ging deze afgevinkte werkset anders dan gevraagd: andere herhalingen dan Forge in het vak zette,
// of een gemeten RIR anders dan het doel. Een set die je
// afvinkte zoals hij er stond zegt niets nieuws over je kracht (de herhalingen waren een vraag, geen
// grens), dus daarmee blijft de schatting van het voorschrift staan.
export function wentOtherwise(r: WorkoutRow): boolean {
  if (r.kind !== 'work' || !r.done || !r.reps || r.reps <= 0 || r.weightKg === undefined || r.target.timedSec !== undefined) return false;
  if (measuredRir(r) && r.rir !== rirAim(r.target)) return true;
  if (r.forgeReps === undefined) return measuredRir(r);
  return r.reps !== r.forgeReps;
}

// Beter (1) of minder (-1) dan gevraagd: herhalingen plus reserve tegen wat Forge vroeg plus het doel.
function directionOf(r: WorkoutRow): number {
  const aim = rirAim(r.target);
  const did = (r.reps ?? 0) + (r.rir ?? aim);
  const asked = (r.forgeReps ?? r.reps ?? 0) + aim;
  return Math.sign(did - asked);
}

const workIds = (ex: WorkoutExercise) => ex.rows.filter((r) => r.kind === 'work').map((r) => r.id);

// De geschatte kracht voor een werkset: uit de laatste afgevinkte werkset ervoor die anders ging dan
// gevraagd, anders die van het voorschrift; min de vermoeidheid per werkset ertussen.
export function strengthFor(ex: WorkoutExercise, rowId: string, ctx: ReckonContext): number | undefined {
  const ids = workIds(ex);
  const at = ids.indexOf(rowId);
  if (at < 0 || ex.timed) return undefined;
  const exercise = exerciseOf(ex);
  let base: { kg: number; from: number } | undefined;
  for (let i = at - 1; i >= 0 && !base; i--) {
    const r = ex.rows.find((x) => x.id === ids[i])!;
    if (!wentOtherwise(r) || r.rir === undefined) continue;
    const est = estimateSet({ reps: r.reps!, weightKg: r.weightKg, rir: r.rir, kind: 'work' }, { exercise, bodyKg: ctx.bodyKg, maxToFailure: ctx.maxToFailure, dumbbellTotal: ex.dumbbellTotal });
    if (est) base = { kg: est.strengthKg, from: i };
  }
  if (!base && ex.strengthKg !== undefined) base = { kg: ex.strengthKg, from: 0 };
  if (!base) return undefined;
  const fatigue = ex.fatiguePerSet ?? ctx.fatiguePerSet ?? FATIGUE_PER_SET;
  return ctx.workSets === 'equal' ? base.kg : base.kg * (1 - fatigue) ** (at - base.from);
}

// Wat je bij dit gewicht in deze set waarschijnlijk haalt, met de gevraagde RIR. Undefined zonder schatting.
export function estimateRepsAt(ex: WorkoutExercise, rowId: string, weightKg: number, ctx: ReckonContext, strength = strengthFor(ex, rowId, ctx)): number | undefined {
  const row = ex.rows.find((r) => r.id === rowId);
  if (!row || row.kind !== 'work' || ex.timed || row.target.timedSec !== undefined || strength === undefined) return undefined;
  const load = loadFromExternal(exerciseOf(ex), weightKg, ctx.bodyKg, ex.dumbbellTotal);
  if (load === undefined || load <= 0) return undefined;
  return clampReps(expectedReps(strength, load, rirAim(row.target)));
}

// Je veranderde het gewicht van een werkset (`before` is de oefening van voor die wijziging, `after`
// erna, ook met wat doorschoof). Elke open werkset waarvan het gewicht veranderde en waarvan de
// herhalingen nog van Forge zijn, krijgt de herhalingen die bij dat gewicht horen. De set die jij
// veranderde krijgt het merkje `repsEstimated`, zodat een volgend gewicht ze opnieuw mag schatten.
export function reckonWeight(before: WorkoutExercise, after: WorkoutExercise, rowId: string, ctx: ReckonContext): WorkoutExercise {
  if (!ctx.on || after.timed) return after;
  const was = new Map(before.rows.map((r) => [r.id, r]));
  let changed = false;
  const rows = after.rows.map((r) => {
    const old = was.get(r.id);
    if (!old || r.kind !== 'work' || r.done || r.weightKg === undefined || r.weightKg === old.weightKg) return r;
    if (!repsAreForge(old)) return r;
    // Alleen de set die je zelf veranderde, en sets die vanzelf meegingen (niet door jou aangepast).
    if (r.id !== rowId && r.edited) return r;
    const reps = estimateRepsAt(after, r.id, r.weightKg, ctx);
    if (reps === undefined) return r;
    changed = true;
    return { ...r, reps, forgeReps: reps, ...(r.edited ? { repsEstimated: true } : {}) };
  });
  return changed ? { ...after, rows } : after;
}

// Na het afvinken van `rowId`: de eerstvolgende open werkset, als je die niet zelf aanpaste, naar wat
// Forge nu verwacht. Eerst de herhalingen bij het gewicht dat er staat; valt dat buiten het gevraagde
// bereik, dan het gewicht dat er het dichtst bij binnen valt (lichter zoals "Lichter", zwaarder de
// kleinste stap die past). Past er geen gewicht, dan blijft het gewicht en zegt het vak wat je verwacht.
export function reckonAfterTick(ex: WorkoutExercise, rowId: string, ctx: ReckonContext): WorkoutExercise {
  if (!ctx.on || ex.timed) return ex;
  const index = ex.rows.findIndex((r) => r.id === rowId);
  const row = ex.rows[index];
  if (!row || !wentOtherwise(row)) return ex;
  const next = ex.rows.slice(index + 1).find((r) => r.kind === 'work' && !r.done);
  if (!next || next.edited || next.weightKg === undefined || next.target.timedSec !== undefined) return ex;
  const strength = strengthFor(ex, next.id, ctx);
  if (strength === undefined) return ex;
  const exercise = exerciseOf(ex);
  const rir = rirAim(next.target);
  const now = loadFromExternal(exercise, next.weightKg, ctx.bodyKg, ex.dumbbellTotal);
  if (now === undefined || now <= 0) return ex;
  const low = next.target.repsLow;
  const high = next.target.failure || next.target.open ? Infinity : next.target.repsHigh;
  let weightKg = next.weightKg;
  let reps = expectedReps(strength, now, rir);
  if (reps < low || reps > high) {
    const candidates = candidatesFor(exercise, profileFor(ctx.profile, ex.dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: next.weightKg, usedKg: [...(ex.usedKg ?? []), ...(ctx.usedKg ?? []), ...(row.weightKg !== undefined ? [row.weightKg] : [])], stackWeights: ctx.stackWeights, dumbbellTotal: ex.dumbbellTotal });
    if (candidates) {
      if (reps < low) {
        const c = lighterPick(strength, candidates, next.target, rir, now);
        if (c) weightKg = c.externalKg;
      } else {
        const c = candidates.find((x) => x.loadKg > now + 1e-9 && expectedReps(strength, x.loadKg, rir) <= high && expectedReps(strength, x.loadKg, rir) >= low);
        if (c) weightKg = c.externalKg;
      }
      if (weightKg !== next.weightKg) {
        const load = loadFromExternal(exercise, weightKg, ctx.bodyKg, ex.dumbbellTotal);
        if (load !== undefined && load > 0) reps = expectedReps(strength, load, rir);
      }
    }
  }
  const fixed = clampReps(reps);
  weightKg = Math.min(MAX_ROW_KG, r2(weightKg));
  if (fixed === next.reps && weightKg === next.weightKg) return ex;
  // Alleen de kant op van wat je deed: na een betere set nooit lichter of minder, na een mindere nooit
  // zwaarder of meer. (Het voorschrift vraagt soms minder dan het verwacht, het midden van het bereik.)
  const side = directionOf(row);
  const up = weightKg > next.weightKg + 1e-9 || (Math.abs(weightKg - next.weightKg) < 1e-9 && fixed > (next.reps ?? 0));
  if ((side > 0 && !up) || (side < 0 && up)) return ex;
  return { ...ex, rows: ex.rows.map((r) => (r.id === next.id ? { ...r, weightKg, reps: fixed, forgeReps: fixed } : r)) };
}

// Een open set die je niet aanraakte en waar nog het voorschrift met de stap staat (niet bijgesteld na een set).
const stillRaised = (r: WorkoutRow) => !r.done && !r.edited && r.target.weightKg !== undefined && r.weightKg === r.target.weightKg;

// Staat de stap omhoog nog in een open set die je niet aanraakte? Dan kan hij nog terug.
export function raiseOpen(ex: WorkoutExercise): boolean {
  if (!ex.raise) return false;
  const back = new Map(ex.raise.back.map((b) => [b.rowId, b]));
  return ex.rows.some((r) => {
    const b = back.get(r.id);
    return !!b && stillRaised(r) && b.weightKg !== undefined && r.weightKg !== b.weightKg;
  });
}

// Terugzetten: de werksets die nog open zijn, die je niet aanraakte en die Forge niet bijstelde, krijgen het gewicht en de
// herhalingen van zonder de stap; de opwarmsets die je niet aanraakte volgen het eerste werkgewicht
// naar rato. De zin bij de oefening wordt die van zonder de stap.
// `snap` rondt een opwarmgewicht af op wat je sportschool kan maken (forgeInput.ts#makeSnap).
export function undoRaise(ex: WorkoutExercise, snap: (kg: number) => number = r2): WorkoutExercise {
  const raise = ex.raise;
  if (!raise) return ex;
  const back = new Map(raise.back.map((b) => [b.rowId, b]));
  const firstWork = ex.rows.find((r) => r.kind === 'work');
  const firstBack = firstWork ? back.get(firstWork.id) : undefined;
  const firstOpen = !!firstWork && stillRaised(firstWork);
  const rows = ex.rows.map((r) => {
    const b = back.get(r.id);
    if (r.kind === 'work') {
      if (!b || !stillRaised(r)) return r;
      return { ...r, ...(b.weightKg !== undefined ? { weightKg: b.weightKg } : {}), reps: b.reps, forgeReps: b.reps, target: { ...r.target, ...(b.weightKg !== undefined ? { weightKg: b.weightKg } : {}) } };
    }
    if (!firstOpen || firstBack?.weightKg === undefined || r.done || r.edited || r.share === undefined) return r;
    const w = snap(r2(r.share * firstBack.weightKg));
    return { ...r, weightKg: w, target: { ...r.target, weightKg: w } };
  });
  const { raise: _gone, ...rest } = ex;
  void _gone;
  return { ...rest, rows, ...(raise.reason ? { reason: raise.reason } : {}) };
}
