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
//   A hard run that stays becomes an easy run on the same day, in its short
//   version, and every other run gets its short version: no build-up away from home.
// - Normal: the runs stay as planned, only without a gym.
// - Never two sessions with your own weight (or any two strength sessions) on
//   consecutive days: 48 hours between them. A strength session that finds no day
//   goes, with that reason (docs/beslissingen/2026-11-09-zonder-sportschool-beter.md).
// - Heuvels in de buurt: one run per week of the period is a real hill training, hill
//   sprints or an easy hill run, by phase, by the 48 hours between heavy leg days and by
//   a complaint of a knee or leg at Matig or worse.
// - A period with Heuvels in de buurt and no run that can become a hill training gets one
//   easy hill run on a free day, with 48 hours from heavy leg days.
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
import { daysBetween, isoWeekday, mondayOfWeek } from '../utils/dates';
import { describePeriodDates, type LeaveDay } from './leave';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { templateSport } from './sports';
import { hasRole, idIsTestOrRace, isGymStrengthTemplate } from './templateRoles';
import { lockLevel, type Repair } from './weekValidator';
import { BODYWEIGHT_TEMPLATE_ID, resolveNoGym } from './noGymDetails';

export { BODYWEIGHT_TEMPLATE_ID };

const EASY_RUN_TEMPLATE_ID = 'tpl_easy_run';
export const HILL_EASY_TEMPLATE_ID = 'tpl_hill_easy';
// Hill sprints first: bergop hard, then a controlled way down; the intervals are the fallback.
const HILL_SPRINT_IDS = ['tpl_hills_descent', 'tpl_hill_intervals'];
const HILL_TRAINING_IDS = new Set([...HILL_SPRINT_IDS, HILL_EASY_TEMPLATE_ID]);
export const LIGHT_RUNS_PER_WEEK = 2;

export interface NoGymStepInput {
  sessions: PlannedSession[];
  days: Map<string, LeaveDay>;
  today: string;
  goalDay?: string;
  templates: SessionTemplate[];
  logged: Set<string | undefined>;
  newId: () => string;
  // A week of the program for gentle hills only (base phase, taper, rest week), by its Monday.
  gentleWeek?: (monday: string) => boolean;
  // A complaint of a knee or leg at Matig or worse is open.
  legComplaint?: boolean;
  // The rest day you set (1 to 7, Monday first): no session with your own weight lands on it.
  restDay?: number;
}

