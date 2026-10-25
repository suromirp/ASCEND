// ASCEND — "Je stand": the numbers behind the Stand screen, each in its own
// section so one view can change without touching the others.
//
// - Weekly load: minutes × effort (session-RPE, Foster e.a. 2001), per sport,
//   done and still planned, against the four weeks before.
// - Freshness: the leg fatigue index (engine/legFatigue.ts) day by day, from
//   last week to two weeks ahead, with what is planned on each day.
// - Leg calendar: what each day's training leaves in your legs.
// - Intensity: how the minutes of your endurance sessions split into easy, middle and
//   hard, by heart rate where the log has a profile, else by intention (session-goal
//   method, Seiler & Kjerland 2006; about 80% easy, Seiler 2010).
// - Descent: metres down per week; the GR5 day asks a lot of it.
// - GR5 day: a typical route day next to your best of the last eight weeks.
//
// Pure: no React, no IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { GoalRequirement } from '../models/goals';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';
import { fatigueEvents, legFatigueOn, sessionImpulse, PLANNED_RPE, PLANNED_STRENGTH_RPE, type LegFatigueInputs } from './legFatigue';
import { resolveEffectiveStressProfile } from './stressProfile';
import { logSport, templateSport } from './sports';
import { zoneBpm, type HeartRateSettings } from './heartRateZones';
import { minutesByZone } from './intensityMinutes';
import type { IntensityCounting } from './intensitySettings';
import { estimatedHikingMinutes, typicalDayValue } from './goalRoute';

// --- weekly load (session-RPE) ---------------------------------------------------
export type LoadSport = 'lopen' | 'kracht' | 'wandelen' | 'overig';
export const LOAD_SPORTS: LoadSport[] = ['lopen', 'kracht', 'wandelen', 'overig'];

// One training as it counts: minutes times effort.
export interface LoadItem {
  date: string;
  name: string;
  sport: LoadSport;
  minutes: number;
  effort: number;
  load: number;
  planned: boolean; // still to come
  estimated: boolean; // done, but no effort filled in: the planned effort
}

export interface WeekLoad {
  weekStart: string;
  items: LoadItem[];
  done: Record<LoadSport, number>;
  planned: Record<LoadSport, number>; // still to come (this week from today, later weeks whole)
  doneTotal: number;
  plannedTotal: number;
  estimated: number; // part of done that had no logged effort (estimated from the plan)
  isRestWeek: boolean;
  isCurrent: boolean;
}

export interface LoadInputs {
  logs: SessionLog[];
  plannedSessions: PlannedSession[];
  templates: SessionTemplate[];
  today: string;
  minutesOf?: (session: PlannedSession, template: SessionTemplate) => number;
  isRestWeek?: (monday: string) => boolean;
}

const zero = (): Record<LoadSport, number> => ({ lopen: 0, kracht: 0, wandelen: 0, overig: 0 });

// The effort a training is planned at, on the same 1 to 10 scale you log.
export function plannedEffort(template: SessionTemplate): number {
  if (template.type === 'strength') return PLANNED_STRENGTH_RPE;
  return PLANNED_RPE[resolveEffectiveStressProfile(template).intensity] ?? 4;
}

function sportOfTemplate(t: SessionTemplate | undefined): LoadSport {
  if (!t) return 'overig';
  if (t.type === 'strength') return 'kracht';
  const s = templateSport(t);
  return s === 'running' ? 'lopen' : s === 'hiking' ? 'wandelen' : 'overig';
}

function sportOfLog(l: SessionLog, t: SessionTemplate | undefined): LoadSport {
  if (l.type === 'strength') return 'kracht';
  const s = logSport(l);
  if (s === 'running') return 'lopen';
  if (s === 'hiking') return 'wandelen';
  return s ? 'overig' : sportOfTemplate(t);
}

