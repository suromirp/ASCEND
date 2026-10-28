// ASCEND: "raak". An honest measure of a proposal for a strength exercise, the
// same for every proposal, whoever made it (decision
// docs/beslissingen/2026-10-24-kracht-stil-toetsen.md). Pure.
//
// The question is not whether ASCEND chooses the same weight as MacroFactor
// (that says nothing, nobody knows whether MacroFactor is right) but whether a
// proposal is a good one for THAT day. Each exercise of each training has a
// target from the template: a rep range and the reps in reserve (RIR).
//
// One test for both sides, with one estimator: the strength of that day (the
// best work set of that training, reps plus RIR, the estimate ASCEND already
// uses) says how many reps to failure a load would have given that day. A load
// is a hit when (reps to failure minus the RIR target) is inside the range, with
// 1 rep of room (`checkProposal`).
//
// - What you did: `checkProposal(strength of the day, load of the set you did)`.
// - The proposal of ASCEND: `checkProposal(strength of the day, load of the
//   proposal for the SAME set)`. The same weight gets the same verdict on both
//   sides. For ASCEND that is an estimate afterwards.
// - A training made in Forge itself whose weight stayed within one step of the
//   proposal: then what happened is the measurement, `checkDone` (reps plus RIR
//   of the set itself, the same room), no estimate. A hand-made log with another
//   weight did not follow a proposal and counts as an estimate.
// - Close to what you did (`NEAR_SHARE`): where the proposal of ASCEND lay within 5% of
//   the load you used, both sides are about equally often a hit; the difference sits
//   in proposals far away, where the test leans on the Epley conversion to another
//   weight, its least certain part. So `near` gives a second number for those rows
//   only (decision docs/beslissingen/2026-10-26-doorvoeren-en-raak-dichtbij.md).
//
// The deviation is in reps: positive is too light (more was possible), negative
// too heavy, counted from the middle of the range.

import type { ExercisePrescription, SessionLog } from '../models/training';

export type CheckOrigin = 'macrofactor' | 'forge';

export interface RepTarget {
  low: number;
  high: number;
  rir: number;
}

// How much room a hit has: the reps at the target RIR may lie this far outside
// the range, on both sides and for every kind of check.
export const REPS_ROOM = 1;

// Where a strength log came from, by who made its sets: MacroFactor (read in, or
// a log whose sets MacroFactor replaced) or Forge itself (a log by hand in the
// app, sets still its own, also after MacroFactor took over only the duration).
// Anything else (the watch) has no reps in reserve and does not count. After
// `restoreManual` the log is as it was, so the origin is again the first one.
export function logOrigin(log: Pick<SessionLog, 'source' | 'manualMeasured'>): CheckOrigin | undefined {
  const s = log.manualMeasured?.strength;
  if (s) {
    if ('strengthData' in s) return 'macrofactor';
    const was = s.tied?.source ?? log.source;
    return was === 'manual' ? 'forge' : was === 'macrofactor' ? 'macrofactor' : undefined;
  }
  if (log.source === 'macrofactor') return 'macrofactor';
  if (log.source === 'manual') return 'forge';
  return undefined;
}

// The range and RIR the template asks for this exercise, the same reading as the
// workout screen: the first set that is not to failure of a program, else the
// "8-10" of the template with the RIR from its RPE.
export function targetOfSlot(slot: Pick<ExercisePrescription, 'reps' | 'rpe' | 'setTargets'> | undefined): Partial<RepTarget> | undefined {
  if (!slot) return undefined;
  if (slot.setTargets && slot.setTargets.length > 0) {
    const first = slot.setTargets.find((t) => !t.failure);
    return first ? { low: first.repsLow, high: first.repsHigh, rir: first.rir } : undefined;
  }
  const text = slot.reps.toLowerCase();
  if (/\d+\s*(s|sec|seconden|seconds)\b/.test(text)) return undefined;
  const range = text.match(/(\d+)\s*(?:-|\u2013|tot|to)\s*(\d+)/);
  const one = text.match(/(\d+)/);
  const bounds = range ? [Number(range[1]), Number(range[2])] : one ? [Number(one[1]), Number(one[1])] : undefined;
  if (!bounds) return undefined;
  const rir = slot.rpe !== undefined ? Math.max(0, Math.min(5, 10 - slot.rpe)) : undefined;
  return { low: Math.min(...bounds), high: Math.max(...bounds), ...(rir !== undefined ? { rir } : {}) };
}

