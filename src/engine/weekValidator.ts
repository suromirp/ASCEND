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
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { addDays, daysBetween, isoWeekday, mondayOfWeek, weekdayOf, weekdayShortNL } from '../utils/dates';
import { findHeavyConflicts, freshnessAt, isHardRun, isLegHeavyTemplate } from './scheduler';
import { patternSlotOf } from './programLayout';
import { FATIGUE_THRESHOLDS } from './legFatigue';

// --- who may touch a session ------------------------------------------------------
// 0 history: logged, or its day has passed. 1 yours: you placed or moved it,
// or an accepted proposal did (a 'moved' session from before locks existed
// counts as yours too: when in doubt, leave it). 2 an anchor: a test or the
// race. 3 the system's: free to repair.
export type LockLevel = 0 | 1 | 2 | 3;
const ANCHORS = new Set(['tpl_test_run', 'tpl_race']);

export function lockLevel(s: PlannedSession, logged: Set<string | undefined>, today: string): LockLevel {
  if (logged.has(s.id) || s.scheduledDate < today) return 0;
  if (s.lock || s.status === 'moved') return 1;
  if (ANCHORS.has(s.templateId)) return 2;
  return 3;
}

// --- the rules --------------------------------------------------------------------
export type CheckRule =
  | 'GOAL-DAY' // nothing on or after the main goal's day
  | 'REST-DAY' // the rest day stays free
  | 'TWO-HARD-RUNS' // at most one hard run a day
  | 'AFTER-TEST' // the day after a test or race: no hard run, nothing heavy for the legs but strength
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
}

const LONG = new Set(['tpl_long_run', 'tpl_mountain_hike']);
const HORIZON_DAYS = 7 * 44;

function context(input: CheckInput) {
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const until = [input.goalDay ? addDays(input.goalDay, -1) : addDays(input.today, HORIZON_DAYS), input.until].filter((d): d is string => !!d).sort()[0];
  // What the rules look at: open sessions from today until the goal.
  const open = (s: PlannedSession) => s.status !== 'skipped' && !logged.has(s.id) && s.scheduledDate >= input.today;
  return { byId, logged, until, open };
}

