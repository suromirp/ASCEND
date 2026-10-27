// ASCEND — the weekly review ("weekterugblik").
//
// On Sunday the week that is ending, on Monday the week that just ended:
// what you did, how it felt, what ASCEND adjusted, what next week asks,
// and at most three pieces of coach advice. Missed trainings are bundled
// into one line here instead of one message each.
//
// Rest days are never trainings (no counting, never missed). Weeks before
// week 1 are not reviewed. Pure: no React, no IndexedDB.

import type { WeeklyHealthCheck } from '../models/checkIn';
import { significantPain } from './pain';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { PlanChangeProposal } from '../models/planChange';
import { addDays, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { buildWorkoutPlan } from './workoutPlan';
import { INTENSITY } from '../data/workoutStructure';
import { resolveEffectiveFullDuration } from './substitutions';
import { progressionTarget } from './programLayout';
import { logSport, SPORT_LABEL, type Sport } from './sports';
import { weekChanges } from './changeLog';
import { durationLabel } from './sessionBrief';
import { weekDoneMinutes, weekLogsOf } from './weekLogs';
import { isIllnessDay } from './illness';
import { EASY_RPE_TOP } from './coach';
import type { IllnessEpisode } from '../models/illness';
import { idHasRole } from './templateRoles';

export interface WeekReview {
  weekStart: string;
  title: string; // "Week 3 van 17, basisfase"
  done: number;
  planned: number;
  minutes: number;
  perSport: string[]; // "Hardlopen: 18,4 km, 320 m D+"
  missed: string[]; // template names
  missedTemplateIds: string[];
  keyPlanned: number; // long run / mountain hike
  keyDone: number;
  heavier: number; // trainings that felt harder than planned
  pain: string[]; // "knie 2 keer", from what you ticked after a training
  lighter: number;
  avgRpe?: number;
  changes: string[]; // what ASCEND adjusted in this week
  next?: { title: string; note?: string; minutes: number; key?: string };
  advice: string[];
  weeklyCheck?: WeeklyHealthCheck;
}

interface ReviewInputs {
  weekStart: string;
  plannedSessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  program: Program | null | undefined;
  planChangeLog: PlanChangeProposal[];
  asOf: string;
  illnessEpisodes?: IllnessEpisode[];
  weeklyChecks?: WeeklyHealthCheck[];
}

// The key sessions are the templates with the role 'key' (engine/templateRoles.ts).

function weekTitle(program: Program | null | undefined, weekStart: string): string {
  const position = program ? resolveProgramWeek(program, weekStart) : null;
  return position ? `Week ${position.weekInPhase} van ${position.phase.weekCount}, ${position.phase.name.toLowerCase()}` : 'Deze week';
}

// "RPE 3-4" -> 4: the top of the planned effort.
function plannedRpeTop(template: SessionTemplate, date: string, program: Program | null | undefined): number | undefined {
  const plan = buildWorkoutPlan(template, date, program);
  const levels = plan?.timeline.filter((s) => s.kind !== 'strength' && !s.noTarget).map((s) => s.intensity) ?? [];
  if (levels.length === 0) return undefined;
  const m = INTENSITY[Math.max(...levels) as 1 | 2 | 3 | 4].rpe.match(/(\d+)(?:-(\d+))?/);
  return m ? Number(m[2] ?? m[1]) : undefined;
}

export function buildWeekReview(inputs: ReviewInputs): WeekReview | null {
  const { weekStart, plannedSessions, logs, templates, program, planChangeLog, asOf, illnessEpisodes, weeklyChecks } = inputs;
  const weeklyCheck = weeklyChecks?.find((c) => c.weekStart === weekStart);
  if (program && weekStart < mondayOfWeek(program.startDate)) return null;
  const byId = new Map(templates.map((t) => [t.id, t]));
  const weekEnd = addDays(weekStart, 6);
  const isRest = (s: PlannedSession) => byId.get(s.templateId)?.type === 'recovery';
  const loggedIds = new Set(logs.map((l) => l.plannedSessionId));

  // A training you skipped (or let go after missing it) still counts as
  // planned and not done (production feedback: "4 van 4, alles gedaan"
  // while two trainings were skipped). Not counted: sessions ASCEND itself
  // took out while rearranging the plan (a new strength block, the weekly
  // planning), and days you were ill.
  const removedBy = new Map<string, string>();
  for (const p of planChangeLog) {
    if (p.resolution !== 'accepted') continue;
    for (const c of p.changes) if (c.action === 'remove' && c.plannedSessionId) removedBy.set(c.plannedSessionId, p.trigger);
  }
  const countsAsTraining = (s: PlannedSession) => {
    if (isRest(s) || (illnessEpisodes && isIllnessDay(s.scheduledDate, illnessEpisodes, asOf))) return false;
    if (s.status !== 'skipped') return true;
    const trigger = removedBy.get(s.id);
    return !trigger || trigger === 'session_skipped' || trigger === 'session_missed';
  };
  const trainings = plannedSessions.filter((s) => s.scheduledDate >= weekStart && s.scheduledDate <= weekEnd && countsAsTraining(s));
  // What was done that week, by the day it was done, with or without a plan: the same
  // logs and the same minutes as the top of Week (engine/weekLogs.ts).
  const weekLogs = weekLogsOf(logs, byId, weekStart);
  const done = trainings.filter((s) => loggedIds.has(s.id)).length;
  const missedSessions = trainings.filter((s) => !loggedIds.has(s.id) && (s.scheduledDate < asOf || s.status === 'skipped')).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const minutes = weekDoneMinutes(logs, byId, weekStart);

  // Per sport: kilometers and climbing, from what was logged.
  const sportTotals = new Map<Sport, { km: number; dplus: number }>();
  for (const l of weekLogs) {
    const sport = logSport(l);
    if (!sport) continue;
    const data = l.outdoorData ?? l.cardioData;
    const t = sportTotals.get(sport) ?? { km: 0, dplus: 0 };
    t.km += data?.distanceKm ?? 0;
    t.dplus += data?.elevationGainM ?? 0;
    sportTotals.set(sport, t);
  }
  const perSport = [...sportTotals.entries()]
    .filter(([, t]) => t.km > 0 || t.dplus > 0)
    .map(([sport, t]) => `${SPORT_LABEL[sport]}: ${[t.km > 0 ? `${formatNumberNL(t.km, 1)} km` : '', t.dplus > 0 ? `${formatNumberNL(t.dplus, 0)} m D+` : ''].filter(Boolean).join(', ')}`);

  // How it felt against the plan.
  let heavier = 0;
  let lighter = 0;
  const rpes: number[] = [];
  for (const l of weekLogs) {
    if (l.rpe === undefined) continue;
    rpes.push(l.rpe);
    const t = byId.get(l.templateId);
    const top = t ? plannedRpeTop(t, l.completedDate, program) : undefined;
    if (top !== undefined && l.rpe >= top + 2) heavier++;
    else if (top !== undefined && top > EASY_RPE_TOP && l.rpe <= top - 3) lighter++;
    else if (l.subjectiveFeel === 'worse') heavier++;
  }
  const painCount = new Map<string, number>();
  for (const l of weekLogs) for (const { area: a } of significantPain(l)) painCount.set(a, (painCount.get(a) ?? 0) + 1);
  const pain = [...painCount.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a.toLowerCase()}${n > 1 ? ` ${n} keer` : ''}`);
  const avgRpe = rpes.length > 0 ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : undefined;

  const changes = weekChanges(planChangeLog, plannedSessions, templates, weekStart, asOf, 21).map((c) => c.line);

  // Next week: phase, what it asks, the key session.
  const nextStart = addDays(weekStart, 7);
  const nextSessions = plannedSessions.filter((s) => s.scheduledDate >= nextStart && s.scheduledDate <= addDays(nextStart, 6) && !isRest(s) && s.status !== 'skipped');
  let next: WeekReview['next'];
  if (nextSessions.length > 0) {
    const nextMinutes = nextSessions.reduce((n, s) => {
      const t = byId.get(s.templateId);
      return t ? n + resolveEffectiveFullDuration(t, s.scheduledDate, program) : n;
    }, 0);
    const key = nextSessions.find((s) => idHasRole(s.templateId, 'key', byId));
    const keyT = key ? byId.get(key.templateId) : undefined;
    const keyStep = keyT && key ? progressionTarget(keyT, program, key.scheduledDate)?.step : undefined;
    const note = nextSessions.map((s) => byId.get(s.templateId)).map((t) => (t && progressionTarget(t, program, nextStart)?.step.note?.split(/, | \(/)[0])).find(Boolean);
    next = {
      title: weekTitle(program, nextStart),
      note,
      minutes: nextMinutes,
      key: keyT && key
        ? `${keyT.name}: ${durationLabel(resolveEffectiveFullDuration(keyT, key.scheduledDate, program))}${keyStep?.elevationGainM ? `, ${formatNumberNL(keyStep.elevationGainM, 0)} m omhoog` : ''}${keyStep?.backpackKg ? `, ${formatNumberNL(keyStep.backpackKg, 1)} kg rugzak` : ''}`
        : undefined,
    };
  }

  // The coach: at most three lines, the most important first.
  const advice: string[] = [];
  const missedNames = missedSessions.map((s) => byId.get(s.templateId)?.name ?? 'een training');
  if (missedSessions.length === 0 && trainings.length > 0 && done === trainings.length) {
    advice.push('Alles gedaan wat gepland stond. Zo bouw je op.');
  } else if (missedSessions.length > 0) {
    // Only a key session that is still open can be caught up; a skipped one
    // was already let go.
    const keyMissed = missedSessions.find((s) => idHasRole(s.templateId, 'key', byId) && s.status !== 'skipped');
    advice.push(
      `${missedNames.length === 1 ? missedNames[0] : `${missedNames.slice(0, -1).join(', ')} en ${missedNames.at(-1)}`} ${missedNames.length === 1 ? 'is' : 'zijn'} blijven liggen. ` +
      (keyMissed
        ? `De ${byId.get(keyMissed.templateId)?.name.toLowerCase()} is de belangrijkste van de week; die haalt ASCEND in op een vrije dag als dat nog past. De rest laat je los, niet dubbel doen.`
        : 'Laat het los: inhalen door te stapelen is geen goed idee. Volgende week weer gewoon volgens plan.'),
    );
  }
  // The same training missing two weeks in a row: a pattern, not bad luck.
  const prevStart = addDays(weekStart, -7);
  const prevMissed = new Set(plannedSessions
    .filter((s) => s.scheduledDate >= prevStart && s.scheduledDate < weekStart && countsAsTraining(s) && !loggedIds.has(s.id) && (!program || s.scheduledDate >= mondayOfWeek(program.startDate)))
    .map((s) => s.templateId));
  const repeated = [...new Set(missedSessions.map((s) => s.templateId))].find((id) => prevMissed.has(id));
  if (repeated) {
    advice.push(`${byId.get(repeated)?.name} viel twee weken op rij weg. Past een andere dag beter? Verplaats hem in Week, dan houdt ASCEND er rekening mee.`);
  }
  if ([...painCount.values()].some((n) => n >= 2) && advice.length < 3) {
    advice.push('Dezelfde plek deed deze week meer dan eens pijn. Meld het bij Lichaam, dan houdt ASCEND er rekening mee, en bouw volgende week niet verder op.');
  }
  // The weekly question (OSTRC-style): what the answer means for next week.
  if (weeklyCheck && weeklyCheck.trouble !== 'geen') {
    const where = weeklyCheck.area ? ` aan je ${weeklyCheck.area.toLowerCase()}` : '';
    if (weeklyCheck.trouble === 'niet_kunnen' || weeklyCheck.severity === 'ernstig') {
      advice.unshift(`Je kon door klachten${where} niet trainen. Bouw volgende week niet verder op, meld het bij Lichaam en laat het bekijken als het niet binnen 2 tot 3 weken beter wordt.`);
    } else if (weeklyCheck.trouble === 'minder') {
      advice.unshift(`Klachten${where} hielden je deze week af en toe af. Volgende week houdt ASCEND op die plek de omvang gelijk, zonder extra opbouw.`);
    } else if (weeklyCheck.severity === 'matig') {
      // Een melding op de kaart "Hoe voelt je lijf?": je kon trainen, de pijn hindert wel.
      advice.unshift(`Je meldde matige pijn${where}. Volgende week houdt ASCEND op die plek de omvang gelijk, zonder extra opbouw.`);
    } else {
      advice.push(`Een lichte klacht${where}, zonder dat je minder kon trainen. Let erop; zakt hij niet, meld het dan weer volgende week.`);
    }
  }
  if (heavier >= 2) {
    advice.push('Twee of meer trainingen voelden zwaarder dan gepland. Voelt het volgende week weer zo, kies dan de korte versie of houd de minuten gelijk. Slaap en eten kunnen helpen.');
  } else if (lighter >= 2 && advice.length < 3) {
    advice.push('Een paar trainingen voelden lichter dan gepland. Dat kan een teken zijn dat je sterker wordt. ASCEND bouwt rustig verder.');
  }
  if (next?.note && /rust/i.test(next.note) && advice.length < 3) {
    advice.push('Volgende week is een rustweek. Korter en rustiger is precies goed: dan komt de opbouw binnen.');
  }

  return {
    weekStart,
    title: weekTitle(program, weekStart),
    done,
    planned: trainings.length,
    minutes,
    perSport,
    missed: missedNames,
    missedTemplateIds: missedSessions.map((s) => s.templateId),
    keyPlanned: trainings.filter((s) => idHasRole(s.templateId, 'key', byId)).length,
    keyDone: trainings.filter((s) => idHasRole(s.templateId, 'key', byId) && loggedIds.has(s.id)).length,
    heavier,
    pain,
    lighter,
    avgRpe,
    changes,
    next,
    advice: advice.slice(0, 3),
    weeklyCheck,
  };
}

// Which week the review on Today is about: Sunday the current week,
// Monday the week that just ended, other days none.
export function reviewWeekFor(today: string, isoWeekday: number): string | undefined {
  if (isoWeekday === 7) return mondayOfWeek(today);
  if (isoWeekday === 1) return addDays(mondayOfWeek(today), -7);
  return undefined;
}
