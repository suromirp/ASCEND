// ASCEND — advice engine (Fase 3).
//
// Deterministic coaching: every piece of advice is one TRIGGER (something
// that happened), one RULE (a fixed, readable if-then), and one EFFECT
// (what ASCEND suggests, optionally as a concrete PlanChangeProposal the
// user can accept). No AI, no guessing — the same inputs always give the
// same advice, and the "waarom" line spells out trigger -> rule -> effect.
//
// Boundaries, on purpose:
// - Load feedback (too hard / too light) only for running, cycling and
//   hiking — the sports ASCEND actually measures. Strength is tracked in
//   MacroFactor: ASCEND only looks at whether sessions happened
//   (regularity), never at loads.
// - An effect never removes history and never stacks sessions: a missed
//   session is moved to a free day in the same week or let go.
// - Whether an accepted proposal is applied at once or asked first is not
//   decided here — that's the shared feedback pattern (changeImpact.ts);
//   accepting advice IS the user's confirmation.

import { checkInFor, morningSignals, tiredStreak } from './wellbeing';
import type { MorningCheckIn } from '../models/checkIn';
import { FATIGUE_THRESHOLDS } from './legFatigue';
import { proposeRestWeekSkip } from './restWeek';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { InjuryNote } from '../models/injury';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { IllnessEpisode } from '../models/illness';
import { activeIllness, isIllnessDay, recoveryRamp } from './illness';
import { findHeavyConflicts, freshnessAt, isHardRun, respectsHeavySpacing, dayHasRoomFor, isLegHeavyTemplate, isIntentionalBackToBack, heavyAxes, HEAVY_AXIS_LABEL } from './scheduler';
import { isTemplatePlannable, type EnabledSports } from './sports';
import { addDays, daysBetween, formatDateNL, mondayOfWeek, weekDates, weekdayShortNL } from '../utils/dates';
import { makeId } from '../utils/id';
import { plannedRpeTop, EASY_RPE_TOP } from './coach';
import { proposeExtraSession, type ExtraAdviceInputs } from './extraRun';

export type AdviceTrigger = 'plan_update' | 'same_muscles_back_to_back' | 'session_missed' | 'session_too_hard' | 'session_too_light' | 'injury_active' | 'strength_irregular';

export interface Advice {
  id: string; // deterministic (rule + subject) — a response to it sticks
  trigger: AdviceTrigger;
  ruleId: string;
  title: string;
  effect: string;
  why: string;
  priority: number; // higher first
  proposal?: PlanChangeProposal;
  // More than one good way: the best first (the same as `proposal`), you
  // choose which one Akkoord applies.
  options?: AdviceOption[];
  relatedLogId?: string;
  // Rule REST-WEEK-SKIP: Akkoord trains through the rest week of this
  // Monday (engine/restWeek.ts). A program change, not a session change.
  restWeekSkip?: string;
}

export interface AdviceOption {
  label: string;
  effect: string;
  proposal: PlanChangeProposal;
}

const MAX_OPTIONS = 3;

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
  // The extra training of the week (engine/extraRun.ts, rule EXTRA-SESSION).
  extraSession?: Pick<ExtraAdviceInputs, 'gaps' | 'races' | 'ambition' | 'anchor' | 'restDay' | 'planChangeLog'>;
}

const LOAD_SPORT_TYPES = new Set(['cardio', 'hiking']);
const LEG_BODY_PARTS = ['knie', 'enkel', 'heup', 'hamstring', 'kuit', 'voet', 'achilles', 'quadriceps', 'been', 'benen'];

// A planned session counts as done when it has its own log, or when the
// same training was logged within two days of it without being linked
// (logged as a loose training, or on another day than planned).
function isDone(s: PlannedSession, logs: SessionLog[], loggedIds: Set<string | undefined>): boolean {
  if (loggedIds.has(s.id)) return true;
  return logs.some((l) => !l.plannedSessionId && l.templateId === s.templateId && Math.abs(daysBetween(l.completedDate, s.scheduledDate)) <= 2);
}

// Sessions from before week 1 (an old schedule) are never held against you.
function inProgram(s: PlannedSession, program: Program | null | undefined): boolean {
  return !program || s.scheduledDate >= mondayOfWeek(program.startDate);
}