const day = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))}-${Number(iso.slice(5, 7))}`;

export function validateWeeks(input: CheckInput, onlyWeeks?: Set<string>): Finding[] {
  const { byId, logged, until, open } = context(input);
  const level = (s: PlannedSession) => lockLevel(s, logged, input.today);
  const findings: Finding[] = [];
  const active = input.sessions.filter(open).filter((s) => !onlyWeeks || onlyWeeks.has(mondayOfWeek(s.scheduledDate)));
  const all = input.sessions.filter((s) => s.status !== 'skipped');
  const recentLogs = input.logs.filter((l) => daysBetween(l.completedDate, input.today) <= 56);
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

    // The rest day stays free; what you put there yourself is your choice.
    if (input.restDay && t.type !== 'recovery' && isoWeekday(s.scheduledDate) === input.restDay && level(s) >= 2) {
      findings.push({ rule: 'REST-DAY', date: s.scheduledDate, sessionIds: [s.id], subjectId: s.id, level: level(s), message: `${name} staat op je rustdag (${day(s.scheduledDate)}).` });
    }

    const sameDay = active.filter((o) => o.id !== s.id && o.scheduledDate === s.scheduledDate);
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
    if (budget && counted(s) && sameDay.filter(counted).length > 0 && sameDay.filter(counted).every((o) => o.id > s.id)) {
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
    const testBefore = all.find((o) => ANCHORS.has(o.templateId) && daysBetween(o.scheduledDate, s.scheduledDate) === 1);
    // The long training the day after, in its short version, is how the race
    // block plans it: easy legs, not a second effort.
    const shortLong = LONG.has(t.id) && !!s.plannedMinutes && !!t.durationVariants.short && s.plannedMinutes <= t.durationVariants.short;
    if (testBefore && !shortLong && t.type !== 'strength' && t.type !== 'recovery' && (isHardRun(t) || isLegHeavyTemplate(t))) {
      findings.push({ rule: 'AFTER-TEST', date: s.scheduledDate, sessionIds: [s.id, testBefore.id], subjectId: s.id, level: level(s), message: `${name} de dag na de ${testBefore.templateId === 'tpl_race' ? 'wedstrijd' : 'testloop'}.` });
    }

    // Fresh legs for a test or race.
    if (ANCHORS.has(t.id)) {
      const limit = t.id === 'tpl_race' ? FATIGUE_THRESHOLDS.race.doubt : FATIGUE_THRESHOLDS.test.fresh;
      const index = freshnessAt(s.scheduledDate, all.filter((o) => o.id !== s.id), byId, recentLogs).index;
      if (index > limit) {
        findings.push({ rule: 'TEST-FRESH', date: s.scheduledDate, sessionIds: [s.id], subjectId: s.id, level: level(s), message: `${name} op ${day(s.scheduledDate)}: beenindex ${index.toFixed(1).replace('.', ',')}, grens ${limit}.` });
      }
      continue;
    }

    // Heavy days for the same muscles: each pair once, the later session as
    // the subject unless only the earlier one may be moved.
    for (const c of findHeavyConflicts(s.id, t, s.scheduledDate, all.filter((o) => Math.abs(daysBetween(o.scheduledDate, s.scheduledDate)) <= 4), byId, recentLogs)) {
      if (ANCHORS.has(c.templateId)) continue; // TEST-FRESH and AFTER-TEST cover the test
      if (c.scheduledDate > s.scheduledDate || (c.scheduledDate === s.scheduledDate && c.id < s.id)) continue;
      const subject = level(s) === 3 || level(c) !== 3 ? s : c;
      findings.push({ rule: 'LEG-SPACING', date: s.scheduledDate, sessionIds: [c.id, s.id], subjectId: subject.id, level: level(subject), message: `${tpl(c)?.name ?? 'Training'} (${day(c.scheduledDate)}) en ${name} (${day(s.scheduledDate)}) te dicht op elkaar.` });
    }
  }

  // One full long session a week.
  const weeks = new Map<string, PlannedSession[]>();
  for (const s of active) if (LONG.has(s.templateId) && !s.plannedMinutes) weeks.set(s.weekStartDate, [...(weeks.get(s.weekStartDate) ?? []), s]);
  for (const list of weeks.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const subject = sorted.find((s) => level(s) === 3 && s !== sorted[sorted.length - 1]) ?? sorted[0];
    findings.push({ rule: 'ONE-LONG', date: subject.scheduledDate, sessionIds: list.map((s) => s.id), subjectId: subject.id, level: level(subject), message: `Twee volle lange trainingen in de week van ${day(mondayOfWeek(subject.scheduledDate))}.` });
  }
  return findings;
}

// --- repairing what the system planned ----------------------------------------------
export interface Repair {
  sessionId: string;
  rule: CheckRule;
  from: string;
  to: string;
  plannedMinutes?: number;
  removed?: boolean;
}

export interface RepairResult {
  sessions: PlannedSession[]; // the whole list after repair
  repairs: Repair[];
  remaining: Finding[];
}

const MAX_ROUNDS = 60;
// The order repairs are tried in: what the rest are judged on first.
const RULE_ORDER: CheckRule[] = ['WEEK-START', 'DUPLICATE', 'GOAL-DAY', 'REST-DAY', 'DAY-FULL', 'AFTER-TEST', 'TWO-HARD-RUNS', 'TEST-FRESH', 'LEG-SPACING', 'ONE-LONG'];
const key = (f: Finding) => `${f.rule}:${[...f.sessionIds].sort().join(',')}`;

export function repairWeeks(input: CheckInput): RepairResult {
  const { byId, logged, until } = context(input);
  const level = (s: PlannedSession) => lockLevel(s, logged, input.today);
  let sessions = input.sessions;
  const repairs: Repair[] = [];
  const tried = new Set<string>();

  // A change is only kept when the weeks around it are better: fewer
  // findings, and none that wasn't there before.
  const better = (changed: PlannedSession[], dates: string[]) => {
    const weeks = new Set(dates.flatMap((d) => [-7, 0, 7].map((o) => mondayOfWeek(addDays(d, o)))));
    const before = validateWeeks({ ...input, sessions }, weeks);
    const beforeKeys = new Set(before.map(key));
    const after = validateWeeks({ ...input, sessions: changed }, weeks);
    return after.length < before.length && after.every((f) => beforeKeys.has(key(f)));
  };

  // Another day in the same week for a session of the system: the nearest
  // one that is better. Never the rest day, a race day, the past or the goal.
  const relocate = (subject: PlannedSession, rule: CheckRule, alsoCheck: string[] = [], plannedMinutes?: number): boolean => {
    const t = byId.get(subject.templateId);
    if (!t) return false;
    const monday = mondayOfWeek(subject.scheduledDate);
    const candidates = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
      .filter((d) => d !== subject.scheduledDate && d >= input.today && d <= until && (!input.goalDay || d < input.goalDay) && !(input.raceDays ?? []).includes(d) && isoWeekday(d) !== input.restDay)
      .sort((a, b) => Math.abs(daysBetween(subject.scheduledDate, a)) - Math.abs(daysBetween(subject.scheduledDate, b)) || a.localeCompare(b));
    // Its own place in the week first (a test goes where the easy run is).
    const slotDay = input.slotDays?.get(patternSlotOf(subject.templateId));
    if (slotDay) candidates.sort((a, b) => Number(isoWeekday(b) === slotDay) - Number(isoWeekday(a) === slotDay));
    for (const d of candidates) {
      const moved = sessions.map((s) => (s.id === subject.id ? { ...s, scheduledDate: d, weekStartDate: monday, ...(plannedMinutes ? { plannedMinutes } : {}) } : s));
      if (!better(moved, [subject.scheduledDate, d, ...alsoCheck])) continue;
      sessions = moved;
      repairs.push({ sessionId: subject.id, rule, from: subject.scheduledDate, to: d, ...(plannedMinutes ? { plannedMinutes } : {}) });
      return true;
    }
    return false;
  };

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const findings = validateWeeks({ ...input, sessions });
    // The system's own sessions, and a test or race made fresh by changing
    // the system's strength before it (also a test you placed yourself).
    const next = findings
      // A test that is on the wrong day itself waits for its proposal first.
      .filter((f) => (f.level === 3 || ((f.level === 1 || f.level === 2) && f.rule === 'TEST-FRESH' && !findings.some((o) => o !== f && o.subjectId === f.subjectId))) && !tried.has(key(f)))
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
    if (next.rule === 'DUPLICATE' || next.rule === 'GOAL-DAY') {
      sessions = sessions.filter((s) => s.id !== subject.id);
      repairs.push({ sessionId: subject.id, rule: next.rule, from: subject.scheduledDate, to: subject.scheduledDate, removed: true });
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
        if (!s || !ct || c.logged || level(s) !== 3 || ct.type !== 'strength') continue;
        const short = ct.durationVariants.short;
        if (isLegHeavyTemplate(ct) && short && s.plannedMinutes !== short) {
          const shortened = sessions.map((x) => (x.id === s.id ? { ...x, plannedMinutes: short } : x));
          if (better(shortened, [s.scheduledDate, subject.scheduledDate])) {
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
    relocate(subject, next.rule);
  }
  return { sessions, repairs, remaining: validateWeeks({ ...input, sessions }) };
}

// --- what changed, in words ----------------------------------------------------------
const REASON: Record<CheckRule, string> = {
  'GOAL-DAY': 'niets op of na de dag van je doel',
  'REST-DAY': 'je rustdag blijft vrij',
  'TWO-HARD-RUNS': 'niet twee harde loopjes op één dag',
  'AFTER-TEST': 'de dag na een test of wedstrijd niets zwaars',
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
  const what = r.removed ? 'eruit' : [moved, shorter].filter(Boolean).join(', ') || 'aangepast';
  return `${name}: ${what} (${REASON[r.rule]})`;
}

// Only what you'd notice: a moved, shortened or removed session.
export const visibleRepair = (r: Repair) => r.rule !== 'WEEK-START';
