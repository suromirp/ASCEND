// ASCEND — de weekcontrole. After every planning run, every week from today
// to the main goal is checked against one fixed list of rules
// (docs/onderzoek/Planning op een lijn.md, "De weekcontrole: de regels").
// The check itself only ever repairs what the system planned (level 3), and
// only when the week is demonstrably better after it: fewer findings and no
// new ones. A test or race (level 2) is never moved here: where it goes is a
// trade-off, so that is a proposal with options (rule TEST-MAKE-ROOM). For a
// fresh test the check may only shorten or move strength before it, never
// the long run, the hills or a hike. What you placed yourself (level 1) is
// your choice: reported, never changed.
//
// Pure: no React, no IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { addDays, daysBetween, isoWeekday, mondayOfWeek, weekdayOf, weekdayShortNL } from '../utils/dates';
import { conflictsOnTestDay, findHeavyConflicts, freshnessAt, isHardRun, isLegHeavyTemplate } from './scheduler';
import { patternSlotOf } from './programLayout';
import { FATIGUE_THRESHOLDS } from './legFatigue';
import { leaveDays, lightDays } from './leave';
import { templateSport } from './sports';
import { hasRole, idHasRole, idIsTestOrRace, isTestOrRace } from './templateRoles';

// --- who may touch a session ------------------------------------------------------
// 0 history: logged, or its day has passed. 1 yours: you placed or moved it,
// or an accepted proposal did (a 'moved' session from before locks existed
// counts as yours too: when in doubt, leave it). 2 an anchor: a test or the
// race. 3 the system's: free to repair.
export type LockLevel = 0 | 1 | 2 | 3;

export function lockLevel(s: PlannedSession, logged: Set<string | undefined>, today: string): LockLevel {
  if (logged.has(s.id) || s.scheduledDate < today) return 0;
  if (s.lock || s.status === 'moved') return 1;
  if (idIsTestOrRace(s.templateId)) return 2;
  return 3;
}

// --- the rules --------------------------------------------------------------------
export type CheckRule =
  | 'GOAL-DAY' // nothing on or after the main goal's day
  | 'LEAVE-OFF' // nothing on a holiday day, nothing but the walk on a trek day (engine/leave.ts)
  | 'LEAVE-LIGHT' // the day before and after a trek stays light
  | 'REST-DAY' // the rest day stays free
  | 'TWO-HARD-RUNS' // at most one hard run a day
  | 'TEST-DAY' // on a test or race day: nothing else hard, strength after it only with "Zware dingen op één dag"
  | 'AFTER-TEST' // the day after a test or race: no hard run, nothing heavy for the legs but strength
  | 'AFTER-GOAL' // the days of recovery after a goal (recoveryDaysFor of its kind): no hard training, no heavy leg strength
  | 'LEG-SPACING' // heavy days for the same muscles far enough apart
  | 'TEST-FRESH' // fresh legs for a test or race, by the leg index
  | 'ONE-LONG' // one full long session a week
  | 'DUPLICATE' // the same training twice on one day
  | 'DAY-FULL' // more on a day than the time you have for it
  | 'WEEK-START'; // a session belongs to the week of its date

export interface Finding {
  rule: CheckRule;
  date: string;
  sessionIds: string[];
  // The session the rule would move or change, with its level.
  subjectId: string;
  level: LockLevel;
  message: string;
}

export interface CheckInput {
  sessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  today: string;
  restDay?: number; // weekday 1 to 7 of the rest day
  goalDay?: string; // the main goal's day: the plan ends the day before
  raceDays?: string[];
  // The recovery after a goal that is in the plan (a race): `days` days after `date` without a hard
  // training and without heavy leg strength. The days come from the kind of the goal and its
  // distance, never from its label (data/goalKinds.ts#recoveryDaysFor).
  afterGoals?: { date: string; days: number }[];
  program?: Program | null;
  dailyTimeBudget?: Partial<Record<Weekday, DailyTimeBudget>>;
  sameDayPairingPreference?: TrainingStrategyProfile['sameDayPairingPreference'];
  // The weekday of each place in the week as it is now (database.ts
  // #patternDays): a session that has to move tries its own place first.
  slotDays?: Map<string, number>;
  // The minutes a session is planned at (as Week shows them).
  minutesOf?: (session: PlannedSession, template: SessionTemplate) => number;
  // Check only up to this day (a preview needs the weeks near, not the year).
  until?: string;
  // Periods of free days, holidays and treks (models/leave.ts).
  leave?: LeavePeriod[];
  // Rest after a tocht (Instellingen): 'soft' (default) accepts the short
  // version of a heavy leg day from 48 hours after a tocht, 'strict' keeps 72.
  trekRest?: 'soft' | 'strict';
}