function shortDate(iso: string): string {
  return `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;
}

function proposal(issue: string, items: PlanChangeItem[], consequences: string, explanation: string): PlanChangeProposal {
  return { id: makeId('planchange'), trigger: 'session_skipped', issue, changes: items, alternatives: [], consequences, explanation, createdAt: new Date().toISOString() };
}

// A free day for `session` from `fromDate` to the end of its week: room
// under the user's time budget/pairing preference, and no second
// leg-heavy session within 48 hours of it (the one hard scheduling rule).
function findCatchUpDate(
  session: PlannedSession,
  template: SessionTemplate,
  inputs: AdviceInputs,
  templateById: Map<string, SessionTemplate>,
  fromDate: string,
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
    return date;
  }
  return undefined;
}

// Every good day for `session` from `fromDate` on in its week, nearest first
// (the same checks as findCatchUpDate), optionally filtered further.
function catchUpDates(session: PlannedSession, template: SessionTemplate, inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, fromDate: string, accept: (date: string) => boolean = () => true): string[] {
  const out: string[] = [];
  for (let from = fromDate, n = 0; n < 7; n++) {
    const found = findCatchUpDate(session, template, inputs, templateById, from);
    if (!found) break;
    if (accept(found)) out.push(found);
    from = addDays(found, 1);
  }
  return out;
}

// Up to three days to move one session to, as options: the first is the
// proposal itself. One option only: no choice to show.
function moveOptions(title: string, item: PlanChangeItem, dates: string[], name: string, why: string, effectFor: (date: string) => string): { proposal: PlanChangeProposal; options?: AdviceOption[] } {
  const all = dates.slice(0, MAX_OPTIONS).map((d) => ({
    label: `${name} naar ${shortDate(d)}`,
    effect: effectFor(d),
    proposal: proposal(title, [{ ...item, toDate: d }], `${name} schuift naar ${shortDate(d)}.`, why),
  }));
  return { proposal: all[0].proposal, options: all.length > 1 ? all : undefined };
}

// A planned rest day today or tomorrow, after a day without any training:
// there is nothing to recover from, so it can carry the missed key
// session instead (production feedback: "zo'n rustdag is niet meer nodig
// als je gisteren niks gedaan hebt"). Also works across the week
// boundary: a long run missed on Sunday lands on Monday's rest day.
function findRestDayToUse(
  session: PlannedSession,
  template: SessionTemplate,
  inputs: AdviceInputs,
  templateById: Map<string, SessionTemplate>,
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
    return rest;
  }
  return undefined;
}

// A key session caught up in the NEXT week, which already has a key session
// of its own: the short version. Two full long trainings in one week, often
// after a week with little training, is a jump in volume; the week's own
// long training keeps the build-up (production feedback, October 2026).
// Undefined: the session keeps its normal length.
function catchUpMinutes(session: PlannedSession, template: SessionTemplate, toDate: string, inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): number | undefined {
  const week = mondayOfWeek(toDate);
  if (week === mondayOfWeek(session.scheduledDate)) return undefined;
  const ownKey = inputs.plannedSessions.some((o) => {
    const t = templateById.get(o.templateId);
    return o.id !== session.id && o.status !== 'skipped' && mondayOfWeek(o.scheduledDate) === week && !!t && isKeySession(t);
  });
  if (!ownKey) return undefined;
  return template.durationVariants.short ?? Math.max(15, Math.round((template.durationVariants.full * 0.75) / 5) * 5);
}

// --- Rule MISSED-CATCH-UP --------------------------------------------------
// Trigger: a planned session in the last 3 days has no log and wasn't
// skipped. Rule: catch up on a free day later this same week, if one
// exists without breaking the 48h leg rule; otherwise let it go — never
// double up. Effect: a move (or skip) proposal.
function missedAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  // Ill or building back up: nothing gets caught up (engine/illness.ts).
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const recentMissed = inputs.plannedSessions.filter(
    (s) => s.templateId !== TEST_RUN_ID && s.status !== 'skipped' && !isDone(s, inputs.logs, loggedIds) && inProgram(s, inputs.program) && s.scheduledDate < inputs.asOf && daysBetween(s.scheduledDate, inputs.asOf) <= 3
      && !isIllnessDay(s.scheduledDate, inputs.illnessEpisodes, inputs.asOf),
  );
  // One advice for everything missed, not one each (production feedback:
  // a stack of "gemist" cards). Only a key session (the long run or the
  // mountain hike) is caught up, on a free day this week that keeps 48
  // hours from other heavy leg days; everything else is let go
  // (docs/onderzoek, rapport 2, rule C8: catching up is never stacking).
  const rule = 'ASCEND haalt alleen de sleuteltraining van de week in, de lange duurloop of de bergtocht, op een vrije dag in dezelfde week en nooit binnen 48 uur van een andere zware beendag. Staat er vandaag of morgen een rustdag en deed je de dag ervoor niets, dan wordt die rustdag de inhaaldag: er is niets om van te herstellen. De rest laten we gaan: twee trainingen op één dag om bij te benen helpt niet.';
  const missed = recentMissed
    .map((s) => ({ s, template: templateById.get(s.templateId) }))
    .filter((m): m is { s: PlannedSession; template: SessionTemplate } => !!m.template && m.template.type !== 'recovery')
    .sort((x, y) => x.s.scheduledDate.localeCompare(y.s.scheduledDate));
  if (missed.length === 0) return [];

  const items: PlanChangeItem[] = [];
  const caughtUp: string[] = [];
  const dropped: string[] = [];
  let usedRest = false;
  for (const { s, template } of missed) {
    const key = isKeySession(template);
    const plannable = key && isTemplatePlannable(template, inputs.enabledSports);
    const catchUp = plannable ? findCatchUpDate(s, template, inputs, templateById, inputs.asOf) : undefined;
    const restDay = plannable && !catchUp && !usedRest ? findRestDayToUse(s, template, inputs, templateById) : undefined;
    if (restDay) {
      usedRest = true;
      const minutes = catchUpMinutes(s, template, restDay.scheduledDate, inputs, templateById);
      items.push({ plannedSessionId: s.id, action: 'move', fromDate: s.scheduledDate, toDate: restDay.scheduledDate, plannedMinutes: minutes, reason: `Gemist op ${shortDate(s.scheduledDate)}, ingehaald op je rustdag: de dag ervoor deed je geen training.`, generatedBy: ['engine/adviceEngine.ts', 'MISSED-CATCH-UP'] });
      items.push({ plannedSessionId: restDay.id, action: 'remove', reason: 'Rustdag niet nodig: de dag ervoor deed je geen training.', generatedBy: ['engine/adviceEngine.ts', 'MISSED-CATCH-UP'] });
      caughtUp.push(`${template.name} doe je ${restDay.scheduledDate === inputs.asOf ? 'vandaag' : 'morgen'} in plaats van je rustdag, want ${restDay.scheduledDate === inputs.asOf ? 'gisteren' : 'vandaag'} deed je geen training${minutes ? `. Korter, ${minutes} minuten: deze week staat er al een lange training, en twee volle in één week is te veel ineens` : ''}`);
    } else if (catchUp) {
      items.push({ plannedSessionId: s.id, action: 'move', fromDate: s.scheduledDate, toDate: catchUp, reason: `Gemist op ${shortDate(s.scheduledDate)}, ingehaald op een vrije dag in dezelfde week.`, generatedBy: ['engine/adviceEngine.ts', 'MISSED-CATCH-UP'] });
      caughtUp.push(`${template.name} haal je in op ${shortDate(catchUp)}`);
    } else {
      items.push({ plannedSessionId: s.id, action: 'remove', reason: key ? 'Gemist en deze week niet in te halen zonder te stapelen.' : 'Gemist; alleen de sleuteltraining van de week wordt ingehaald.', generatedBy: ['engine/adviceEngine.ts', 'MISSED-CATCH-UP'] });
      dropped.push(template.name);
    }
  }
  const names = missed.map((m) => m.template.name);
  const list = (xs: string[]) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} en ${xs.at(-1)}`);
  const title = missed.length === 1 ? `${names[0]} van ${shortDate(missed[0].s.scheduledDate)} gemist` : `${missed.length} trainingen gemist: ${list(names)}`;
  const effect = [
    caughtUp.length > 0 ? `${caughtUp.join('; ')}.` : '',
    dropped.length > 0 ? `${list(dropped)} ${dropped.length === 1 ? 'laten we gaan' : 'laten we gaan'}, de rest van de week blijft zoals gepland.` : '',
  ].filter(Boolean).join(' ');
  // One training caught up on a free day: the other free days as options.
  let options: AdviceOption[] | undefined;
  const single = items.length === 1 && items[0].action === 'move' && !usedRest ? missed[0] : undefined;
  if (single) {
    const dates = catchUpDates(single.s, single.template, inputs, templateById, inputs.asOf);
    if (dates.length > 1) options = moveOptions(title, items[0], dates, single.template.name, rule, (d) => `${single.template.name} haal je in op ${shortDate(d)}.`).options;
  }
  return [{
    options,
    id: `missed:${missed.map((m) => m.s.id).join('+')}`,
    trigger: 'session_missed',
    ruleId: 'MISSED-CATCH-UP',
    title,
    effect,
    why: `${missed.length === 1 ? 'Je hebt deze training niet afgevinkt.' : 'Je hebt deze trainingen niet afgevinkt.'} ${rule}`,
    priority: caughtUp.length > 0 ? 3 : 2,
    proposal: proposal(title, items, effect, rule),
  }];
}

// The long run and the mountain hike are the week's key sessions: the only
// ones worth catching up.
function isKeySession(template: SessionTemplate): boolean {
  return ['tpl_long_run', 'tpl_mountain_hike', 'tpl_hike_day_one'].includes(template.id) || /lange duurloop|bergtocht/i.test(template.name);
}

// --- Rule TEST-MAKE-ROOM -----------------------------------------------------
// Trigger: the 5 km test run was missed or skipped (no time). The test is
// what sets your race pace, so it is worth more than most trainings around
// it. Rule: first a free day in the next 9 days that keeps the spacing
// (a test never within 48 hours after heavy legs, 72 before a test, and not
// next to another hard run); if there is none, the least important training
// on a day that does fit goes, and the test takes its place. Never the long
// run, the mountain hike, a race or leg strength. Always a proposal.
const TEST_RUN_ID = 'tpl_test_run';
const TEST_ROOM_DAYS = 9;

// How much a training can be missed, lowest first; undefined: never taken out.
function removalCost(templateId: string, template: SessionTemplate): number | undefined {
  if (['tpl_strides_run', 'tpl_fartlek', 'tpl_progression_run', 'tpl_recovery_run', 'tpl_ruck_walk', 'tpl_bergconditie'].includes(templateId)) return 1;
  if (templateId === 'tpl_easy_run') return 2;
  if (template.type === 'strength' && !isLegHeavyTemplate(template)) return 3;
  if (['tpl_hill_intervals', 'tpl_hills_descent', 'tpl_intervals', 'tpl_tempo_run'].includes(templateId)) return 4;
  return undefined;
}

function testRunAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, usedIds: Set<string>): Advice[] {
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const test = templateById.get(TEST_RUN_ID);
  if (!test) return [];
  const today = inputs.asOf;
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const open = (s: PlannedSession) => s.status !== 'skipped' && !loggedIds.has(s.id);
  // Not in the two weeks before a race: that is the taper.
  if (inputs.plannedSessions.some((s) => s.templateId === 'tpl_race' && open(s) && daysBetween(today, s.scheduledDate) >= 0 && daysBetween(today, s.scheduledDate) <= 14)) return [];
  // A test that sits on your rest day (the rest day moved onto it, or the
  // test fell on it): that is arranged like a missed one, around its own date.
  const restDates = new Set(inputs.plannedSessions.filter((s) => open(s) && templateById.get(s.templateId)?.type === 'recovery').map((s) => s.scheduledDate));
  const onRestDay = inputs.plannedSessions
    .filter((s) => s.templateId === TEST_RUN_ID && open(s) && s.scheduledDate > today && daysBetween(today, s.scheduledDate) <= 14 && restDates.has(s.scheduledDate) && !usedIds.has(s.id))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  // Another test already waiting in the next two weeks: nothing to arrange.
  if (!onRestDay && inputs.plannedSessions.some((s) => s.templateId === TEST_RUN_ID && open(s) && s.scheduledDate >= today && daysBetween(today, s.scheduledDate) <= 14)) return [];

  const lost = onRestDay ?? inputs.plannedSessions
    .filter((s) => s.templateId === TEST_RUN_ID && !loggedIds.has(s.id) && !isDone(s, inputs.logs, loggedIds) && inProgram(s, inputs.program) && !inputs.removedByPlanIds?.has(s.id) && !usedIds.has(s.id)
      && !isIllnessDay(s.scheduledDate, inputs.illnessEpisodes, today)
      && (s.status === 'skipped' ? daysBetween(s.scheduledDate, today) >= -14 && daysBetween(s.scheduledDate, today) <= 7 : s.scheduledDate < today && daysBetween(s.scheduledDate, today) <= 7))
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0];
  if (!lost) return [];

  const load = (without: Set<string>) => inputs.plannedSessions.filter((s) => s.id !== lost.id && !without.has(s.id) && s.status !== 'skipped' && (s.scheduledDate >= today || loggedIds.has(s.id)));
  const weekOf = (date: string) => inputs.plannedSessions.filter((s) => s.weekStartDate === mondayOfWeek(date) && s.id !== lost.id && s.status !== 'skipped');
  // The days after today; for a test on your rest day those around its own
  // date, nearest first, never a rest day itself.
  const days = onRestDay
    ? Array.from({ length: 9 }, (_, i) => addDays(lost.scheduledDate, [1, -1, 2, -2, 3, -3, 4, -4, 5][i]))
      .filter((d) => d > today && !restDates.has(d) && !isIllnessDay(d, inputs.illnessEpisodes, today))
    : Array.from({ length: TEST_ROOM_DAYS }, (_, i) => addDays(today, i + 1));
  const why = 'De testloop van 5 km is het meetpunt voor je wedstrijdtempo: daarop stelt ASCEND je tempo af, en daaruit rekent hij je voorspelde tijd. Daarom hoort hij erin, ook als er een andere training voor moet wijken. Alleen jij beslist: dit is een voorstel.';
  const missedWord = lost.status === 'skipped' ? 'overgeslagen' : 'gemist';
  const title = onRestDay ? `Testloop van ${shortDate(lost.scheduledDate)} staat op je rustdag` : `Testloop van ${shortDate(lost.scheduledDate)} ${missedWord}`;
  const moveItem = (date: string): PlanChangeItem => ({ plannedSessionId: lost.id, action: 'move', fromDate: lost.scheduledDate, toDate: date, reason: 'De testloop is het meetpunt voor je tempo.', generatedBy: ['engine/adviceEngine.ts', 'TEST-MAKE-ROOM'] });

  // 1b. Move leg strength out of the way rather than dropping anything: to
  // after the test, that evening (with "Zware dingen op één dag") or in the
  // days after. Running first and lifting later leaves the next run alone
  // (Doma en Deakin 2013; docs/onderzoek/Spierbelasting en beenvermoeidheid.md).
  // Strength that shares the day (when the test doesn't fit beside it) moves
  // too, to the nearest day where it fits; nothing is dropped in this step.
  // Moved leg strength must not leave the next hard session (hills, intervals,
  // tempo, a long run) in the two days after it too heavy: index 12 at most
  // (docs/onderzoek/Spierbelasting en beenvermoeidheid.md, "Drempels").
  function nextHardStaysFresh(d: string, s: PlannedSession, others: PlannedSession[]): boolean {
    const t = templateById.get(s.templateId);
    if (!t || !isLegHeavyTemplate(t)) return true;
    const hard = others.find((o) => { const ot = templateById.get(o.templateId); return !!ot && ot.type !== 'strength' && ot.type !== 'recovery' && (isHardRun(ot) || isLegHeavyTemplate(ot)) && daysBetween(d, o.scheduledDate) >= 0 && daysBetween(d, o.scheduledDate) <= 2; });
    if (!hard) return true;
    if (hard.scheduledDate === d) return false; // the same day as a hard session: never
    return freshnessAt(hard.scheduledDate, others.filter((o) => o.id !== hard.id), templateById, inputs.logs, { id: s.id, templateId: s.templateId, date: d, plannedMinutes: s.plannedMinutes }).index <= FATIGUE_THRESHOLDS.hard.fresh;
  }

  function moveStrengthFor(date: string): Advice[] | undefined {
    if (!test || !lost) return undefined;
    const base = load(new Set());
    const sameDay = base.filter((s) => s.scheduledDate === date && templateById.get(s.templateId)?.type !== 'recovery');
    const roomOk = dayHasRoomFor(date, test, weekOf(date), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference);
    const blockers = findHeavyConflicts(lost.id, test, date, base, templateById, inputs.logs);
    const toMove = [...blockers, ...(roomOk ? [] : sameDay.filter((s) => !blockers.some((b) => b.id === s.id)))];
    if (toMove.length === 0 || !toMove.every(movable)) return undefined;
    const testAt: PlannedSession = { ...lost, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned' };
    let now = base;
    const moves: { session: PlannedSession; to: string }[] = [];
    for (const s of toMove) {
      const t = templateById.get(s.templateId)!;
      const legs = isLegHeavyTemplate(t);
      const others = now.filter((o) => o.id !== s.id);
      // Leg strength after the test (that evening first); upper body the nearest free day.
      const targets = legs ? [0, 1, 2, 3] : [1, -1, 2, -2, 3];
      const to = targets.map((d) => addDays(date, d)).find((d) => {
        if (d < today || d === s.scheduledDate && d === date || restDates.has(d) || isIllnessDay(d, inputs.illnessEpisodes, today)) return false;
        const week = [...weekOf(d).filter((o) => o.id !== s.id && !moves.some((m) => m.session.id === o.id)), ...moves.filter((m) => m.to === d).map((m) => ({ ...m.session, scheduledDate: m.to })), ...(d === date ? [testAt] : [])];
        return dayHasRoomFor(d, t, week, templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference)
          && respectsHeavySpacing(d, t, [...others, testAt], templateById, inputs.logs, s.id)
          && nextHardStaysFresh(d, s, [...others, testAt]);
      });
      if (!to) break;
      moves.push({ session: s, to });
      now = [...others, { ...s, scheduledDate: to, weekStartDate: mondayOfWeek(to) }];
    }
    const weekAfter = [...weekOf(date).filter((o) => !moves.some((m) => m.session.id === o.id)), ...moves.map((m) => ({ ...m.session, scheduledDate: m.to }))];
    if (moves.length !== toMove.length || !dayHasRoomFor(date, test, weekAfter, templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference) || !respectsHeavySpacing(date, test, now, templateById, inputs.logs, lost.id)) return undefined;
    const moveLines = moves.map((m) => `${templateById.get(m.session.templateId)?.name ?? 'Kracht'} naar ${m.to === date ? `${shortDate(m.to)}, na de test (minstens 6 uur later)` : shortDate(m.to)}`);
    const items: PlanChangeItem[] = [
      ...moves.map((m): PlanChangeItem => ({ plannedSessionId: m.session.id, action: 'move', fromDate: m.session.scheduledDate, toDate: m.to, reason: 'Na de test, zodat je benen fris zijn voor de testloop.', generatedBy: ['engine/adviceEngine.ts', 'TEST-MAKE-ROOM'] })),
      moveItem(date),
    ];
    const effect = `Doe hem ${shortDate(date)}, en ${moveLines.join(' en ')}. Eerst lopen en daarna kracht verstoort je volgende loop niet, andersom wel. ${why}`;
    return [{ id: `testroom:${lost.id}`, trigger: onRestDay ? 'plan_update' : 'session_missed', ruleId: 'TEST-MAKE-ROOM', title, effect, why, priority: 3, proposal: proposal(title, items, `De testloop komt op ${shortDate(date)}; ${moveLines.join('; ')}.`, why) }];
  }

  // 1. Per day, nearest first: a free day, or else (1b below) a day that
  // becomes free by moving strength, before looking at the next day.
  const isStrength = (s: PlannedSession) => templateById.get(s.templateId)?.type === 'strength';
  const movable = (s: PlannedSession) => isStrength(s) && s.scheduledDate >= today && !loggedIds.has(s.id);
  // The smallest change wins: a day further away weighs one, every training
  // moved aside two (a free day two days off beats moving two sessions).
  const daysFrom = (date: string) => (onRestDay ? Math.abs(daysBetween(lost.scheduledDate, date)) : daysBetween(today, date));
  type Candidate = { cost: number; date: string; label: string; effect: string; proposal: PlanChangeProposal };
  const candidates: Candidate[] = [];
  for (const date of days) {
    const free = dayHasRoomFor(date, test, weekOf(date), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference)
      && respectsHeavySpacing(date, test, load(new Set()), templateById, inputs.logs, lost.id);
    if (!free) {
      const moved = moveStrengthFor(date);
      if (moved) {
        const extra = moved[0].proposal!.changes.filter((c) => c.plannedSessionId !== lost.id);
        const label = `${shortDate(date)}, ${extra.map((c) => `${templateById.get(inputs.plannedSessions.find((x) => x.id === c.plannedSessionId)?.templateId ?? '')?.name ?? 'training'} naar ${shortDate(c.toDate!)}`).join(', ')}`;
        candidates.push({ cost: daysFrom(date) + 2 * extra.length, date, label, effect: moved[0].effect, proposal: moved[0].proposal! });
      }
      continue;
    }
    const sameDayLegs = weekOf(date).filter((s) => s.scheduledDate === date && open(s) && (() => { const t = templateById.get(s.templateId); return !!t && t.type === 'strength' && isLegHeavyTemplate(t); })());
    const legsName = sameDayLegs.length > 0 ? templateById.get(sameDayLegs[0].templateId)?.name ?? 'Beenkracht' : undefined;
    const legsNote = legsName ? ` ${legsName} die dag pas na de test, minstens 6 uur later: eerst lopen, dan kracht.` : '';
    candidates.push({ cost: daysFrom(date), date, label: `${shortDate(date)}${legsName ? `, ${legsName} erna` : ''}`, effect: `Doe hem ${shortDate(date)}.${legsNote} ${why}`, proposal: proposal(title, [moveItem(date)], `De testloop komt op ${shortDate(date)}.`, why) });
  }

  // 2. Make room: the least important trainings that stand in the way, on
  // that day or close to it (the hills the day after, an easy run the day
  // before). In a test week the test is the quality session, so the hills
  // of that week may go. Never the long run, leg strength or a race.
  // Dropping weighs more than moving: these come after the options above.
  for (const date of days) {
    // What is on that day only has to go when the test doesn't fit next to it.
    const fitsBeside = dayHasRoomFor(date, test, weekOf(date), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference);
    const there = fitsBeside ? [] : inputs.plannedSessions.filter((s) => s.scheduledDate === date && s.id !== lost.id && open(s) && templateById.get(s.templateId)?.type !== 'recovery');
    const blockers = findHeavyConflicts(lost.id, test, date, load(new Set(there.map((s) => s.id))), templateById, inputs.logs);
    const remove = [...there, ...blockers.filter((b) => !there.some((t) => t.id === b.id))];
    if (remove.length === 0 || remove.some((s) => loggedIds.has(s.id) || s.scheduledDate < today)) continue;
    const costs = remove.map((s) => { const t = templateById.get(s.templateId); return t ? removalCost(s.templateId, t) : undefined; });
    if (costs.some((c) => c === undefined)) continue;
    if (!respectsHeavySpacing(date, test, load(new Set(remove.map((s) => s.id))), templateById, inputs.logs, lost.id)) continue;
    const names = remove.map((s) => templateById.get(s.templateId)?.name ?? 'training');
    const items: PlanChangeItem[] = [
      ...remove.map((s): PlanChangeItem => ({ plannedSessionId: s.id, action: 'remove', reason: 'Plaats gemaakt voor de testloop.', generatedBy: ['engine/adviceEngine.ts', 'TEST-MAKE-ROOM'] })),
      moveItem(date),
    ];
    const verb = remove.length === 1 ? 'vervalt' : 'vervallen';
    const sameDay = remove.every((s) => s.scheduledDate === date);
    const effect = sameDay
      ? `Er is geen vrije dag. Mijn voorstel: ${names.join(' en ')} van ${shortDate(date)} ${verb} en de testloop komt daar. ${why}`
      : `Er is geen dag met frisse benen. Mijn voorstel: de testloop op ${shortDate(date)}, en ${remove.map((s) => `${templateById.get(s.templateId)?.name ?? 'training'} van ${shortDate(s.scheduledDate)}`).join(' en ')} ${verb}. In een testweek is de test je kwaliteitstraining. ${why}`;
    candidates.push({ cost: daysFrom(date) + 3 + (costs as number[]).reduce((a, b) => a + b, 0), date, label: `${shortDate(date)}, ${names.join(' en ')} ${verb}`, effect, proposal: proposal(title, items, `${names.join(' en ')} ${verb}; de testloop komt op ${shortDate(date)}.`, why) });
  }

  // The best first; up to three different options to choose from.
  for (const c of candidates) c.label = `Testloop ${c.label}`;
  const ranked = candidates.sort((a, b) => a.cost - b.cost || a.date.localeCompare(b.date)).filter((c, n, all) => all.findIndex((o) => o.label === c.label) === n).slice(0, MAX_OPTIONS);
  const trigger = onRestDay ? 'plan_update' as const : 'session_missed' as const;
  if (ranked.length > 0) {
    const [first] = ranked;
    return [{ id: `testroom:${lost.id}`, trigger, ruleId: 'TEST-MAKE-ROOM', title, effect: first.effect, why, priority: 3, proposal: first.proposal, options: ranked.length > 1 ? ranked.map((c) => ({ label: c.label, effect: c.effect, proposal: c.proposal })) : undefined }];
  }
  return [{ id: `testroom:${lost.id}`, trigger, ruleId: 'TEST-MAKE-ROOM', title, effect: 'De komende dagen is er geen goede plek voor de testloop zonder je zware dagen te raken. De volgende testloop staat in je plan; je kunt de testloop ook zelf in Week verplaatsen.', why, priority: 1 }];
}

