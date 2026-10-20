// ASCEND — de beenvermoeidheid-index: how fresh your legs are on a given
// day, from what is left of each recent session. Replaces fixed day gaps
// around a test run or race (production feedback: "2 dagen is iets te hard,
// het hangt af van de situatie"). From docs/onderzoek/Spierbelasting en
// beenvermoeidheid.md, "Voorstel voor de index"; every number below is the
// report's own calibration against published recovery times (derived), the
// index as a whole was never tested in a study.
//
// Three buckets, each with its own pace (whole days between the session and
// the day looked at; a session on that day itself does not count):
// - intensity (metabolic, central): halves every 12 hours;
// - strength and impact (neuromuscular): halves every 24 hours;
// - muscle damage (eccentric): stays the first day, then halves every 36 hours.
//
// Pure: no React, no IndexedDB.

import { significantPain } from './pain';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { daysBetween, addDays } from '../utils/dates';
import { resolveEffectiveStressProfile } from './stressProfile';
import { templateSport } from './sports';

type Level = 'none' | 'light' | 'moderate' | 'heavy';

// --- the pace of each bucket -------------------------------------------------
export function intensityLeft(days: number): number {
  return days < 1 ? 0 : 2 ** (-(days * 24) / 12);
}
export function strengthLeft(days: number): number {
  return days < 1 ? 0 : 2 ** (-(days * 24) / 24);
}
export function damageLeft(days: number): number {
  return days < 1 ? 0 : 2 ** (-((days - 1) * 24) / 36);
}

// --- points per hour -----------------------------------------------------------
const INTENSITY_PER_HOUR: Record<string, number> = { low: 2, moderate: 8, high: 24 };
const STRENGTH_INTENSITY_PER_HOUR = 5;
const LOWER_BODY_PER_HOUR: Record<Level, number> = { none: 0, light: 3, moderate: 6, heavy: 10 };
const IMPACT_PER_HOUR: Record<Level, number> = { none: 0, light: 1, moderate: 2, heavy: 4 };
const ECCENTRIC_PER_HOUR: Record<Level, number> = { none: 0, light: 4, moderate: 12, heavy: 24 };
const CLIMB_PER_1000 = 4;
const DESCENT_PER_1000 = 24;
const RUNNING_DESCENT = 1.5;
// Planned effort when nothing is logged yet.
const PLANNED_RPE: Record<string, number> = { low: 4, moderate: 6, high: 8 };
const PLANNED_STRENGTH_RPE = 8;
// Descent without a log or a target of its own (hills walked back down;
// the up-and-down session run down).
const DEFAULT_DESCENT_M: Record<string, number> = { tpl_hill_intervals: 150, tpl_hills_descent: 200 };
// The hill repeats are walked down; everything else of a run is run.
const WALKED_DOWN = new Set(['tpl_hill_intervals']);
const DEFAULT_BODY_KG = 80;

// Sets near failure work on much longer than sets with reps in reserve
// (Morán-Navarro e.a. 2017).
// Anchors 6: 0.7, 7: 0.85, 8: 1.0, 9: 1.3, 10: 1.5, straight lines between
// them, so one point of RPE never makes the index jump (docs/onderzoek/
// Betrouwbaarheid beenvermoeidheid-index.md, aanbeveling 3).
const EFFORT_ANCHORS: [number, number][] = [[6, 0.7], [7, 0.85], [8, 1], [9, 1.3], [10, 1.5]];
function effortFactor(rpe: number): number {
  if (rpe <= 6) return 0.7;
  if (rpe >= 10) return 1.5;
  const i = EFFORT_ANCHORS.findIndex(([r]) => r > rpe);
  const [r0, f0] = EFFORT_ANCHORS[i - 1];
  const [r1, f1] = EFFORT_ANCHORS[i];
  return f0 + ((rpe - r0) / (r1 - r0)) * (f1 - f0);
}

// Minutes of strength that count: long breaks don't make a session heavier
// (95 minutes is not 27% more than 75; same report, aanbeveling 2).
const MAX_STRENGTH_MINUTES = 75;
// Descent counts towards adaptation gradually from 50 to 150 m, instead of
// a hard line at 100 m (aanbeveling 3).
const DESCENT_ADAPT_FROM = 50;
const DESCENT_ADAPT_FULL = 150;

