// ASCEND: de terugblik na een golf zonder doel (docs/visie/Zonder doel.md, 2.5 en stap 9). Een kaart op
// de Ascend-tab vanaf de maandag na de laatste week van een golf, tot je een keuze maakt of tien
// dagen voorbij zijn. Alles is afgeleid uit de logs, je richting en haar startmaandag; alleen je
// antwoord wordt bewaard (AppSettings.waveReviewDone, de maandag waarop de besproken golf begon).
// Puur: geen React, geen IndexedDB.

import { DIRECTIONS, MINUTES_CEILING, type DirectionId } from '../data/directions';
import type { SessionLog } from '../models/training';
import { addDays, daysBetween } from '../utils/dates';
import { parseDirection, parseDirectionStart } from './direction';
import { budgetFor, countedMinutesOfWeek, recentAverage, resolveWeekBudget, type CountOptions } from './weekBudget';
import { nextWaveLevel, resolveWaveSettings, waveReview, waveShapeFor, waveWeek, type WaveVerdict } from './waves';

// De kaart blijft hoogstens zoveel dagen staan.
export const REVIEW_DAYS = 10;

export type WaveReviewChoice = 'again' | 'easier' | 'goal';

export interface WaveReviewCard {
  // De maandag waarop de besproken golf begon: je antwoord bewaart deze.
  waveStart: string;
  directionId: DirectionId;
  verdict: WaveVerdict;
  title: string;
  facts: string[];
  stepUp: boolean;
  // Wat Nog een golf doet: een hoger weekbudget (Fit blijven, Sterker worden), of niets want de golf
  // rekent zelf vanaf wat je deed (Fitter worden).
  againMinutes?: number;
  againLine: string;
  // Rustiger aan: Fit blijven op het niveau van je laatste golf.
  easierMinutes: number;
}

const TITLE: Record<WaveVerdict, string> = { goed: 'Goede golf', rustig: 'Een rustige golf', zwaar: 'Een zware golf' };
const round5 = (n: number) => Math.round(n / 5) * 5;

export interface WaveReviewInput {
  settings: { direction?: unknown; directionStart?: unknown; weekBudget?: unknown; waves?: unknown; waveReviewDone?: unknown };
  logs: readonly SessionLog[];
  today: string;
  countOptions: CountOptions;
  // Zonder doel (engine/direction.ts#activeDirection): met een doel is er geen terugblik.
  noGoal: boolean;
}

// De weken van een golf die op `start` begon: wat je deed en wat het budget was.
function waveWeeks(id: DirectionId, start: string, input: WaveReviewInput) {
  const shape = waveShapeFor(id, input.settings.waves)!;
  const choice = resolveWeekBudget(input.settings.weekBudget);
  const history = id === 'improve' ? recentAverage(input.logs, start, input.countOptions) : undefined;
  const done: number[] = [];
  const budgets: number[] = [];
  for (let w = 1; w <= shape.weeks; w++) {
    done.push(Math.round(countedMinutesOfWeek(input.logs, addDays(start, (w - 1) * 7), input.countOptions)));
    budgets.push(budgetFor(id, { choice, history, shape, wave: { week: w, light: w === shape.weeks } }).minutes);
  }
  return { shape, done, budgets, base: budgetFor(id, { choice, history, shape }).minutes };
}

export function waveReviewCard(input: WaveReviewInput): WaveReviewCard | undefined {
  if (!input.noGoal) return undefined;
  const id = parseDirection(input.settings.direction);
  const start = parseDirectionStart(input.settings.directionStart);
  const waves = resolveWaveSettings(input.settings.waves);
  if (!id || !start || !waves.review) return undefined;
  const shape = waveShapeFor(id, input.settings.waves);
  if (!shape) return undefined;
  const now = waveWeek(start, input.today, shape.weeks);
  // Alleen in het begin van een nieuwe golf, en pas na de eerste.
  if (!now || now.wave < 2 || daysBetween(now.startsOn, input.today) >= REVIEW_DAYS) return undefined;
  const reviewed = addDays(now.startsOn, -7 * shape.weeks);
  if (input.settings.waveReviewDone === reviewed) return undefined;

  const last = waveWeeks(id, reviewed, input);
  const review = waveReview(last.done, last.budgets, Math.min(waves.weeksForStep, shape.weeks));
  const facts = [`${review.weeksHit} van ${review.weeks} weken haalde je je minuten.`];
  const before = now.wave >= 3 ? waveWeeks(id, addDays(reviewed, -7 * shape.weeks), input) : undefined;
  const beforeAvg = before ? Math.round(before.done.reduce((a, b) => a + b, 0) / before.done.length) : undefined;
  if (beforeAvg && beforeAvg > 0) {
    const diff = Math.round(((review.averageMinutes - beforeAvg) / beforeAvg) * 100);
    facts.push(`Gemiddeld ${review.averageMinutes} minuten per week, ${diff === 0 ? 'net zoveel als' : `${Math.abs(diff)}% ${diff > 0 ? 'meer' : 'minder'} dan`} de golf ervoor.`);
  } else {
    facts.push(`Gemiddeld ${review.averageMinutes} minuten per week.`);
  }

  const raised = id === 'improve' ? undefined : nextWaveLevel(last.base, review, shape, MINUTES_CEILING);
  const againMinutes = raised !== undefined && raised > last.base ? raised : undefined;
  const againLine = id === 'improve'
    ? 'Nog een golf begint bij wat je de laatste vier weken deed.'
    : againMinutes
      ? `Nog een golf op ${againMinutes} minuten per week.`
      : 'Dezelfde golf nog eens is geen falen.';
  return {
    waveStart: reviewed,
    directionId: id,
    verdict: review.verdict,
    title: TITLE[review.verdict],
    facts,
    stepUp: review.stepUp,
    ...(againMinutes ? { againMinutes } : {}),
    againLine,
    easierMinutes: Math.min(MINUTES_CEILING, Math.max(DIRECTIONS.easy.minutes.value, round5(review.averageMinutes || DIRECTIONS.maintain.minutes.value))),
  };
}

// Wat een keuze in de instellingen zet. `undefined`: niets aan de planning, alleen het antwoord.
export function waveReviewPatch(card: WaveReviewCard, choice: WaveReviewChoice, settings: { weekBudget?: unknown }): {
  plan: boolean;
  patch: { waveReviewDone: string; direction?: DirectionId; directionStart?: string; weekBudget?: { minutes?: number; strength?: number; doubleHard?: boolean } };
} {
  const done = { waveReviewDone: card.waveStart };
  const current = resolveWeekBudget(settings.weekBudget);
  const keep = { ...(current.strength !== undefined ? { strength: current.strength } : {}), ...(current.doubleHard ? {} : { doubleHard: false }) };
  if (choice === 'again' && card.againMinutes) {
    return { plan: true, patch: { ...done, weekBudget: { ...keep, minutes: card.againMinutes } } };
  }
  if (choice === 'easier') {
    const minutes = card.easierMinutes === DIRECTIONS.maintain.minutes.value ? undefined : card.easierMinutes;
    const budget = { ...keep, ...(minutes ? { minutes } : {}) };
    return { plan: true, patch: { ...done, direction: 'maintain', weekBudget: Object.keys(budget).length > 0 ? budget : undefined } };
  }
  return { plan: false, patch: done };
}

