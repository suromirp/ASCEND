// ASCEND: which earlier trainings a run or tocht may be compared with.
//
// A difference is only a difference when the two trainings differed in nothing
// but what you want to know. So this is mostly a list of exclusions
// (docs/onderzoek/Loopgegevens en vooruitgang.md, hoofdstuk 2): the same kind,
// outdoors, a flat steady block, the same heart rate zone, about the same
// weather, rested legs, the same source of the heart rate, and enough of them.
// What does not pass is left out, and when too little is left the answer says why
// in plain words ("niet te vergelijken") instead of guessing. The reference is the
// middle value (median), so one odd day does not weigh.
//
// It only chooses and judges the material. What a difference is worth is for
// engine/runInsight.ts. Pure: no React, no IndexedDB.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { DetailConditions } from '../models/activityDetail';
import { logSport, isIndoorLog } from './sports';
import { plannedRpeTop, EASY_RPE_TOP } from './coach';
import { zoneBpm, type HeartRateSettings } from './heartRateZones';
import { FATIGUE_THRESHOLDS, fatigueEvents, legFatigueOn, type FatigueEvent, type LegFatigueInputs } from './legFatigue';
import { isLegHeavyTemplate } from './scheduler';
import {
  LONG_RUN_EFFICIENCY_WINDOW_SEC,
  EFFICIENCY_BLOCK,
  climbsOf,
  descentsOf,
  driftOf,
  efficiencyOf,
  formOf,
  isUnavailable,
  type BlockOptions,
  type ClimbFact,
  type Unavailable,
} from './runMetrics';
import { addDays } from '../utils/dates';

export type InsightTopic = 'efficiency' | 'drift' | 'climb' | 'descent' | 'form';

export interface ComparisonContext {
  // All logs: the history to choose from.
  logs: SessionLog[];
  templates: SessionTemplate[];
  program: Program | null | undefined;
  hr: HeartRateSettings | undefined;
  // For the leg index (engine/legFatigue.ts).
  legs: LegFatigueInputs;
  // "Mijn hartslag komt van de borstband". On: the heart rate always came from
  // the same source. Off: only trainings with the same sign of a strap are
  // compared (the ground contact balance only comes from a strap or a pod).
  chestStrap: boolean;
  // Trainings you set to "Niet meetellen voor hartslag" (engine/influence.ts): they are
  // never a comparison for a later one. Everything else about them counts as before.
  excludedLogIds?: ReadonlySet<string>;
  // The leg fatigue events when the caller already has them, so a list of many
  // trainings does not work them out again for each one.
  events?: FatigueEvent[];
}

// --- the numbers of the gate (own assumptions, to be tuned on own data) ---------------------

export const WINDOW_DAYS = 42;
export const MIN_BASELINE = 3;
export const MAX_BASELINE = 5;
// Feels-like temperature: under 4 degrees apart is the same weather, 4 to 8 can
// explain a difference, over 8 is another day (one small study: about one beat
// per degree).
export const TEMP_SAME_C = 4;
export const TEMP_TOO_DIFFERENT_C = 8;
export const WIND_MEAN_KMH = 25;
export const WIND_GUST_KMH = 40;
export const RAIN_MM = 5;
export const FORM_PACE_TOLERANCE_PCT = 6;
export const PACK_TOLERANCE_KG = 2;
// Without zones of the owner's own: another heart rate than this many beats
// from the one of the subject is no same zone.
export const ZONE_FALLBACK_BPM = 10;

export type ReasonCode =
  | 'noDetail'
  | 'treadmill'
  | 'unavailableMetric'
  | 'legsTired'
  | 'windy'
  | 'rainy'
  | 'temperature'
  | 'heartRateSource'
  | 'otherKind'
  | 'noMatch'
  | 'tooFew';

export interface NotComparable {
  code: ReasonCode;
  // How many earlier trainings fell out on this, or were found (tooFew).
  count?: number;
  // Warmer (plus) or colder (minus) than the earlier ones, in degrees.
  diffC?: number;
  metric?: Unavailable;
}

export type ConditionVerdict = 'same' | 'explains-worse' | 'explains-better' | 'too-different' | 'windy' | 'rainy' | 'unknown';