export function weeklyLoad(inputs: LoadInputs, weeksBack = 6, weeksAhead = 1): WeekLoad[] {
  const byId = new Map(inputs.templates.map((t) => [t.id, t]));
  const current = mondayOfWeek(inputs.today);
  const logged = new Set(inputs.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const weeks: WeekLoad[] = [];
  for (let w = -weeksBack; w <= weeksAhead; w++) {
    const weekStart = addDays(current, 7 * w);
    const weekEnd = addDays(weekStart, 7);
    const week: WeekLoad = { weekStart, items: [], done: zero(), planned: zero(), doneTotal: 0, plannedTotal: 0, estimated: 0, isRestWeek: inputs.isRestWeek?.(weekStart) ?? false, isCurrent: w === 0 };
    for (const l of inputs.logs) {
      if (l.completedDate < weekStart || l.completedDate >= weekEnd || l.type === 'recovery') continue;
      const t = byId.get(l.templateId);
      const rpe = l.rpe ?? (t ? plannedEffort(t) : 4);
      const load = l.durationMinutes * rpe;
      week.items.push({ date: l.completedDate, name: t?.name ?? 'Training', sport: sportOfLog(l, t), minutes: l.durationMinutes, effort: rpe, load, planned: false, estimated: l.rpe === undefined });
      week.done[sportOfLog(l, t)] += load;
      week.doneTotal += load;
      if (l.rpe === undefined) week.estimated += load;
    }
    for (const s of inputs.plannedSessions) {
      if (s.scheduledDate < weekStart || s.scheduledDate >= weekEnd || s.scheduledDate < inputs.today) continue;
      if (s.status === 'skipped' || logged.has(s.id)) continue;
      const t = byId.get(s.templateId);
      if (!t || t.type === 'recovery') continue;
      const minutes = s.plannedMinutes ?? inputs.minutesOf?.(s, t) ?? t.durationVariants.full;
      const load = minutes * plannedEffort(t);
      week.items.push({ date: s.scheduledDate, name: t.name, sport: sportOfTemplate(t), minutes, effort: plannedEffort(t), load, planned: true, estimated: false });
      week.planned[sportOfTemplate(t)] += load;
      week.plannedTotal += load;
    }
    week.items.sort((a, b) => a.date.localeCompare(b.date));
    weeks.push(week);
  }
  return weeks;
}

// This week (done plus still planned) against the average of the four
// weeks before. A sudden jump goes with more injuries (Gabbett 2016), though
// a fixed ratio predicts little on its own (Impellizzeri e.a. 2020): a hint
// to look, not a rule. Undefined with fewer than three earlier weeks of data.
// doneRatio: only what is already done, so a jump that is still just the
// plan can be told apart from one you already made.
export const LOAD_JUMP = 1.3;
export function loadVersusBefore(weeks: WeekLoad[]): { ratio: number; doneRatio: number; before: number; now: number } | undefined {
  const i = weeks.findIndex((w) => w.isCurrent);
  if (i < 0) return undefined;
  const before = weeks.slice(Math.max(0, i - 4), i).filter((w) => w.doneTotal > 0);
  if (before.length < 3) return undefined;
  const avg = before.reduce((n, w) => n + w.doneTotal, 0) / before.length;
  const now = weeks[i].doneTotal + weeks[i].plannedTotal;
  return { ratio: now / avg, doneRatio: weeks[i].doneTotal / avg, before: avg, now };
}

// --- freshness curve -------------------------------------------------------------
export type DayMark = 'test' | 'race' | 'hard' | 'legs' | 'easy';
export interface FreshnessPoint {
  date: string;
  index: number;
  sessions: { id: string; name: string; mark: DayMark; logged: boolean }[];
}

// A hard day on the calendar; the intensity mix below counts tempo as middle.
const HARD_TEMPLATES = new Set(['tpl_hill_intervals', 'tpl_hills_descent', 'tpl_intervals', 'tpl_tempo_run']);
// Above the second threshold: repeats, the test and the race.
const HARD_INTENSITY = new Set(['tpl_hill_intervals', 'tpl_intervals', 'tpl_test_run', 'tpl_race']);

function markOf(t: SessionTemplate): DayMark {
  if (t.id === 'tpl_test_run') return 'test';
  if (t.id === 'tpl_race') return 'race';
  const p = resolveEffectiveStressProfile(t);
  if (t.type === 'strength') return p.lowerBodyLoad === 'heavy' || p.lowerBodyLoad === 'moderate' ? 'legs' : 'easy';
  if (HARD_TEMPLATES.has(t.id) || p.intensity === 'high') return 'hard';
  if (p.lowerBodyLoad === 'heavy' || p.eccentricLoad === 'heavy' || p.lowerBodyLoad === 'moderate') return 'legs';
  return 'easy';
}

export function freshnessCurve(inputs: LegFatigueInputs, daysBack = 6, daysAhead = 14): FreshnessPoint[] {
  const events = fatigueEvents(inputs);
  const byId = new Map(inputs.templates.map((t) => [t.id, t]));
  const points: FreshnessPoint[] = [];
  for (let d = -daysBack; d <= daysAhead; d++) {
    const date = addDays(inputs.today, d);
    const sessions = events
      .filter((e) => e.date === date)
      .flatMap((e) => {
        const t = byId.get(e.templateId);
        return t && t.type !== 'recovery' ? [{ id: e.id, name: t.name, mark: markOf(t), logged: e.logged }] : [];
      });
    points.push({ date, index: legFatigueOn(date, inputs, events).index, sessions });
  }
  return points;
}

// --- leg calendar ----------------------------------------------------------------
export interface LegDay {
  date: string;
  points: number; // what that day's training puts into your legs, before it fades
  level: 0 | 1 | 2 | 3 | 4;
  names: string[];
  planned: boolean; // only planned, nothing logged yet
}

// Light: an easy run or upper body. Middle: a long run, a hill session.
// Heavy: heavy leg strength, a hilly hike. Very heavy: a long mountain day.
export const LEG_LEVELS = [1, 8, 18, 30];

export function legCalendar(inputs: LegFatigueInputs, weeksBack = 3, weeksAhead = 1): LegDay[] {
  const events = fatigueEvents(inputs);
  const byId = new Map(inputs.templates.map((t) => [t.id, t]));
  const start = addDays(mondayOfWeek(inputs.today), -7 * weeksBack);
  const days: LegDay[] = [];
  for (let d = 0; d < 7 * (weeksBack + weeksAhead + 1); d++) {
    const date = addDays(start, d);
    let points = 0;
    const names: string[] = [];
    let anyLogged = false;
    for (const e of events) {
      if (e.date !== date) continue;
      const t = byId.get(e.templateId);
      if (!t || t.type === 'recovery') continue;
      const imp = sessionImpulse(e, t, events, byId, inputs.bodyKg);
      points += imp.intensity + imp.strength + imp.damage;
      names.push(t.name);
      if (e.logged) anyLogged = true;
    }
    const level = (LEG_LEVELS.filter((l) => points >= l).length) as LegDay['level'];
    days.push({ date, points: Math.round(points * 10) / 10, level, names, planned: names.length > 0 && !anyLogged });
  }
  return days;
}

// --- intensity mix -----------------------------------------------------------------
export interface IntensityMix {
  // How many trainings fall in each group by what they were meant to be.
  sessions: { easy: number; middle: number; hard: number };
  // The minutes in each group: by heart rate where the log has a profile, else by intention.
  minutes: { easy: number; middle: number; hard: number };
  totalMinutes: number;
  // How many trainings were counted by heart rate and how many by plan.
  measuredSessions: number;
  plannedSessions: number;
  easyShare: number; // of minutes, 0 to 1
  easyTooHard: { date: string; name: string; why: 'hartslag' | 'zwaarte' }[];
  // Number of trainings counted.
  total: number;
}

// About 80% of endurance training easy is what well-trained endurance athletes
// end up doing (Seiler 2010); below 70% the easy part is getting squeezed.
export const EASY_TARGET = 0.8;
export const EASY_FLOOR = 0.7;

// An easy run counts as too hard when clearly more than half of it was above zone 2.
const TOO_HARD_SHARE = 0.55;

export function intensityMix(logs: SessionLog[], templates: SessionTemplate[], today: string, hr?: HeartRateSettings, days = 28, counting: IntensityCounting = 'heartrate'): IntensityMix {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const since = addDays(today, -days);
  const mix: IntensityMix = { sessions: { easy: 0, middle: 0, hard: 0 }, minutes: { easy: 0, middle: 0, hard: 0 }, totalMinutes: 0, measuredSessions: 0, plannedSessions: 0, easyShare: 0, easyTooHard: [], total: 0 };
  const easyTop = zoneBpm(2, hr)?.[1];
  for (const l of logs) {
    if (l.completedDate < since || l.completedDate > today) continue;
    if (l.type === 'strength' || l.type === 'recovery') continue;
    const t = byId.get(l.templateId);
    const goal = t ? resolveEffectiveStressProfile(t).intensity : 'low';
    const kind = goal === 'high' || (t && HARD_INTENSITY.has(t.id)) ? 'hard' : goal === 'moderate' ? 'middle' : 'easy';
    mix.sessions[kind]++;
    mix.total++;
    const measured = counting === 'heartrate' ? minutesByZone(l, hr) : undefined;
    const name = t?.name ?? 'Training';
    if (measured) {
      mix.measuredSessions++;
      mix.minutes.easy += measured.easy;
      mix.minutes.middle += measured.middle;
      mix.minutes.hard += measured.hard;
    } else {
      mix.plannedSessions++;
      mix.minutes[kind] += l.durationMinutes;
    }
    if (kind === 'easy') {
      const avg = l.cardioData?.avgHeartRate;
      if (measured) {
        const above = (measured.middle + measured.hard) / Math.max(1, l.durationMinutes);
        if (above > TOO_HARD_SHARE) mix.easyTooHard.push({ date: l.completedDate, name, why: 'hartslag' });
        else if ((l.rpe ?? 0) >= 7) mix.easyTooHard.push({ date: l.completedDate, name, why: 'zwaarte' });
      } else if (easyTop && avg && avg > easyTop) mix.easyTooHard.push({ date: l.completedDate, name, why: 'hartslag' });
      else if ((l.rpe ?? 0) >= 7) mix.easyTooHard.push({ date: l.completedDate, name, why: 'zwaarte' });
    }
  }
  mix.minutes = { easy: Math.round(mix.minutes.easy), middle: Math.round(mix.minutes.middle), hard: Math.round(mix.minutes.hard) };
  mix.totalMinutes = mix.minutes.easy + mix.minutes.middle + mix.minutes.hard;
  mix.easyShare = mix.totalMinutes ? mix.minutes.easy / mix.totalMinutes : 0;
  return mix;
}

// --- descent per week ------------------------------------------------------------
export interface WeekDescent { weekStart: string; metres: number; biggestDay: number }

// Metres down from what you logged; a loop without a logged descent comes
// down as far as it went up. Treadmill climbing is no descent.
export function descentOf(l: SessionLog): number {
  const o = l.outdoorData;
  if (o?.elevationLossM !== undefined) return o.elevationLossM;
  const d = o ?? l.cardioData;
  if (!d || d.estimatedElevation || d.environment === 'treadmill') return 0;
  return d.elevationGainM ?? 0;
}

export function weeklyDescent(logs: SessionLog[], today: string, weeks = 8): WeekDescent[] {
  const current = mondayOfWeek(today);
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(current, -7 * (weeks - 1 - i));
    const end = addDays(weekStart, 7);
    const perDay = new Map<string, number>();
    for (const l of logs) {
      if (l.completedDate < weekStart || l.completedDate >= end) continue;
      const m = descentOf(l);
      if (m > 0) perDay.set(l.completedDate, (perDay.get(l.completedDate) ?? 0) + m);
    }
    const values = [...perDay.values()];
    return { weekStart, metres: Math.round(values.reduce((a, b) => a + b, 0)), biggestDay: Math.round(Math.max(0, ...values)) };
  });
}

