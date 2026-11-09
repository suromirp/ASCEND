// ASCEND: vermoeidheid tussen oefeningen in Forge. Puur; geen React, geen opslag.
// Bron: docs/onderzoek/RIR en RPE in krachtapps.md, hoofdstuk 3 en bouwstap 6 tot 8.
// Besluit: docs/beslissingen/2026-11-09-forge-vermoeidheid-tussen-oefeningen.md.
//
// In het kort. Binnen een oefening kost elke werkset de volgende een deel van je kracht
// (strengthModel.ts#fatigueFactor). Hier gaat het om wat eerder in de training gebeurde: harde werksets
// voor dezelfde spieren. Je historie bevat die vermoeidheid al voor je gewone volgorde, dus alleen het
// verschil met wat je normaal deed telt: meer harde sets ervoor dan normaal maakt de eerste set iets
// lichter (gewicht of herhalingen), nooit zwaarder. Het log verandert nooit; alles is een lezing.

import type { Exercise } from '../models/exercise';
import type { SessionLog, SetLog } from '../models/training';
import { median } from '../utils/stats';
import { formatNumberNL } from '../utils/number';
import { confirmedAssumed, confirmedRir } from './assumedSets';
import { REPS_ROOM } from './prescriptionCheck';
import { exerciseKey } from './strengthHistory';
import { analyseSessions, DEFAULT_RIR, estimateSet, expectedReps, type LoadContext, type SessionInput } from './strengthModel';
import type { Candidate } from './strengthWeights';
import { isWorkSet } from './workSets';

// --- drempels -------------------------------------------------------------------------------------
// Alle getallen zijn een gok uit het verslag ("Wat nog onzeker is"), te toetsen met de stille
// vergelijking "raak" (engine/prescriptionCheck.ts).

// Een harde set: zoveel herhalingen over of minder (of tot falen, 0 over).
export const CROSS_HARD_MAX_RIR = 3;
// Een eerdere oefening waarvan een hoofdspier alleen een hulpspier van deze is, telt zo zwaar per set.
export const CROSS_SECONDARY_SHARE = 0.5;
// De kost per harde set meer dan normaal: de startwaarde (hoofdstuk 3: 3 tot 5% voor één set kort ervoor,
// 7% voor een hele training, minder dan lineair).
export const CROSS_PER_SET = 0.02;
// Geleerd: tussen 0 en 5% per set.
export const CROSS_PER_SET_MAX = 0.05;
// Nooit meer dan zoveel van je kracht in totaal.
export const CROSS_MAX_TOTAL = 0.1;
// Leren pas vanaf zoveel trainingen met een gemeten eerste set, met minstens twee verschillende aantallen ervoor.
export const CROSS_LEARN_MIN = 6;
// Krimp naar de startwaarde, zoals learnFatigue en learnAfterHard: (n x gemeten + k x 2%) / (n + k).
export const CROSS_SHRINK = 8;
// "Normaal": de mediaan van de laatste zoveel trainingen met een bekend aantal ervoor, en minstens zoveel.
export const CROSS_NORMAL_WINDOW = 6;
export const CROSS_NORMAL_MIN = 3;

// --- spieren ---------------------------------------------------------------------------------------

const hasMuscles = (e: Exercise | undefined): e is Exercise => !!e && e.primary.length > 0;

// Hoe zwaar een set van `earlier` telt voor `later`: 1 bij een gedeelde hoofdspier, een half als een
// hoofdspier van de eerdere alleen een hulpspier van de latere is, anders 0. Dezelfde regels als
// forgeWorkout.ts#doneBefore. Zonder spiergegevens: 0.
export function muscleShare(earlier: Exercise | undefined, later: Exercise | undefined): number {
  if (!hasMuscles(earlier) || !hasMuscles(later)) return 0;
  if (earlier.primary.some((m) => later.primary.includes(m))) return 1;
  if (earlier.primary.some((m) => later.secondary.includes(m))) return CROSS_SECONDARY_SHARE;
  return 0;
}

// --- harde sets ------------------------------------------------------------------------------------

// Het aantal harde werksets van één oefening in een log: een RIR die je zelf koos van hoogstens 3, of een
// afgevinkte set die bevestigd is (engine/assumedSets.ts, alleen met "Afvinken telt als het doel") met
// hoogstens 3. Undefined als het van een werkset niet te weten is: geen RIR, of aangenomen en niet
// bevestigd. Een oud log zonder `repsAsked` is bij een aangenomen set dus onbekend, nooit geraden.
export function hardSetsLogged(sets: SetLog[], confirmOn: boolean): number | undefined {
  let n = 0;
  for (const [i, s] of sets.entries()) {
    if (!isWorkSet(s) || !(s.reps > 0)) continue;
    if (typeof s.rir !== 'number' || !Number.isFinite(s.rir)) return undefined;
    if (!s.rirAssumed) {
      if (s.rir <= CROSS_HARD_MAX_RIR) n++;
      continue;
    }
    if (!confirmOn || !confirmedAssumed(s, sets.slice(i + 1).find(isWorkSet), {})) return undefined;
    if (confirmedRir(s, undefined) <= CROSS_HARD_MAX_RIR) n++;
  }
  return n;
}