export interface Comparison {
  // Newest first, at most five.
  logs: SessionLog[];
  // Why there is no comparison, or why trainings fell out; empty when enough remain.
  reasons: NotComparable[];
  // What the weather says about a difference with the logs that remain.
  verdict: ConditionVerdict;
  // At least three.
  enough: boolean;
  // The heart rate the paces are converted to (efficiency).
  referenceHr?: number;
}

// --- small helpers -------------------------------------------------------------------------------------

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// The middle of the latest few values (newest first), when there are enough.
export function baselineOf(values: number[], min = MIN_BASELINE, max = MAX_BASELINE): { median: number; n: number } | undefined {
  const used = values.filter((v) => Number.isFinite(v)).slice(0, max);
  return used.length >= min ? { median: median(used), n: used.length } : undefined;
}

const feelsLike = (c: DetailConditions | undefined): number | undefined => (c ? (c.feelsC ?? c.tempC) : undefined);

// What the weather says about a difference between this training and the
// earlier ones. Wind and heavy rain decide the pace themselves: no judgement.
export function conditionVerdict(subject: DetailConditions | undefined, baseline: (DetailConditions | undefined)[]): ConditionVerdict {
  if (!subject) return 'unknown';
  if ((subject.windKmh ?? 0) >= WIND_MEAN_KMH || (subject.gustKmh ?? 0) > WIND_GUST_KMH) return 'windy';
  if ((subject.rainMm ?? 0) >= RAIN_MM) return 'rainy';
  const own = feelsLike(subject);
  const others = baseline.map(feelsLike).filter((v): v is number => v !== undefined);
  if (own === undefined || others.length === 0) return 'unknown';
  const diff = own - median(others);
  if (Math.abs(diff) < TEMP_SAME_C) return 'same';
  if (Math.abs(diff) <= TEMP_TOO_DIFFERENT_C) return diff > 0 ? 'explains-worse' : 'explains-better';
  return 'too-different';
}

// Does this training count as an easy one (planned at most RPE 4, as aerobicTrend does)?
export function isEasyPlanned(log: SessionLog, ctx: Pick<ComparisonContext, 'templates' | 'program'>): boolean {
  const template = ctx.templates.find((t) => t.id === log.templateId);
  if (!template) return false;
  const top = plannedRpeTop(template, log.completedDate, ctx.program);
  return top !== undefined && top <= EASY_RPE_TOP;
}

const packKg = (log: SessionLog) => log.outdoorData?.backpackWeightKg ?? 0;

// Heavy legs in the two days before: a leg-heavy session, a long run, or a day
// with a lot of descent. Without rested legs you measure the legs, not the
// heart (Bontemps 2020: after downhill running the oxygen cost at the same
// speed is 4 to 7 percent higher for up to three days).
function hardLegsBefore(log: SessionLog, ctx: Pick<ComparisonContext, 'logs' | 'templates'>): boolean {
  const from = addDays(log.completedDate, -2);
  return ctx.logs.some((other) => {
    if (other.id === log.id || other.completedDate < from || other.completedDate > log.completedDate) return false;
    if (other.completedDate === log.completedDate && other.completedAt >= log.completedAt) return false;
    const template = ctx.templates.find((t) => t.id === other.templateId);
    if (template && isLegHeavyTemplate(template)) return true;
    const data = other.cardioData ?? other.outdoorData;
    if ((data?.elevationLossM ?? 0) >= 300) return true;
    return logSport(other) === 'running' && other.durationMinutes > 60;
  });
}

// --- the gate -------------------------------------------------------------------------------------------------

interface Candidate {
  log: SessionLog;
  // Feels-like of its conditions, when known.
  conditions?: DetailConditions;
}

export function windowOf(topic: InsightTopic, movingSec: number): BlockOptions {
  // A long run is read on its first 40 minutes when those were flat.
  if (topic === 'efficiency' && movingSec >= 60 * 60) return { ...EFFICIENCY_BLOCK, untilSec: LONG_RUN_EFFICIENCY_WINDOW_SEC };
  return EFFICIENCY_BLOCK;
}

function referenceHrOf(hr: HeartRateSettings | undefined, subjectBlockHr?: number): number | undefined {
  const band = zoneBpm(2, hr);
  if (band) return Math.round((band[0] + band[1]) / 2);
  return subjectBlockHr !== undefined ? Math.round(subjectBlockHr) : undefined;
}

