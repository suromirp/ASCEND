// ASCEND: a period without a gym (docs/beslissingen/2026-11-09-zonder-sportschool.md). You
// are away, you can run, but there is no gym. One step of the leave block
// (engine/leaveBlock.ts), so it runs in every turn of the planning run
// (engine/planPass.ts) and only ever reaches your plan through a proposal with
// Akkoord (engine/leaveProposal.ts):
//
// - A gym session (strength) on such a day goes. With the advice a short
//   session with your own weight takes its place on that day
//   (BODYWEIGHT_TEMPLATE_ID); with 'drop' nothing does.
// - Light (the advice): at most two runs per week on the days of the period.
//   The long run stays first, then the easy ones, then the hard ones; the rest goes.
// - A hard run that stays becomes an easy run on the same day, in its short
//   version: no build-up away from home.
// - Every other run that stays gets its short version.
// - A test or race, what is logged, the past, what you fixed yourself, a race
//   block session and a session another period moved: never touched here.
//
// Every change carries a mark of the period (models/leave.ts#PlannedLeaveMark),
// so removing the period puts it all back (engine/leaveProposal.ts#putBack).
// Deterministic and idempotent: a second run finds it done and changes nothing.
//
// Pure: no React, no IndexedDB.

import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import type { LeaveDay } from './leave';
import { isHardRun } from './scheduler';
import { templateSport } from './sports';
import { hasRole, idIsTestOrRace, isGymStrengthTemplate } from './templateRoles';
import { lockLevel, type Repair } from './weekValidator';
import { BODYWEIGHT_TEMPLATE_ID, resolveNoGym } from './noGymDetails';

export { BODYWEIGHT_TEMPLATE_ID };

const EASY_RUN_TEMPLATE_ID = 'tpl_easy_run';
export const LIGHT_RUNS_PER_WEEK = 2;

export interface NoGymStepInput {
  sessions: PlannedSession[];
  days: Map<string, LeaveDay>;
  today: string;
  goalDay?: string;
  templates: SessionTemplate[];
  logged: Set<string | undefined>;
  newId: () => string;
}

export const isNoGymRun = (t: SessionTemplate | undefined): boolean => !!t && t.type !== 'strength' && templateSport(t) === 'running';
export const isNoGymStrength = (t: SessionTemplate | undefined): boolean => !!t && isGymStrengthTemplate(t);
const isHard = (t: SessionTemplate) => isHardRun(t) || hasRole(t, 'hills') || hasRole(t, 'hard_load') || hasRole(t, 'blocks');

