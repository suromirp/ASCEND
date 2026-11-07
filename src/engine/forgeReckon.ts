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
// - Na een zware topset (0 of 1 over of tot falen, gevolgd door terugsets met meer over) die anders ging dan
//   gevraagd, met een bekende reserve: alle open terugsets die je niet aanraakte volgen samen je kracht van
//   vandaag, met de extra daling na een topset (`reckonBackOffs`, strengthModel.ts#fatigueFactor).
//   Besluit: docs/beslissingen/2026-11-03-forge-na-de-eerste-vergelijking.md.
// - De stap omhoog na de bovenkant van het bereik staat in het voorschrift zelf (strengthModel.ts#prescribe,
//   `raised`); hier alleen het terugzetten (`undoRaise`).
// Herhalingen die je zelf invulde worden nooit overschreven; een bestaand log wordt nooit aangeraakt.

import { exerciseOf, MAX_ROW_KG, workAims, type RowTarget, type WorkoutExercise, type WorkoutRow } from './forgeWorkout';
import { lighterPick, OPEN_ROOM, type AdjustContext } from './forgeAdjust';
import { underBar } from './barCheck';
import { DEFAULT_RIR, estimateSet, expectedReps, FATIGUE_PER_SET, fatigueFactor, isHardPair } from './strengthModel';
import { candidatesFor, loadFromExternal, profileFor } from './strengthWeights';
import { r2 } from '../utils/round';

// Een redelijk bereik voor een geschat aantal: daarbuiten zegt de omrekening niets meer.
export const RECKON_MIN_REPS = 1;
export const RECKON_MAX_REPS = 30;
// Tot falen of open: een lichtere stand die meer dan zoveel herhalingen boven de onderkant uitkomt is te grote sprong;
// dan blijft het gewicht staan zolang je er niet meer dan zoveel onder zit.
export const JUMP_ROOM = 2;

// `on`: de instelling "Forge rekent mee". Uit doet niets van dit alles.
export type ReckonContext = AdjustContext & { on: boolean };

// De gevraagde reserve van een set: het doel, 0 bij een set tot falen, anders het advies.
const rirAim = (t: RowTarget): number => t.rir ?? (t.failure ? 0 : DEFAULT_RIR);

const clampReps = (n: number) => Math.min(RECKON_MAX_REPS, Math.max(RECKON_MIN_REPS, Math.floor(n)));

// Zijn de herhalingen van deze rij van Forge (nog niet door jou getypt)?
export const repsAreForge = (r: WorkoutRow): boolean => !r.edited || !!r.repsEstimated;

const measuredRir = (r: WorkoutRow): boolean => r.rir !== undefined && !r.rirAssumed;

// De reserve waarmee Forge na een zware topset rekent. Een RIR die je zelf koos telt zoals hij is. Een
// aangenomen RIR (je vulde niets in) is het doel; haalde je in de topset meer herhalingen dan Forge in het
// vak zette, dan rekent Forge voorzichtig met zoveel minder over (niet onder 0): meer dan gevraagd op 0 of 1
// over is vaak dichter bij falen, en zo zet een gok de terugsets niet zwaarder dan je aankan. Kies je je RIR
// ("Hoeveel over?"), dan telt die. Bij gewone sets blijft de aangenomen RIR het doel.
export function readRir(r: WorkoutRow): number | undefined {
  if (r.rir === undefined || !r.rirAssumed || r.forgeReps === undefined || r.reps === undefined) return r.rir;
  return Math.max(0, r.rir - Math.max(0, r.reps - r.forgeReps));
}

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
    // Een set onder de lege stang (een tikfout als 10 bij de squat) telt niet stil mee als je kracht van vandaag.
    if (!wentOtherwise(r) || r.rir === undefined || underBar(ex, r.id, ctx.profile) !== undefined) continue;
    const est = estimateSet({ reps: r.reps!, weightKg: r.weightKg, rir: isTopSetRow(ex, r.id) ? readRir(r) : r.rir, kind: 'work' }, { exercise, bodyKg: ctx.bodyKg, maxToFailure: ctx.maxToFailure, dumbbellTotal: ex.dumbbellTotal });
    if (est) base = { kg: est.strengthKg, from: i };
  }
  if (!base && ex.strengthKg !== undefined) base = { kg: ex.strengthKg, from: 0 };
  if (!base) return undefined;
  const fatigue = ex.fatiguePerSet ?? ctx.fatiguePerSet ?? FATIGUE_PER_SET;
  return ctx.workSets === 'equal' ? base.kg : base.kg * fatigueFactor(workAims(ex), base.from, at, fatigue, ex.fatigueAfterHard);
}