// --- Rule HARD-THEN-SPACE ----------------------------------------------------
// Trigger: a run/ride/hike in the last 2 days logged at RPE 8+ or as
// "zwaarder dan normaal". Rule: the next leg-heavy session within a day of
// it gets one extra day, if there's room; otherwise keep it easy.
function tooHardAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const recent = inputs.logs
    .filter((l) => LOAD_SPORT_TYPES.has(l.type) && daysBetween(l.completedDate, inputs.asOf) <= 1 && daysBetween(l.completedDate, inputs.asOf) >= 0)
    .filter((l) => (l.rpe ?? 0) >= 8 || l.subjectiveFeel === 'worse')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  if (!recent) return [];
  const loggedName = templateById.get(recent.templateId)?.name ?? 'Je sessie';
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const next = inputs.plannedSessions
    .filter((s) => s.status !== 'skipped' && !loggedIds.has(s.id) && s.scheduledDate >= inputs.asOf && daysBetween(recent.completedDate, s.scheduledDate) <= 1)
    .find((s) => { const t = templateById.get(s.templateId); return t ? isLegHeavyTemplate(t) : false; });
  const signal = recent.rpe !== undefined && recent.rpe >= 8 ? `zwaarte ${recent.rpe} van 10` : 'zwaarder dan normaal';
  const rule = 'Na een zware training krijgt de eerstvolgende zware beendag een dag extra herstel, als daar plek voor is.';
  const base = { trigger: 'session_too_hard' as const, ruleId: 'HARD-THEN-SPACE', title: `${loggedName} was zwaar (${signal})`, relatedLogId: recent.id, priority: 4 };
  if (!next) {
    return [{ ...base, id: `hard:${recent.id}`, effect: 'Er staat morgen geen zware beensessie, dus er hoeft niets te schuiven. Houd het de komende dag rustig.', why: `Je laatste training was zwaar (${signal}). ${rule}`, priority: 1 }];
  }
  const nextTemplate = templateById.get(next.templateId)!;
  const laterDates = catchUpDates(next, nextTemplate, inputs, templateById, addDays(next.scheduledDate, 1));
  const later = laterDates[0];
  if (!later) {
    return [{ ...base, id: `hard:${recent.id}`, effect: `${nextTemplate.name} op ${shortDate(next.scheduledDate)} rustig houden (RPE 3-4); er is geen latere plek deze week.`, why: `Je laatste training was zwaar (${signal}). ${rule}` }];
  }
  const hardEffect = (d: string) => `${nextTemplate.name} naar ${shortDate(d)}.`;
  const moved = moveOptions(base.title, { plannedSessionId: next.id, action: 'move', fromDate: next.scheduledDate, toDate: later, reason: `Extra herstel na ${loggedName} (${signal}).`, generatedBy: ['engine/adviceEngine.ts', 'HARD-THEN-SPACE'] }, laterDates, nextTemplate.name, rule, hardEffect);
  return [{
    ...base,
    id: `hard:${recent.id}`,
    effect: hardEffect(later),
    why: `Je laatste training was zwaar (${signal}). ${rule}`,
    ...moved,
  }];
}

