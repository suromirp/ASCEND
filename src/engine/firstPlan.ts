// ASCEND: de eerste vragen en wat daaruit komt. Een nieuwe app plant niets tot
// je hebt gezegd wat je wilt (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md).
//
// Dit bouwt geen tweede planner. Het zet je antwoorden om in wat de bestaande
// planning al leest: een doel (met de Ascent Ladder voor een tocht), de rustdag
// en de vorm van je week (engine/weekShape.ts), de beschikbare dagen en, als je
// kracht wilt, een krachtblok. Daarna rekent de gewone planningsronde
// (storage/database.ts#syncProgramHorizon, engine/planPass.ts) het plan uit en
// komt het als voorstel met Akkoord (storage/horizonPlan.ts).
//
// Puur: geen React, geen IndexedDB.

import type { Program } from '../models/program';
import type { GoalMilestone, TrainingGoal } from '../models/goals';
import type { SessionTemplate } from '../models/training';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import type { Weekday } from '../models/goalEngineConfig';
import { buildObjective, buildProgram } from '../data/defaultProgram';
import { formatDateNL, mondayOfWeek } from '../utils/dates';
import { makeId } from '../utils/id';
import { goalDateProblem } from './goalDate';
import { buildDefaultStrengthProgramStrategy, buildMarathonGoal, migrateGr5ObjectiveData } from './goalMigration';
import { isRaceGoal } from './raceBlock';
import { layoutPhases } from './programLayout';
import type { RestWeekday } from './restDay';
import { mainGoal } from './mainGoal';
import type { WeekShape } from './sports';
import { adviceDays, chooseWeekShape, isStrengthTemplateId, type StartGoalKind } from './weekShape';

export type StartRace = '5k' | '10k' | 'half' | 'full';

export const RACE_OPTIONS: { id: StartRace; label: string; km: number }[] = [
  { id: '5k', label: '5 kilometer', km: 5 },
  { id: '10k', label: '10 kilometer', km: 10 },
  { id: 'half', label: 'Halve marathon', km: 21.1 },
  { id: 'full', label: 'Marathon', km: 42.2 },
];

export const GOAL_OPTIONS: { id: StartGoalKind; label: string; note: string }[] = [
  { id: 'trek', label: 'Een meerdaagse tocht met rugzak', note: 'Zoals de GR5. ASCEND bouwt op naar lange dagen met een zware rugzak.' },
  { id: 'race', label: 'Een hardloopwedstrijd', note: 'Een vaste afstand op een vaste dag. ASCEND plant een blok toe naar de wedstrijd.' },
  { id: 'fit', label: 'Fit en sterk blijven', note: 'Zonder datum. Een rustige, vaste week die je kunt volhouden.' },
];

export type StartStep = 'goal' | 'race' | 'date' | 'days' | 'which' | 'strength';

// De vragen die bij dit doel horen, in volgorde: de afstand alleen voor een
// wedstrijd, de datum niet voor fit blijven.
export function startSteps(goal: StartGoalKind, hasGoal = false): StartStep[] {
  // A goal that is already there (set by hand before the first plan) stays as
  // it is: only the week is asked.
  if (hasGoal) return ['days', 'which', 'strength'];
  return ['goal', ...(goal === 'race' ? (['race'] as StartStep[]) : []), ...(goal === 'fit' ? [] : (['date'] as StartStep[])), 'days', 'which', 'strength'];
}

export interface StartAnswers {
  goal: StartGoalKind;
  race: StartRace;
  // De datum van de tocht of de wedstrijd; leeg mag.
  goalDate?: string;
  daysPerWeek: number;
  // 1 maandag tot 7 zondag.
  allowedDays: number[];
  strength: boolean;
}

// Het advies als startpunt: de week die bij het doel past, alle dagen
// beschikbaar, met kracht.
export function defaultAnswers(goal: StartGoalKind = 'trek'): StartAnswers {
  return { goal, race: 'half', daysPerWeek: adviceDays(goal).days, allowedDays: [1, 2, 3, 4, 5, 6, 7], strength: true };
}

export function startDateProblem(answers: Pick<StartAnswers, 'goal' | 'goalDate'>, today: string): string | undefined {
  if (answers.goal === 'fit') return undefined;
  return goalDateProblem(answers.goalDate, today);
}

const WEEKDAY_KEYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WEEKDAY_NAMES = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
export const WEEKDAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

export interface FirstPlanSetup {
  title: string;
  program: Program;
  goals: TrainingGoal[];
  milestones: GoalMilestone[];
  // Wat in de instellingen komt.
  settings: { weekShape: WeekShape; restDay: RestWeekday; marathonRaceType?: 'half' | 'full'; marathonTargetDate?: string };
  allowedDays: Weekday[];
  strategy: StrengthProgramStrategy | null;
  // Gewone zinnen: wat je koos en wat anders uitpakte dan gevraagd.
  lines: string[];
  // Het aantal trainingen per week zoals het werd.
  count: number;
}

