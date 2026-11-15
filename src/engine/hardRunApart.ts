// ASCEND: nooit hard naast hard bij het inhalen van de sleuteltraining (docs/beslissingen/2026-11-11-sleuteltraining.md).
// Gedeeld door het inhalen (engine/adviceWeek.ts via adviceShared.ts) en REST-BACK (engine/restDayBack.ts). Puur.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import { validateWeeks, type CheckInput, type CheckRule } from './weekValidator';
import { isHardRun } from './scheduler';
import { isTestOrRace } from './templateRoles';

export interface HardApartInputs {
  plannedSessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  asOf: string;
}

// Catching up a key session that is a hard run (a tempo run or intervals for a 10 km,
// engine/keySession.ts): never the day before or after another hard run, and not on
// the same day; a test or race keeps the two days before it free. A long run is not a
// hard run (scheduler.ts#isHardRun: low intensity), so catching it up is as before.
// A missed session in the past carries no load; a logged one does.
// Opt-in (`hardApart`), so the morning and load rules that also use these dates keep their own checks.
export function hardRunApart(date: string, session: Pick<PlannedSession, 'id'>, template: SessionTemplate, inputs: HardApartInputs, templateById: ReadonlyMap<string, SessionTemplate>, ignore: readonly string[] = []): boolean {
  if (!isHardRun(template)) return true;
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const near = new Set([addDays(date, -1), date, addDays(date, 1)]);
  const testAhead = new Set([addDays(date, 1), addDays(date, 2)]);
  const testSoon = inputs.plannedSessions.some((o) => o.id !== session.id && !ignore.includes(o.id) && o.status !== 'skipped' && testAhead.has(o.scheduledDate) && !loggedIds.has(o.id)
    && (() => { const t = templateById.get(o.templateId); return !!t && isTestOrRace(t); })());
  if (testSoon) return false;
  const plannedHard = inputs.plannedSessions.some((o) => o.id !== session.id && !ignore.includes(o.id) && o.status !== 'skipped' && near.has(o.scheduledDate)
    && (o.scheduledDate >= inputs.asOf || loggedIds.has(o.id)) && (() => { const t = templateById.get(o.templateId); return !!t && isHardRun(t); })());
  const loggedHard = inputs.logs.some((l) => near.has(l.completedDate) && l.plannedSessionId !== session.id && (() => { const t = templateById.get(l.templateId); return !!t && isHardRun(t); })());
  return !plannedHard && !loggedHard;
}

// Het inhalen leest dezelfde weekcontrole als Let op in Week (engine/weekConcerns.ts, met `reportYours`): na de
// verplaatsing mag de week geen nieuw punt over deze training geven, ook niet over de weekgrens (een lange duurloop op
// maandag na heuvelintervallen op zondag). Nooit een voorstel dat Week daarna zelf afkeurt
// (docs/beslissingen/2026-11-15-week-telling-zonder-sportschool.md). De rustdag die het voorstel opheft telt niet mee.
export const CATCH_UP_CHECK_RULES: readonly CheckRule[] = ['LEG-SPACING', 'TWO-HARD-RUNS', 'TEST-DAY', 'AFTER-TEST', 'ONE-LONG', 'TEST-FRESH', 'TEST-REST'];

export interface WeekAcceptInputs extends HardApartInputs {
  templates: readonly SessionTemplate[];
  program?: Program | null;
  restDay?: number;
  leave?: LeavePeriod[];
  slotDays?: Map<string, number>;
  dailyTimeBudget?: CheckInput['dailyTimeBudget'];
  sameDayPairingPreference?: CheckInput['sameDayPairingPreference'];
}

export function weekAccepts(date: string, session: PlannedSession, inputs: WeekAcceptInputs, change: { plannedMinutes?: number; removeIds?: readonly string[] } = {}): boolean {
  const remove = new Set(change.removeIds ?? []);
  // Na Akkoord is de verplaatste training van jou (een slot), zoals elke verplaatsing uit een voorstel.
  const moved: PlannedSession = { ...session, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'moved', plannedMinutes: change.plannedMinutes ?? session.plannedMinutes };
  const sessions = inputs.plannedSessions.filter((s) => !remove.has(s.id)).map((s) => (s.id === session.id ? moved : s));
  const weeks = new Set([addDays(date, -1), date, addDays(date, 1)].map(mondayOfWeek));
  const findings = validateWeeks({
    sessions, logs: [...inputs.logs], templates: [...inputs.templates], today: inputs.asOf, restDay: inputs.restDay, program: inputs.program,
    dailyTimeBudget: inputs.dailyTimeBudget, sameDayPairingPreference: inputs.sameDayPairingPreference, leave: inputs.leave, slotDays: inputs.slotDays,
    reportYours: true, until: addDays(date, 3),
  }, weeks);
  return !findings.some((f) => CATCH_UP_CHECK_RULES.includes(f.rule) && f.sessionIds.includes(session.id));
}
