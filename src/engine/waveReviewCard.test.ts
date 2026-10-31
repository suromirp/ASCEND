import { describe, expect, it } from 'vitest';
import { waveReviewCard, waveReviewPatch, REVIEW_DAYS } from './waveReviewCard';
import type { SessionLog } from '../models/training';
import { addDays } from '../utils/dates';

// Nagemaakte logs: een golf van vier weken vanaf START, de terugblik in de week erna.
const START = '2026-11-02';
const NEXT = addDays(START, 28);
const opts = { doubleHard: true };
const run = (id: string, date: string, minutes: number): SessionLog => ({
  id, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: minutes, source: 'manual', rpe: 4,
});
const weeks = (minutes: number[]) => minutes.flatMap((m, i) => [run(`a${i}`, addDays(START, i * 7 + 1), m / 2), run(`b${i}`, addDays(START, i * 7 + 4), m / 2)]);
const base = (over: Partial<Parameters<typeof waveReviewCard>[0]> = {}) => ({
  settings: { direction: 'maintain', directionStart: START }, logs: weeks([150, 150, 150, 100]), today: NEXT, countOptions: opts, noGoal: true, ...over,
});

describe('waveReviewCard', () => {
  it('na een goede golf: het oordeel, de feiten en een stap omhoog', () => {
    const card = waveReviewCard(base())!;
    expect(card.title).toBe('Goede golf');
    expect(card.waveStart).toBe(START);
    expect(card.facts[0]).toBe('4 van 4 weken haalde je je minuten.');
    expect(card.facts[1]).toBe('Gemiddeld 138 minuten per week.');
    expect(card.stepUp).toBe(true);
    expect(card.againMinutes).toBe(160);
  });

  it('een rustige golf houdt het niveau, zonder oordeel over falen', () => {
    const card = waveReviewCard(base({ logs: weeks([60, 60, 60, 40]) }))!;
    expect(card.title).toBe('Een rustige golf');
    expect(card.againMinutes).toBeUndefined();
    expect(card.againLine).toBe('Dezelfde golf nog eens is geen falen.');
    expect(card.easierMinutes).toBe(90);
  });

  it('vergelijkt met de golf ervoor als die er is', () => {
    const logs = [...weeks([150, 150, 150, 100]).map((l) => ({ ...l, id: `o${l.id}`, completedDate: addDays(l.completedDate, -28) })), ...weeks([165, 165, 165, 110])];
    const card = waveReviewCard(base({ settings: { direction: 'maintain', directionStart: addDays(START, -28) }, logs }))!;
    expect(card.facts[1]).toBe('Gemiddeld 151 minuten per week, 9% meer dan de golf ervoor.');
  });

  it('staat er alleen de eerste tien dagen van een nieuwe golf, en niet na je keuze', () => {
    expect(waveReviewCard(base({ today: addDays(NEXT, REVIEW_DAYS - 1) }))).toBeTruthy();
    expect(waveReviewCard(base({ today: addDays(NEXT, REVIEW_DAYS) }))).toBeUndefined();
    expect(waveReviewCard(base({ today: addDays(START, 20) }))).toBeUndefined();
    expect(waveReviewCard(base({ settings: { direction: 'maintain', directionStart: START, waveReviewDone: START } }))).toBeUndefined();
  });

  it('niet met een doel, niet bij Rustig aan en niet als de terugblik uit staat', () => {
    expect(waveReviewCard(base({ noGoal: false }))).toBeUndefined();
    expect(waveReviewCard(base({ settings: { direction: 'easy', directionStart: START } }))).toBeUndefined();
    expect(waveReviewCard(base({ settings: { direction: 'maintain', directionStart: START, waves: { review: false } } }))).toBeUndefined();
  });

  it('Fitter worden: nog een golf rekent zelf vanaf wat je deed', () => {
    const card = waveReviewCard(base({ settings: { direction: 'improve', directionStart: START } }))!;
    expect(card.againMinutes).toBeUndefined();
    expect(card.againLine).toBe('Nog een golf begint bij wat je de laatste vier weken deed.');
  });

  it('teksten zonder gedachtestreepjes en uitroeptekens', () => {
    const card = waveReviewCard(base())!;
    expect([card.title, card.againLine, ...card.facts].join(' ')).not.toMatch(/[\u2013\u2014!]/);
  });
});

describe('waveReviewPatch', () => {
  const card = waveReviewCard(base())!;
  it('nog een golf met een stap omhoog: een hoger weekbudget, als voorstel', () => {
    expect(waveReviewPatch(card, 'again', {})).toEqual({ plan: true, patch: { waveReviewDone: START, weekBudget: { minutes: 160 } } });
  });

  it('rustiger aan: Fit blijven op het niveau van je laatste golf', () => {
    expect(waveReviewPatch(card, 'easier', {})).toEqual({ plan: true, patch: { waveReviewDone: START, direction: 'maintain', weekBudget: { minutes: 140 } } });
  });

  it('een doel kiezen of een golf zonder stap: alleen je antwoord', () => {
    expect(waveReviewPatch(card, 'goal', {})).toEqual({ plan: false, patch: { waveReviewDone: START } });
    const calm = waveReviewCard(base({ logs: weeks([60, 60, 60, 40]) }))!;
    expect(waveReviewPatch(calm, 'again', {})).toEqual({ plan: false, patch: { waveReviewDone: START } });
  });
});