function raceGoal(answers: StartAnswers, now: string): { goal: TrainingGoal; marathon?: 'half' | 'full' } {
  if (answers.race === 'half' || answers.race === 'full') {
    const goal = buildMarathonGoal(answers.race, answers.goalDate, undefined)!;
    return { goal, marathon: answers.race };
  }
  const option = RACE_OPTIONS.find((o) => o.id === answers.race)!;
  const base = {
    id: makeId('goal'),
    name: option.label,
    requirements: [{ id: makeId('req'), kind: 'distance' as const, scope: 'SINGLE_EVENT' as const, target: { amount: option.km, unit: 'km' as const }, discipline: 'running' }],
    createdAt: now,
    updatedAt: now,
  };
  const goal: TrainingGoal = answers.goalDate ? { ...base, status: 'active', targetDate: answers.goalDate } : { ...base, status: 'paused' };
  return { goal };
}

function trekGoal(answers: StartAnswers, now: string): { goal: TrainingGoal; milestones: GoalMilestone[] } {
  // Precies het doel en de ladder die een app altijd had (data/defaultProgram.ts,
  // storage/goalMilestoneSync.ts houdt ze bij); alleen de datum is die van jou.
  // De route (aantal dagen, rugzak) vul je later in bij je doel.
  const objective = { ...buildObjective(), ...(answers.goalDate ? { targetDate: answers.goalDate } : {}) };
  const { goal, milestones } = migrateGr5ObjectiveData(objective, []);
  return { goal: { ...goal, createdAt: now, updatedAt: now }, milestones };
}

function goalLine(answers: StartAnswers): string {
  const when = answers.goalDate ? ` op ${formatDateNL(answers.goalDate)}` : ' (nog zonder datum)';
  if (answers.goal === 'trek') return `Doel: een meerdaagse tocht met rugzak${when}.`;
  if (answers.goal === 'race') return `Doel: ${RACE_OPTIONS.find((o) => o.id === answers.race)!.label.toLowerCase()}${when}.`;
  return 'Doel: fit en sterk blijven, zonder datum.';
}

// Which kind of week fits goals that are already there.
export function kindOfExistingGoals(goals: TrainingGoal[], milestones: GoalMilestone[]): StartGoalKind {
  if (mainGoal(goals, milestones, 'live')) return 'trek';
  if (goals.filter((g) => g.status !== 'archived').some(isRaceGoal)) return 'race';
  return 'fit';
}

// `existing`: goals are there already; none is made, and the week follows their kind.
export function buildFirstPlan(answers: StartAnswers, templates: SessionTemplate[], today: string, nowIso: string = new Date().toISOString(), existing?: { kind: StartGoalKind }): FirstPlanSetup {
  if (existing) answers = { ...answers, goal: existing.kind };
  const week = chooseWeekShape(templates, { goal: answers.goal, daysPerWeek: answers.daysPerWeek, allowedDays: answers.allowedDays, strength: answers.strength });

  let goals: TrainingGoal[] = [];
  let milestones: GoalMilestone[] = [];
  let marathon: 'half' | 'full' | undefined;
  if (existing) {
    // Nothing to make: the plan is laid out toward the goals that exist.
  } else if (answers.goal === 'trek') {
    const t = trekGoal(answers, nowIso);
    goals = [t.goal];
    milestones = t.milestones;
  } else if (answers.goal === 'race') {
    const r = raceGoal(answers, nowIso);
    goals = [r.goal];
    marathon = r.marathon;
  }

  // Het programma begint deze week; zonder doeldatum de gewone blokken en daarna onderhoud.
  const base = buildProgram();
  const startDate = mondayOfWeek(today);
  const anchor = !existing && answers.goal === 'trek' && answers.goalDate && answers.goalDate > today ? answers.goalDate : undefined;
  // Zonder doel (fit, geen bestaand doel) de neutrale golven, zoals de planningsronde het daarna ook doet.
  const program: Program = { ...base, startDate, phases: layoutPhases(startDate, anchor, today, undefined, { free: !existing && answers.goal === 'fit' }) };

  const strengthIds = week.kept.filter(isStrengthTemplateId);
  const strategy: StrengthProgramStrategy | null = answers.strength && strengthIds.length > 0
    ? { ...buildDefaultStrengthProgramStrategy(today), startDate: today, sessionsPerWeek: strengthIds.length, sessionTemplateIds: strengthIds, splitType: strengthIds.length === 1 ? 'full_body' : 'upper_lower' }
    : null;

  const names = new Map(templates.map((t) => [t.id, t.name]));
  const dayLine = week.kept.map((id) => `${WEEKDAY_NAMES[(week.shape.days[id] ?? 1) - 1]}: ${names.get(id) ?? id}`).join(', ');
  const lines = [
    existing ? 'Je doel blijft zoals het is.' : goalLine(answers),
    `${week.count} ${week.count === 1 ? 'training' : 'trainingen'} per week${week.count > 0 ? ` (${dayLine})` : ''}.`,
    `Rustdag: ${WEEKDAY_NAMES[week.restDay - 1]}.`,
    strategy ? 'Met krachttraining.' : 'Zonder krachttraining.',
    ...week.notes,
  ];

  return {
    title: 'Zo ziet je eerste week eruit',
    program,
    goals,
    milestones,
    settings: { weekShape: week.shape, restDay: week.restDay, ...(marathon ? { marathonRaceType: marathon, marathonTargetDate: answers.goalDate } : {}) },
    allowedDays: answers.allowedDays.filter((d) => d >= 1 && d <= 7).map((d) => WEEKDAY_KEYS[d - 1]),
    strategy,
    lines,
    count: week.count,
  };
}
