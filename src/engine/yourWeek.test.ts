import { describe, expect, it } from 'vitest';
import type { SessionLog } from '../models/training';
import { yourWeek, type YourWeekInputs } from './yourWeek';
import { plannedRestOfWeek } from './weekBudget';

const TODAY = '2026-10-28';

function log(id: string, date: string, over: Partial<SessionLog> = {}): SessionLog {
  return { id, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual', ...over } as SessionLog;
}

const base = (over: Partial<YourWeekInputs> = {}): YourWeekInputs => ({
  settings: {}, goals: [], milestones: new Set<string>(), logs: [], templates: [], today: TODAY, ...over,
});

describe('yourWeek', () => {
  it('geeft niets zodra je een doel hebt', () => {
    expect(yourWeek(base({ goals: [{ id: 'g', status: 'active', targetDate: '2027-07-25' }] }))).toBeUndefined();
  });

  it('toont zonder keuze het advies van Fit blijven', () => {
    const w = yourWeek(base({ logs: [log('a', '2026-10-27'), log('s', '2026-10-27', { type: 'strength' })] }))!;
    expect(w.chosen).toBe(false);
    expect(w.directionId).toBe('maintain');
    expect(w.minutesLine).toBe('40 van 150 minuten');
    expect(w.strengthLine).toBe('Kracht: 1 van 2 keer');
    expect(w.remainingLine).toBe('Nog 110 minuten te gaan.');
    expect(w.adviceLine).toBeTruthy();
    expect(w.waveLine).toBeUndefined();
    expect(w.belowLine).toBeUndefined();
  });

  it('zegt eerlijk dat Rustig aan onder de richtlijn zit', () => {
    const w = yourWeek(base({ settings: { direction: 'easy' } }))!;
    expect(w.minutesLine).toBe('0 van 90 minuten');
    expect(w.remainingLine).toBe('Deze week nog niets. Elke training telt.');
    expect(w.belowLine).toContain('onder de richtlijn');
    expect(w.adviceLine).toBeUndefined();
  });

  it('zegt dat je minuten gehaald zijn', () => {
    const w = yourWeek(base({ settings: { direction: 'easy' }, logs: [log('a', '2026-10-27', { durationMinutes: 95 })] }))!;
    expect(w.remainingLine).toBe('Je minuten voor deze week zijn gehaald.');
  });

  it('laat Fitter worden beginnen bij je laatste vier weken en volgt de golf', () => {
    const logs = [log('a', '2026-10-20', { durationMinutes: 100 }), log('b', '2026-10-13', { durationMinutes: 100 }), log('c', '2026-10-06', { durationMinutes: 100 }), log('d', '2026-09-29', { durationMinutes: 100 })];
    const w = yourWeek(base({ settings: { direction: 'improve', directionStart: '2026-10-26' }, logs }))!;
    expect(w.wave).toMatchObject({ week: 1, length: 4, wave: 1 });
    expect(w.budget.minutes).toBe(100);
    expect(w.waveLine).toBe('Week 1 van 4. Deze week bouw je op.');
    expect(w.bars.map((b) => b.budget)).toEqual([100, 110, 120, 80]);
    expect(w.bars.map((b) => b.current)).toEqual([true, false, false, false]);
  });

  it('houdt het begin van de golf vast terwijl de golf loopt', () => {
    const logs = [log('a', '2026-10-27', { durationMinutes: 500 })];
    const w = yourWeek(base({ settings: { direction: 'improve', directionStart: '2026-10-19' }, logs }))!;
    // Week 2 van de golf die op 19 oktober begon, met een basis van 120 zonder geschiedenis.
    expect(w.wave?.week).toBe(2);
    expect(w.budget.minutes).toBe(130);
  });

  it('noemt een lichte week licht', () => {
    const w = yourWeek(base({ settings: { direction: 'stronger', directionStart: '2026-10-05' } }))!;
    expect(w.wave).toMatchObject({ week: 4, light: true });
    expect(w.budget).toMatchObject({ minutes: 80, strength: 3, light: true });
    expect(w.waveLine).toBe('Week 4 van 4. Deze week is lichter.');
  });

  it('gebruikt je eigen weekbudget en telt pittig enkel als je dat wilt', () => {
    const logs = [log('hill', '2026-10-27', { rpe: 8, durationMinutes: 30 })];
    const dubbel = yourWeek(base({ settings: { weekBudget: { minutes: 135, strength: 3 } }, logs }))!;
    expect(dubbel.minutesLine).toBe('60 van 135 minuten');
    expect(dubbel.strengthLine).toBe('Kracht: 0 van 3 keer');
    const enkel = yourWeek(base({ settings: { weekBudget: { doubleHard: false } }, logs }))!;
    expect(enkel.minutesLine).toBe('30 van 150 minuten');
    expect(enkel.explain).toContain('Elke minuut telt 1');
  });

  it('gebruikt geen gedachtestreepjes of uitroeptekens in zijn zinnen', () => {
    const w = yourWeek(base({ settings: { direction: 'easy', directionStart: '2026-10-26' } }))!;
    const all = [w.minutesLine, w.strengthLine, w.remainingLine, w.explain, w.belowLine, w.adviceLine, w.waveLine].join(' ');
    expect(all).not.toMatch(/[\u2013\u2014!]/);
  });
});

describe('yourWeek: wat er nog staat', () => {
  it('zegt eerlijk dat het met de planning niet meer lukt, met wat het wel haalt', () => {
    const w = yourWeek(base({ logs: [log('a', '2026-10-27')], plannedRest: 90 }))!;
    expect(w.remainingLine).toBe('Met wat er nog staat kom je op 130. Een extra wandeling van 20 minuten brengt je op 150.');
  });

  it('past het wel, dan wat er nog te gaan is', () => {
    expect(yourWeek(base({ logs: [log('a', '2026-10-27')], plannedRest: 120 }))!.remainingLine).toBe('Nog 110 minuten te gaan.');
  });
});

describe('plannedRestOfWeek', () => {
  it('telt alleen duur die nog komt, pittig dubbel', () => {
    const templates = new Map([
      ['run', { type: 'cardio', intendedRpe: 4 }],
      ['hill', { type: 'cardio', intendedRpe: 8 }],
      ['gym', { type: 'strength', intendedRpe: 7 }],
    ]);
    const s = (id: string, templateId: string, scheduledDate: string, status = 'planned') => ({ id, templateId, scheduledDate, status });
    const sessions = [s('a', 'run', '2026-10-27'), s('b', 'run', '2026-10-29'), s('c', 'hill', '2026-10-31'), s('d', 'gym', '2026-10-30'), s('e', 'run', '2026-11-01', 'skipped'), s('f', 'run', '2026-11-02')];
    expect(plannedRestOfWeek(sessions, templates, () => 30, TODAY, '2026-10-26', new Set(), true)).toBe(90);
    expect(plannedRestOfWeek(sessions, templates, () => 30, TODAY, '2026-10-26', new Set(['b']), false)).toBe(30);
  });
});
