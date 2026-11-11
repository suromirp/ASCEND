// De vormen van een advies en de hulpjes die meerdere regels delen
// (zie adviceEngine.ts voor de uitgangspunten).

import { isKeyFor, type KeyFocus } from './keySession';
import type { MorningCheckIn } from '../models/checkIn';
import { FATIGUE_THRESHOLDS } from './legFatigue';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { InjuryNote } from '../models/injury';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { IllnessEpisode } from '../models/illness';
import { freshnessAt, isHardRun, respectsHeavySpacing, dayHasRoomFor, isLegHeavyTemplate } from './scheduler';
import type { EnabledSports } from './sports';
import { addDays, daysBetween, mondayOfWeek, weekDates, formatWeekdayDateNL } from '../utils/dates';
import { makeId } from '../utils/id';
import type { ExtraAdviceInputs } from './extraRun';
import type { TentPackProposal } from './gr5Profile';
import type { GrowthChoice } from '../data/goalGrowth';
import type { RaceBlock } from './raceBlock';
import type { WeatherForecast } from '../models/weather';
import type { TestJudgment } from '../models/testJudgment';
import type { LeavePeriod } from '../models/leave';

export type AdviceTrigger = 'plan_update' | 'same_muscles_back_to_back' | 'session_missed' | 'session_too_hard' | 'session_too_light' | 'injury_active' | 'strength_irregular';

export interface Advice {
  id: string; // deterministic (rule + subject) — a response to it sticks
  trigger: AdviceTrigger;
  ruleId: string;
  title: string;
  effect: string;
  why: string;
  // Eén korte feitregel voor het blad. Zonder lead is dat de eerste zin van `effect`.
  lead?: string;
  // Een korte regel voor de kaart op Vandaag (dag en feit). Zonder brief: het lead.
  brief?: string;
  // Een praktische tip onder de wijzigingen in het blad.
  tip?: string;
  priority: number; // higher first
  proposal?: PlanChangeProposal;
  // More than one good way: the best first (the same as `proposal`), you
  // choose which one Akkoord applies.
  options?: AdviceOption[];
  relatedLogId?: string;
  // Rule REST-WEEK-SKIP: Akkoord trains through the rest week of this
  // Monday (engine/restWeek.ts). A program change, not a session change.
  restWeekSkip?: string;
  // Rule REPEAT-WEEK: Akkoord lets this week carry last week's load instead
  // of stepping up (engine/repeatWeek.ts). A program change, not a session
  // change; the planning round follows it.
  repeatWeek?: string;
  // Rule GR5-PACK-TENT: Akkoord sets the rucksack target of a goal. A goal
  // setting, not a session change (engine/gr5Profile.ts).
  goalChange?: { goalId: string; packWeightKg: number };
  // Rule TARGET-TIME: Akkoord sets the target time (minutes) of this goal.
  // A goal change, not a session change.
  goalTargetTime?: { goalId: string; minutes: number };
  // Rule NO-GOAL-WAVES: Akkoord plant een bestaand plan zonder doel in neutrale golven
  // (engine/noGoalWaves.ts). Een programmawijziging: eerst het eigen voorstel met wat er verandert.
  noGoalWaves?: true;
}

export interface AdviceOption {
  label: string;
  effect: string;
  proposal: PlanChangeProposal;
}

export const MAX_OPTIONS = 3;