// Bounded, so one odd log can't dominate.
function rpeFactor(logged: number | undefined, planned: number): number {
  if (!logged) return 1;
  return Math.min(1.5, Math.max(0.75, logged / planned));
}

// --- thresholds ------------------------------------------------------------------
export type FatiguePurpose = 'test' | 'race' | 'hard';
export const FATIGUE_THRESHOLDS: Record<FatiguePurpose, { fresh: number; doubt: number }> = {
  test: { fresh: 8, doubt: 10 },
  race: { fresh: 3, doubt: 5 },
  hard: { fresh: 12, doubt: 12 },
};
export type FatigueStatus = 'fris' | 'twijfel' | 'niet fris';

// Areas of the legs: pain there counts for the legs.
const LEG_AREAS = ['Knie', 'Scheen', 'Kuit', 'Achillespees', 'Enkel', 'Voet', 'Heup', 'Heup of lies', 'Hamstring', 'Quadriceps', 'Bovenbeen'];
const PAIN_POINTS = 3;

// --- inputs ----------------------------------------------------------------------
export interface FatigueSoreness {
  date: string; // the morning it was reported
  level: 'stijf' | 'spierpijn' | 'flink';
}

export interface LegFatigueInputs {
  logs: SessionLog[];
  // Planned sessions that still lie ahead (or today, unlogged): counted as
  // they are planned. Planned sessions in the past without a log did not happen.
  plannedSessions: PlannedSession[];
  templates: SessionTemplate[];
  today: string;
  bodyKg?: number;
  // Planned minutes for a session that has no plannedMinutes of its own.
  minutesOf?: (session: PlannedSession, template: SessionTemplate) => number;
  // Morning reports of muscle soreness (pain research: a floor, never lower).
  soreness?: FatigueSoreness[];
}

export interface FatigueEvent {
  id: string;
  templateId: string;
  date: string;
  minutes: number;
  rpe?: number;
  feel?: SessionLog['subjectiveFeel'];
  descentM?: number;
  climbM?: number;
  packKg?: number;
  logged: boolean;
}

export interface FatigueContribution {
  id: string;
  templateId: string;
  name: string;
  date: string;
  points: number;
  intensity: number;
  strength: number;
  damage: number;
  logged: boolean;
}

export interface LegFatigueResult {
  date: string;
  index: number;
  contributions: FatigueContribution[]; // largest first, only what still counts
  painRecent: boolean;
  sorenessFloor?: number;
}

// --- the events: what happened and what is still planned ------------------------
export function fatigueEvents(inputs: Pick<LegFatigueInputs, 'logs' | 'plannedSessions' | 'templates' | 'today' | 'minutesOf'>): FatigueEvent[] {
  const byId = new Map(inputs.templates.map((t) => [t.id, t]));
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const ownElevation = recentElevation(inputs.logs);
  const events: FatigueEvent[] = inputs.logs.map((l) => {
    const d = l.outdoorData ?? l.cardioData;
    return {
      id: l.id, templateId: l.templateId, date: l.completedDate, minutes: l.durationMinutes, rpe: l.rpe, feel: l.subjectiveFeel,
      descentM: l.outdoorData?.elevationLossM ?? d?.elevationGainM, climbM: d?.elevationGainM, packKg: l.outdoorData?.backpackWeightKg, logged: true,
    };
  });
  for (const s of inputs.plannedSessions) {
    if (s.status === 'skipped' || loggedIds.has(s.id) || s.scheduledDate < inputs.today) continue;
    const t = byId.get(s.templateId);
    if (!t || t.type === 'recovery') continue;
    const minutes = s.plannedMinutes ?? inputs.minutesOf?.(s, t) ?? t.durationVariants.full;
    // Your own recent climbing for this training when there is some (a long
    // run in flat country has far less than its 300 m target), else the target.
    const own = ownElevation.get(t.id);
    const target = own ?? t.outdoorTarget?.targetElevationM ?? DEFAULT_DESCENT_M[t.id];
    events.push({ id: s.id, templateId: s.templateId, date: s.scheduledDate, minutes, descentM: target, climbM: target, packKg: t.outdoorTarget?.backpackWeightKg, logged: false });
  }
  return events;
}

