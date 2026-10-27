import { describe, expect, it } from 'vitest';
import type { SessionLog } from '../models/training';
import {
  belowGuideline, budgetFor, countedDetail, recentAverage, resolveWeekBudget, strengthCount, weekProgress,
  type CountOptions,
} from './weekBudget';

const OPTS: CountOptions = { doubleHard: true };
// Maandag 26 oktober 2026.
const WEEK = '2026-10-26';

function log(id: string, date: string, over: Partial<SessionLog> = {}): SessionLog {
  return { id, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual', ...over } as SessionLog;
}

describe('countedDetail', () => {
  it('telt een rustige training als matig', () => {
    expect(countedDetail(log('a', WEEK), OPTS)).toEqual({ duration: 40, counted: 40, hard: 0 });
  });

  it('telt een pittige training dubbel naar je eigen RPE', () => {
    expect(countedDetail(log('a', WEEK, { rpe: 8, durationMinutes: 30 }), OPTS)).toEqual({ duration: 30, counted: 60, hard: 30 });
  });

  it('telt een pittige training enkel als je dat zo instelt', () => {
    expect(countedDetail(log('a', WEEK, { rpe: 8, durationMinutes: 30 }), { doubleHard: false }).counted).toBe(30);
  });

  it('leest zonder RPE hoe zwaar de training bedoeld was', () => {
    const hard = { doubleHard: true, intendedRpe: () => 8 };
    const easy = { doubleHard: true, intendedRpe: () => 4 };
    expect(countedDetail(log('a', WEEK, { durationMinutes: 35 }), hard).counted).toBe(70);
    expect(countedDetail(log('a', WEEK, { durationMinutes: 35 }), easy).counted).toBe(35);
  });

  it('telt kracht, herstel en een lege duur niet in de minuten', () => {
    expect(countedDetail(log('a', WEEK, { type: 'strength' }), OPTS).counted).toBe(0);
    expect(countedDetail(log('b', WEEK, { type: 'recovery' }), OPTS).counted).toBe(0);
    expect(countedDetail(log('c', WEEK, { durationMinutes: 0 }), OPTS).counted).toBe(0);
  });
});

describe('strengthCount', () => {
  it('telt krachttrainingen van deze week als keren, en niet de minimale variant', () => {
    const logs = [
      log('a', '2026-10-27', { type: 'strength' }),
      log('b', '2026-10-29', { type: 'strength', variant: 'minimum' }),
      log('c', '2026-10-30', { type: 'strength' }),
      log('d', '2026-10-20', { type: 'strength' }),
      log('e', '2026-11-02', { type: 'strength' }),
    ];
    expect(strengthCount(logs, WEEK)).toBe(2);
  });
});

describe('weekProgress', () => {
  it('telt minuten en kracht apart', () => {
    const logs = [
      log('run', '2026-10-27'),
      log('hill', '2026-10-29', { rpe: 8, durationMinutes: 30 }),
      log('gym', '2026-10-28', { type: 'strength', durationMinutes: 60 }),
      log('old', '2026-10-20', { durationMinutes: 200 }),
    ];
    const p = weekProgress(logs, WEEK, { minutes: 150, strength: 2 }, OPTS);
    expect(p).toMatchObject({ minutes: 100, target: 150, strengthDone: 1, strengthTarget: 2, remaining: 50 });
    expect(p.fraction).toBeCloseTo(100 / 150);
    expect(p.items.map((i) => i.log.id)).toEqual(['run', 'gym', 'hill']);
  });

  it('geeft een lege week als er niets is', () => {
    expect(weekProgress([], WEEK, { minutes: 150, strength: 2 }, OPTS)).toMatchObject({ minutes: 0, strengthDone: 0, fraction: 0, remaining: 150, items: [] });
  });

  it('laat de ring vol staan boven het budget', () => {
    const p = weekProgress([log('a', '2026-10-27', { durationMinutes: 200 })], WEEK, { minutes: 150, strength: 2 }, OPTS);
    expect(p.fraction).toBe(1);
    expect(p.remaining).toBe(0);
  });
});

describe('recentAverage', () => {
  it('rekent het gemiddelde van de vier weken ervoor', () => {
    const logs = [log('a', '2026-10-20', { durationMinutes: 80 }), log('b', '2026-10-13', { durationMinutes: 120 }), log('now', '2026-10-27', { durationMinutes: 500 })];
    expect(recentAverage(logs, WEEK, OPTS)).toBe(50);
  });

  it('geeft niets zonder geschiedenis', () => {
    expect(recentAverage([], WEEK, OPTS)).toBeUndefined();
  });
});

describe('budgetFor', () => {
  it('geeft per richting de advieswaarden', () => {
    expect(budgetFor('maintain')).toEqual({ minutes: 150, strength: 2, light: false });
    expect(budgetFor('easy')).toEqual({ minutes: 90, strength: 1, light: false });
    expect(budgetFor('stronger')).toEqual({ minutes: 120, strength: 3, light: false });
  });

  it('bouwt Fitter worden op vanaf je gemiddelde en maakt de vierde week licht', () => {
    const weeks = [1, 2, 3, 4].map((week) => budgetFor('improve', { history: 100, wave: { week, light: week === 4 } }));
    expect(weeks.map((w) => w.minutes)).toEqual([100, 110, 120, 80]);
    expect(weeks.map((w) => w.light)).toEqual([false, false, false, true]);
  });

  it('laat Rustig aan en Fit blijven geen golf volgen', () => {
    expect(budgetFor('easy', { wave: { week: 4, light: true } }).minutes).toBe(90);
    expect(budgetFor('maintain', { wave: { week: 4, light: true } }).minutes).toBe(150);
  });

  it('neemt je eigen waarden als basis', () => {
    expect(budgetFor('easy', { choice: { minutes: 120, strength: 2, doubleHard: true } })).toEqual({ minutes: 120, strength: 2, light: false });
    const light = budgetFor('stronger', { choice: { minutes: 160, doubleHard: true }, wave: { week: 4, light: true } });
    expect(light.minutes).toBe(105);
  });

  it('blijft onder het plafond van 300 minuten', () => {
    expect(budgetFor('improve', { history: 900, wave: { week: 3, light: false } }).minutes).toBe(300);
  });
});

describe('belowGuideline', () => {
  it('zegt onder de richtlijn bij minder dan 150 minuten of 2 keer kracht', () => {
    expect(belowGuideline({ minutes: 150, strength: 2 })).toBe(false);
    expect(belowGuideline({ minutes: 90, strength: 1 })).toBe(true);
    expect(belowGuideline({ minutes: 200, strength: 1 })).toBe(true);
  });
});

describe('resolveWeekBudget', () => {
  it('leest defensief en valt terug op het advies', () => {
    expect(resolveWeekBudget(undefined)).toEqual({ doubleHard: true });
    expect(resolveWeekBudget({ minutes: 135, strength: 3, doubleHard: false })).toEqual({ minutes: 135, strength: 3, doubleHard: false });
    expect(resolveWeekBudget({ minutes: 5, strength: 9 })).toEqual({ doubleHard: true });
    expect(resolveWeekBudget({ minutes: 'veel', strength: 2.5 })).toEqual({ doubleHard: true });
    expect(resolveWeekBudget('rommel')).toEqual({ doubleHard: true });
  });
});