// Which work set of the training the target belongs to: the first set of the slot
// that is not to failure (the sets to failure and the back-off sets with another
// target are not measured). Without per-set targets it is the first work set.
export function targetIndexOf(slot: Pick<ExercisePrescription, 'setTargets'> | undefined): number {
  const targets = slot?.setTargets;
  if (!targets || targets.length === 0) return 0;
  const i = targets.findIndex((t) => !t.failure);
  return i < 0 ? 0 : i;
}

const middle = (t: RepTarget) => (t.low + t.high) / 2;

export interface SideCheck {
  hit: boolean;
  // Reps from the middle of the range: positive too light, negative too heavy.
  deviation: number;
}

function judge(repsAtTarget: number, target: RepTarget): SideCheck {
  return {
    hit: repsAtTarget >= target.low - REPS_ROOM - 1e-9 && repsAtTarget <= target.high + REPS_ROOM + 1e-9,
    deviation: repsAtTarget - middle(target),
  };
}

// A load against the strength of that day (kg): the reps to failure at that load
// are 30 times (strength over load minus 1), the Epley the model uses. The one
// test for what you did and for what ASCEND proposed.
export function checkProposal(strengthKg: number, loadKg: number, target: RepTarget, epleyDivisor = 30): SideCheck | undefined {
  if (!(strengthKg > 0) || !(loadKg > 0)) return undefined;
  return judge(epleyDivisor * (strengthKg / loadKg - 1) - target.rir, target);
}

// A set that was really made in Forge to a proposal, measured: its own reps plus
// RIR, the same as `checkProposal` with the strength of that set itself.
export function checkDone(set: { reps: number; rir?: number }, target: RepTarget): SideCheck | undefined {
  if (set.rir === undefined || set.reps <= 0) return undefined;
  return judge(set.reps + set.rir - target.rir, target);
}

// A proposal is "close" when it lies within this share of the load that was used.
export const NEAR_SHARE = 0.05;

export const isNear = (proposedLoadKg: number, doneLoadKg: number): boolean => doneLoadKg > 0 && Math.abs(proposedLoadKg - doneLoadKg) <= NEAR_SHARE * doneLoadKg + 1e-9;

export interface RowCheck {
  origin: CheckOrigin;
  target: RepTarget;
  // Het doel waaraan jouw kant is getoetst, alleen als dat een ander is dan `target` (zonder spotter:
  // de planning vroeg 0 over, ASCEND schreef 1 voor). Afwezig: allebei hetzelfde doel.
  didTarget?: RepTarget;
  // What you did.
  did: SideCheck;
  // The proposal of ASCEND. `measured`: what happened in Forge itself, not an estimate.
  ascend: SideCheck & { measured: boolean };
  // The proposal lay within 5% of the load you used (`isNear`). Absent: not close, or unknown.
  near?: boolean;
}

// `measured`: a training made in Forge that followed the proposal, `done` is the
// measurement itself. Otherwise the proposal is an estimate and needs its own side.
export function checkRow(origin: CheckOrigin, target: RepTarget, done: SideCheck | undefined, proposal: SideCheck | undefined, measured = false, near = false): RowCheck | undefined {
  if (!done) return undefined;
  if (measured) return { origin, target, did: done, ascend: { ...done, measured: true }, ...(near ? { near: true } : {}) };
  if (!proposal) return undefined;
  return { origin, target, did: done, ascend: { ...proposal, measured: false }, ...(near ? { near: true } : {}) };
}

// --- the totals -----------------------------------------------------------------------------

export interface Tally {
  hit: number;
  total: number;
  // Average deviation in reps, undefined without rows.
  meanDeviation?: number;
}

