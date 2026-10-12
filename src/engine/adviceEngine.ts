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

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { InjuryNote } from '../models/injury';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { IllnessEpisode } from '../models/illness';
import { activeIllness, isIllnessDay, recoveryRamp } from './illness';
import { respectsHeavySpacing, dayHasRoomFor, isLegHeavyTemplate, isIntentionalBackToBack, heavyAxes, HEAVY_AXIS_LABEL } from './scheduler';
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
  relatedLogId?: string;
}

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
    (s) => s.status !== 'skipped' && !isDone(s, inputs.logs, loggedIds) && inProgram(s, inputs.program) && s.scheduledDate < inputs.asOf && daysBetween(s.scheduledDate, inputs.asOf) <= 3
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
  return [{
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
  const later = findCatchUpDate(next, nextTemplate, inputs, templateById, addDays(next.scheduledDate, 1));
  if (!later) {
    return [{ ...base, id: `hard:${recent.id}`, effect: `${nextTemplate.name} op ${shortDate(next.scheduledDate)} rustig houden (RPE 3-4); er is geen latere plek deze week.`, why: `Je laatste training was zwaar (${signal}). ${rule}` }];
  }
  return [{
    ...base,
    id: `hard:${recent.id}`,
    effect: `${nextTemplate.name} een dag later: ${shortDate(later)}.`,
    why: `Je laatste training was zwaar (${signal}). ${rule}`,
    proposal: proposal(base.title, [{ plannedSessionId: next.id, action: 'move', fromDate: next.scheduledDate, toDate: later, reason: `Extra herstel na ${loggedName} (${signal}).`, generatedBy: ['engine/adviceEngine.ts', 'HARD-THEN-SPACE'] }], `${nextTemplate.name} schuift naar ${shortDate(later)}.`, rule),
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

export function computeAdvice(inputs: AdviceInputs): Advice[] {
  const templateById = new Map(inputs.templates.map((t) => [t.id, t]));
  // A catch-up you declined leaves the rest day free for the swap.
  const missed = missedAdvice(inputs, templateById).filter((a) => !inputs.respondedIds.has(a.id));
  const usedIds = new Set(missed.flatMap((a) => a.proposal?.changes.map((c) => c.plannedSessionId).filter((id): id is string => !!id) ?? []));
  const skippedKey = skippedKeyAdvice(inputs, templateById, usedIds).filter((a) => !inputs.respondedIds.has(a.id));
  for (const id of skippedKey.flatMap((a) => a.proposal?.changes.map((c) => c.plannedSessionId) ?? [])) if (id) usedIds.add(id);
  return [
    ...missed,
    ...skippedKey,
    ...restSwapAdvice(inputs, templateById, usedIds),
    ...restPullAdvice(inputs, templateById, usedIds),
    ...tooHardAdvice(inputs, templateById),
    ...tooLightAdvice(inputs, templateById),
    ...injuryAdvice(inputs, templateById),
    ...strengthAdvice(inputs, templateById),
    ...spacingAdvice(inputs, templateById),
    ...extraSessionAdvice(inputs, templateById),
  ]
    .filter((a) => !inputs.respondedIds.has(a.id))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

// Advice tied to one specific log — what the debrief right after logging
// shows.
export function adviceForLog(inputs: AdviceInputs, logId: string): Advice[] {
  return computeAdvice(inputs).filter((a) => a.relatedLogId === logId);
}