export function applyNoGymDays(input: NoGymStepInput): { sessions: PlannedSession[]; repairs: Repair[] } {
  const { days, today, goalDay, templates, logged } = input;
  const byId = new Map(templates.map((t) => [t.id, t]));
  const repairs: Repair[] = [];
  let sessions = input.sessions;
  const periodOn = (date: string) => { const d = days.get(date); return d?.kind === 'nogym' ? d.period : undefined; };
  if (![...days.values()].some((d) => d.kind === 'nogym')) return { sessions, repairs };

  const usable = (date: string) => date >= today && (!goalDay || date < goalDay);
  const open = (s: PlannedSession) => s.status !== 'skipped';
  // A session this step may change: the system's own, on a day of the period, not marked by another period.
  const mine = (s: PlannedSession) => {
    const p = periodOn(s.scheduledDate);
    return !!p && open(s) && usable(s.scheduledDate) && !idIsTestOrRace(s.templateId, byId) && !s.raceBlock &&
      (lockLevel(s, logged, today) === 3) && (!s.leave || s.leave.periodId === p.id);
  };
  const drop = (s: PlannedSession, period: LeavePeriod, reason: string) => {
    sessions = sessions.map((o) => (o.id === s.id ? { ...o, status: 'skipped' as const, leave: { periodId: period.id, role: 'dropped' as const, from: s.scheduledDate } } : o));
    repairs.push({ sessionId: s.id, rule: 'LEAVE-PLACE', from: s.scheduledDate, to: s.scheduledDate, removed: true, reason });
  };
  // Placed once per day and template: also when you skipped or moved it since.
  const served = (period: LeavePeriod, date: string, templateId: string) => sessions.some((s) =>
    (s.leave?.periodId === period.id && s.leave.role === 'placed' && (s.leave.from ?? s.scheduledDate) === date && s.templateId === templateId) ||
    (s.scheduledDate === date && open(s) && s.templateId === templateId));
  const place = (period: LeavePeriod, date: string, templateId: string, reason: string, minutes?: number) => {
    if (served(period, date, templateId)) return;
    const added: PlannedSession = {
      id: input.newId(), templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned', order: 0,
      ...(minutes ? { plannedMinutes: minutes } : {}),
      leave: { periodId: period.id, role: 'placed', from: date },
    };
    sessions = [...sessions, added];
    repairs.push({ sessionId: added.id, rule: 'LEAVE-PLACE', from: date, to: date, added: true, reason });
  };

  // 1. Light: at most two runs per week and period, the long one first.
  const groups = new Map<string, PlannedSession[]>();
  for (const s of sessions) {
    const p = periodOn(s.scheduledDate);
    if (!p || !open(s) || !isNoGymRun(byId.get(s.templateId)) || resolveNoGym(p).amount !== 'light') continue;
    // The past of the period counts only with a log: a run that did not happen is not one of the two.
    if (s.scheduledDate < today && !logged.has(s.id)) continue;
    const key = `${p.id}|${mondayOfWeek(s.scheduledDate)}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  for (const runs of groups.values()) {
    const period = periodOn(runs[0].scheduledDate)!;
    const fixed = runs.filter((s) => !mine(s));
    const rank = (s: PlannedSession) => { const t = byId.get(s.templateId)!; return hasRole(t, 'long') ? 0 : isHard(t) ? 2 : 1; };
    const free = runs.filter(mine).sort((a, b) => rank(a) - rank(b) || a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id));
    for (const s of free.slice(Math.max(0, LIGHT_RUNS_PER_WEEK - fixed.length))) {
      drop(s, period, `Zonder sportschool loop je twee keer deze week: ${byId.get(s.templateId)?.name ?? 'deze loop'} vervalt.`);
    }
  }

  // 2. The gym and the hard runs, day by day.
  const easy = byId.has(EASY_RUN_TEMPLATE_ID) ? byId.get(EASY_RUN_TEMPLATE_ID) : undefined;
  for (const s of [...sessions].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id))) {
    if (!mine(s)) continue;
    const period = periodOn(s.scheduledDate)!;
    const t = byId.get(s.templateId);
    if (!t) continue;
    if (isNoGymStrength(t)) {
      const bodyweight = resolveNoGym(period).strength === 'bodyweight' && byId.has(BODYWEIGHT_TEMPLATE_ID);
      drop(s, period, bodyweight ? `Geen sportschool: ${t.name} wordt een korte sessie met je eigen gewicht.` : `Geen sportschool: ${t.name} vervalt.`);
      if (bodyweight) place(period, s.scheduledDate, BODYWEIGHT_TEMPLATE_ID, `Geen sportschool: een korte sessie met je eigen gewicht in plaats van ${t.name}.`);
    } else if (isNoGymRun(t) && isHard(t) && easy && isNoGymRun(easy)) {
      // A rustige loop already on that day: the hard run goes without a second one.
      if (served(period, s.scheduledDate, easy.id)) {
        drop(s, period, `Weg van huis: ${t.name} vervalt, er staat die dag al een rustige loop.`);
        continue;
      }
      drop(s, period, `Weg van huis: ${t.name} wordt een rustige loop.`);
      place(period, s.scheduledDate, easy.id, `Weg van huis: een korte rustige loop in plaats van ${t.name}.`, easy.durationVariants.short);
    } else if (isNoGymRun(t) && s.plannedMinutes === undefined && !s.leave && t.durationVariants.short && t.durationVariants.short < t.durationVariants.full) {
      const minutes = t.durationVariants.short;
      sessions = sessions.map((o) => (o.id === s.id ? { ...o, plannedMinutes: minutes, leave: { periodId: period.id, role: 'moved' as const, from: s.scheduledDate, shortened: true } } : o));
      repairs.push({ sessionId: s.id, rule: 'LEAVE-PLACE', from: s.scheduledDate, to: s.scheduledDate, plannedMinutes: minutes, reason: `Weg van huis: ${t.name} korter en rustig, ${minutes} minuten.` });
    }
  }
  return { sessions, repairs };
}