// --- a GR5 day next to your best -------------------------------------------------
export interface RouteDayRow {
  key: 'tijd' | 'stijgen' | 'dalen' | 'rugzak' | 'dagen';
  need: number;
  best: number;
  bestDate?: string;
}

const WINDOW_DAYS = 56;

export function routeDayRows(requirements: GoalRequirement[], logs: SessionLog[], today: string): RouteDayRow[] {
  const since = addDays(today, -WINDOW_DAYS);
  const recent = logs.filter((l) => l.completedDate >= since && l.completedDate <= today && l.type !== 'strength' && l.type !== 'recovery');
  const onFoot = recent.filter((l) => logSport(l) === 'hiking' || l.type === 'hiking' || l.type === 'adventure');
  const best = (list: SessionLog[], value: (l: SessionLog) => number) => {
    let top: SessionLog | undefined;
    for (const l of list) if (!top || value(l) > value(top)) top = l;
    return top && value(top) > 0 ? { best: value(top), bestDate: top.completedDate } : { best: 0 };
  };
  const gain = (l: SessionLog) => {
    const d = l.outdoorData ?? l.cardioData;
    return d && !d.estimatedElevation ? d.elevationGainM ?? 0 : 0;
  };
  const rows: RouteDayRow[] = [];
  const dist = typicalDayValue(requirements, 'distance')?.value;
  const up = typicalDayValue(requirements, 'elevationGain')?.value;
  const down = typicalDayValue(requirements, 'elevationLoss')?.value;
  if (dist?.unit === 'km') rows.push({ key: 'tijd', need: estimatedHikingMinutes(dist.amount, up?.amount, down?.amount), ...best(onFoot, (l) => l.durationMinutes) });
  if (up) rows.push({ key: 'stijgen', need: up.amount, ...best(recent, gain) });
  if (down) rows.push({ key: 'dalen', need: down.amount, ...best(recent, descentOf) });
  const pack = requirements.find((r) => r.kind === 'packWeight')?.target?.amount;
  if (pack) rows.push({ key: 'rugzak', need: pack, ...best(onFoot, (l) => l.outdoorData?.backpackWeightKg ?? 0) });
  const consecutive = requirements.find((r) => r.kind === 'consecutiveDays')?.target?.amount;
  if (consecutive) rows.push({ key: 'dagen', need: consecutive, best: longestRun(onFoot.filter((l) => l.durationMinutes >= 90).map((l) => l.completedDate)) });
  return rows;
}

// The most days in a row with a long walk.
function longestRun(dates: string[]): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  sorted.forEach((d, i) => {
    run = i > 0 && daysBetween(sorted[i - 1], d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}