export interface AdviceInputs {
  logs: SessionLog[];
  plannedSessions: PlannedSession[];
  templates: SessionTemplate[];
  injuries: InjuryNote[];
  program: Program | null | undefined;
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>> | undefined;
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'];
  enabledSports?: Partial<EnabledSports>;
  respondedIds: Set<string>;
  asOf: string;
  // Sessions ASCEND itself took out (any accepted 'remove' change): not a
  // skip of yours, so never offered back (rule SKIPPED-KEY-TO-REST).
  removedByPlanIds?: Set<string>;
  // Sessions planned while ill are never "gemist" (engine/illness.ts).
  illnessEpisodes?: IllnessEpisode[];
  // The morning check-in (engine/wellbeing.ts, rule MORNING-CHECK).
  checkIns?: MorningCheckIn[];
  // "Lichter bij vermoeide benen" (engine/legEaseSettings.ts). With a proposal, the card on Vandaag
  // (rule LEG-EASE) speaks for a heavy leg day of today after muscle soreness, so MORNING-CHECK
  // does not make a second card for the same training.
  legEase?: 'voorstel' | 'regel' | 'uit';
  // Your verdicts on test runs and the setting that asks first (engine/testJudgment.ts).
  testJudgments?: TestJudgment[];
  askDoubtTest?: boolean;
  // "Doeltijd aanpassen voorstellen" (rule TARGET-TIME). Absent = on.
  proposeTargetTime?: boolean;
  // "Groei bij het rekenen" (AppSettings.goalGrowth): the same growth as the card. Absent = average.
  goalGrowth?: GrowthChoice;
  // "Nieuwe test voorstellen bij stilstand" (rule TEST-RETRY). Absent = on.
  newTestOnStops?: boolean;
  // Holidays, treks and free days (engine/leave.ts): the new test and what moves for it avoid them (rule TEST-RETRY).
  leave?: LeavePeriod[];
  // The extra training of the week (engine/extraRun.ts, rule EXTRA-SESSION).
  extraSession?: Pick<ExtraAdviceInputs, 'gaps' | 'races' | 'ambition' | 'anchor' | 'restDay' | 'planChangeLog' | 'leave'>;
  // The main goal still carries the old hut default of 12 kg (rule
  // GR5-PACK-TENT, engine/gr5Profile.ts#tentPackProposal).
  tentPack?: TentPackProposal;
  // The races that are a tussendoel (engine/raceBlock.ts), with their target
  // time: the goal time is held against the test (rule TARGET-TIME).
  raceGoals?: RaceBlock[];
  // The forecast for your place and the moment it is read at (engine/weather.ts,
  // rule WEATHER-SWAP). Absent without a place or before the first fetch.
  weather?: { forecast: WeatherForecast; now: Date; leave?: LeavePeriod[] };
  // Your rest day, 1 to 7 (rule REST-BACK). Absent: the rest day of the extra training, if any.
  restDay?: number;
  // "Rustdag terugzetten voorstellen" (rule REST-BACK, engine/restDayBack.ts). Absent = on.
  restDayBack?: boolean;
  // "Log op een andere dag koppelen" (engine/missedTraining.ts) and the pairs you said Liever niet to.
  // A missed training a loose watch or MacroFactor log may belong to gets the link proposal first, never
  // a catch-up (rule MISSED-CATCH-UP). Absent = on, nothing declined.
  missedLink?: { on: boolean; declined: readonly string[]; declinedOn?: Readonly<Record<string, string>> };
  // Rows an accepted TEST-RETRY proposal made a test (`retryTestRows` of the stored proposals). A
  // retry that was skipped or missed is spoken for by TEST-RETRY once more, not by TEST-MAKE-ROOM.
  retryRows?: ReadonlySet<string>;
  // What the key session is (engine/keySession.ts#keyFocusOf): the same as the line on Ascend.
  // Absent: the long run or the mountain hike.
  keyFocus?: KeyFocus;
  // Internal: leave TEST-RETRY out, for the check of its own end state (it would otherwise call itself).
  noRetry?: boolean;
}

export const LOAD_SPORT_TYPES = new Set(['cardio', 'hiking']);

// A planned session counts as done when it has its own log, or when the
// same training was logged within two days of it without being linked
// (logged as a loose training, or on another day than planned).
export function isDone(s: PlannedSession, logs: SessionLog[], loggedIds: Set<string | undefined>): boolean {
  if (loggedIds.has(s.id)) return true;
  return logs.some((l) => !l.plannedSessionId && l.templateId === s.templateId && Math.abs(daysBetween(l.completedDate, s.scheduledDate)) <= 2);
}

// Sessions from before week 1 (an old schedule) are never held against you.
export function inProgram(s: PlannedSession, program: Program | null | undefined): boolean {
  return !program || s.scheduledDate >= mondayOfWeek(program.startDate);
}

