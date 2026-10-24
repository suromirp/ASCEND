import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { candidatesFor, learnedStack, nearestIndex, usedWeights } from './strengthWeights';
import { DEFAULT_PROFILE, resolveStrengthSettings } from './strengthSettings';
import { prescribe } from './strengthModel';

const press = exerciseById('leg-press')!;

describe('gewichten van een toestel leren', () => {
  it('binnen het gebruikte bereik alleen gewichten die er echt waren', () => {
    const list = learnedStack([85, 93, 101], 5)!;
    expect(list).toContain(93);
    expect(list.filter((w) => w >= 85 && w <= 101)).toEqual([85, 93, 101]);
  });

  it('buiten het bereik de kleinste stap die bij het toestel hoort', () => {
    const list = learnedStack([85, 93, 101], 5)!;
    expect(list).toContain(109);
    expect(list).toContain(77);
    expect(list).not.toContain(105);
  });

  it('met één gewicht of een te grote kloof de stap van het profiel', () => {
    expect(learnedStack([40], 5)).toContain(45);
    expect(learnedStack([40], 5)).toContain(35);
    expect(learnedStack([40, 80], 5)).toContain(85);
  });

  it('niets gebruikt: niets geleerd', () => {
    expect(learnedStack([], 5)).toBeUndefined();
    expect(learnedStack([0, -3], 5)).toBeUndefined();
  });

  it('usedWeights slaat sets zonder gewicht over', () => {
    expect(usedWeights([{ weightKg: 40 }, {}, { weightKg: 0 }])).toEqual([40]);
  });

  it('een toestel rondt af op het geleerde gewicht, een stang niet', () => {
    const learned = candidatesFor(press, DEFAULT_PROFILE, { bodyKg: 82, usedKg: [85, 93, 101] })!;
    expect(learned[nearestIndex(learned, 91)].externalKg).toBe(93);
    const plain = candidatesFor(press, DEFAULT_PROFILE, { bodyKg: 82 })!;
    expect(plain[nearestIndex(plain, 91)].externalKg).toBe(90);
    const squat = exerciseById('back-squat')!;
    const bar = candidatesFor(squat, DEFAULT_PROFILE, { bodyKg: 82, usedKg: [87.3, 93.1] })!;
    expect(bar.some((c) => c.externalKg === 87.3)).toBe(false);
  });
});

describe('voorstel met een geleerd toestel', () => {
  const sets = (kg: number) => [8, 8, 7].map((reps) => ({ reps, weightKg: kg, rir: 2 }));
  const sessions = [
    { date: '2026-09-01', sets: sets(85) },
    { date: '2026-09-08', sets: sets(93) },
    { date: '2026-09-15', sets: sets(93) },
  ];
  const run = (learnStacks: boolean) =>
    prescribe({ exercise: press, sessions, date: '2026-09-22', bodyKg: 82, settings: { ...resolveStrengthSettings(undefined), learnStacks }, plan: { low: 6, high: 8, rir: 2 } });

  it('met leren is elk voorgesteld gewicht er een dat op het toestel voorkwam of een stap erbuiten', () => {
    const rx = run(true)!;
    const allowed = new Set(learnedStack([85, 93], 5));
    for (const set of rx.sets) expect(allowed.has(set.weightKg)).toBe(true);
  });

  it('zonder leren blijft het bij stappen van 5', () => {
    const rx = run(false)!;
    for (const set of rx.sets) expect(set.weightKg % 5).toBe(0);
  });
});