export const isNoGymRun = (t: SessionTemplate | undefined): boolean => !!t && t.type !== 'strength' && templateSport(t) === 'running';
export const isNoGymStrength = (t: SessionTemplate | undefined): boolean => !!t && isGymStrengthTemplate(t);
export const isHillTraining = (t: SessionTemplate | undefined): boolean => !!t && (hasRole(t, 'hills') || HILL_TRAINING_IDS.has(t.id));
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

  // 2. The hill training of the week (Heuvels in de buurt): one run per week of the period.
  const easy = byId.has(EASY_RUN_TEMPLATE_ID) ? byId.get(EASY_RUN_TEMPLATE_ID) : undefined;
  const weekOf = (date: string) => mondayOfWeek(date);
  const openOn = (date: string) => sessions.filter((o) => o.scheduledDate === date && open(o));
  // Too close for a heavy leg day: another heavy day for the legs (or the long run) on the day before, after or the same day.
  // A gym session of this period does not count: it is let go or becomes a light session with your own weight.
  const heavyNear = (date: string, selfId: string) => sessions.some((o) => {
    if (o.id === selfId || !open(o) || Math.abs(daysBetween(o.scheduledDate, date)) > 1) return false;
    const ot = byId.get(o.templateId);
    if (!ot) return false;
    if (isNoGymStrength(ot) && mine(o)) return false;
    return isLegHeavyTemplate(ot) || hasRole(ot, 'long');
  });
  interface HillPick { templateId: string; reason: string; short: boolean }
  const picks = new Map<string, HillPick>();
  // A hill training that already stands in the week stays what it is (only shortened in Licht).
  const keepHill = new Set<string>();
  const hillWeeks = new Map<string, PlannedSession[]>();
  for (const s of sessions) {
    const p = periodOn(s.scheduledDate);
    if (!p || !resolveNoGym(p).hills || !open(s) || !isNoGymRun(byId.get(s.templateId))) continue;
    const key = `${p.id}|${weekOf(s.scheduledDate)}`;
    hillWeeks.set(key, [...(hillWeeks.get(key) ?? []), s]);
  }
  const sprintId = HILL_SPRINT_IDS.find((id) => byId.has(id));
  for (const runs of hillWeeks.values()) {
    const period = periodOn(runs[0].scheduledDate)!;
    const monday = weekOf(runs[0].scheduledDate);
    const standing = runs.filter((s) => isHillTraining(byId.get(s.templateId)));
    if (standing.length > 0) { for (const s of standing) keepHill.add(s.id); continue; }
    const candidates = runs
      .filter((s) => mine(s) && !hasRole(byId.get(s.templateId)!, 'long') && !s.leave)
      .sort((a, b) => Number(!isHard(byId.get(a.templateId)!)) - Number(!isHard(byId.get(b.templateId)!)) || a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id));
    if (candidates.length === 0) continue;
    const short = resolveNoGym(period).amount === 'light';
    const candidateIds = new Set(candidates.map((c) => c.id));
    const hardHillsThisWeek = sessions.some((o) => { const ot = byId.get(o.templateId); return open(o) && !candidateIds.has(o.id) && weekOf(o.scheduledDate) === monday && !!ot && ((isNoGymRun(ot) && isHard(ot)) || HILL_SPRINT_IDS.includes(o.templateId)); });
    const gentle = !!input.gentleWeek?.(monday);
    const easyHill = byId.has(HILL_EASY_TEMPLATE_ID) ? HILL_EASY_TEMPLATE_ID : undefined;
    const sprintsOk = (s: PlannedSession) => !!sprintId && !input.legComplaint && !gentle && !hardHillsThisWeek && !heavyNear(s.scheduledDate, s.id);
    const first = candidates.find(sprintsOk);
    if (first && sprintId) {
      picks.set(first.id, { templateId: sprintId, short, reason: `Heuvels in de buurt: heuvelsprints in plaats van ${byId.get(first.templateId)?.name ?? 'je loop'}, één heuveltraining per week.` });
    } else if (easyHill) {
      const c = candidates[0];
      const why = input.legComplaint
        ? 'je klacht aan een knie of been is Matig of erger, dus geen afdalen in tempo'
        : gentle ? 'in deze week passen geen sprints'
        : hardHillsThisWeek ? 'er staat deze week al een harde loop of heuveltraining'
        : 'sprints hebben 48 uur nodig na een beenzware dag';
      picks.set(c.id, { templateId: easyHill, short, reason: `Heuvels in de buurt: een rustige heuvelloop in plaats van ${byId.get(c.templateId)?.name ?? 'je loop'}, ${why}.` });
    }
  }

  // 3. The gym, the hard runs and the short runs, day by day.
  const strengthNear = (date: string, selfId: string) => sessions.some((o) => {
    const ot = byId.get(o.templateId);
    if (o.id === selfId || !open(o) || ot?.type !== 'strength' || Math.abs(daysBetween(o.scheduledDate, date)) >= 2) return false;
    // A gym session of this period that is still to be handled does not count: it decides for itself.
    return !(isNoGymStrength(ot) && mine(o));
  });
  for (const s of [...sessions].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id))) {
    if (!mine(s)) continue;
    const period = periodOn(s.scheduledDate)!;
    const t = byId.get(s.templateId);
    if (!t) continue;
    const light = resolveNoGym(period).amount === 'light';
    const pick = picks.get(s.id);
    if (isNoGymStrength(t)) {
      const bodyweight = resolveNoGym(period).strength === 'bodyweight' && byId.has(BODYWEIGHT_TEMPLATE_ID);
      if (!bodyweight) { drop(s, period, `Geen sportschool: ${t.name} vervalt.`); continue; }
      // 48 hours between strength sessions: the same day if it fits, else the nearest day of the period that does.
      const periodDay = (date: string) => periodOn(date)?.id === period.id && usable(date) && isoWeekday(date) !== input.restDay && !openOn(date).some((o) => idIsTestOrRace(o.templateId, byId) || logged.has(o.id));
      const options = [...days.keys()].filter((d) => periodDay(d) && !strengthNear(d, s.id) && !served(period, d, BODYWEIGHT_TEMPLATE_ID))
        .sort((a, b) => Math.abs(daysBetween(a, s.scheduledDate)) - Math.abs(daysBetween(b, s.scheduledDate)) || a.localeCompare(b));
      const day = options[0];
      if (day === undefined) {
        drop(s, period, `Geen sportschool: ${t.name} vervalt. Een sessie met je eigen gewicht past niet, want tussen twee krachtsessies zit minstens 48 uur.`);
        continue;
      }
      drop(s, period, day === s.scheduledDate ? `Geen sportschool: ${t.name} wordt een korte sessie met je eigen gewicht.` : `Geen sportschool: ${t.name} wordt een korte sessie met je eigen gewicht op ${describePeriodDates({ startDate: day, endDate: day })}.`);
      place(period, day, BODYWEIGHT_TEMPLATE_ID, day === s.scheduledDate ? `Geen sportschool: een korte sessie met je eigen gewicht in plaats van ${t.name}.` : `Geen sportschool: een korte sessie met je eigen gewicht in plaats van ${t.name}, een andere dag voor 48 uur tussen je krachtsessies.`);
    } else if (pick) {
      const target = byId.get(pick.templateId)!;
      drop(s, period, `Heuvels in de buurt: ${t.name} wordt ${target.name.toLowerCase()}.`);
      place(period, s.scheduledDate, pick.templateId, pick.reason, pick.short ? target.durationVariants.short : undefined);
    } else if (light && isNoGymRun(t) && isHard(t) && !keepHill.has(s.id) && easy && isNoGymRun(easy)) {
      // A rustige loop already on that day: the hard run goes without a second one.
      if (served(period, s.scheduledDate, easy.id)) {
        drop(s, period, `Weg van huis: ${t.name} vervalt, er staat die dag al een rustige loop.`);
        continue;
      }
      drop(s, period, `Weg van huis: ${t.name} wordt een rustige loop.`);
      place(period, s.scheduledDate, easy.id, `Weg van huis: een korte rustige loop in plaats van ${t.name}.`, easy.durationVariants.short);
    } else if (light && isNoGymRun(t) && s.plannedMinutes === undefined && !s.leave && t.durationVariants.short && t.durationVariants.short < t.durationVariants.full) {
      const minutes = t.durationVariants.short;
      sessions = sessions.map((o) => (o.id === s.id ? { ...o, plannedMinutes: minutes, leave: { periodId: period.id, role: 'moved' as const, from: s.scheduledDate, shortened: true } } : o));
      repairs.push({ sessionId: s.id, rule: 'LEAVE-PLACE', from: s.scheduledDate, to: s.scheduledDate, plannedMinutes: minutes, reason: keepHill.has(s.id) ? `Heuvels in de buurt: ${t.name} blijft je heuveltraining van deze week, korter, ${minutes} minuten.` : `Weg van huis: ${t.name} korter en rustig, ${minutes} minuten.` });
    }
  }

  // 4. A period with Heuvels in de buurt and no run that can become a hill training: one easy hill run
  // on a free day of the period (docs/beslissingen/2026-11-09-zonder-sportschool-heuvelloop.md).
  // After the day by day step, so the layout it must fit is final; a second run finds it standing.
  const hillEasy = byId.get(HILL_EASY_TEMPLATE_ID);
  if (hillEasy) {
    const periods = new Map<string, LeavePeriod>();
    for (const d of days.values()) if (d.kind === 'nogym' && resolveNoGym(d.period).hills) periods.set(d.period.id, d.period);
    for (const period of periods.values()) {
      const dates = [...days.keys()].filter((date) => periodOn(date)?.id === period.id).sort();
      // Already there, or there was one: standing, placed by this period (also when you moved or skipped it),
      // let go by this period, or skipped by you.
      const hasHill = sessions.some((o) => {
        if (!isHillTraining(byId.get(o.templateId))) return false;
        if (o.leave?.periodId === period.id && (o.leave.role === 'placed' || o.leave.role === 'dropped')) return true;
        return periodOn(o.scheduledDate)?.id === period.id;
      });
      if (hasHill) continue;
      const light = resolveNoGym(period).amount === 'light';
      const legHeavyNear = (date: string) => sessions.some((o) => { const ot = byId.get(o.templateId); return open(o) && !!ot && Math.abs(daysBetween(o.scheduledDate, date)) <= 1 && (isLegHeavyTemplate(ot) || hasRole(ot, 'long') || isHillTraining(ot)); });
      const strengthClose = (date: string) => sessions.some((o) => open(o) && byId.get(o.templateId)?.type === 'strength' && Math.abs(daysBetween(o.scheduledDate, date)) <= 1);
      // A test or race within two days (or the goal day) is no neighbour for an extra run; a day you emptied yourself stays empty.
      const keyDayNear = (date: string) => (!!goalDay && Math.abs(daysBetween(goalDay, date)) <= 2) ||
        sessions.some((o) => open(o) && idIsTestOrRace(o.templateId, byId) && Math.abs(daysBetween(o.scheduledDate, date)) <= 2);
      const emptiedByYou = (date: string) => sessions.some((o) => o.scheduledDate === date && o.status === 'skipped' && o.leave?.role !== 'dropped');
      const free = dates.filter((date) => usable(date) && isoWeekday(date) !== input.restDay && openOn(date).length === 0 && !emptiedByYou(date) && !keyDayNear(date) &&
        // Light: no third run in that week.
        !(light && sessions.filter((o) => open(o) && isNoGymRun(byId.get(o.templateId)) && periodOn(o.scheduledDate)?.id === period.id && weekOf(o.scheduledDate) === weekOf(date)).length >= LIGHT_RUNS_PER_WEEK));
      const day = free.find((date) => !legHeavyNear(date) && !strengthClose(date)) ?? free.find((date) => !legHeavyNear(date));
      if (day === undefined) continue;
      const why = input.legComplaint
        ? 'want er staat in je periode geen loop die een heuveltraining kan worden, en je klacht aan een knie of been is Matig of erger, dus zonder afdalen in tempo'
        : 'er staat in je periode geen loop die een heuveltraining kan worden';
      place(period, day, HILL_EASY_TEMPLATE_ID, `Heuvels in de buurt: een rustige heuvelloop erbij, ${why}.`, light ? hillEasy.durationVariants.short : undefined);
    }
  }
  return { sessions, repairs };
}