// The metric of one training for a topic, or why there is none. Used by the gate
// for the subject and for every earlier training.
function checkMetric(log: SessionLog, topic: InsightTopic, ctx: ComparisonContext, referenceHr: number | undefined, subjectHr: number | undefined): Unavailable | undefined {
  const detail = log.detail;
  const zone = zoneBpm(2, ctx.hr);
  switch (topic) {
    case 'efficiency': {
      if (referenceHr === undefined) return 'noHeartRate';
      const r = efficiencyOf(detail, referenceHr, zone, windowOf(topic, detail?.movingSec ?? 0));
      if (isUnavailable(r)) return r.unavailable;
      // Without zones of his own: the same heart rate as the subject.
      if (!zone && subjectHr !== undefined && Math.abs(r.blockHeartRate - subjectHr) > ZONE_FALLBACK_BPM) return 'outsideZone';
      return undefined;
    }
    case 'drift': {
      const r = driftOf(detail);
      return isUnavailable(r) ? r.unavailable : undefined;
    }
    case 'form': {
      const r = formOf(detail);
      return isUnavailable(r) ? r.unavailable : undefined;
    }
    case 'climb': {
      const r = climbsOf(detail);
      if (isUnavailable(r)) return r.unavailable;
      return r.length === 0 ? 'noStretch' : undefined;
    }
    case 'descent': {
      const r = descentsOf(detail);
      if (isUnavailable(r)) return r.unavailable;
      return r.length === 0 ? 'noStretch' : undefined;
    }
  }
}

function sportsOf(topic: InsightTopic): (ReturnType<typeof logSport>)[] {
  return topic === 'climb' || topic === 'descent' ? ['hiking', 'running'] : ['running'];
}

function climbClasses(log: SessionLog): Set<number> {
  const r = climbsOf(log.detail);
  return new Set(isUnavailable(r) ? [] : r.map((c: ClimbFact) => c.gradeFrom));
}