// Een rij van het voorschrift: telt als harde set als hij tot falen gaat of hoogstens 3 over vraagt.
export function hardPlanned(rows: readonly { kind: string; target: { rir?: number; failure?: boolean; timedSec?: number } }[]): number {
  return rows.filter((r) => r.kind === 'work' && r.target.timedSec === undefined && (!!r.target.failure || (r.target.rir ?? DEFAULT_RIR) <= CROSS_HARD_MAX_RIR)).length;
}

export interface EarlierWork {
  exercise?: Exercise;
  // Undefined: niet te weten (zie hardSetsLogged).
  hard: number | undefined;
}

// Bouwstap 6: hoeveel harde werksets er eerder in de training voor de spieren van deze oefening waren.
// Undefined zonder spiergegevens, of als een eerdere oefening op dezelfde spieren een onbekend aantal heeft.
export function setsBefore(exercise: Exercise | undefined, earlier: readonly EarlierWork[]): number | undefined {
  if (!hasMuscles(exercise)) return undefined;
  let n = 0;
  for (const e of earlier) {
    const share = muscleShare(e.exercise, exercise);
    if (share === 0) continue;
    if (e.hard === undefined) return undefined;
    n += share * e.hard;
  }
  return n;
}

// Per log (id) en per oefening (de sleutel van strengthHistory.ts#exerciseKey): de harde sets ervoor, in
// de volgorde van het log. Een oefening die twee keer in een log staat telt bij de eerste keer.
export type CrossHistory = Map<string, Map<string, number | undefined>>;

export function crossHistory(logs: readonly SessionLog[], confirmOn: boolean): CrossHistory {
  const out: CrossHistory = new Map();
  for (const log of logs) {
    const data = Array.isArray(log.strengthData) ? log.strengthData : [];
    if (data.length === 0) continue;
    const earlier: EarlierWork[] = [];
    const per = new Map<string, number | undefined>();
    for (const entry of data) {
      const sets = Array.isArray(entry?.sets) ? entry.sets : [];
      if (!sets.some(isWorkSet)) continue;
      const { key, exercise } = exerciseKey(entry.exerciseId, entry.exerciseName);
      if (!per.has(key)) per.set(key, setsBefore(exercise, earlier));
      earlier.push({ exercise, hard: hardSetsLogged(sets, confirmOn) });
    }
    out.set(log.id, per);
  }
  return out;
}

// Bouwstap 7: wat je normaal deed, de mediaan van de laatste trainingen met een bekend aantal. Te weinig: niets.
export function normalBefore(counts: readonly (number | undefined)[]): number | undefined {
  const known = counts.filter((c): c is number => typeof c === 'number' && Number.isFinite(c)).slice(-CROSS_NORMAL_WINDOW);
  return known.length >= CROSS_NORMAL_MIN ? median(known) : undefined;
}

// --- leren -----------------------------------------------------------------------------------------

export interface CrossPoint {
  // De harde sets ervoor in die training.
  before: number;
  // Hoeveel lager de eerste werkset uitkwam dan de gladgestreken kracht van ervoor (0,04 is 4%).
  drop: number;
}

// Bouwstap 8, de meetpunten: per training met een bekend aantal ervoor de eerste werkset, alleen met een RIR
// die je zelf koos (nooit rirAssumed, zoals learnFatigue), tegen de gladgestreken kracht van voor die training.
// Een training op vermoeide benen telt niet: dat verschil komt ergens anders vandaan.
export function crossPoints(sessions: readonly (SessionInput & { before?: number })[], ctx: LoadContext): CrossPoint[] {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const plain: LoadContext = { ...ctx, confirm: undefined };
  const points = analyseSessions(sorted, plain);
  const out: CrossPoint[] = [];
  let smoothed: number | undefined;
  for (const [i, s] of sorted.entries()) {
    const first = s.sets.find(isWorkSet);
    if (s.before !== undefined && smoothed !== undefined && first && !first.rirAssumed && !s.legsTired) {
      const e = estimateSet(first, plain);
      if (e && e.weight >= 1) out.push({ before: s.before, drop: 1 - e.strengthKg / smoothed });
    }
    if (points[i]?.smoothed !== undefined) smoothed = points[i].smoothed;
  }
  return out;
}

export interface LearnedCross {
  perSet: number;
  trainings: number;
}

