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
import { weekNameAt, weekPositionLabel } from './weekLabel';
import { durationLabel } from './sessionBrief';
import type { PlannedById } from './logDay';
import { countsAsTraining as countsAsTrainingShared, leftOutOfCount, weekDoneMinutes, weekLogsOf } from './weekLogs';
import { EASY_RPE_TOP } from './coach';
import type { IllnessEpisode } from '../models/illness';
import { weekKeySession, type KeyFocus } from './keySession';
import { kgLabel } from '../utils/kg';
import type { HeartRateSettings } from './heartRateZones';
import type { IntensityCounting } from './intensitySettings';
import { effortMinutes, type EffortMinutes } from './weekEffort';
import { caughtUpMap } from './catchUp';

export interface WeekReview {
  weekStart: string;
  title: string; // "Week 3 van 17, basisfase"
  done: number;
  planned: number;
  minutes: number;
  perSport: string[]; // "Hardlopen: 18,4 km, 320 m D+"
  missed: string[]; // template names
  missedTemplateIds: string[];
  keyPlanned: number; // 1 als de week een sleuteltraining heeft (engine/keySession.ts#weekKeySession), anders 0
  keyDone: number; // 1 als die gedaan is
  keyName?: string; // de naam van die sleuteltraining
  heavier: number; // trainings that felt harder than planned
  pain: string[]; // "knie 2 keer", from what you ticked after a training
  lighter: number;
  avgRpe?: number;
  // Minuten rustig en hard (engine/weekEffort.ts), in plaats van een gemiddelde zwaarte.
  effort: EffortMinutes;
  // De week loopt nog (asOf valt erin): dan is het "je week tot nu" en blijft wat vandaag nog staat niet liggen.
  running: boolean;
  // Hoeveel trainingen er vandaag nog open staan, alleen als de week nog loopt.
  todayLeft: number;
  keyMissedName?: string; // de sleuteltraining die nog open blijft liggen
  checkAdvice?: string; // de zin uit je wekelijkse lijfvraag
  // `label`: de naam van de week ("Opbouw, week 4 van 18", "Rustweek", de golf), uit engine/weekLabel.ts#weekNameAt;
  // `rest`: volgens het programma een rustweek die je niet doortraint.
  next?: { title: string; note?: string; minutes: number; key?: string; label?: string; rest?: boolean };
  label?: string; // de naam van deze week, zoals bij next
  extraLogged?: number; // logs van deze week die niet bij een geplande training van deze week horen
  advice: string[];
  weeklyCheck?: WeeklyHealthCheck;
}

interface ReviewInputs {
  // Voor de weergave: een MacroFactor-log over middernacht telt op de dag van zijn geplande training (engine/logDay.ts), zoals in Week.
  plannedById?: PlannedById;
  weekStart: string;
  plannedSessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  program: Program | null | undefined;
  planChangeLog: PlanChangeProposal[];
  asOf: string;
  illnessEpisodes?: IllnessEpisode[];
  weeklyChecks?: WeeklyHealthCheck[];
  heartRate?: HeartRateSettings;
  // Instelling "Intensiteit tellen" (engine/intensitySettings.ts): bij "plan" telt de hartslag niet.
  intensityCounting?: IntensityCounting;
  // Wat de sleuteltraining is (engine/keySession.ts#keyFocusOf), dezelfde als op Ascend en bij het inhalen.
  // Zonder: de lange duurloop of de bergtocht.
  keyFocus?: KeyFocus;
}

// The key sessions are those of engine/keySession.ts, for the goal on top of Ascend or the direction.