// --- Rule LIGHT-TWICE --------------------------------------------------------
// Trigger: the same run/ride/hike logged twice in a row at RPE 3 or
// lower. Rule: no manual action; the weekly planning raises load only
// when a goal asks for it and recovery is good. Effect: a hint.
function tooLightAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const byTemplate = new Map<string, SessionLog[]>();
  for (const l of inputs.logs) {
    if (!LOAD_SPORT_TYPES.has(l.type) || daysBetween(l.completedDate, inputs.asOf) > 14) continue;
    byTemplate.set(l.templateId, [...(byTemplate.get(l.templateId) ?? []), l]);
  }
  const advice: Advice[] = [];
  for (const [templateId, logs] of byTemplate) {
    const lastTwo = [...logs].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 2);
    // An easy session (planned at most RPE 4: easy run, long run) is meant
    // to feel light; that's no sign it could be more (production feedback:
    // "lange duurloop voelde twee keer licht" after a zone 2 long run).
    const template = templateById.get(templateId);
    const top = template ? plannedRpeTop(template, lastTwo[0]?.completedDate ?? inputs.asOf, inputs.program) : undefined;
    if (top !== undefined && top <= EASY_RPE_TOP) continue;
    if (lastTwo.length < 2 || !lastTwo.every((l) => l.rpe !== undefined && l.rpe <= 3)) continue;
    const name = template?.name ?? 'Deze sessie';
    advice.push({
      id: `light:${lastTwo[0].id}`,
      trigger: 'session_too_light',
      ruleId: 'LIGHT-TWICE',
      title: `${name} voelde twee keer licht`,
      effect: 'Je hoeft niets te doen. Blijft je herstel goed, dan vraagt de weekplanning vanzelf iets meer zodra je doel dat nodig heeft.',
      why: 'Deze training voelde twee keer op rij heel licht (zwaarte 3 of lager). ASCEND verzwaart alleen via de weekplanning, stap voor stap, nooit na één losse training.',
      priority: 1,
      relatedLogId: lastTwo[0].id,
    });
  }
  return advice;
}

// --- Rule INJURY-LEGS ---------------------------------------------------------
// Trigger: an open injury on a leg area noted in the last 14 days. Rule:
// ASCEND adds nothing heavy for the legs; the user picks the short variant
// or skips. Effect: a hint naming this week's leg-heavy sessions.
function injuryAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const leg = inputs.injuries.find((i) => !i.resolvedDate && daysBetween(i.date, inputs.asOf) <= 14 && LEG_BODY_PARTS.some((p) => i.bodyPart.toLowerCase().includes(p)));
  if (!leg) return [];
  const upcoming = inputs.plannedSessions
    .filter((s) => s.status !== 'skipped' && s.scheduledDate >= inputs.asOf && daysBetween(inputs.asOf, s.scheduledDate) <= 6)
    .filter((s) => { const t = templateById.get(s.templateId); return t ? isLegHeavyTemplate(t) : false; })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .map((s) => `${templateById.get(s.templateId)?.name} (${shortDate(s.scheduledDate)})`);
  return [{
    id: `injury:${leg.id}`,
    trigger: 'injury_active',
    ruleId: 'INJURY-LEGS',
    title: `Blessure: ${leg.bodyPart.toLowerCase()}`,
    effect: upcoming.length > 0
      ? `Zware beensessies de komende week: ${upcoming.join(', ')}. Kies de korte variant of sla over als het niet goed voelt.`
      : 'Er staan de komende week geen zware beensessies. Houd het zo tot het beter voelt.',
    why: 'Je hebt een blessure aan been of voet genoteerd. ASCEND plant er niets zwaars bij. Jij bepaalt per training of het gaat.',
    priority: leg.severity === 'ernstig' ? 6 : 5,
  }];
}

// --- Rule STRENGTH-REGULARITY -------------------------------------------------
// Trigger: over the last 14 days, two or more planned strength sessions
// without a log. Rule: ASCEND only watches whether strength happens —
// loads and progression stay in MacroFactor. Effect: a hint.
function strengthAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const window = inputs.plannedSessions.filter((s) => {
    const t = templateById.get(s.templateId);
    return t?.type === 'strength' && s.status !== 'skipped' && inProgram(s, inputs.program) && s.scheduledDate < inputs.asOf && daysBetween(s.scheduledDate, inputs.asOf) <= 14
      && !isIllnessDay(s.scheduledDate, inputs.illnessEpisodes, inputs.asOf);
  });
  const done = window.filter((s) => isDone(s, inputs.logs, loggedIds)).length;
  const missed = window.length - done;
  if (window.length === 0 || missed < 2) return [];
  return [{
    id: `strength:${mondayOfWeek(inputs.asOf)}`, // at most once a week
    trigger: 'strength_irregular',
    ruleId: 'STRENGTH-REGULARITY',
    title: `Kracht: ${done} van ${window.length} trainingen afgevinkt`,
    effect: 'Past het huidige krachtblok nog bij je week? Minder sessies die je echt doet is beter dan meer die je mist. Je kunt het blok aanpassen op de ASCEND-pagina.',
    why: 'Twee of meer krachttrainingen zijn in de laatste 14 dagen niet afgevinkt. ASCEND kijkt bij kracht alleen naar regelmaat. Gewichten en progressie blijven in MacroFactor.',
    priority: 2,
  }];
}

