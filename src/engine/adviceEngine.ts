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
  // Sessions planned while ill are never "gemist" (engine/illness.ts).
  illnessEpisodes?: IllnessEpisode[];
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
  const rule = 'ASCEND haalt alleen de sleuteltraining van de week in, de lange duurloop of de bergtocht, op een vrije dag in dezelfde week en nooit binnen 48 uur van een andere zware beendag. De rest laten we gaan: twee trainingen op één dag om bij te benen helpt niet.';
  const missed = recentMissed
    .map((s) => ({ s, template: templateById.get(s.templateId) }))
    .filter((m): m is { s: PlannedSession; template: SessionTemplate } => !!m.template && m.template.type !== 'recovery')
    .sort((x, y) => x.s.scheduledDate.localeCompare(y.s.scheduledDate));
  if (missed.length === 0) return [];

  const items: PlanChangeItem[] = [];
  const caughtUp: string[] = [];
  const dropped: string[] = [];
  for (const { s, template } of missed) {
    const key = isKeySession(template);
    const catchUp = key && isTemplatePlannable(template, inputs.enabledSports) ? findCatchUpDate(s, template, inputs, templateById, inputs.asOf) : undefined;
    if (catchUp) {
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
    if (lastTwo.length < 2 || !lastTwo.every((l) => l.rpe !== undefined && l.rpe <= 3)) continue;
    const name = templateById.get(templateId)?.name ?? 'Deze sessie';
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

export function computeAdvice(inputs: AdviceInputs): Advice[] {
  const templateById = new Map(inputs.templates.map((t) => [t.id, t]));
  return [
    ...missedAdvice(inputs, templateById),
    ...tooHardAdvice(inputs, templateById),
    ...tooLightAdvice(inputs, templateById),
    ...injuryAdvice(inputs, templateById),
    ...strengthAdvice(inputs, templateById),
    ...spacingAdvice(inputs, templateById),
  ]
    .filter((a) => !inputs.respondedIds.has(a.id))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

// Advice tied to one specific log — what the debrief right after logging
// shows.
export function adviceForLog(inputs: AdviceInputs, logId: string): Advice[] {
  return computeAdvice(inputs).filter((a) => a.relatedLogId === logId);
}

