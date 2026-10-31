// ASCEND: minuten in de planning zonder doel (docs/visie/Zonder doel.md, 3.3 en stap 5). Het
// weekbudget van je richting wordt over de trainingen van je week verdeeld: elke training houdt
// haar eigen gewone lengte (de opbouwweek van haar schema), maal één factor per week van de golf.
// De factor is het budget van die week gedeeld door wat het weekpatroon gewoon telt, met pittige
// minuten dubbel zoals op de kaart Je week. Kracht en herstel tellen niet mee en houden hun lengte.
//
// De grenzen die er al zijn blijven boven op de factor gelden: de sessiepiek van 110% van je
// langste training van 30 dagen (engine/substitutions.ts), je tijd per dag en ziekte (de weekcheck).
// Past het budget dan niet, dan zegt de kaart het (engine/yourWeek.ts), nooit stil.
//
// Puur: geen React, geen IndexedDB. storage/database.ts#syncProgramHorizon zet het resultaat op
// Program.direction, zoals het rugzakdoel.

import { DIRECTIONS, type DirectionId } from '../data/directions';
import type { ProgramDirection } from '../models/program';
import type { SessionLog, SessionTemplate } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import { budgetFor, recentAverage, resolveWeekBudget, HARD_RPE, type CountOptions } from './weekBudget';
import { waveWeek as waveOfDate } from './waves';
import { plannedEffort } from './standing';

// De week van het schema die als gewone lengte geldt: de opbouwweek.
export const BASE_STEP_WEEK = 2;
// Veiligheid (afgeleid): een training wordt hoogstens 1,6 keer en minstens de helft van haar
// gewone lengte. De sessiepiek en je tijd per dag kunnen daarna nog verder begrenzen.
export const FACTOR_MIN = 0.5;
export const FACTOR_MAX = 1.6;

// Telt deze training mee in de minuten (geen kracht, geen herstel)?
export function countsInMinutes(template: Pick<SessionTemplate, 'type'>): boolean {
  return template.type !== 'strength' && template.type !== 'recovery';
}

// De gewone lengte van een training: de opbouwweek van haar algemene schema.
export function baseMinutes(template: SessionTemplate): number | undefined {
  const step = template.weeklyProgression?.find((s) => !s.phaseId && s.weekInPhase === BASE_STEP_WEEK);
  return step && step.targetMinutes > 0 ? step.targetMinutes : undefined;
}

// Wat een week van het patroon gewoon telt, in tel-minuten (pittig dubbel als dat aan staat).
export function patternCounted(pattern: readonly SessionTemplate[], doubleHard = true): number {
  let total = 0;
  for (const t of pattern) {
    if (!countsInMinutes(t)) continue;
    const m = baseMinutes(t);
    if (!m) continue;
    total += m * (doubleHard && plannedEffort(t) >= HARD_RPE ? 2 : 1);
  }
  return total;
}

export interface DirectionPlanInput {
  id: DirectionId;
  settings: { weekBudget?: unknown; directionStart?: unknown };
  // De trainingen van een gewone week in een golf (na de wissels van de richting).
  pattern: readonly SessionTemplate[];
  logs: readonly SessionLog[];
  today: string;
  countOptions: CountOptions;
}

// Het budget van elke week van de golf waar je nu in zit. Fitter worden begint bij het gemiddelde
// van de vier weken voor de golf, net als de kaart Je week.
export function waveBudgets(input: Omit<DirectionPlanInput, 'pattern'>): number[] {
  const spec = DIRECTIONS[input.id];
  const choice = resolveWeekBudget(input.settings.weekBudget);
  const shape = spec.wave.value;
  const start = typeof input.settings.directionStart === 'string' ? input.settings.directionStart : undefined;
  const wave = shape ? waveOfDate(start, input.today, shape.weeks) : undefined;
  const history = input.id === 'improve' ? recentAverage(input.logs, wave?.startsOn ?? mondayOfWeek(input.today), input.countOptions) : undefined;
  if (!shape) return [budgetFor(input.id, { choice, history }).minutes];
  return Array.from({ length: shape.weeks }, (_, i) => budgetFor(input.id, { choice, history, wave: { week: i + 1, light: i + 1 === shape.weeks } }).minutes);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// De factor per week van de golf; zonder iets wat telt in het patroon geen factoren.
export function directionFactors(budgets: readonly number[], counted: number): number[] | undefined {
  if (!(counted > 0) || budgets.length === 0) return undefined;
  return budgets.map((b) => round2(Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, b / counted))));
}

// Wat het programma meekrijgt.
export function programDirection(input: DirectionPlanInput): ProgramDirection {
  const factors = directionFactors(waveBudgets(input), patternCounted(input.pattern, input.countOptions.doubleHard));
  return { id: input.id, ...(factors ? { factors } : {}) };
}