export function proposal(issue: string, items: PlanChangeItem[], consequences: string, explanation: string): PlanChangeProposal {
  return { id: makeId('planchange'), trigger: 'session_skipped', issue, changes: items, alternatives: [], consequences, explanation, createdAt: new Date().toISOString() };
}

// A free day for `session` from `fromDate` to the end of its week: room
// under the user's time budget/pairing preference, and no second
// leg-heavy session within 48 hours of it (the one hard scheduling rule).
// Catching up a key session that is a hard run (a tempo run or intervals for a 10 km,
// engine/keySession.ts): never the day before or after another hard run, and not on
// the same day. A missed session in the past carries no load; a logged one does.
// Opt-in (`hardApart`), so the morning and load rules that also use these dates keep their own checks.
export function hardRunApart(date: string, session: PlannedSession, template: SessionTemplate, inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, ignore: readonly string[] = []): boolean {
  if (!isHardRun(template)) return true;
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const near = new Set([addDays(date, -1), date, addDays(date, 1)]);
  const plannedHard = inputs.plannedSessions.some((o) => o.id !== session.id && !ignore.includes(o.id) && o.status !== 'skipped' && near.has(o.scheduledDate)
    && (o.scheduledDate >= inputs.asOf || loggedIds.has(o.id)) && (() => { const t = templateById.get(o.templateId); return !!t && isHardRun(t); })());
  const loggedHard = inputs.logs.some((l) => near.has(l.completedDate) && l.plannedSessionId !== session.id && (() => { const t = templateById.get(l.templateId); return !!t && isHardRun(t); })());
  return !plannedHard && !loggedHard;
}

export function findCatchUpDate(
  session: PlannedSession,
  template: SessionTemplate,
  inputs: AdviceInputs,
  templateById: Map<string, SessionTemplate>,
  fromDate: string,
  opts: { hardApart?: boolean } = {},
): string | undefined {
  const week = inputs.plannedSessions.filter((s) => s.weekStartDate === session.weekStartDate && s.id !== session.id && s.status !== 'skipped');
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  for (const date of weekDates(session.weekStartDate)) {
    if (date < fromDate) continue;
    if (!dayHasRoomFor(date, template, week, templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference)) continue;
    // Same 48-hour rule as everywhere else, for legs and upper body alike;
    // a session that was itself missed carries no load.
    const withLoad = week.filter((other) => other.scheduledDate >= inputs.asOf || loggedIds.has(other.id));
    if (!respectsHeavySpacing(date, template, withLoad, templateById, inputs.logs, session.id)) continue;
    if (opts.hardApart && !hardRunApart(date, session, template, inputs, templateById)) continue;
    return date;
  }
  return undefined;
}

// Every good day for `session` from `fromDate` on in its week, nearest first
// (the same checks as findCatchUpDate), optionally filtered further.
export function catchUpDates(session: PlannedSession, template: SessionTemplate, inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, fromDate: string, accept: (date: string) => boolean = () => true, opts: { hardApart?: boolean } = {}): string[] {
  const out: string[] = [];
  for (let from = fromDate, n = 0; n < 7; n++) {
    const found = findCatchUpDate(session, template, inputs, templateById, from, opts);
    if (!found) break;
    if (accept(found)) out.push(found);
    from = addDays(found, 1);
  }
  return out;
}

// Up to three days to move one session to, as options: the first is the
// proposal itself. One option only: no choice to show.
export function moveOptions(title: string, item: PlanChangeItem, dates: string[], name: string, why: string, effectFor: (date: string) => string): { proposal: PlanChangeProposal; options?: AdviceOption[] } {
  const all = dates.slice(0, MAX_OPTIONS).map((d) => ({
    label: `${name} naar ${formatWeekdayDateNL(d)}`,
    effect: effectFor(d),
    proposal: proposal(title, [{ ...item, toDate: d }], `${name} schuift naar ${formatWeekdayDateNL(d)}.`, why),
  }));
  return { proposal: all[0].proposal, options: all.length > 1 ? all : undefined };
}

