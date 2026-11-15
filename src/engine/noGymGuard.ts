// ASCEND: een sportschooltraining op een dag zonder sportschool (docs/beslissingen/2026-11-15-zonder-sportschool-verplaatst.md).
// De stap zonder sportschool (engine/noGym.ts) zet alleen om wat van het systeem is. Een training die jij of een
// voorstel vastzette laat hij staan, dus elke weg die een training naar een andere dag zet kijkt hier:
//
// - een voorstel van ASCEND zet nooit een sportschooltraining op zo'n dag (`withoutGymOnNoGym`);
// - de voorgestelde dagen, slepen en ruilen kennen zo'n dag (engine/moveSuggestions.ts#keptDayReason, 'nogym'): de
//   voorgestelde dagen slaan hem over, slepen en een datum kiezen vragen eerst Akkoord (`NO_GYM_ASK`);
// - staat er toch een, dan zegt Week het in Let op, in amber (regel NO-GYM, engine/weekValidator.ts), met een
//   voorstel dat doet wat de periode zelf doet: eigen gewicht, op dezelfde of een andere dag, of laten vervallen
//   (`planNoGymFix`).
//
// Puur: geen React, geen IndexedDB.

import type { LeavePeriod } from '../models/leave';
import type { PlanChangeItem } from '../models/planChange';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import { leaveDays, type LeaveDay } from './leave';
import { applyNoGymDays } from './noGym';
import { isGymStrengthTemplate } from './templateRoles';
import type { CheckInput } from './weekValidator';

// De vraag bij slepen, een datum kiezen en ruilen, en de kop in Let op (eigenaar, 15 november).
export const NO_GYM_ASK = 'Sportschool nodig, en je zit zonder sportschool.';

const SOURCE = ['engine/noGymGuard.ts'];

// De periode zonder sportschool van deze dag, als deze training de sportschool nodig heeft. Een vakantie of tocht
// gaat voor (engine/leave.ts#leaveDays, de strengste telt): die dag is geen dag zonder sportschool.
export function noGymPeriodFor(date: string, template: Pick<SessionTemplate, 'id' | 'type'> | undefined, periods: LeavePeriod[] | undefined, days: Map<string, LeaveDay> = leaveDays(periods)): LeavePeriod | undefined {
  if (!template || !periods?.length || !isGymStrengthTemplate(template)) return undefined;
  const day = days.get(date);
  return day?.kind === 'nogym' ? day.period : undefined;
}

export function needsGymOn(date: string, template: Pick<SessionTemplate, 'id' | 'type'> | undefined, periods: LeavePeriod[] | undefined, days?: Map<string, LeaveDay>): boolean {
  return !!noGymPeriodFor(date, template, periods, days);
}

// De vraag voor een verplaatsing naar `date`, of niets als de dag kan.
export function noGymAsk(template: Pick<SessionTemplate, 'id' | 'type'> | undefined, date: string, periods: LeavePeriod[] | undefined): string | undefined {
  return needsGymOn(date, template, periods) ? NO_GYM_ASK : undefined;
}

// Zet dit voorstel een sportschooltraining op een dag zonder sportschool? Een verplaatsing of een nieuwe rij; wat de
// periode zelf neerzet draagt het merk van de periode en is nooit een sportschooltraining.
export function landsGymOnNoGym(changes: readonly PlanChangeItem[], sessions: readonly PlannedSession[], templates: ReadonlyMap<string, SessionTemplate>, periods: LeavePeriod[] | undefined): boolean {
  if (!periods?.length) return false;
  const days = leaveDays(periods);
  const byId = new Map(sessions.map((s) => [s.id, s]));
  return changes.some((c) => {
    if (c.action === 'move' && c.toDate) {
      const s = c.plannedSessionId ? byId.get(c.plannedSessionId) : undefined;
      return needsGymOn(c.toDate, templates.get(c.templateId ?? s?.templateId ?? ''), periods, days);
    }
    if (c.action === 'add' && c.newSessionDraft) return needsGymOn(c.newSessionDraft.scheduledDate, templates.get(c.newSessionDraft.templateId), periods, days);
    return false;
  });
}