// --- Rule SAME-MUSCLE-SPACING ------------------------------------------------
// Trigger: in the coming week, two sessions that load the SAME muscles
// heavily (both heavy for the upper body, or both heavy for the legs) sit
// on consecutive days — e.g. Bovenlichaam A and Bovenlichaam B, both chest/back/
// shoulders. A pairing the program marks as intentional (hill intervals +
// long run: running the long one on tired legs is the point) is left alone.
// Rule: heavy work for the same muscles ~48 hours apart, the same spacing
// ASCEND already keeps between two heavy leg days. Effect: move the later
// one to the nearest day in its week that keeps 48 hours from every other
// heavy session for those muscles and has room — or, if there is none,
// advise to keep it lighter.
function spacingAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const upcoming = inputs.plannedSessions
    .filter((s) => s.status !== 'skipped' && !loggedIds.has(s.id) && s.scheduledDate >= inputs.asOf && daysBetween(inputs.asOf, s.scheduledDate) <= 7)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const advice: Advice[] = [];
  const handled = new Set<string>();

  for (const a of upcoming) {
    for (const b of upcoming) {
      if (daysBetween(a.scheduledDate, b.scheduledDate) !== 1 || handled.has(b.id)) continue;
      const ta = templateById.get(a.templateId);
      const tb = templateById.get(b.templateId);
      if (!ta || !tb || isIntentionalBackToBack(ta, tb)) continue;
      const shared = heavyAxes(ta).filter((axis) => heavyAxes(tb).includes(axis));
      if (shared.length === 0) continue;
      handled.add(b.id);

      const week = inputs.plannedSessions.filter((s) => s.weekStartDate === b.weekStartDate && s.id !== b.id && s.status !== 'skipped');
      const keepsSpacing = (date: string) => week.every((other) => {
        const t = templateById.get(other.templateId);
        if (!t || !heavyAxes(t).some((axis) => shared.includes(axis) || heavyAxes(tb).includes(axis))) return true;
        return Math.abs(daysBetween(other.scheduledDate, date)) >= 2;
      });
      const candidates = weekDates(b.weekStartDate)
        .filter((d) => d >= inputs.asOf && d !== b.scheduledDate && keepsSpacing(d)
          && dayHasRoomFor(d, tb, week, templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference))
        .sort((x, y) => Math.abs(daysBetween(b.scheduledDate, x)) - Math.abs(daysBetween(b.scheduledDate, y)));
      const muscles = shared.map((axis) => HEAVY_AXIS_LABEL[axis]).join(' en ');
      const title = `${ta.name} en ${tb.name} op twee dagen achter elkaar`;
      const why = `Er staan twee zware trainingen voor ${muscles} op opeenvolgende dagen. Zware training voor dezelfde spieren hoort ongeveer 48 uur uit elkaar te liggen, zodat ze kunnen herstellen.`;
      const target = candidates[0];
      if (!target) {
        advice.push({ id: `spacing:${b.id}:${b.scheduledDate}`, trigger: 'same_muscles_back_to_back', ruleId: 'SAME-MUSCLE-SPACING', title, effect: `Er is deze week geen dag met 48 uur ertussen. Houd ${tb.name} op ${shortDate(b.scheduledDate)} lichter, of kies de korte variant.`, why, priority: 3 });
        continue;
      }
      advice.push({
        id: `spacing:${b.id}:${b.scheduledDate}`,
        trigger: 'same_muscles_back_to_back',
        ruleId: 'SAME-MUSCLE-SPACING',
        title,
        effect: `${tb.name} naar ${shortDate(target)}, zodat er 48 uur tussen zit.`,
        why,
        priority: 3,
        proposal: proposal(title, [{ plannedSessionId: b.id, action: 'move', fromDate: b.scheduledDate, toDate: target, reason: `48 uur tussen zware training voor hetzelfde ${muscles}.`, generatedBy: ['engine/adviceEngine.ts', 'SAME-MUSCLE-SPACING'] }], `${tb.name} schuift naar ${shortDate(target)}.`, why),
      });
    }
  }
  return advice;
}

// --- Rule REST-SWAP -----------------------------------------------------------
// Trigger: a rest day today, and yesterday no training at all. There is
// nothing to recover from (production feedback: "die rustdag is niet meer
// nodig als je gisteren niks gedaan hebt"). Rule: tomorrow's training moves
// to today and the rest day to tomorrow, if that keeps the spacing between
// heavy sessions. Not when ill, and not when the missed-session advice
// already uses this rest day for a catch-up.
function restSwapAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, usedIds: Set<string>): Advice[] {
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const today = inputs.asOf;
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  if (inputs.program && yesterday < inputs.program.startDate) return [];
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const isRest = (s: PlannedSession) => templateById.get(s.templateId)?.type === 'recovery';
  const open = (s: PlannedSession) => s.status !== 'skipped' && !loggedIds.has(s.id);
  const rest = inputs.plannedSessions.find((s) => s.scheduledDate === today && isRest(s) && open(s));
  if (!rest || usedIds.has(rest.id)) return [];
  if (inputs.plannedSessions.some((s) => s.scheduledDate === today && !isRest(s) && open(s))) return [];
  if (inputs.logs.some((l) => l.completedDate === yesterday && templateById.get(l.templateId)?.type !== 'recovery')) return [];
  if (isIllnessDay(yesterday, inputs.illnessEpisodes, today)) return [];
  const next = inputs.plannedSessions.filter((s) => s.scheduledDate === tomorrow && !isRest(s) && open(s));
  if (next.length !== 1) return [];
  const session = next[0];
  const template = templateById.get(session.templateId);
  if (!template || !isTemplatePlannable(template, inputs.enabledSports)) return [];
  const withLoad = inputs.plannedSessions.filter((s) => s.id !== session.id && s.id !== rest.id && s.status !== 'skipped' && (s.scheduledDate >= today || loggedIds.has(s.id)));
  if (!respectsHeavySpacing(today, template, withLoad, templateById, inputs.logs, session.id)) return [];
  const rule = 'Een rustdag is er om te herstellen van wat je deed. Deed je de dag ervoor geen training, dan schuift ASCEND de training van morgen naar vandaag en de rust naar morgen, zolang de afstand tussen zware trainingen klopt.';
  const effect = `Doe ${template.name} vandaag en rust morgen. Gisteren deed je geen training, dus er is vandaag niets om van te herstellen.`;
  const items: PlanChangeItem[] = [
    { plannedSessionId: session.id, action: 'move', fromDate: tomorrow, toDate: today, reason: 'Naar voren: gisteren geen training, dus de rustdag van vandaag is niet nodig.', generatedBy: ['engine/adviceEngine.ts', 'REST-SWAP'] },
    { plannedSessionId: rest.id, action: 'move', fromDate: today, toDate: tomorrow, reason: 'Rustdag een dag later, na de training.', generatedBy: ['engine/adviceEngine.ts', 'REST-SWAP'] },
  ];
  const title = 'Gisteren geen training: je rustdag kan een dag schuiven';
  return [{ id: `restswap:${rest.id}`, trigger: 'plan_update', ruleId: 'REST-SWAP', title, effect, why: rule, priority: 3, proposal: proposal(title, items, effect, rule) }];
}

// --- Rule SKIPPED-KEY-TO-REST --------------------------------------------------
// Trigger: you skipped today's (or yesterday's) long run or mountain hike,
// and a rest day follows right after a day without training. Skipping is
// usually "not today", not "never" (production feedback: long run and hill
// intervals skipped on Sunday, Monday a rest day). Rule: the key session
// takes the rest day, under the same conditions as MISSED-CATCH-UP. Shown
// straight away, the evening of the skip, not only the next morning.
function skippedKeyAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, usedIds: Set<string>): Advice[] {
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const skipped = inputs.plannedSessions
    .filter((s) => s.status === 'skipped' && !inputs.removedByPlanIds?.has(s.id) && !usedIds.has(s.id) && !isDone(s, inputs.logs, loggedIds) && inProgram(s, inputs.program)
      && s.scheduledDate <= inputs.asOf && daysBetween(s.scheduledDate, inputs.asOf) <= 1)
    .map((s) => ({ s, template: templateById.get(s.templateId) }))
    .filter((m): m is { s: PlannedSession; template: SessionTemplate } => !!m.template && isKeySession(m.template) && isTemplatePlannable(m.template, inputs.enabledSports))
    .sort((a, b) => b.s.scheduledDate.localeCompare(a.s.scheduledDate));
  for (const { s, template } of skipped) {
    const rest = findRestDayToUse(s, template, inputs, templateById);
    if (!rest || usedIds.has(rest.id)) continue;
    const when = rest.scheduledDate === inputs.asOf ? 'vandaag' : 'morgen';
    const before = rest.scheduledDate === inputs.asOf ? 'gisteren' : 'vandaag';
    const rule = 'Een rustdag is er om te herstellen van wat je deed. Sla je de lange training over en deed je die dag verder niets, dan kan hij op de rustdag erna, zolang de afstand tussen zware trainingen klopt.';
    const title = `${template.name} overgeslagen`;
    const minutes = catchUpMinutes(s, template, rest.scheduledDate, inputs, templateById);
    const effect = `Doe hem ${when} in plaats van je rustdag: ${before} deed je geen training, dus die rust heb je niet nodig.${minutes ? ` Wel korter, ${minutes} minuten: deze week staat er al een lange training, en twee volle in één week is te veel ineens.` : ''}`;
    const items: PlanChangeItem[] = [
      { plannedSessionId: s.id, action: 'move', fromDate: s.scheduledDate, toDate: rest.scheduledDate, plannedMinutes: minutes, reason: `Overgeslagen op ${shortDate(s.scheduledDate)}, gedaan op de rustdag erna.`, generatedBy: ['engine/adviceEngine.ts', 'SKIPPED-KEY-TO-REST'] },
      { plannedSessionId: rest.id, action: 'remove', reason: `Rustdag niet nodig: ${before} geen training.`, generatedBy: ['engine/adviceEngine.ts', 'SKIPPED-KEY-TO-REST'] },
    ];
    return [{ id: `skippedkey:${s.id}`, trigger: 'session_missed', ruleId: 'SKIPPED-KEY-TO-REST', title, effect, why: rule, priority: 3, proposal: proposal(title, items, effect, rule) }];
  }
  return [];
}