// Hoeveel een harde set meer ervoor kost, uit je eigen trainingen: de helling van de daling tegen het aantal
// ervoor (een vaste afwijking valt zo weg), naar de 2% getrokken zolang er weinig is, tussen 0 en 5%.
export function learnCross(points: readonly CrossPoint[]): LearnedCross {
  const n = points.length;
  const xs = points.map((p) => p.before);
  if (n < CROSS_LEARN_MIN || new Set(xs).size < 2) return { perSet: CROSS_PER_SET, trainings: n };
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = points.reduce((a, p) => a + p.drop, 0) / n;
  let cov = 0;
  let varX = 0;
  for (const p of points) {
    cov += (p.before - mx) * (p.drop - my);
    varX += (p.before - mx) ** 2;
  }
  const slope = cov / varX;
  const shrunk = (n * slope + CROSS_SHRINK * CROSS_PER_SET) / (n + CROSS_SHRINK);
  return { perSet: Math.min(CROSS_PER_SET_MAX, Math.max(0, shrunk)), trainings: n };
}

// --- de bijstelling --------------------------------------------------------------------------------

export interface CrossFatigue {
  today: number;
  normal: number;
  // Vandaag min normaal, altijd meer dan 0.
  extra: number;
  perSet: number;
  // Het deel van je kracht dat overblijft, tussen 0,9 en 1.
  factor: number;
}

// Alleen het verschil met normaal telt, alleen omlaag, hoogstens 10%. Undefined: niets bijstellen.
export function crossFatigue(today: number | undefined, normal: number | undefined, perSet: number): CrossFatigue | undefined {
  if (today === undefined || normal === undefined || !(perSet > 0)) return undefined;
  const extra = today - normal;
  if (!(extra > 1e-9)) return undefined;
  return { today, normal, extra, perSet, factor: 1 - Math.min(CROSS_MAX_TOTAL, extra * perSet) };
}

export interface FirstSet {
  weightKg: number;
  reps: number;
  target: { repsLow: number; repsHigh: number; rir?: number; failure?: boolean; open?: boolean; timedSec?: number };
}

// De eerste werkset van het voorschrift bij iets minder kracht. Haal je de onderkant nog op dit gewicht, dan
// alleen minder herhalingen; anders het zwaarste lichtere gewicht waarmee je de onderkant haalt (dezelfde keuze
// als forgeAdjust.ts#lighterPick, met de speling van raak); past er geen, dan de onderkant op dit gewicht.
// Nooit zwaarder en nooit meer herhalingen. Tot falen, een open doel of een houding: niets.
export function adjustFirstSet(set: FirstSet, strengthKg: number, factor: number, loadOf: (kg: number) => number | undefined, candidates: readonly Candidate[] | undefined): { weightKg: number; reps: number } | undefined {
  const t = set.target;
  if (t.failure || t.open || t.timedSec !== undefined || !(factor < 1)) return undefined;
  const rir = t.rir ?? DEFAULT_RIR;
  const load = loadOf(set.weightKg);
  if (load === undefined || !(load > 0)) return undefined;
  const strength = strengthKg * factor;
  const here = expectedReps(strength, load, rir);
  if (here >= t.repsLow) {
    const reps = Math.max(t.repsLow, Math.min(set.reps, here));
    return reps < set.reps ? { weightKg: set.weightKg, reps } : undefined;
  }
  const list = candidates ?? [];
  for (let j = list.length - 1; j >= 0; j--) {
    const c = list[j];
    if (c.loadKg >= load - 1e-9) continue;
    const reps = expectedReps(strength, c.loadKg, rir);
    if (reps < t.repsLow) continue;
    if (reps > t.repsHigh + REPS_ROOM) break;
    return { weightKg: c.externalKg, reps: Math.min(t.repsHigh, reps) };
  }
  return set.reps > t.repsLow ? { weightKg: set.weightKg, reps: t.repsLow } : undefined;
}

// "2 harde sets meer voor dezelfde spieren ervoor dan normaal, dus je eerste set iets lichter." Het droge feit
// eerst. Een half telt mee ("1,5"), want een hulpspier telt een halve set.
export function crossLine(c: CrossFatigue, change: { lighter: boolean; fewerReps: number }): string {
  const n = Math.round(c.extra * 2) / 2;
  const count = n < 0.5 ? 'Iets meer harde sets' : `${formatNumberNL(n, 1)} ${n <= 1 ? 'harde set' : 'harde sets'} meer`;
  const what = change.lighter ? 'iets lichter' : change.fewerReps === 1 ? 'een herhaling minder' : `${change.fewerReps} herhalingen minder`;
  return `${count} voor dezelfde spieren ervoor dan normaal, dus je eerste set ${what}.`;
}
