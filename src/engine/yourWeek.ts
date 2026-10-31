// ASCEND: "Je week" zonder doel (docs/visie/Zonder doel.md, 2.2 en 2.4). Zet de richting,
// het weekbudget en de logs van deze week om in wat de kaart en het blad zeggen. Alleen
// lezen: niets hier verandert de planning. Puur: geen React, geen IndexedDB.

import { DIRECTIONS, GUIDELINE_MINUTES, GUIDELINE_STRENGTH, type DirectionId } from '../data/directions';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { plannedByIdOf } from './logDay';
import { addDays, mondayOfWeek } from '../utils/dates';
import { activeDirection, parseDirectionStart } from './direction';
import type { HeartRateSettings } from './heartRateZones';
import type { Ladder } from './mainGoal';
import { plannedEffort } from './standing';
import {
  belowGuideline, budgetFor, countedMinutesOfWeek, recentAverage, resolveWeekBudget, weekProgress,
  type CountOptions, type WeekBudget, type WeekProgress,
} from './weekBudget';
import { waveWeek, type WaveWeek } from './waves';

export interface YourWeekInputs {
  settings: { direction?: unknown; directionStart?: unknown; weekBudget?: unknown; heartRate?: HeartRateSettings };
  // De doelen zoals de Ascend-tab ze toont.
  goals: readonly Pick<TrainingGoal, 'id' | 'status' | 'kind' | 'targetDate'>[];
  milestones: Ladder;
  logs: readonly SessionLog[];
  templates: readonly Pick<SessionTemplate, 'id' | 'type' | 'baseStressProfile'>[];
  // De geplande sessies, zodat een log op de dag van zijn geplande training telt (engine/logDay.ts).
  plannedSessions?: readonly Pick<PlannedSession, 'id' | 'scheduledDate'>[];
  today: string;
}

export interface WaveBar {
  week: number;
  budget: number;
  done: number;
  current: boolean;
  future: boolean;
}

export interface YourWeek {
  directionId: DirectionId;
  // Heb je een richting gekozen? Zo niet, dan is dit het advies (Fit blijven).
  chosen: boolean;
  label: string;
  line: string;
  weekStart: string;
  budget: WeekBudget;
  progress: WeekProgress;
  wave?: WaveWeek;
  bars: WaveBar[];
  minutesLine: string;
  strengthLine: string;
  waveLine?: string;
  remainingLine: string;
  explain: string;
  belowLine?: string;
  adviceLine?: string;
}

function countOptions(settings: YourWeekInputs['settings'], templates: YourWeekInputs['templates'], plannedSessions: YourWeekInputs['plannedSessions']): CountOptions {
  const byId = new Map(templates.map((t) => [t.id, t]));
  return {
    hr: settings.heartRate,
    doubleHard: resolveWeekBudget(settings.weekBudget).doubleHard,
    plannedById: plannedSessions ? plannedByIdOf(plannedSessions) : undefined,
    intendedRpe: (log) => {
      const t = byId.get(log.templateId);
      return t ? plannedEffort(t as SessionTemplate) : undefined;
    },
  };
}

const times = (n: number) => `${n} keer`;

// Undefined zodra je een doel hebt: dan is er geen Je week en blijft alles zoals het is.
export function yourWeek(input: YourWeekInputs): YourWeek | undefined {
  const active = activeDirection(input.settings, input.goals, input.milestones);
  if (active.kind === 'goal') return undefined;
  const id = active.id;
  const spec = DIRECTIONS[id];
  const choice = resolveWeekBudget(input.settings.weekBudget);
  const opts = countOptions(input.settings, input.templates, input.plannedSessions);
  const weekStart = mondayOfWeek(input.today);
  const shape = spec.wave.value;
  const start = active.chosen ? parseDirectionStart(input.settings.directionStart) : undefined;
  const wave = shape ? waveWeek(start, input.today, shape.weeks) : undefined;
  // De start van een golf blijft de hele golf gelijk: het gemiddelde van de vier weken ervoor.
  const history = id === 'improve' ? recentAverage(input.logs, wave?.startsOn ?? weekStart, opts) : undefined;
  const budget = budgetFor(id, { choice, history, wave });
  const base = budgetFor(id, { choice, history });
  const progress = weekProgress(input.logs, weekStart, budget, opts);

  const bars: WaveBar[] = wave && shape
    ? Array.from({ length: shape.weeks }, (_, i) => {
        const monday = addDays(wave.startsOn, i * 7);
        const w = i + 1;
        return {
          week: w,
          budget: budgetFor(id, { choice, history, wave: { week: w, light: w === shape.weeks } }).minutes,
          done: monday <= weekStart ? Math.round(countedMinutesOfWeek(input.logs, monday, opts)) : 0,
          current: w === wave.week,
          future: monday > weekStart,
        };
      })
    : [];

  const waveLine = wave
    ? wave.light
      ? `Week ${wave.week} van ${wave.length}. Deze week is lichter.`
      : shape && shape.step > 0
        ? `Week ${wave.week} van ${wave.length}. Deze week bouw je op.`
        : `Week ${wave.week} van ${wave.length}. Deze week houd je het niveau vast.`
    : undefined;

  const remainingLine = progress.minutes >= progress.target
    ? 'Je minuten voor deze week zijn gehaald.'
    : progress.minutes === 0
      ? 'Deze week nog niets. Elke training telt.'
      : `Nog ${progress.remaining} ${progress.remaining === 1 ? 'minuut' : 'minuten'} te gaan.`;

  const explain = choice.doubleHard
    ? `Matige minuten tellen 1, pittige tellen 2. ${GUIDELINE_MINUTES} is de beweegrichtlijn.`
    : `Elke minuut telt 1. ${GUIDELINE_MINUTES} is de beweegrichtlijn.`;

  return {
    directionId: id,
    chosen: active.chosen,
    label: spec.label,
    line: spec.line,
    weekStart,
    budget,
    progress,
    wave,
    bars,
    minutesLine: `${progress.minutes} van ${progress.target} minuten`,
    strengthLine: `Kracht: ${progress.strengthDone} van ${times(progress.strengthTarget)}`,
    waveLine,
    remainingLine,
    explain,
    belowLine: belowGuideline(base) ? `Dat is onder de richtlijn van ${GUIDELINE_MINUTES} minuten en ${GUIDELINE_STRENGTH} keer kracht. Dat mag een keuze zijn.` : undefined,
    adviceLine: active.chosen ? undefined : 'Dit is het advies van Fit blijven. Kies een richting als je het anders wilt.',
  };
}