// --- Rule REST-PULL ---------------------------------------------------------
// Trigger: nothing left to train today (moved, skipped or never there),
// nothing done today, and tomorrow is your rest day. Then today already is
// a rest day (production feedback: "verplaats je je laatste training van
// de dag voor de rustdag, dan had je vandaag eigenlijk rust"). Rule: the
// rest day comes to today and tomorrow gets a training: the one you just
// moved if it fits, otherwise the nearest one after it that keeps the
// spacing between heavy sessions. If none fits, say that two rest days in
// a row are fine too.
function restPullAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, usedIds: Set<string>): Advice[] {
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const today = inputs.asOf;
  const tomorrow = addDays(today, 1);
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const isRest = (s: PlannedSession) => templateById.get(s.templateId)?.type === 'recovery';
  const open = (s: PlannedSession) => s.status !== 'skipped' && !loggedIds.has(s.id);
  const rest = inputs.plannedSessions.find((s) => s.scheduledDate === tomorrow && isRest(s) && open(s));
  if (!rest || usedIds.has(rest.id)) return [];
  if (inputs.plannedSessions.some((s) => s.scheduledDate === today && open(s))) return [];
  if (inputs.logs.some((l) => l.completedDate === today && templateById.get(l.templateId)?.type !== 'recovery')) return [];
  if (isIllnessDay(today, inputs.illnessEpisodes, today)) return [];
  if (inputs.program && today < inputs.program.startDate) return [];

  const restToToday: PlanChangeItem = { plannedSessionId: rest.id, action: 'move', fromDate: tomorrow, toDate: today, reason: 'Vandaag staat er geen training meer: dit is je rustdag.', generatedBy: ['engine/adviceEngine.ts', 'REST-PULL'] };
  const rule = 'Staat er vandaag geen training meer en is morgen je rustdag, dan is vandaag al een rustdag. ASCEND haalt de rust naar vandaag en zet morgen een training, als die past zonder te dicht op een zware training te zitten.';
  const title = 'Vandaag geen training meer: rust je vandaag?';
  // Already a training tomorrow next to the rest day (you moved it there).
  const tomorrowTraining = inputs.plannedSessions.find((s) => s.scheduledDate === tomorrow && !isRest(s) && open(s));
  if (tomorrowTraining) {
    const name = templateById.get(tomorrowTraining.templateId)?.name ?? 'je training';
    const effect = `Dan is vandaag je rustdag en doe je morgen ${name}.`;
    return [{ id: `restpull:${rest.id}`, trigger: 'plan_update', ruleId: 'REST-PULL', title, effect, why: rule, priority: 3, proposal: proposal(title, [restToToday], effect, rule) }];
  }
  // The training you just moved away from today first, then the nearest ones.
  const candidates = inputs.plannedSessions
    .filter((s) => !isRest(s) && open(s) && !usedIds.has(s.id) && s.scheduledDate > tomorrow && daysBetween(tomorrow, s.scheduledDate) <= 5)
    .sort((a, b) => Number(b.movedFromDate === today) - Number(a.movedFromDate === today) || a.scheduledDate.localeCompare(b.scheduledDate));
  for (const c of candidates) {
    const template = templateById.get(c.templateId);
    if (!template || !isTemplatePlannable(template, inputs.enabledSports)) continue;
    const others = inputs.plannedSessions.filter((s) => s.id !== c.id && s.id !== rest.id && s.status !== 'skipped' && (s.scheduledDate >= today || loggedIds.has(s.id)));
    if (!respectsHeavySpacing(tomorrow, template, others, templateById, inputs.logs, c.id)) continue;
    const effect = `Dan is vandaag je rustdag en doe je morgen ${template.name}${c.movedFromDate === today ? '' : ` (gepland op ${shortDate(c.scheduledDate)})`}.`;
    const items: PlanChangeItem[] = [restToToday, { plannedSessionId: c.id, action: 'move', fromDate: c.scheduledDate, toDate: tomorrow, reason: 'Naar de oude rustdag: de rust is naar vandaag gegaan.', generatedBy: ['engine/adviceEngine.ts', 'REST-PULL'] }];
    return [{ id: `restpull:${rest.id}`, trigger: 'plan_update', ruleId: 'REST-PULL', title, effect, why: rule, priority: 3, proposal: proposal(title, items, effect, rule) }];
  }
  return [{
    id: `restpull:${rest.id}`, trigger: 'plan_update', ruleId: 'REST-PULL', title: 'Vandaag en morgen rust',
    effect: 'Morgen past geen training zonder te dicht op een zware training te zitten. Twee rustdagen achter elkaar is ook prima: je komt fris aan bij de volgende.',
    why: rule, priority: 1,
  }];
}

// Rule EXTRA-SESSION: when the weeks before earned it, one extra training
// from the catalogue, the one that serves your biggest gap. A proposal:
// nothing is planned without Akkoord.
function extraSessionAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  if (!inputs.extraSession || !inputs.program) return [];
  const found = proposeExtraSession({
    ...inputs.extraSession,
    today: inputs.asOf, program: inputs.program, plannedSessions: inputs.plannedSessions, logs: inputs.logs,
    templates: inputs.templates, illnessEpisodes: inputs.illnessEpisodes, respondedIds: inputs.respondedIds,
  });
  if (!found) return [];
  const template = templateById.get(found.choice.templateId)!;
  const title = `Extra training: ${template.name}`;
  const effect = `${found.choice.reason} Voorstel: ${shortDate(found.date)}.`;
  const why = `${found.earnedReason} Dan mag je week groeien. Dat gaat via een extra korte training, niet via langere: één loop meer dan 10% langer dan je langste van de afgelopen maand gaf meer blessures, een groter weektotaal niet (Frandsen e.a. 2025).`;
  const items: PlanChangeItem[] = [{
    action: 'add', newSessionDraft: { templateId: template.id, scheduledDate: found.date, weekStartDate: found.weekStart },
    reason: found.choice.reason, generatedBy: ['engine/extraRun.ts', 'EXTRA-SESSION'],
  }];
  const p = proposal(title, items, effect, why);
  return [{ id: found.id, trigger: 'plan_update', ruleId: 'EXTRA-SESSION', title, effect, why, priority: 2, proposal: { ...p, trigger: 'new_training_data' } }];
}