// The average logged descent (or climb) per training over its last 4 logs
// with elevation data.
function recentElevation(logs: SessionLog[]): Map<string, number> {
  const per = new Map<string, number[]>();
  for (const l of [...logs].sort((a, b) => b.completedDate.localeCompare(a.completedDate))) {
    const m = l.outdoorData?.elevationLossM ?? l.outdoorData?.elevationGainM ?? l.cardioData?.elevationGainM;
    if (m === undefined) continue;
    const list = per.get(l.templateId) ?? [];
    if (list.length < 4) per.set(l.templateId, [...list, m]);
  }
  return new Map([...per].map(([id, list]) => [id, list.reduce((a, b) => a + b, 0) / list.length]));
}

// --- adaptation: the repeated bout effect, damage bucket only --------------------
type AdaptKind = 'strength' | 'descent';

function adaptKind(t: SessionTemplate, e: FatigueEvent): AdaptKind | undefined {
  const p = resolveEffectiveStressProfile(t);
  if (t.type === 'strength') return p.lowerBodyLoad !== 'none' && p.eccentricLoad !== 'none' ? 'strength' : undefined;
  return (e.descentM ?? 0) >= DESCENT_ADAPT_FROM ? 'descent' : undefined;
}

// 1.0 nothing similar in 6 weeks; 0.8 the last one 3 to 6 weeks ago; 0.75
// one in the last 3 weeks; 0.6 two or more (Maeo e.a. 2017; Doma e.a. 2017;
// Byrnes e.a. 1985). Only sessions before this one count.
export function adaptationFactor(event: FatigueEvent, kind: AdaptKind, all: FatigueEvent[], byId: Map<string, SessionTemplate>): number {
  const similar = all.filter((o) => {
    if (o.id === event.id || o.date >= event.date) return false;
    const t = byId.get(o.templateId);
    return !!t && adaptKind(t, o) === kind && daysBetween(o.date, event.date) <= 42;
  });
  const recent = similar.filter((o) => daysBetween(o.date, event.date) <= 21).length;
  if (recent >= 2) return 0.6;
  if (recent === 1) return 0.75;
  if (similar.length > 0) return 0.8;
  return 1;
}

// --- one session's impulse in the three buckets ------------------------------------
export function sessionImpulse(event: FatigueEvent, template: SessionTemplate, all: FatigueEvent[], byId: Map<string, SessionTemplate>, bodyKg = DEFAULT_BODY_KG): { intensity: number; strength: number; damage: number } {
  const p = resolveEffectiveStressProfile(template);
  const hours = Math.max(0, template.type === 'strength' ? Math.min(event.minutes, MAX_STRENGTH_MINUTES) : event.minutes) / 60;
  const kind = adaptKind(template, event);
  const fullAdapt = kind ? adaptationFactor(event, kind, all, byId) : 1;
  // For runs and walks the discount grows with the descent itself.
  const weight = template.type === 'strength' ? 1 : Math.min(1, Math.max(0, ((event.descentM ?? 0) - DESCENT_ADAPT_FROM) / (DESCENT_ADAPT_FULL - DESCENT_ADAPT_FROM)));
  const adapt = 1 - weight * (1 - fullAdapt);
  const feel = event.feel === 'worse' ? 1.25 : event.feel === 'better' ? 0.9 : 1;
  let intensity = 0;
  let strength = 0;
  let damage = 0;
  if (template.type === 'strength') {
    const rpe = event.rpe ?? PLANNED_STRENGTH_RPE;
    const effort = effortFactor(rpe);
    intensity = STRENGTH_INTENSITY_PER_HOUR * hours * rpeFactor(event.rpe, PLANNED_STRENGTH_RPE);
    strength = LOWER_BODY_PER_HOUR[p.lowerBodyLoad as Level] * hours * effort;
    damage = ECCENTRIC_PER_HOUR[p.eccentricLoad as Level] * hours * effort * adapt;
  } else if (template.type !== 'recovery') {
    const planned = PLANNED_RPE[p.intensity] ?? 4;
    const factor = rpeFactor(event.rpe, planned);
    const pack = event.packKg ? 1 + event.packKg / bodyKg : 1;
    const running = templateSport(template) === 'running' && !WALKED_DOWN.has(template.id);
    intensity = (INTENSITY_PER_HOUR[p.intensity] ?? 2) * hours * factor * pack;
    strength = (IMPACT_PER_HOUR[p.impact as Level] * hours + CLIMB_PER_1000 * (event.climbM ?? 0) / 1000) * factor * pack;
    damage = DESCENT_PER_1000 * ((event.descentM ?? 0) / 1000) * (running ? RUNNING_DESCENT : 1) * pack * adapt;
  }
  return { intensity: intensity * feel, strength: strength * feel, damage: damage * feel };
}