const HORIZON_DAYS = 7 * 44;
const EASY_ID = 'tpl_easy_run';

function context(input: CheckInput) {
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const until = [input.goalDay ? addDays(input.goalDay, -1) : addDays(input.today, HORIZON_DAYS), input.until].filter((d): d is string => !!d).sort()[0];
  // What the rules look at: open sessions from today until the goal.
  const open = (s: PlannedSession) => s.status !== 'skipped' && !logged.has(s.id) && s.scheduledDate >= input.today;
  return { byId, logged, until, open };
}

// The leave periods as the rules read them. A walking day of a trek is a
// hiking session on a day of a trek: that is the trek itself, so the rest day,
// the time budget, the one-long-a-week rule and the spacing between its own
// days do not apply to it, and the check never moves it.
function leaveContext(input: CheckInput, byId: Map<string, SessionTemplate>) {
  const days = leaveDays(input.leave);
  const light = lightDays(input.leave, days);
  const isWalk = (s: PlannedSession) => {
    const t = byId.get(s.templateId);
    return !!t && t.type === 'hiking' && templateSport(t) === 'hiking';
  };
  const inTrek = (s: PlannedSession) => days.get(s.scheduledDate)?.kind === 'trek' && isWalk(s);
  return { days, light, inTrek };
}

// The goal whose recovery a date falls in (the latest one before it), and which day after it this is.
function afterGoal(input: CheckInput, date: string): { day: number; date: string } | undefined {
  let best: number | undefined;
  let bestDate = '';
  for (const g of input.afterGoals ?? []) {
    const d = daysBetween(g.date, date);
    if (d >= 1 && d <= g.days && (best === undefined || d < best)) { best = d; bestDate = g.date; }
  }
  return best === undefined ? undefined : { day: best, date: bestDate };
}