// A planned rest day today or tomorrow, after a day without any training:
// there is nothing to recover from, so it can carry the missed key
// session instead (production feedback: "zo'n rustdag is niet meer nodig
// als je gisteren niks gedaan hebt"). Also works across the week
// boundary: a long run missed on Sunday lands on Monday's rest day.
export function findRestDayToUse(
  session: PlannedSession,
  template: SessionTemplate,
  inputs: AdviceInputs,
  templateById: Map<string, SessionTemplate>,
  opts: { hardApart?: boolean } = {},
): PlannedSession | undefined {
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const isRest = (s: PlannedSession) => templateById.get(s.templateId)?.type === 'recovery';
  for (const date of [inputs.asOf, addDays(inputs.asOf, 1)]) {
    const rest = inputs.plannedSessions.find((s) => s.scheduledDate === date && s.status !== 'skipped' && isRest(s) && !loggedIds.has(s.id));
    if (!rest) continue;
    const dayBefore = addDays(date, -1);
    const trainedDayBefore = inputs.logs.some((l) => l.completedDate === dayBefore && templateById.get(l.templateId)?.type !== 'recovery');
    if (trainedDayBefore) continue;
    // Nothing else of weight on that day, and 48 hours from the next heavy day.
    const sameDay = inputs.plannedSessions.filter((s) => s.scheduledDate === date && s.id !== rest.id && s.status !== 'skipped' && !isRest(s));
    if (sameDay.length > 0) continue;
    const around = inputs.plannedSessions.filter((s) => s.id !== session.id && s.id !== rest.id && s.status !== 'skipped' && (s.scheduledDate >= inputs.asOf || loggedIds.has(s.id)));
    if (!respectsHeavySpacing(date, template, around, templateById, inputs.logs, session.id)) continue;
    if (opts.hardApart && !hardRunApart(date, session, template, inputs, templateById, [rest.id])) continue;
    return rest;
  }
  return undefined;
}

// A key session caught up in the NEXT week, which already has a key session
// of its own: the short version. Two full long trainings in one week, often
// after a week with little training, is a jump in volume; the week's own
// long training keeps the build-up (production feedback, October 2026).
// Undefined: the session keeps its normal length.
export function catchUpMinutes(session: PlannedSession, template: SessionTemplate, toDate: string, inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): number | undefined {
  const week = mondayOfWeek(toDate);
  if (week === mondayOfWeek(session.scheduledDate)) return undefined;
  const ownKey = inputs.plannedSessions.some((o) => {
    const t = templateById.get(o.templateId);
    return o.id !== session.id && o.status !== 'skipped' && mondayOfWeek(o.scheduledDate) === week && !!t && isKeySession(t, inputs.keyFocus);
  });
  if (!ownKey) return undefined;
  return template.durationVariants.short ?? Math.max(15, Math.round((template.durationVariants.full * 0.75) / 5) * 5);
}

// The week's key sessions, the only ones worth catching up: the one definition of
// engine/keySession.ts, for the goal on top of Ascend or the direction. Without a
// focus: the long run or the mountain hike, as always.
export function isKeySession(template: SessionTemplate, focus?: KeyFocus): boolean {
  return isKeyFor(template, focus);
}

// Moved leg strength must not leave the next hard session in the two days after it too heavy
// (index 12 at most), shared by TEST-MAKE-ROOM and TEST-RETRY.
export function leavesNextHardFresh(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, d: string, s: PlannedSession, others: PlannedSession[]): boolean {
  const t = templateById.get(s.templateId);
  if (!t || !isLegHeavyTemplate(t)) return true;
  const hard = others.find((o) => { const ot = templateById.get(o.templateId); return !!ot && ot.type !== 'strength' && ot.type !== 'recovery' && (isHardRun(ot) || isLegHeavyTemplate(ot)) && daysBetween(d, o.scheduledDate) >= 0 && daysBetween(d, o.scheduledDate) <= 2; });
  if (!hard) return true;
  if (hard.scheduledDate === d) return false; // the same day as a hard session: never
  return freshnessAt(hard.scheduledDate, others.filter((o) => o.id !== hard.id), templateById, inputs.logs, { id: s.id, templateId: s.templateId, date: d, plannedMinutes: s.plannedMinutes }).index <= FATIGUE_THRESHOLDS.hard.fresh;
}
