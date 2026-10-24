import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { candidatesFor, learnedStack, looksLikePounds, nearestIndex, usedWeights } from './strengthWeights';
import { DEFAULT_PROFILE, resolveStrengthSettings } from './strengthSettings';
import { prescribe } from './strengthModel';

const press = exerciseById('leg-press')!;

describe('gewichten van een toestel leren', () => {
  it('binnen het gebruikte bereik alleen gewichten die er echt waren', () => {
    const list = learnedStack([30, 36, 42], 5)!;
    expect(list).toContain(36);
    expect(list.filter((w) => w >= 30 && w <= 42)).toEqual([30, 36, 42]);
  });

  it('buiten het bereik de stap die twee keer voorkwam', () => {
    const list = learnedStack([30, 36, 42], 5)!;
    expect(list).toContain(48);
    expect(list).toContain(24);
    expect(list).not.toContain(45);
  });

  it('een kloof die maar één keer voorkomt is geen stap', () => {
    const list = learnedStack([30, 34, 40], 5)!;
    expect(list).toContain(45);
    expect(list).not.toContain(44);
    expect(list).not.toContain(38);
  });

  it('een kloof onder de helft van de profielstap is geen stap', () => {
    const list = learnedStack([30, 31, 32], 5)!;
    expect(list).toContain(37);
    expect(list).not.toContain(33);
  });

  it('met één gewicht de stap van het profiel', () => {
    expect(learnedStack([40], 5)).toContain(45);
    expect(learnedStack([40], 5)).toContain(35);
  });

  it('een grote kloof wordt opgevuld, zodat 70 tussen 40 en 80 bestaat', () => {
    const list = learnedStack([40, 80], 5)!;
    expect(list).toContain(70);
    expect(list.filter((w) => w >= 40 && w <= 80)).toEqual([40, 45, 50, 55, 60, 65, 70, 75, 80]);
  });

  it('een grote kloof wordt opgevuld met de geleerde stap', () => {
    const list = learnedStack([20, 24, 28, 60], 5)!;
    expect(list.filter((w) => w >= 28 && w <= 60)).toEqual([28, 32, 36, 40, 44, 48, 52, 56, 60]);
  });

  it('omgerekende ponden zijn geen gewicht en geen stap', () => {
    expect(looksLikePounds(40.82)).toBe(true);
    expect(looksLikePounds(45.36)).toBe(true);
    expect(looksLikePounds(42.5)).toBe(false);
    expect(looksLikePounds(40)).toBe(false);
    const list = learnedStack([30, 35, 40.82, 45.36], 5)!;
    expect(list).not.toContain(40.82);
    expect(list).not.toContain(45.36);
    expect(list).toContain(40);
    expect(learnedStack([40.82, 45.36], 5)).toBeUndefined();
  });

  it('het bereik erboven loopt tot het plafond van 400 kg', () => {
    const list = learnedStack([30, 35], 5)!;
    expect(list.at(-1)).toBe(400);
    expect(list).toContain(250);
  });

  it('een gewicht met meer dan één decimaal telt niet en geen voorstel heeft er meer dan één', () => {
    const list = learnedStack([30, 36.25, 42], 2.5)!;
    expect(list).not.toContain(36.25);
    expect(list.every((w) => Math.abs(w * 10 - Math.round(w * 10)) < 1e-6)).toBe(true);
    const fine = learnedStack([20, 22.5], 1.25)!;
    expect(fine.every((w) => Math.abs(w * 10 - Math.round(w * 10)) < 1e-6)).toBe(true);
  });

  it('niets gebruikt: niets geleerd', () => {
    expect(learnedStack([], 5)).toBeUndefined();
    expect(learnedStack([0, -3], 5)).toBeUndefined();
  });

  it('usedWeights slaat sets zonder gewicht over', () => {
    expect(usedWeights([{ weightKg: 40 }, {}, { weightKg: 0 }])).toEqual([40]);
  });

  it('een toestel rondt af op het geleerde gewicht, een stang niet', () => {
    const learned = candidatesFor(press, DEFAULT_PROFILE, { bodyKg: 82, usedKg: [30, 36, 42] })!;
    expect(learned[nearestIndex(learned, 38)].externalKg).toBe(36);
    const plain = candidatesFor(press, DEFAULT_PROFILE, { bodyKg: 82 })!;
    expect(plain[nearestIndex(plain, 38)].externalKg).toBe(40);
    const squat = exerciseById('back-squat')!;
    const bar = candidatesFor(squat, DEFAULT_PROFILE, { bodyKg: 82, usedKg: [87.3, 93.1] })!;
    expect(bar.some((c) => c.externalKg === 87.3)).toBe(false);
  });
});

describe('voorstel met een geleerd toestel', () => {
  const sets = (kg: number) => [8, 8, 7].map((reps) => ({ reps, weightKg: kg, rir: 2 }));
  const sessions = [
    { date: '2026-09-01', sets: sets(30) },
    { date: '2026-09-08', sets: sets(36) },
    { date: '2026-09-15', sets: sets(36) },
  ];
  const run = (learnStacks: boolean) =>
    prescribe({ exercise: press, sessions, date: '2026-09-22', bodyKg: 82, settings: { ...resolveStrengthSettings(undefined), learnStacks }, plan: { low: 6, high: 8, rir: 2 } });

  it('met leren is elk voorgesteld gewicht er een dat op het toestel voorkwam of een stap erbuiten', () => {
    const rx = run(true)!;
    const allowed = new Set(learnedStack([30, 36], 5));
    for (const set of rx.sets) expect(allowed.has(set.weightKg)).toBe(true);
  });

  it('zonder leren blijft het bij stappen van 5', () => {
    const rx = run(false)!;
    for (const set of rx.sets) expect(set.weightKg % 5).toBe(0);
  });
});