export interface CheckTotals {
  // MacroFactor: what you did, and ASCEND afterwards for the same rows.
  macrofactor: { did: Tally; ascend: Tally };
  // Forge: the proposals of ASCEND, measured; and the trainings made in Forge with
  // another weight than proposed, where both sides are estimates.
  forge: { ascend: Tally; other: { did: Tally; ascend: Tally } };
  // Only the rows where the proposal lay within 5% of the load used and that are an
  // estimate (MacroFactor, and Forge with another weight). A row measured in Forge
  // has no conversion to another weight, so it is not part of this.
  near: { did: Tally; ascend: Tally };
}

function tally(sides: SideCheck[]): Tally {
  const hit = sides.filter((s) => s.hit).length;
  const mean = sides.length > 0 ? sides.reduce((n, s) => n + s.deviation, 0) / sides.length : undefined;
  return { hit, total: sides.length, ...(mean !== undefined ? { meanDeviation: Math.round(mean * 10) / 10 } : {}) };
}

export function totalsOf(rows: { date: string; check?: RowCheck }[], from?: string): CheckTotals {
  const checks = rows.filter((r) => r.check && (!from || r.date >= from)).map((r) => r.check!);
  const mf = checks.filter((c) => c.origin === 'macrofactor');
  const fg = checks.filter((c) => c.origin === 'forge' && c.ascend.measured);
  const other = checks.filter((c) => c.origin === 'forge' && !c.ascend.measured);
  const near = checks.filter((c) => c.near && !c.ascend.measured);
  return {
    near: { did: tally(near.map((c) => c.did)), ascend: tally(near.map((c) => c.ascend)) },
    macrofactor: { did: tally(mf.map((c) => c.did)), ascend: tally(mf.map((c) => c.ascend)) },
    forge: { ascend: tally(fg.map((c) => c.ascend)), other: { did: tally(other.map((c) => c.did)), ascend: tally(other.map((c) => c.ascend)) } },
  };
}

export interface CheckSummary {
  // Everything there is, and the part since the start date.
  all: CheckTotals;
  since: CheckTotals;
  from: string;
}

export function summariseChecks(rows: { date: string; check?: RowCheck }[], from: string): CheckSummary {
  return { all: totalsOf(rows), since: totalsOf(rows, from), from };
}

// --- words ----------------------------------------------------------------------------------

export const percent = (t: Tally): number | undefined => (t.total > 0 ? Math.round((100 * t.hit) / t.total) : undefined);

// "eerder te zwaar" or "eerder te licht" for an average deviation of at least half a rep.
export function biasWord(t: Tally): string | undefined {
  if (t.meanDeviation === undefined || Math.abs(t.meanDeviation) < 0.5) return undefined;
  return t.meanDeviation < 0 ? 'eerder te zwaar' : 'eerder te licht';
}

// The lines of the settings: "Raak: MacroFactor 72%, ASCEND 68%" and, once there
// are trainings made in Forge, "Raak in Forge: ASCEND 70%". Undefined while
// there is nothing to say yet.
export function checkLines(totals: CheckTotals): { macrofactor?: string; forge?: string } {
  const mf = percent(totals.macrofactor.did);
  const mfAscend = percent(totals.macrofactor.ascend);
  const fg = percent(totals.forge.ascend);
  return {
    ...(mf !== undefined && mfAscend !== undefined ? { macrofactor: `Raak: MacroFactor ${mf}%, ASCEND ${mfAscend}%` } : {}),
    ...(fg !== undefined ? { forge: `Raak in Forge: ASCEND ${fg}%` } : {}),
  };
}

// The one extra line: "Dicht bij wat je deed (binnen 5%): jij 74%, ASCEND 73%, 78 keer".
// Undefined while there are no such rows.
export function nearLine(totals: CheckTotals): string | undefined {
  const did = percent(totals.near.did);
  const ascend = percent(totals.near.ascend);
  if (did === undefined || ascend === undefined) return undefined;
  const count = totals.near.did.total;
  return `Dicht bij wat je deed (binnen 5%): MacroFactor ${did}%, ASCEND ${ascend}%, ${count} keer`;
}