// --- Rule MORNING-CHECK ------------------------------------------------------
// What the morning check-in says for today and tomorrow (docs/onderzoek/Pijn
// spierpijn en vermoeidheid melden.md, "Hoe de planning reageert"):
// - muscle soreness: 1 to 2 days no quality and no heavy legs; easy running,
//   cycling and upper body stay. The first hard or leg-heavy session moves on.
// - "Op", or two negatives (tired, slept badly, heavy soreness): a calm day,
//   today's hard session moves on. One negative: a word, nothing moves.
// - three tired mornings in a row: a few lighter days, as a word.
// - the pain spot worse this morning (above 5, or 2 up): 2 to 3 days no
//   running or jumping on that spot.
// Always a proposal or a word; nothing moves without you.
function morningAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const today = inputs.asOf;
  const checkIn = checkInFor(today, inputs.checkIns);
  if (!checkIn || checkIn.allNormal) return [];
  const sig = morningSignals(checkIn, inputs.logs);
  const out: Advice[] = [];
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const heavy = (s: PlannedSession, days: number) => {
    const t = templateById.get(s.templateId);
    return !!t && t.type !== 'recovery' && s.status !== 'skipped' && !loggedIds.has(s.id) && s.scheduledDate >= today && daysBetween(today, s.scheduledDate) <= days && (isHardRun(t) || isLegHeavyTemplate(t));
  };

  if (sig.spotWorse) {
    const { area, score } = sig.spotWorse;
    out.push({
      id: `morning-pain:${today}`, trigger: 'injury_active', ruleId: 'MORNING-CHECK', priority: 5,
      title: `${area} vanochtend ${score} van 10`,
      effect: `Hoger dan na de training. Doe de komende 2 tot 3 dagen geen lopen, springen of bergaf voor je ${area.toLowerCase()}; fietsen en bovenlichaam mogen. Pas weer hardlopen als wandelen hooguit 1 tot 2 doet. Wordt het niet beter in 2 tot 3 weken, laat een fysiotherapeut kijken.`,
      why: 'Volgens het pijnmonitoringsmodel mag pijn tot 5 op 10, als hij de ochtend erna niet hoger is. Vanochtend is hij hoger: dan krijgt die plek rust (Silbernagel en Thomeé).',
    });
  }

  if (sig.sore !== 'none' || sig.rest) {
    const days = sig.sore !== 'none' ? 1 : 0;
    const next = inputs.plannedSessions.filter((s) => heavy(s, days)).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
    const reason = sig.rest ? 'Je bent op of sliep slecht en bent moe' : sig.sore === 'flink' ? 'Flinke spierpijn' : 'Spierpijn';
    const rule = sig.rest
      ? 'Bij "op", of bij twee signalen tegelijk, is vandaag een rustige dag: herstel komt eerst (Saw, Main en Gastin 2016).'
      : 'Met spierpijn zijn je benen 1 tot 2 dagen minder krachtig en minder zuinig; een harde training levert dan minder op (Marcora 2007). Rustig lopen, fietsen en bovenlichaam blijven staan.';
    if (next) {
      const t = templateById.get(next.templateId)!;
      // Not next to another hard or leg-heavy session (that day or the day after).
      const clear = (d: string) => !inputs.plannedSessions.some((o) => o.id !== next.id && (o.scheduledDate === d || o.scheduledDate === addDays(d, 1)) && heavy(o, 14));
      const laterDates = catchUpDates(next, t, inputs, templateById, addDays(today, sig.sore !== 'none' ? 2 : 1), clear);
      const later = laterDates[0];
      const title = `${reason}: ${t.name} later`;
      if (later) {
        const morningEffect = (d: string) => `${t.name} van ${shortDate(next.scheduledDate)} naar ${shortDate(d)}.${sig.sore === 'flink' ? ' Ook de rustige loop mag vandaag wandelen of fietsen worden.' : ''}`;
        out.push({
          id: `morning:${today}:${next.id}`, trigger: 'session_too_hard', ruleId: 'MORNING-CHECK', priority: 4, title,
          effect: morningEffect(later),
          why: rule,
          ...moveOptions(title, { plannedSessionId: next.id, action: 'move', fromDate: next.scheduledDate, toDate: later, reason: `${reason} op de ochtend van ${shortDate(today)}.`, generatedBy: ['engine/adviceEngine.ts', 'MORNING-CHECK'] }, laterDates, t.name, rule, morningEffect),
        });
      } else {
        out.push({ id: `morning:${today}:${next.id}`, trigger: 'session_too_hard', ruleId: 'MORNING-CHECK', priority: 3, title: `${reason}: houd ${t.name} rustig`, effect: t.type === 'strength' ? `Er is geen goede latere plek deze week. Kies de korte versie van ${t.name}, met lichtere gewichten en ruim reserve (zeker 3 herhalingen over).` : `Er is geen goede latere plek deze week. Kies de korte versie van ${t.name} en houd het rustig (RPE 3 tot 4).`, why: rule });
      }
    } else if (sig.rest) {
      out.push({ id: `morning:${today}:rest`, trigger: 'session_too_hard', ruleId: 'MORNING-CHECK', priority: 2, title: 'Een rustige dag', effect: 'Er staat vandaag niets zwaars. Houd het zo: een wandeling of rustig fietsen is genoeg.', why: rule });
    }
  } else if (sig.negatives === 1) {
    const next = inputs.plannedSessions.find((s) => heavy(s, 0));
    if (next) {
      const t = templateById.get(next.templateId)!;
      out.push({ id: `morning:${today}:one`, trigger: 'session_too_hard', ruleId: 'MORNING-CHECK', priority: 2, title: `Moe of slecht geslapen: ${t.name} vandaag`, effect: `Doe hem liefst vroeg op de dag, of kies de korte versie. Voelt het inlopen zwaarder dan normaal, ruil hem dan voor een rustige training.`, why: 'Eén signaal is nog geen reden om iets te schuiven; slaap en vermoeidheid wegen het zwaarst bij een harde training later op de dag (Craven e.a. 2022).' });
    }
  }

  if (tiredStreak(today, inputs.checkIns) >= 3) {
    out.push({ id: `morning-tired:${today}`, trigger: 'session_too_hard', ruleId: 'MORNING-CHECK', priority: 3, title: 'Drie ochtenden op rij moe', effect: 'Houd de komende 3 tot 4 dagen ongeveer een kwart minder minuten en geen harde trainingen. Daarna weer gewoon verder.', why: 'Recreatieve lopers die hun schema zo bijstelden op hun ochtendgevoel, gingen meer vooruit dan met een vast schema (Nuuttila e.a. 2022).' });
  }
  return out;
}

function restWeekSkipAdvice(inputs: AdviceInputs): Advice[] {
  if (!inputs.program) return [];
  const found = proposeRestWeekSkip({
    program: inputs.program, plannedSessions: inputs.plannedSessions, logs: inputs.logs, templates: inputs.templates,
    today: inputs.asOf, illnessEpisodes: inputs.illnessEpisodes, respondedIds: inputs.respondedIds,
  });
  if (!found) return [];
  const title = 'Rustweek overslaan?';
  const effect = `De week van ${shortDate(found.weekStart)} is een rustweek. Je liep de afgelopen weken ${found.doneMinutes} van de ${found.plannedMinutes} geplande minuten, dus er is weinig om van te herstellen. Voorstel: doortrainen als een normale opbouwweek, geen tweede zwaarste week.`;
  const why = 'Een rustweek is er om de vermoeidheid van de weken ervoor kwijt te raken. Trainers zien hem als hulpmiddel, niet als vaste regel (Bell e.a. 2023), en na een licht begin is er weinig vermoeidheid. Je loopt nog steeds nooit meer dan 10% langer dan je langste loop van de afgelopen maand. Voelen je benen toch zwaar, zet de rustweek dan terug in Week.';
  return [{ id: found.id, trigger: 'plan_update', ruleId: 'REST-WEEK-SKIP', title, effect, why, priority: 2, restWeekSkip: found.weekStart }];
}

export function computeAdvice(inputs: AdviceInputs): Advice[] {
  const templateById = new Map(inputs.templates.map((t) => [t.id, t]));
  // A catch-up you declined leaves the rest day free for the swap.
  const missed = missedAdvice(inputs, templateById).filter((a) => !inputs.respondedIds.has(a.id));
  const usedIds = new Set(missed.flatMap((a) => a.proposal?.changes.map((c) => c.plannedSessionId).filter((id): id is string => !!id) ?? []));
  const skippedKey = skippedKeyAdvice(inputs, templateById, usedIds).filter((a) => !inputs.respondedIds.has(a.id));
  for (const id of skippedKey.flatMap((a) => a.proposal?.changes.map((c) => c.plannedSessionId) ?? [])) if (id) usedIds.add(id);
  const testRoom = testRunAdvice(inputs, templateById, usedIds).filter((a) => !inputs.respondedIds.has(a.id));
  return [
    ...missed,
    ...skippedKey,
    ...testRoom,
    ...restSwapAdvice(inputs, templateById, usedIds),
    ...restPullAdvice(inputs, templateById, usedIds),
    ...tooHardAdvice(inputs, templateById),
    ...tooLightAdvice(inputs, templateById),
    ...injuryAdvice(inputs, templateById),
    ...strengthAdvice(inputs, templateById),
    ...spacingAdvice(inputs, templateById),
    ...extraSessionAdvice(inputs, templateById),
    ...restWeekSkipAdvice(inputs),
    ...morningAdvice(inputs, templateById),
  ]
    .filter((a) => !inputs.respondedIds.has(a.id))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

// Advice tied to one specific log — what the debrief right after logging
// shows.
export function adviceForLog(inputs: AdviceInputs, logId: string): Advice[] {
  return computeAdvice(inputs).filter((a) => a.relatedLogId === logId);
}