// Het vangnet over de voorstellen van ASCEND: een keuze die een sportschooltraining op een dag zonder sportschool zet
// valt weg; is er geen keuze meer over, dan komt het voorstel niet. Zonder proposal (alleen woorden) blijft het staan.
export function withoutGymOnNoGym<A extends { proposal?: { changes: PlanChangeItem[] }; options?: { proposal: { changes: PlanChangeItem[] } }[] }>(
  advice: A[], sessions: readonly PlannedSession[], templates: ReadonlyMap<string, SessionTemplate>, periods: LeavePeriod[] | undefined,
): A[] {
  if (!periods?.some((p) => p.kind === 'no_gym')) return advice;
  const bad = (changes: readonly PlanChangeItem[]) => landsGymOnNoGym(changes, sessions, templates, periods);
  return advice.flatMap((a) => {
    if (!a.proposal) return [a];
    if (!a.options) return bad(a.proposal.changes) ? [] : [a];
    const options = a.options.filter((o) => !bad(o.proposal.changes));
    if (options.length === a.options.length) return [a];
    if (options.length === 0) return [];
    return [{ ...a, proposal: options[0].proposal, options: options.length > 1 ? options : undefined }];
  });
}

export interface NoGymFix {
  // Wat het voorstel doet: de training vervalt, met zo nodig eigen gewicht erbij.
  items: PlanChangeItem[];
  // De zin, dezelfde als de stap zonder sportschool zegt.
  effect: string;
  // Komt er eigen gewicht voor in de plaats.
  bodyweight: boolean;
}

// Wat de periode zelf zou doen als deze training van het systeem was: de stap zonder sportschool over de week, met
// alleen deze rij losgemaakt. Eigen gewicht op dezelfde dag, of op een andere dag van de periode voor 48 uur tussen
// krachtsessies; past dat nergens, dan vervalt hij. De rijen krijgen het merk van de periode, zodat weghalen van de
// periode hem terugzet (engine/leaveProposal.ts#putBack). Niets als de rij niet (meer) op zo'n dag staat.
export function planNoGymFix(input: CheckInput, sessionId: string): NoGymFix | undefined {
  const session = input.sessions.find((s) => s.id === sessionId);
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const template = session ? byId.get(session.templateId) : undefined;
  const days = leaveDays(input.leave);
  const period = session ? noGymPeriodFor(session.scheduledDate, template, input.leave, days) : undefined;
  if (!session || !template || !period || session.status === 'skipped') return undefined;
  const logged = new Set<string | undefined>(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  if (logged.has(session.id) || session.scheduledDate < input.today) return undefined;
  let n = 0;
  const run = (sessions: PlannedSession[]) => applyNoGymDays({
    sessions, days, today: input.today, goalDay: input.goalDay, templates: input.templates, logged, restDay: input.restDay, newId: () => `nogym-fix-${n++}`,
  });
  const loose = input.sessions.map((s) => {
    if (s.id !== session.id) return s;
    const free: PlannedSession = { ...s, status: 'planned' };
    delete free.lock;
    // Een merk van een andere periode houdt de stap tegen; dat hoort hier niet bij.
    if (free.leave && free.leave.periodId !== period.id) delete free.leave;
    return free;
  });
  const base = run(input.sessions);
  const after = run(loose);
  const drop = after.repairs.find((r) => r.sessionId === session.id && r.removed);
  if (!drop) return undefined;
  const placedKey = (s: PlannedSession) => `${s.scheduledDate}|${s.templateId}`;
  const before = new Set(base.sessions.filter((s) => s.leave?.role === 'placed').map(placedKey));
  const added = after.repairs
    .filter((r) => r.added)
    .map((r) => ({ r, s: after.sessions.find((s) => s.id === r.sessionId)! }))
    .filter(({ s }) => !!s && !before.has(placedKey(s)));
  const mark = { periodId: period.id, from: session.scheduledDate };
  const items: PlanChangeItem[] = [
    // `restore`: zoals de periode het zelf doet, zonder slot; weghalen van de periode zet hem terug.
    { plannedSessionId: session.id, action: 'remove', fromDate: session.scheduledDate, restore: true, leave: { ...mark, role: 'dropped' }, reason: drop.reason ?? NO_GYM_ASK, generatedBy: SOURCE },
    ...added.map(({ r, s }): PlanChangeItem => ({
      action: 'add', toDate: s.scheduledDate, restore: true,
      newSessionDraft: { templateId: s.templateId, scheduledDate: s.scheduledDate, weekStartDate: mondayOfWeek(s.scheduledDate) },
      ...(s.plannedMinutes ? { plannedMinutes: s.plannedMinutes } : {}),
      leave: { ...mark, role: 'placed' }, reason: r.reason ?? NO_GYM_ASK, generatedBy: SOURCE,
    })),
  ];
  return { items, effect: drop.reason ?? NO_GYM_ASK, bodyweight: added.length > 0 };
}