const day = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))}-${Number(iso.slice(5, 7))}`;

export function validateWeeks(input: CheckInput, onlyWeeks?: Set<string>): Finding[] {
  const { byId, logged, until, open } = context(input);
  const level = (s: PlannedSession) => lockLevel(s, logged, input.today);
  const leave = leaveContext(input, byId);
  const findings: Finding[] = [];
  const active = input.sessions.filter(open).filter((s) => !onlyWeeks || onlyWeeks.has(mondayOfWeek(s.scheduledDate)));
  const all = input.sessions.filter((s) => s.status !== 'skipped');
  const recentLogs = input.logs.filter((l) => daysBetween(l.completedDate, input.today) <= 56);
  // By date, so each rule looks at a few days instead of the whole plan.
  const index = (list: PlannedSession[]) => {
    const map = new Map<string, PlannedSession[]>();
    for (const s of list) map.set(s.scheduledDate, [...(map.get(s.scheduledDate) ?? []), s]);
    return map;
  };
  const allByDate = index(all);
  const openByDate = index(input.sessions.filter(open));
  const around = (date: string, days: number) => Array.from({ length: days * 2 + 1 }, (_, i) => allByDate.get(addDays(date, i - days)) ?? []).flat();
  const tpl = (s: PlannedSession) => byId.get(s.templateId);
  const minutes = (s: PlannedSession) => { const t = tpl(s); return s.plannedMinutes ?? (t ? input.minutesOf?.(s, t) ?? t.durationVariants.full : 0); };

  for (const s of active) {
    const t = tpl(s);
    if (!t) continue;
    const name = t.name;

    if (s.weekStartDate !== mondayOfWeek(s.scheduledDate)) {
      findings.push({ rule: 'WEEK-START', date: s.scheduledDate, sessionIds: [s.id], subjectId: s.id, level: level(s), message: `${name} hoort bij een andere week.` });
    }
    if (input.goalDay && s.scheduledDate >= input.goalDay) {
      findings.push({ rule: 'GOAL-DAY', date: s.scheduledDate, sessionIds: [s.id], subjectId: s.id, level: level(s), message: `${name} op of na de dag van je doel.` });
      continue;
    }
    if (s.scheduledDate > until) continue;

    // A holiday day has no training, a trek day only its walk. Reported on
    // the session that has to go; what you locked yourself stays and is
    // reported only.
    const leaveDay = leave.days.get(s.scheduledDate);
    if (leaveDay && (leaveDay.kind === 'off' || (leaveDay.kind === 'trek' && !leave.inTrek(s)))) {
      const where = leaveDay.kind === 'off' ? 'in je vakantie' : 'op een dag van je tocht';
      findings.push({ rule: 'LEAVE-OFF', date: s.scheduledDate, sessionIds: [s.id], subjectId: s.id, level: level(s), message: `${name} staat ${where} (${day(s.scheduledDate)}).` });
      continue;
    }
    // The day before and after a trek: nothing hard, nothing heavy for the legs.
    const lightDay = leave.light.get(s.scheduledDate);
    if (lightDay && !leave.inTrek(s) && t.type !== 'recovery' && (isHardRun(t) || isLegHeavyTemplate(t) || hasRole(t, 'long'))) {
      findings.push({ rule: 'LEAVE-LIGHT', date: s.scheduledDate, sessionIds: [s.id], subjectId: s.id, level: level(s), message: `${name} ${lightDay.side === 'before' ? (lightDay.distance <= 1 ? 'de dag voor je tocht' : `${lightDay.distance} dagen voor je tocht`) : 'de dag na je tocht'} (${day(s.scheduledDate)}).` });
    }

    // The rest day stays free; what you put there yourself is your choice.
    if (input.restDay && t.type !== 'recovery' && !leave.inTrek(s) && isoWeekday(s.scheduledDate) === input.restDay && level(s) >= 2) {
      findings.push({ rule: 'REST-DAY', date: s.scheduledDate, sessionIds: [s.id], subjectId: s.id, level: level(s), message: `${name} staat op je rustdag (${day(s.scheduledDate)}).` });
    }

    const sameDay = (openByDate.get(s.scheduledDate) ?? []).filter((o) => o.id !== s.id);
    // Two hard runs on one day: reported once, on the one that is easiest to move.
    if (isHardRun(t)) {
      for (const o of sameDay) {
        const ot = tpl(o);
        if (!ot || !isHardRun(ot) || o.id < s.id) continue;
        const subject = level(o) > level(s) ? o : s;
        findings.push({ rule: 'TWO-HARD-RUNS', date: s.scheduledDate, sessionIds: [s.id, o.id], subjectId: subject.id, level: level(subject), message: `Twee harde loopjes op ${day(s.scheduledDate)}: ${name} en ${ot.name}.` });
      }
    }
    // The day over your time for it: reported once a day, on the session
    // that is easiest to move: the system's, and of those the one that is not
    // on its own place in the week.
    const budget = input.dailyTimeBudget?.[weekdayOf(s.scheduledDate)];
    const counted = (o: PlannedSession) => tpl(o)?.type !== 'recovery';
    // On a free day or a trek day the time is yours: no budget for the day.
    const timeIsFree = leaveDay?.kind === 'free' || leaveDay?.kind === 'trek';
    if (budget && !timeIsFree && counted(s) && sameDay.filter(counted).length > 0 && sameDay.filter(counted).every((o) => o.id > s.id)) {
      const dayList = [s, ...sameDay.filter(counted)];
      const total = dayList.reduce((n, o) => n + minutes(o), 0);
      const ceiling = budget.hardMaximumMinutes ?? budget.preferredMinutes + budget.softFlexMinutes;
      if (total > ceiling || input.sameDayPairingPreference === 'never') {
        const offSlot = (o: PlannedSession) => Number(input.slotDays?.get(patternSlotOf(o.templateId)) !== isoWeekday(o.scheduledDate));
        const subject = [...dayList].sort((a, b) => level(b) - level(a) || offSlot(b) - offSlot(a) || b.id.localeCompare(a.id))[0];
        findings.push({ rule: 'DAY-FULL', date: s.scheduledDate, sessionIds: dayList.map((o) => o.id), subjectId: subject.id, level: level(subject), message: `${day(s.scheduledDate)} is te vol: ${total} minuten, je hebt er ${ceiling}.` });
      }
    }
    if (sameDay.some((o) => o.templateId === s.templateId && o.id < s.id)) {
      findings.push({ rule: 'DUPLICATE', date: s.scheduledDate, sessionIds: [s.id], subjectId: s.id, level: level(s), message: `${name} staat twee keer op ${day(s.scheduledDate)}.` });
    }

    // The day after a test or race.
    const testBefore = (allByDate.get(addDays(s.scheduledDate, -1)) ?? []).find((o) => idIsTestOrRace(o.templateId, byId));
    // The long training the day after, in its short version, is how the race
    // block plans it: easy legs, not a second effort.
    const shortLong = hasRole(t, 'long') && !!s.plannedMinutes && !!t.durationVariants.short && s.plannedMinutes <= t.durationVariants.short;
    // A trek is what you chose: the day after a test the walk stays (the proposal says so).
    if (testBefore && !shortLong && !leave.inTrek(s) && t.type !== 'strength' && t.type !== 'recovery' && (isHardRun(t) || isLegHeavyTemplate(t))) {
      findings.push({ rule: 'AFTER-TEST', date: s.scheduledDate, sessionIds: [s.id, testBefore.id], subjectId: s.id, level: level(s), message: `${name} de dag na de ${idHasRole(testBefore.templateId, 'race', byId) ? 'wedstrijd' : 'testloop'}.` });
    }

    // The recovery after a goal: not the first day after a test or race (AFTER-TEST has that),
    // and not what the goal's own taper made short: the long training in its short version is
    // easy legs, and from the third day a short leg day is too.
    const recovery = afterGoal(input, s.scheduledDate);
    if (recovery && !leave.inTrek(s) && t.type !== 'recovery' && !(recovery.day === 1 && testBefore) && (isHardRun(t) || isLegHeavyTemplate(t))) {
      const lighter = !!s.plannedMinutes && !!t.durationVariants.short && s.plannedMinutes <= t.durationVariants.short;
      const easyLegs = lighter && (hasRole(t, 'long') || (t.type === 'strength' && recovery.day >= 3));
      if (!easyLegs) {
        findings.push({ rule: 'AFTER-GOAL', date: s.scheduledDate, sessionIds: [s.id], subjectId: s.id, level: level(s), message: `${name} ${recovery.day} ${recovery.day === 1 ? 'dag' : 'dagen'} na je wedstrijd, je herstelt nog (${day(s.scheduledDate)}).` });
      }
    }

    // On the test or race day itself: reported on the other session.
    if (isTestOrRace(t)) {
      for (const o of sameDay) {
        const ot = tpl(o);
        if (!ot || !conflictsOnTestDay(ot)) continue;
        findings.push({ rule: 'TEST-DAY', date: s.scheduledDate, sessionIds: [o.id, s.id], subjectId: o.id, level: level(o), message: `${ot.name} op dezelfde dag als de ${hasRole(t, 'race') ? 'wedstrijd' : 'testloop'} (${day(s.scheduledDate)}).` });
      }
    }

    // Fresh legs for a test or race.
    if (isTestOrRace(t)) {
      const limit = hasRole(t, 'race') ? FATIGUE_THRESHOLDS.race.doubt : FATIGUE_THRESHOLDS.test.fresh;
      const legIndex = freshnessAt(s.scheduledDate, around(s.scheduledDate, 52).filter((o) => o.id !== s.id), byId, recentLogs).index;
      if (legIndex > limit) {
        findings.push({ rule: 'TEST-FRESH', date: s.scheduledDate, sessionIds: [s.id], subjectId: s.id, level: level(s), message: `${name} op ${day(s.scheduledDate)}: beenindex ${legIndex.toFixed(1).replace('.', ',')}, grens ${limit}.` });
      }
      continue;
    }

    // Heavy days for the same muscles: each pair once, the later session as
    // the subject unless only the earlier one may be moved.
    for (const c of findHeavyConflicts(s.id, t, s.scheduledDate, around(s.scheduledDate, 4), byId, recentLogs)) {
      if (idIsTestOrRace(c.templateId, byId)) continue; // TEST-FRESH and AFTER-TEST cover the test
      if (c.scheduledDate > s.scheduledDate || (c.scheduledDate === s.scheduledDate && c.id < s.id)) continue;
      if (leave.inTrek(s) && leave.inTrek(c)) continue; // the days of one trek follow each other on purpose
      // Soft rest after a tocht: the short version of a heavy leg day may stand 48 hours after a walking day of the tocht.
      if (input.trekRest !== 'strict' && leave.inTrek(c) && c.scheduledDate < s.scheduledDate && daysBetween(c.scheduledDate, s.scheduledDate) >= 2 && t.type === 'strength' && isLegHeavyTemplate(t) && !!t.durationVariants.short && s.plannedMinutes === t.durationVariants.short) continue;
      const subject = level(s) === 3 || level(c) !== 3 ? s : c;
      findings.push({ rule: 'LEG-SPACING', date: s.scheduledDate, sessionIds: [c.id, s.id], subjectId: subject.id, level: level(subject), message: `${tpl(c)?.name ?? 'Training'} (${day(c.scheduledDate)}) en ${name} (${day(s.scheduledDate)}) te dicht op elkaar.` });
    }
  }

  // One full long session a week.
  const weeks = new Map<string, PlannedSession[]>();
  for (const s of active) if (idHasRole(s.templateId, 'long', byId) && !s.plannedMinutes && !leave.inTrek(s)) weeks.set(s.weekStartDate, [...(weeks.get(s.weekStartDate) ?? []), s]);
  for (const list of weeks.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const subject = sorted.find((s) => level(s) === 3 && s !== sorted[sorted.length - 1]) ?? sorted[0];
    findings.push({ rule: 'ONE-LONG', date: subject.scheduledDate, sessionIds: list.map((s) => s.id), subjectId: subject.id, level: level(subject), message: `Twee volle lange trainingen in de week van ${day(mondayOfWeek(subject.scheduledDate))}.` });
  }
  return findings;
}

// --- repairing what the system planned ----------------------------------------------
// A repair is made for a rule of the check, or by the leave step that puts a
// walk on a trek day or a free day (engine/leaveBlock.ts).
export type RepairRule = CheckRule | 'LEAVE-PLACE';

export interface Repair {
  sessionId: string;
  rule: RepairRule;
  from: string;
  to: string;
  plannedMinutes?: number;
  removed?: boolean;
  // A session the planning put on the plan (it was not there before).
  added?: boolean;
  // A reason of its own in plain words, when the rule's general one is too vague.
  reason?: string;
}

export const SOFT_REST_REASON = 'Iets eerder dan ASCEND graag ziet na je tocht, daarom de korte versie.';

// Why a leg day next to a tocht is let go: concrete, so it is clear it is not a mistake.
export function legAndTrekReason(afterTrek: boolean): string {
  return afterTrek
    ? 'Te dicht na je tocht: na een bergtocht houdt ASCEND 72 uur tot de volgende zware beendag, en deze week is er geen dag voor.'
    : 'Te dicht voor je tocht: tussen een zware beendag en je tocht houdt ASCEND 48 uur, en deze week is er geen dag voor.';
}

export interface RepairResult {
  sessions: PlannedSession[]; // the whole list after repair
  repairs: Repair[];
  remaining: Finding[];
}

const MAX_ROUNDS = 60;
// A holiday or a trek can ask for a repair per session; those get their own rounds.
const ROUNDS_PER_LEAVE_FINDING = 2;
// The order repairs are tried in: what the rest are judged on first.
const RULE_ORDER: CheckRule[] = ['WEEK-START', 'DUPLICATE', 'GOAL-DAY', 'LEAVE-OFF', 'LEAVE-LIGHT', 'REST-DAY', 'TEST-DAY', 'DAY-FULL', 'AFTER-TEST', 'AFTER-GOAL', 'TWO-HARD-RUNS', 'TEST-FRESH', 'LEG-SPACING', 'ONE-LONG'];
const key = (f: Finding) => `${f.rule}:${[...f.sessionIds].sort().join(',')}`;
// Two findings are the same finding when this is the same.
export const findingKey = key;

export function repairWeeks(input: CheckInput): RepairResult {
  const { byId, logged, until } = context(input);
  const level = (s: PlannedSession) => lockLevel(s, logged, input.today);
  // What the check may change: the system's own sessions, except a leg day
  // the race block swapped for a test or tempo run (raceBlock marker). That
  // swap is the race block's to keep or undo; moving it here would make the
  // two steps undo each other on every run.
  const leave = leaveContext(input, byId);
  // With a holiday or a trek in the plan nothing is stacked on a day that
  // has no time budget: a session that has to move takes an empty day.
  const leaveActive = (input.leave?.length ?? 0) > 0;
  const movable = (s: PlannedSession) => level(s) === 3 && !s.raceBlock && !leave.inTrek(s);
  let sessions = input.sessions;
  const repairs: Repair[] = [];
  const tried = new Set<string>();
  // While true the rest after a tocht counts the strict 72 hours (the first try before the soft one).
  let strictRest = false;

  // A change is only kept when the weeks around it are better: fewer
  // findings, and none that wasn't there before. The weeks as they are now
  // are judged once, every candidate against them.
  const judge = (dates: string[]) => {
    const weeks = new Set(dates.flatMap((d) => [-7, 0, 7].map((o) => mondayOfWeek(addDays(d, o)))));
    const before = validateWeeks({ ...input, ...(strictRest ? { trekRest: 'strict' as const } : {}), sessions }, weeks);
    const beforeKeys = new Set(before.map(key));
    return (changed: PlannedSession[]) => {
      const after = validateWeeks({ ...input, ...(strictRest ? { trekRest: 'strict' as const } : {}), sessions: changed }, weeks);
      return after.length < before.length && after.every((f) => beforeKeys.has(key(f)));
    };
  };

  // A holiday day or a trek day takes nothing else.
  const isBlockedDay = (d: string) => {
    const kind = leave.days.get(d)?.kind;
    return kind === 'off' || kind === 'trek';
  };

  // Another day in the same week for a session of the system: the nearest
  // one that is better. Never the rest day, a race day, the past or the goal.
  // Without a time budget for that weekday only an empty day takes a session
  // that had to leave its own day (the same as engine/scheduler.ts#dayHasRoomFor).
  const hasRoom = (d: string, subject: PlannedSession) =>
    !!input.dailyTimeBudget?.[weekdayOf(d)] ||
    !sessions.some((o) => o.id !== subject.id && o.scheduledDate === d && o.status !== 'skipped' && byId.get(o.templateId)?.type !== 'recovery');
  const relocate = (subject: PlannedSession, rule: CheckRule, alsoCheck: string[] = [], plannedMinutes?: number): boolean => {
    const t = byId.get(subject.templateId);
    if (!t) return false;
    const monday = mondayOfWeek(subject.scheduledDate);
    const candidates = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
      .filter((d) => d !== subject.scheduledDate && d >= input.today && d <= until && (!input.goalDay || d < input.goalDay) && !(input.raceDays ?? []).includes(d) && isoWeekday(d) !== input.restDay && !isBlockedDay(d) && (!leaveActive || hasRoom(d, subject)))
      .sort((a, b) => Math.abs(daysBetween(subject.scheduledDate, a)) - Math.abs(daysBetween(subject.scheduledDate, b)) || a.localeCompare(b));
    // Its own place in the week first (a test goes where the easy run is).
    const slotDay = input.slotDays?.get(patternSlotOf(subject.templateId));
    if (slotDay) candidates.sort((a, b) => Number(isoWeekday(b) === slotDay) - Number(isoWeekday(a) === slotDay));
    const better = judge([subject.scheduledDate, ...alsoCheck]);
    for (const d of candidates) {
      const moved = sessions.map((s) => (s.id === subject.id ? { ...s, scheduledDate: d, weekStartDate: monday, ...(plannedMinutes ? { plannedMinutes } : {}) } : s));
      if (!better(moved)) continue;
      sessions = moved;
      repairs.push({ sessionId: subject.id, rule, from: subject.scheduledDate, to: d, ...(plannedMinutes ? { plannedMinutes } : {}) });
      return true;
    }
    return false;
  };

  // A hard training the recovery made easy comes back as it was when that recovery is no longer
  // there (the goal moved, went, or the days passed): the way a moved leave session goes back.
  // Only while it is still the system's own and still the easy run; otherwise the mark just goes.
  // History (logged or past) is left exactly as it is, the mark included. Only a session of the
  // system itself (lock level 3, not in a trek, not of the race block) is put back; of anything
  // else the mark just goes.
  for (const marked of sessions.filter((s) => s.afterGoal && level(s) !== 0)) {
    const mark = marked.afterGoal!;
    const { afterGoal: _drop, ...plain } = marked;
    void _drop;
    const stillEasy = movable(marked) && marked.templateId === EASY_ID && marked.status === 'planned';
    if (!stillEasy || !byId.has(mark.templateId)) {
      sessions = sessions.map((s) => (s.id === marked.id ? plain : s));
      continue;
    }
    if (afterGoal(input, marked.scheduledDate)) continue;
    sessions = sessions.map((s) => (s.id === marked.id ? { ...plain, templateId: mark.templateId } : s));
    repairs.push({ sessionId: marked.id, rule: 'AFTER-GOAL', from: marked.scheduledDate, to: marked.scheduledDate, reason: 'je wedstrijd is verschoven of weg, daarom weer de harde training van eerst' });
  }

  const leaveFindings = !input.leave?.length ? 0 : validateWeeks(input).filter((f) => f.rule === 'LEAVE-OFF' || f.rule === 'LEAVE-LIGHT').length;
  const maxRounds = MAX_ROUNDS + leaveFindings * ROUNDS_PER_LEAVE_FINDING;
  for (let round = 0; round < maxRounds; round++) {
    const findings = validateWeeks({ ...input, sessions });
    const byIdNow = new Map(sessions.map((s) => [s.id, s]));
    // The system's own sessions, and a test or race made fresh by changing
    // the system's strength before it (also a test you placed yourself).
    const next = findings
      // A test that is on the wrong day itself waits for its proposal first.
      .filter((f) => ((f.level === 3 && movable(byIdNow.get(f.subjectId)!)) || ((f.level === 1 || f.level === 2) && f.rule === 'TEST-FRESH' && !findings.some((o) => o !== f && o.subjectId === f.subjectId))) && !tried.has(key(f)))
      .sort((a, b) => RULE_ORDER.indexOf(a.rule) - RULE_ORDER.indexOf(b.rule) || a.date.localeCompare(b.date))[0];
    if (!next) return { sessions, repairs, remaining: findings };
    tried.add(key(next));
    const subject = sessions.find((s) => s.id === next.subjectId)!;
    const t = byId.get(subject.templateId);
    if (!t) continue;

    if (next.rule === 'WEEK-START') {
      sessions = sessions.map((s) => (s.id === subject.id ? { ...s, weekStartDate: mondayOfWeek(s.scheduledDate) } : s));
      repairs.push({ sessionId: subject.id, rule: next.rule, from: subject.scheduledDate, to: subject.scheduledDate });
      continue;
    }
    if (next.rule === 'ONE-LONG') {
      const short = t.durationVariants.short;
      if (!short) continue;
      sessions = sessions.map((s) => (s.id === subject.id ? { ...s, plannedMinutes: short } : s));
      repairs.push({ sessionId: subject.id, rule: next.rule, from: subject.scheduledDate, to: subject.scheduledDate, plannedMinutes: short });
      continue;
    }
    if (next.rule === 'LEAVE-OFF' || next.rule === 'LEAVE-LIGHT') {
      // To another day of that week where it fits; otherwise it is let go.
      // A rest day (Herstel) is not moved: there is nothing to move.
      if (t.type !== 'recovery' && relocate(subject, next.rule)) continue;
      sessions = sessions.filter((s) => s.id !== subject.id);
      repairs.push({ sessionId: subject.id, rule: next.rule, from: subject.scheduledDate, to: subject.scheduledDate, removed: true });
      continue;
    }
    if (next.rule === 'DUPLICATE' || next.rule === 'GOAL-DAY') {
      sessions = sessions.filter((s) => s.id !== subject.id);
      repairs.push({ sessionId: subject.id, rule: next.rule, from: subject.scheduledDate, to: subject.scheduledDate, removed: true });
      continue;
    }
    if (next.rule === 'AFTER-GOAL') {
      // Another day of that week outside the recovery; else lighter: the short version of a long
      // training or a leg day (on another day when it must), or a hard run as an easy one.
      // Never let go: what cannot be made light stays reported.
      if (relocate(subject, next.rule)) continue;
      const short = t.durationVariants.short;
      const canShort = !!short && subject.plannedMinutes !== short && (hasRole(t, 'long') || (t.type === 'strength' && isLegHeavyTemplate(t)));
      if (canShort) {
        const lighter = sessions.map((x) => (x.id === subject.id ? { ...x, plannedMinutes: short } : x));
        if (judge([subject.scheduledDate])(lighter)) {
          sessions = lighter;
          repairs.push({ sessionId: subject.id, rule: next.rule, from: subject.scheduledDate, to: subject.scheduledDate, plannedMinutes: short });
          continue;
        }
        if (relocate(subject, next.rule, [], short)) continue;
      }
      if (isHardRun(t) && t.id !== EASY_ID && byId.has(EASY_ID)) {
        // Marked, so the hard training comes back when the goal moves or goes (restoreAfterGoal below).
        const mark = { templateId: subject.templateId, date: afterGoal(input, subject.scheduledDate)?.date ?? '' };
        const easy = sessions.map((x) => (x.id === subject.id ? { ...x, templateId: EASY_ID, ...(mark.date ? { afterGoal: mark } : {}) } : x));
        if (judge([subject.scheduledDate])(easy)) {
          sessions = easy;
          repairs.push({ sessionId: subject.id, rule: next.rule, from: subject.scheduledDate, to: subject.scheduledDate, reason: 'je herstelt nog van je wedstrijd, daarom een rustig loopje in plaats van een harde training' });
        }
      }
      continue;
    }
    if (next.rule === 'TEST-FRESH') {
      // What weighs most before the test, of the system's sessions: a leg
      // day goes short first (as the race block does in a test week); only
      // then anything moves to another day.
      const recentLogs = input.logs.filter((l) => daysBetween(l.completedDate, input.today) <= 56);
      const result = freshnessAt(subject.scheduledDate, sessions.filter((o) => o.id !== subject.id && o.status !== 'skipped'), byId, recentLogs);
      for (const c of result.contributions) {
        const s = sessions.find((x) => x.id === c.id);
        const ct = s && byId.get(s.templateId);
        if (!s || !ct || c.logged || !movable(s) || ct.type !== 'strength') continue;
        const short = ct.durationVariants.short;
        if (isLegHeavyTemplate(ct) && short && s.plannedMinutes !== short) {
          const shortened = sessions.map((x) => (x.id === s.id ? { ...x, plannedMinutes: short } : x));
          if (judge([s.scheduledDate, subject.scheduledDate])(shortened)) {
            sessions = shortened;
            repairs.push({ sessionId: s.id, rule: 'TEST-FRESH', from: s.scheduledDate, to: s.scheduledDate, plannedMinutes: short });
            break;
          }
        }
        if (relocate(s, 'TEST-FRESH', [subject.scheduledDate])) break;
        // Both: the short version on another day (after the test, say).
        if (isLegHeavyTemplate(ct) && short && s.plannedMinutes !== short && relocate(s, 'TEST-FRESH', [subject.scheduledDate], short)) break;
      }
      continue;
    }
    if (relocate(subject, next.rule)) continue;
    // The days of a trek stay. A leg day of the system next to one first looks
    // for a day 72 hours away, full and then short (as for TEST-FRESH). Then,
    // unless the setting says strict, the short version from 48 hours after the
    // tocht, on its own day or another. Only when none of that fits it is let go.
    const trekPartner = next.rule === 'LEG-SPACING' ? next.sessionIds.map((id) => sessions.find((o) => o.id === id)).find((o) => !!o && o.id !== subject.id && leave.inTrek(o)) : undefined;
    if (trekPartner) {
      const short = t.durationVariants.short;
      const canShort = t.type === 'strength' && isLegHeavyTemplate(t) && !!short && subject.plannedMinutes !== short;
      strictRest = true;
      const strictShort = canShort && relocate(subject, next.rule, [], short);
      strictRest = false;
      // A leg day the tocht shortened carries the tocht's mark, so removing the
      // tocht can put it back and the old leg-swap cleanup leaves it alone.
      const periodId = leave.days.get(trekPartner.scheduledDate)?.period.id;
      const mark = (from: string) => {
        if (periodId) sessions = sessions.map((x) => (x.id === subject.id && !x.leave ? { ...x, leave: { periodId, role: 'moved' as const, from, shortened: true } } : x));
      };
      if (strictShort) { mark(subject.scheduledDate); continue; }
      if (canShort && input.trekRest !== 'strict') {
        const inPlace = sessions.map((x) => (x.id === subject.id ? { ...x, plannedMinutes: short } : x));
        if (judge([subject.scheduledDate])(inPlace)) {
          sessions = inPlace;
          mark(subject.scheduledDate);
          repairs.push({ sessionId: subject.id, rule: next.rule, from: subject.scheduledDate, to: subject.scheduledDate, plannedMinutes: short, reason: SOFT_REST_REASON });
          continue;
        }
        if (relocate(subject, next.rule, [], short)) {
          repairs[repairs.length - 1].reason = SOFT_REST_REASON;
          mark(subject.scheduledDate);
          continue;
        }
      }
      sessions = sessions.filter((s) => s.id !== subject.id);
      repairs.push({ sessionId: subject.id, rule: next.rule, from: subject.scheduledDate, to: subject.scheduledDate, removed: true, reason: legAndTrekReason(subject.scheduledDate > trekPartner.scheduledDate) });
    }
  }
  return { sessions, repairs, remaining: validateWeeks({ ...input, sessions }) };
}

// --- what changed, in words ----------------------------------------------------------
const REASON: Record<RepairRule, string> = {
  'GOAL-DAY': 'niets op of na de dag van je doel',
  'LEAVE-OFF': 'je bent vrij of op tocht',
  'LEAVE-LIGHT': 'de dagen voor en na je tocht blijven licht',
  'LEAVE-PLACE': 'past bij je vrije periode',
  'REST-DAY': 'je rustdag blijft vrij',
  'TWO-HARD-RUNS': 'niet twee harde loopjes op één dag',
  'TEST-DAY': 'niets zwaars op de dag van een test of wedstrijd',
  'AFTER-TEST': 'de dag na een test of wedstrijd niets zwaars',
  'AFTER-GOAL': 'je herstelt nog van je wedstrijd: niets hards en geen zware beenkracht',
  'LEG-SPACING': 'genoeg ruimte tussen zware dagen voor dezelfde spieren',
  'TEST-FRESH': 'frisse benen voor de test',
  'ONE-LONG': 'één volle lange training per week',
  'DUPLICATE': 'stond dubbel',
  'DAY-FULL': 'past in je tijd voor die dag',
  'WEEK-START': 'hoort bij de week van zijn datum',
};

export function describeRepair(r: Repair, name: string): string {
  const moved = r.from !== r.to ? `${day(r.from)} naar ${day(r.to)}` : '';
  const shorter = r.plannedMinutes ? `korter, ${r.plannedMinutes} minuten` : '';
  const what = r.added ? `erbij op ${day(r.to)}` : r.removed ? 'eruit' : [moved, shorter].filter(Boolean).join(', ') || 'aangepast';
  return `${name}: ${what} (${r.reason ?? REASON[r.rule]})`;
}

// Only what you'd notice: a moved, shortened or removed session.
export const visibleRepair = (r: Repair) => r.rule !== 'WEEK-START';