export function comparableLogs(subject: SessionLog, topic: InsightTopic, ctx: ComparisonContext): Comparison {
  const none = (reason: NotComparable): Comparison => ({ logs: [], reasons: [reason], verdict: 'unknown', enough: false });
  if (!subject.detail) return none({ code: 'noDetail' });
  if (isIndoorLog(subject)) return none({ code: 'treadmill' });
  if (!sportsOf(topic).includes(logSport(subject))) return none({ code: 'otherKind' });

  // The subject itself: a steady block, zone, stretches, form.
  const subjectBlock = topic === 'efficiency' ? efficiencyOf(subject.detail, 1, undefined, windowOf(topic, subject.detail.movingSec)) : undefined;
  const subjectHr = subjectBlock && !isUnavailable(subjectBlock) ? subjectBlock.blockHeartRate : undefined;
  const referenceHr = referenceHrOf(ctx.hr, subjectHr);
  const own = checkMetric(subject, topic, ctx, referenceHr, subjectHr);
  if (own) return { ...none({ code: 'unavailableMetric', metric: own }), referenceHr };

  // Wind and heavy rain: no judgement about pace.
  const own0 = conditionVerdict(subject.detail.conditions, []);
  if (own0 === 'windy' || own0 === 'rainy') return { ...none({ code: own0 }), verdict: own0, referenceHr };

  // Rested legs, for the subject and every earlier one.
  const events = ctx.events ?? fatigueEvents(ctx.legs);
  const rested = (log: SessionLog) => {
    if (hardLegsBefore(log, ctx)) return false;
    const r = legFatigueOn(log.completedDate, ctx.legs, events);
    return r.index <= FATIGUE_THRESHOLDS.test.fresh && !r.painRecent;
  };
  if (!rested(subject)) return { ...none({ code: 'legsTired' }), referenceHr };

  const subjectClasses = topic === 'climb' || topic === 'descent' ? climbClassesOf(subject, topic) : undefined;
  const subjectPace = topic === 'form' ? paceOf(subject) : undefined;
  const from = addDays(subject.completedDate, -WINDOW_DAYS);
  const dropped = new Map<ReasonCode, { n: number; diffs: number[]; metric?: Unavailable }>();
  const drop = (code: ReasonCode, diff?: number, metric?: Unavailable) => {
    const cur = dropped.get(code) ?? { n: 0, diffs: [] as number[], metric };
    cur.n += 1;
    if (diff !== undefined) cur.diffs.push(diff);
    dropped.set(code, cur);
  };

  const pool = ctx.logs
    .filter((l) => l.id !== subject.id && !ctx.excludedLogIds?.has(l.id) && l.completedDate >= from && l.completedDate <= subject.completedDate && l.completedAt < subject.completedAt && sportsOf(topic).includes(logSport(l)))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  const kept: Candidate[] = [];
  const ownFeels = feelsLike(subject.detail.conditions);
  for (const log of pool) {
    if (!log.detail) {
      drop('noDetail');
      continue;
    }
    if (isIndoorLog(log)) {
      drop('treadmill');
      continue;
    }
    if (topic !== 'climb' && topic !== 'descent' && !isEasyPlanned(log, ctx)) {
      drop('otherKind');
      continue;
    }
    // Drift only against long runs, form against runs of about the same pace.
    const bad = checkMetric(log, topic, ctx, referenceHr, subjectHr);
    if (bad) {
      drop('unavailableMetric', undefined, bad);
      continue;
    }
    if (!ctx.chestStrap && !!log.detail.quality.chestStrapSeen !== !!subject.detail.quality.chestStrapSeen) {
      drop('heartRateSource');
      continue;
    }
    if (subjectClasses && !matchesTerrain(log, subject, topic, subjectClasses)) {
      drop('noMatch');
      continue;
    }
    if (subjectPace !== undefined) {
      const p = paceOf(log);
      if (p === undefined || (Math.abs(p - subjectPace) / subjectPace) * 100 > FORM_PACE_TOLERANCE_PCT) {
        drop('noMatch');
        continue;
      }
    }
    const theirFeels = feelsLike(log.detail.conditions);
    if (ownFeels !== undefined && theirFeels !== undefined && Math.abs(ownFeels - theirFeels) > TEMP_TOO_DIFFERENT_C) {
      drop('temperature', ownFeels - theirFeels);
      continue;
    }
    if (!rested(log)) {
      drop('legsTired');
      continue;
    }
    kept.push({ log, conditions: log.detail.conditions });
  }

  const chosen = kept.slice(0, MAX_BASELINE);
  const enough = chosen.length >= MIN_BASELINE;
  const verdict = conditionVerdict(subject.detail.conditions, chosen.map((c) => c.conditions));
  const reasons: NotComparable[] = [];
  if (!enough) {
    for (const [code, v] of [...dropped.entries()].sort((a, b) => b[1].n - a[1].n)) {
      reasons.push({
        code,
        count: v.n,
        ...(v.diffs.length > 0 ? { diffC: Math.round(median(v.diffs)) } : {}),
        ...(v.metric ? { metric: v.metric } : {}),
      });
    }
    reasons.push({ code: 'tooFew', count: chosen.length });
  }
  return { logs: chosen.map((c) => c.log), reasons, verdict, enough, referenceHr };
}

// The pace of a whole training, seconds per kilometre.
function paceOf(log: SessionLog): number | undefined {
  const d = log.detail;
  if (!d) return undefined;
  const dist = d.slices.reduce((n, s) => n + s.distanceM, 0);
  return dist > 0 ? (d.movingSec / dist) * 1000 : undefined;
}

function climbClassesOf(log: SessionLog, topic: InsightTopic): Set<number> {
  if (topic === 'climb') return climbClasses(log);
  const r = descentsOf(log.detail);
  return new Set(isUnavailable(r) ? [] : r.map((d) => Math.floor(d.gradientPct / 4) * 4));
}

// A climb or descent of the same gradient class (four percent wide) and about
// the same pack (plus or minus 2 kg), because the cost per vertical metre
// depends on both (Minetti 2002).
function matchesTerrain(log: SessionLog, subject: SessionLog, topic: InsightTopic, subjectClasses: Set<number>): boolean {
  if (Math.abs(packKg(log) - packKg(subject)) > PACK_TOLERANCE_KG) return false;
  const theirs = climbClassesOf(log, topic);
  return [...subjectClasses].some((c) => theirs.has(c));
}