// Is deze rij een zware topset voor een terugset (0 of 1 over of tot falen, en de volgende werkset vraagt
// meer over)? Dan zegt hij hoe sterk je vandaag bent, en de terugsets erna volgen hem samen.
export function isTopSetRow(ex: WorkoutExercise, rowId: string): boolean {
  const ids = workIds(ex);
  const at = ids.indexOf(rowId);
  if (at < 0 || at + 1 >= ids.length) return false;
  const aims = workAims(ex);
  return isHardPair(aims[at], aims[at + 1]);
}

// Weet Forge hoeveel je over had? Een RIR die je koos, of een set tot falen (dan is het 0).
const reserveKnown = (r: WorkoutRow): boolean => measuredRir(r) || (!!r.target.failure && (r.rir === undefined || r.rir === 0));

// Na een zware topset die anders ging dan gevraagd, met een bekende reserve: elke open terugset die je
// niet aanraakte krijgt het gewicht dat bij je kracht van vandaag hoort, met dezelfde keuze als het
// voorschrift (het zwaarste gewicht waarmee je de onderkant haalt) en de extra daling na een topset.
// Alleen de kant op van wat je deed. Undefined als dit geen topset is of niets verandert.
function reckonBackOffs(ex: WorkoutExercise, row: WorkoutRow, ctx: ReckonContext): WorkoutExercise | undefined {
  if (!isTopSetRow(ex, row.id) || !reserveKnown(row)) return undefined;
  const exercise = exerciseOf(ex);
  const side = directionOf(row);
  if (side === 0) return undefined;
  const index = ex.rows.findIndex((r) => r.id === row.id);
  let changed = false;
  const rows = [...ex.rows];
  for (let k = index + 1; k < rows.length; k++) {
    const r = rows[k];
    if (r.kind !== 'work' || r.done || r.edited || r.weightKg === undefined || r.target.timedSec !== undefined) continue;
    const strength = strengthFor({ ...ex, rows }, r.id, ctx);
    if (strength === undefined) continue;
    const now = loadFromExternal(exercise, r.weightKg, ctx.bodyKg, ex.dumbbellTotal);
    if (now === undefined || now <= 0) continue;
    const rir = rirAim(r.target);
    const low = r.target.repsLow;
    const high = r.target.failure || r.target.open ? Infinity : r.target.repsHigh;
    const candidates = candidatesFor(exercise, profileFor(ctx.profile, ex.dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: r.weightKg, usedKg: [...(ex.usedKg ?? []), ...(ctx.usedKg ?? []), ...(row.weightKg !== undefined ? [row.weightKg] : [])], stackWeights: ctx.stackWeights, dumbbellTotal: ex.dumbbellTotal });
    if (!candidates) continue;
    let pick: (typeof candidates)[number] | undefined;
    for (let j = candidates.length - 1; j >= 0; j--) {
      if (expectedReps(strength, candidates[j].loadKg, rir) >= low) {
        pick = candidates[j];
        break;
      }
    }
    if (!pick) continue;
    const load = pick.loadKg;
    // Alleen de kant op van wat je deed: na een betere topset nooit lichter, na een mindere nooit zwaarder.
    if ((side > 0 && load < now - 1e-9) || (side < 0 && load > now + 1e-9)) continue;
    const reps = clampReps(Math.min(high, expectedReps(strength, load, rir)));
    const weightKg = Math.min(MAX_ROW_KG, r2(pick.externalKg));
    if (weightKg === r.weightKg && reps === r.reps) continue;
    rows[k] = { ...r, weightKg, reps, forgeReps: reps };
    changed = true;
  }
  return changed ? { ...ex, rows } : ex;
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
  const backOffs = reckonBackOffs(ex, row, ctx);
  if (backOffs) return backOffs;
  const next = ex.rows.slice(index + 1).find((r) => r.kind === 'work' && !r.done);
  if (!next || next.edited || next.weightKg === undefined || next.target.timedSec !== undefined) return ex;
  const strength = strengthFor(ex, next.id, ctx);
  if (strength === undefined) return ex;
  const exercise = exerciseOf(ex);
  const rir = rirAim(next.target);
  const now = loadFromExternal(exercise, next.weightKg, ctx.bodyKg, ex.dumbbellTotal);
  if (now === undefined || now <= 0) return ex;
  const low = next.target.repsLow;
  // Een open doel heeft geen bovenkant, maar zwaarder kiezen doet Forge pas boven de onderkant plus wat ruimte.
  const high = next.target.failure || next.target.open ? low + OPEN_ROOM : next.target.repsHigh;
  let weightKg = next.weightKg;
  let load = now;
  let reps = expectedReps(strength, now, rir);
  // Tot falen of een open doel (9+): na een zware set mag de volgende één herhaling onder de onderkant zitten, zodat
  // het gewicht maar één stap zakt in plaats van twee (47,5 x 8 na 52,5 x 7, zoals MacroFactor; eigenaar 7 november).
  const open = !!(next.target.failure || next.target.open);
  const floor = open ? Math.max(1, low - 1) : low;
  let keepFewer = false;
  if (reps < floor || reps > high) {
    const candidates = candidatesFor(exercise, profileFor(ctx.profile, ex.dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: next.weightKg, usedKg: [...(ex.usedKg ?? []), ...(ctx.usedKg ?? []), ...(row.weightKg !== undefined ? [row.weightKg] : [])], stackWeights: ctx.stackWeights, dumbbellTotal: ex.dumbbellTotal });
    if (candidates) {
      if (reps < floor) {
        const c = lighterPick(strength, candidates, { ...next.target, repsLow: floor }, rir, now);
        // Tot falen of open: is de volgende stand een grote sprong (een blok van 7 kg, de hulp van 28 naar 35 kg) die
        // ruim boven het doel uitkomt, dan blijft het gewicht en verwacht Forge een paar herhalingen minder, zoals
        // MacroFactor (eigenaar, 7 november). Niet bij een gewoon bereik.
        const bigJump = c && open && expectedReps(strength, c.loadKg, rir) > low + JUMP_ROOM && reps >= low - 2 * JUMP_ROOM;
        if (c && !bigJump) weightKg = c.externalKg;
        else if (bigJump) keepFewer = true;
      } else {
        const c = candidates.find((x) => x.loadKg > now + 1e-9 && expectedReps(strength, x.loadKg, rir) <= high && expectedReps(strength, x.loadKg, rir) >= low);
        if (c) weightKg = c.externalKg;
      }
      if (weightKg !== next.weightKg) {
        const l = loadFromExternal(exercise, weightKg, ctx.bodyKg, ex.dumbbellTotal);
        if (l !== undefined && l > 0) {
          load = l;
          reps = expectedReps(strength, l, rir);
        }
      }
    }
  }
  // Past er geen gewicht en haal je de onderkant toch niet: de set blijft staan. "Lichter" en de melding
  // dat geen gewicht past doen hun eigen voorstel; een vak met 1 of 2 herhalingen helpt niemand.
  if (reps < floor && !keepFewer) return ex;
  const fixed = clampReps(reps);
  weightKg = Math.min(MAX_ROW_KG, r2(weightKg));
  if (fixed === next.reps && weightKg === next.weightKg) return ex;
  // Alleen de kant op van wat je deed: na een betere set nooit lichter of minder, na een mindere nooit
  // zwaarder of meer. (Het voorschrift vraagt soms minder dan het verwacht, het midden van het bereik.)
  const side = directionOf(row);
  // Zwaarder is meer belasting, niet een groter getal: bij een toestel met hulp is minder hulp zwaarder.
  const up = load > now + 1e-9 || (Math.abs(load - now) < 1e-9 && fixed > (next.reps ?? 0));
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
  return { ...rest, rows, raiseUndone: true, ...(raise.reason ? { reason: raise.reason } : {}) };
}

// "Hoeveel over?" na het afvinken: de keuzes, 3 is "3+".
export const QUICK_RIR = [0, 1, 2, 3] as const;
export const quickRirLabel = (n: number): string => (n >= 3 ? '3+' : String(n));

// Vraagt Forge na het afvinken van deze set hoeveel je over had? Alleen bij een afgevinkte werkset waarvan
// je de RIR niet zelf invulde, en alleen bij de sets die het meest zeggen: de eerste werkset (de topset), een
// zware set (0 of 1 over of tot falen) en de laatste werkset van de oefening. Niet bij een set op tijd.
export function asksReserve(ex: WorkoutExercise, rowId: string): boolean {
  if (ex.timed) return false;
  const work = ex.rows.filter((r) => r.kind === 'work');
  const at = work.findIndex((r) => r.id === rowId);
  const row = work[at];
  if (!row || !row.done || row.target.timedSec !== undefined) return false;
  if (row.rir !== undefined && !row.rirAssumed) return false;
  const hard = !!row.target.failure || (row.target.rir ?? DEFAULT_RIR) <= 1;
  return at === 0 || at === work.length - 1 || hard;
}