function weekTitle(program: Program | null | undefined, weekStart: string): string {
  const position = program ? resolveProgramWeek(program, weekStart) : null;
  return position ? weekPositionLabel(position) : 'Deze week';
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
  const { weekStart, plannedSessions, logs, templates, program, planChangeLog, asOf, illnessEpisodes, weeklyChecks, keyFocus } = inputs;
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
  // planning), days you were ill and days before the program started.
  const leftOut = leftOutOfCount(plannedSessions, planChangeLog, illnessEpisodes, asOf, program?.startDate);
  const countsAsTraining = (s: PlannedSession) => countsAsTrainingShared(s, byId.get(s.templateId), leftOut);
  // De oude rij van een gemiste training die je naar later zette telt niet: de nieuwe rij telt
  // (docs/beslissingen/2026-11-05-inhalen-heet-verplaatsen.md).
  const movedOn = caughtUpMap(plannedSessions);
  const trainings = plannedSessions.filter((s) => s.scheduledDate >= weekStart && s.scheduledDate <= weekEnd && countsAsTraining(s) && !(s.status === 'skipped' && movedOn.has(s.id)));
  // What was done that week, by the day it was done, with or without a plan: the same
  // logs and the same minutes as the top of Week (engine/weekLogs.ts).
  const weekLogs = weekLogsOf(logs, byId, weekStart, inputs.plannedById);
  const done = trainings.filter((s) => loggedIds.has(s.id)).length;
  // Wat je deze week deed buiten een geplande training om (een losse training, iets op een rustdag): telt mee in de
  // minuten, niet in "gedaan". Het blad zegt het dan apart, zodat "0 gedaan · 56 min" geen tegenspraak is.
  const trainingIds = new Set(trainings.map((s) => s.id));
  const extraLogged = weekLogs.filter((l) => !l.plannedSessionId || !trainingIds.has(l.plannedSessionId)).length;
  const missedSessions = trainings.filter((s) => !loggedIds.has(s.id) && (s.scheduledDate < asOf || s.status === 'skipped')).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const minutes = weekDoneMinutes(logs, byId, weekStart, inputs.plannedById);

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

  // Next week: phase, what it asks, the key session.
  const nextStart = addDays(weekStart, 7);
  const nextSessions = plannedSessions.filter((s) => s.scheduledDate >= nextStart && s.scheduledDate <= addDays(nextStart, 6) && !isRest(s) && s.status !== 'skipped');
  let next: WeekReview['next'];
  if (nextSessions.length > 0) {
    const nextMinutes = nextSessions.reduce((n, s) => {
      const t = byId.get(s.templateId);
      return t ? n + resolveEffectiveFullDuration(t, s.scheduledDate, program) : n;
    }, 0);
    const key = weekKeySession(nextSessions, byId, keyFocus, program);
    const keyT = key ? byId.get(key.templateId) : undefined;
    const keyStep = keyT && key ? progressionTarget(keyT, program, key.scheduledDate)?.step : undefined;
    const note = nextSessions.map((s) => byId.get(s.templateId)).map((t) => (t && progressionTarget(t, program, nextStart)?.step.note?.split(/, | \(/)[0])).find(Boolean);
    next = {
      title: weekTitle(program, nextStart),
      label: weekNameAt(program, nextStart),
      rest: weekNameAt(program, nextStart) === 'Rustweek',
      note,
      minutes: nextMinutes,
      key: keyT && key
        ? `${keyT.name}: ${durationLabel(resolveEffectiveFullDuration(keyT, key.scheduledDate, program))}${keyStep?.elevationGainM ? `, ${formatNumberNL(keyStep.elevationGainM, 0)} m omhoog` : ''}${keyStep?.backpackKg ? `, ${kgLabel(keyStep.backpackKg)} rugzak` : ''}`
        : undefined,
    };
  }

  const running = asOf <= weekEnd && asOf >= weekStart;
  const todayLeft = running ? trainings.filter((s) => s.scheduledDate === asOf && s.status !== 'skipped' && !loggedIds.has(s.id)).length : 0;
  // One key session per week (engine/keySession.ts#weekKeySession), done or not: the counts below,
  // the coach line "sleuteltraining 3 van 4" and Herhaal de week all read this one.
  const weekKey = weekKeySession(trainings, byId, keyFocus, program);
  const keyMissedSession = weekKey && weekKey.status !== 'skipped' && missedSessions.some((m) => m.id === weekKey.id) ? weekKey : undefined;
  const effort = effortMinutes(weekLogs, byId, inputs.heartRate, inputs.intensityCounting);

  // The coach: at most three lines, the most important first.
  const advice: string[] = [];
  const missedNames = missedSessions.map((s) => byId.get(s.templateId)?.name ?? 'een training');
  if (missedSessions.length === 0 && trainings.length > 0 && done === trainings.length) {
    advice.push('Alles gedaan wat gepland stond. Zo bouw je op.');
  } else if (missedSessions.length > 0) {
    // Only a key session that is still open can be caught up; a skipped one
    // was already let go.
    const keyMissed = keyMissedSession;
    advice.push(
      // Geen namen: die staan al onder "Blijven liggen" op de terugblik.
      `${missedNames.length === 1 ? 'Eén training is' : `${missedNames.length} trainingen zijn`} blijven liggen. ` +
      (keyMissed
        ? `De ${byId.get(keyMissed.templateId)?.name.toLowerCase()} is de belangrijkste van de week. Die verplaatst ASCEND naar een vrije dag als dat past. De rest laat je los.`
        : 'Laat los wat blijft liggen. Dubbel doen helpt niet. Volgende week volgt het plan.'),
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
  const checkAdvice = weeklyCheck && weeklyCheck.trouble !== 'geen' ? advice.find((a) => /klacht|pijn/i.test(a)) : undefined;
  if (heavier >= 2) {
    advice.push('Twee of meer trainingen voelden zwaarder dan gepland. Voelt het volgende week weer zo? Kies de korte versie of houd de minuten gelijk. Slaap en eten kunnen helpen.');
  } else if (lighter >= 2 && advice.length < 3) {
    advice.push('Een paar trainingen voelden lichter dan gepland. Dat kan een teken zijn dat je sterker wordt. ASCEND bouwt rustig verder.');
  }
  // De rustweek uit het programma (isRestWeekAt via weekNameAt), niet uit een woord in een notitie.
  if (next?.rest && advice.length < 3) {
    advice.push('Volgende week is een rustweek. Korter en rustiger is precies goed: dan komt de opbouw binnen.');
  }

  return {
    weekStart,
    title: weekTitle(program, weekStart),
    label: weekNameAt(program, weekStart),
    extraLogged,
    done,
    planned: trainings.length,
    minutes,
    perSport,
    missed: missedNames,
    missedTemplateIds: missedSessions.map((s) => s.templateId),
    keyPlanned: weekKey ? 1 : 0,
    keyDone: weekKey && loggedIds.has(weekKey.id) ? 1 : 0,
    keyName: weekKey ? byId.get(weekKey.templateId)?.name : undefined,
    heavier,
    pain,
    lighter,
    avgRpe,
    effort,
    running,
    todayLeft,
    keyMissedName: keyMissedSession ? byId.get(keyMissedSession.templateId)?.name : undefined,
    checkAdvice,
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