// --- the index on a day ------------------------------------------------------------
export function legFatigueOn(date: string, inputs: LegFatigueInputs, events = fatigueEvents(inputs)): LegFatigueResult {
  const byId = new Map(inputs.templates.map((t) => [t.id, t]));
  const contributions: FatigueContribution[] = [];
  for (const e of events) {
    const days = daysBetween(e.date, date);
    if (days < 1 || days > 10) continue;
    const t = byId.get(e.templateId);
    if (!t) continue;
    const imp = sessionImpulse(e, t, events, byId, inputs.bodyKg);
    const c = { intensity: imp.intensity * intensityLeft(days), strength: imp.strength * strengthLeft(days), damage: imp.damage * damageLeft(days) };
    const points = c.intensity + c.strength + c.damage;
    if (points < 0.05) continue;
    contributions.push({ id: e.id, templateId: e.templateId, name: t.name, date: e.date, points, ...c, logged: e.logged });
  }
  contributions.sort((a, b) => b.points - a.points);
  let index = contributions.reduce((n, c) => n + c.points, 0);

  // Pain in a leg area in the 72 hours before: a signal, not a scale.
  const since = addDays(date, -3);
  const painRecent = inputs.logs.some((l) => l.completedDate >= since && l.completedDate < date && significantPain(l).some((p) => LEG_AREAS.includes(p.area)));
  if (painRecent) index += PAIN_POINTS;

  // Reported soreness sets a floor: "spierpijn" at least the doubt level of a
  // test, "flink" above it that day and at the doubt level the day after.
  let sorenessFloor: number | undefined;
  for (const s of inputs.soreness ?? []) {
    const ago = daysBetween(s.date, date);
    if (ago === 0) sorenessFloor = Math.max(sorenessFloor ?? 0, s.level === 'flink' ? FATIGUE_THRESHOLDS.test.doubt + 2 : s.level === 'spierpijn' ? FATIGUE_THRESHOLDS.test.fresh + 0.5 : 0);
    if (ago === 1 && s.level === 'flink') sorenessFloor = Math.max(sorenessFloor ?? 0, FATIGUE_THRESHOLDS.test.fresh + 0.5);
  }
  if (sorenessFloor) index = Math.max(index, sorenessFloor);

  return { date, index: Math.round(index * 10) / 10, contributions, painRecent, sorenessFloor };
}

export function fatigueStatus(result: Pick<LegFatigueResult, 'index' | 'painRecent'>, purpose: FatiguePurpose): FatigueStatus {
  const t = FATIGUE_THRESHOLDS[purpose];
  const status: FatigueStatus = result.index <= t.fresh ? 'fris' : result.index <= t.doubt ? 'twijfel' : 'niet fris';
  // With recent leg pain, never "fris" on its own say.
  return status === 'fris' && result.painRecent ? 'twijfel' : status;
}

// A plain word for the user's own card, any day: the same scale as the test.
export function fatigueWord(index: number): { word: string; level: 0 | 1 | 2 } {
  if (index <= FATIGUE_THRESHOLDS.test.fresh) return { word: 'Fris', level: 0 };
  if (index <= FATIGUE_THRESHOLDS.hard.fresh) return { word: 'Wat vermoeid', level: 1 };
  return { word: 'Vermoeid', level: 2 };
}

// The index is an estimate: near a threshold it can as well be 2 points
// higher or lower (docs/onderzoek/Betrouwbaarheid beenvermoeidheid-index.md:
// between about 6 and 11 single inputs flip the decision). Shown as a band;
// within 2 of the threshold: "op de grens, beslis bij het inlopen".
export const FATIGUE_BAND = 2;
export function fatigueBand(index: number, purpose: FatiguePurpose): { low: number; high: number; nearLine: boolean } {
  const t = FATIGUE_THRESHOLDS[purpose].fresh;
  return { low: Math.max(0, Math.round((index - FATIGUE_BAND) * 10) / 10), high: Math.round((index + FATIGUE_BAND) * 10) / 10, nearLine: Math.abs(index - t) <= FATIGUE_BAND };
}
