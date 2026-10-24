// ASCEND: "raak". An honest measure of a proposal for a strength exercise, the
// same for every proposal, whoever made it (decision
// docs/beslissingen/2026-10-24-kracht-stil-toetsen.md). Pure.
//
// The question is not whether ASCEND chooses the same weight as MacroFactor
// (that says nothing, nobody knows whether MacroFactor is right) but whether a
// proposal is a good one for THAT day. Each exercise of each training has a
// target from the template: a rep range and the reps in reserve (RIR).
//
// - What you did (the proposal of MacroFactor that you followed): the top work
//   set is a hit when its reps are inside the range and the logged RIR is within
//   1 of the target.
// - The proposal of ASCEND, afterwards: the strength of that day itself (the work
//   sets of that training, reps plus RIR, the estimate ASCEND already uses) says
//   how many reps to failure ASCEND's weight would have given that day. A hit
//   when (reps to failure minus the RIR target) is inside the range, with 1 rep
//   of room. That is an estimate. Both proposals are held against the same day.
// - A training made in Forge itself, with a proposal of ASCEND: then what
//   happened is the measurement. No estimate, the same test as "what you did".
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

// How much room a hit has: the logged RIR within this many of the target; the
// estimated reps for ASCEND's weight within this many of the range.
export const RIR_ROOM = 1;
export const ASCEND_REPS_ROOM = 1;

// Where a strength log came from: MacroFactor (read in, or a hand-made log that
// took its numbers over) or made in Forge itself (a log by hand in the app, with
// sets). Anything else (the watch) has no reps in reserve and does not count.
export function logOrigin(log: Pick<SessionLog, 'source' | 'manualMeasured'>): CheckOrigin | undefined {
  if (log.source === 'macrofactor' || log.manualMeasured?.strength) return 'macrofactor';
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

const middle = (t: RepTarget) => (t.low + t.high) / 2;

export interface SideCheck {
  hit: boolean;
  // Reps from the middle of the range: positive too light, negative too heavy.
  deviation: number;
}

// What was done: the top work set.
export function checkDone(set: { reps: number; rir?: number }, target: RepTarget): SideCheck | undefined {
  if (set.rir === undefined || set.reps <= 0) return undefined;
  const repsAtTarget = set.reps + set.rir - target.rir;
  return {
    hit: set.reps >= target.low && set.reps <= target.high && Math.abs(set.rir - target.rir) <= RIR_ROOM,
    deviation: repsAtTarget - middle(target),
  };
}

// The proposal of ASCEND against the strength of that day: the load it proposed
// and the strength (kg) the sets of that day showed. Reps to failure at that
// load are 30 times (strength over load minus 1), the Epley the model uses.
export function checkProposal(strengthKg: number, loadKg: number, target: RepTarget, epleyDivisor = 30): SideCheck | undefined {
  if (!(strengthKg > 0) || !(loadKg > 0)) return undefined;
  const repsAtTarget = epleyDivisor * (strengthKg / loadKg - 1) - target.rir;
  return {
    hit: repsAtTarget >= target.low - ASCEND_REPS_ROOM - 1e-9 && repsAtTarget <= target.high + ASCEND_REPS_ROOM + 1e-9,
    deviation: repsAtTarget - middle(target),
  };
}

export interface RowCheck {
  origin: CheckOrigin;
  target: RepTarget;
  // What you did.
  did: SideCheck;
  // The proposal of ASCEND. `measured`: what happened in Forge itself, not an estimate.
  ascend: SideCheck & { measured: boolean };
}

export function checkRow(origin: CheckOrigin, target: RepTarget, done: SideCheck | undefined, proposal: SideCheck | undefined): RowCheck | undefined {
  if (!done) return undefined;
  if (origin === 'forge') return { origin, target, did: done, ascend: { ...done, measured: true } };
  if (!proposal) return undefined;
  return { origin, target, did: done, ascend: { ...proposal, measured: false } };
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
  // Forge: the proposals of ASCEND, measured.
  forge: { ascend: Tally };
}

function tally(sides: SideCheck[]): Tally {
  const hit = sides.filter((s) => s.hit).length;
  const mean = sides.length > 0 ? sides.reduce((n, s) => n + s.deviation, 0) / sides.length : undefined;
  return { hit, total: sides.length, ...(mean !== undefined ? { meanDeviation: Math.round(mean * 10) / 10 } : {}) };
}

export function totalsOf(rows: { date: string; check?: RowCheck }[], from?: string): CheckTotals {
  const checks = rows.filter((r) => r.check && (!from || r.date >= from)).map((r) => r.check!);
  const mf = checks.filter((c) => c.origin === 'macrofactor');
  const fg = checks.filter((c) => c.origin === 'forge');
  return {
    macrofactor: { did: tally(mf.map((c) => c.did)), ascend: tally(mf.map((c) => c.ascend)) },
    forge: { ascend: tally(fg.map((c) => c.ascend)) },
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
