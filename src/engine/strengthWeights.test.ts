import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { candidatesFor, dumbbellsAsTotal, learnedStack, looksLikePounds, nearestIndex, profileFor, usedWeights } from './strengthWeights';
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
  const run = (stackWeights: 'learned' | 'used_only' | 'profile', list = sessions) =>
    prescribe({ exercise: press, sessions: list, date: '2026-09-22', bodyKg: 82, settings: resolveStrengthSettings({ stackWeights }), plan: { low: 6, high: 8, rir: 2 } });

  it('met leren is elk voorgesteld gewicht er een dat op het toestel voorkwam of een stap erbuiten', () => {
    const rx = run('learned')!;
    const allowed = new Set(learnedStack([30, 36], 5));
    for (const set of rx.sets) expect(allowed.has(set.weightKg)).toBe(true);
  });

  it('zonder leren blijft het bij stappen van 5', () => {
    const rx = run('profile')!;
    for (const set of rx.sets) expect(set.weightKg % 5).toBe(0);
  });
});

describe('Alleen wat je gebruikte', () => {
  const sets = (kg: number, reps = 8, rir = 2) => [reps, reps, reps].map((r) => ({ reps: r, weightKg: kg, rir }));
  const run = (list: { date: string; sets: ReturnType<typeof sets> }[], date = '2026-09-22') =>
    prescribe({ exercise: press, sessions: list, date, bodyKg: 82, settings: resolveStrengthSettings({ stackWeights: 'used_only' }), plan: { low: 6, high: 8, rir: 2 } })!;

  it('de kandidaten zijn precies de gebruikte gewichten, zonder gaten te vullen', () => {
    const c = candidatesFor(press, resolveStrengthSettings(undefined).profile, { bodyKg: 82, usedKg: [30, 45, 30], stackWeights: 'used_only' })!;
    expect(c.map((x) => x.externalKg)).toEqual([30, 45]);
  });
  it('zonder gebruikte gewichten vallen de kandidaten terug op de stappen van het profiel', () => {
    const c = candidatesFor(press, resolveStrengthSettings(undefined).profile, { bodyKg: 82, usedKg: [], stackWeights: 'used_only' })!;
    expect(c[0].externalKg).toBe(5);
    expect(c[1].externalKg).toBe(10);
  });
  it('stelt nooit een gewicht voor dat je nog niet gebruikte', () => {
    const rx = run([
      { date: '2026-09-01', sets: sets(30) },
      { date: '2026-09-08', sets: sets(40) },
      { date: '2026-09-15', sets: sets(40, 8, 3) },
    ]);
    for (const set of rx.sets) expect([30, 40]).toContain(set.weightKg);
  });
  it('vraagt je kracht om zwaarder dan je zwaarste, dan blijft het gewicht staan en zegt de zin wat je kunt doen', () => {
    const rx = run([
      { date: '2026-09-01', sets: sets(30) },
      { date: '2026-09-08', sets: sets(30, 8, 3) },
    ]);
    expect(rx.sets[0].weightKg).toBe(30);
    expect(rx.kind).toBe('used_top');
    expect(rx.widened).toBe(false);
    expect(rx.sets[0].repsHigh).toBe(8);
  });
  it('haal je de bovenkant met genoeg over, dan ben je klaar voor zwaarder', () => {
    const rx = run([
      { date: '2026-09-01', sets: sets(30) },
      { date: '2026-09-08', sets: sets(30, 8, 2) },
    ]);
    expect(rx.kind).toBe('used_top');
    expect(rx.reason).toContain('klaar voor zwaarder');
    expect(rx.reason).toContain('eerstvolgende gewicht');
  });
  it('lichter dan je lichtste gebruikte gewicht verzint het niet', () => {
    const rx = run([
      { date: '2026-09-01', sets: sets(30, 3, 2) },
      { date: '2026-09-08', sets: sets(30, 3, 2) },
    ]);
    expect(rx.sets[0].weightKg).toBe(30);
    expect(rx.kind).toBe('used_bottom');
    expect(rx.reason).toContain('lichtste gewicht');
  });
});

describe('dumbbells als totaal van twee', () => {
  const bench = exerciseById('dumbbell-bench-press')!;
  const goblet = exerciseById('goblet-squat')!;
  const rack = { ...DEFAULT_PROFILE, dumbbells: { startKg: 2, stepKg: 2, upToKg: 40, thenStepKg: 2, maxKg: 40 } };
  it('vanzelf: alleen een gewicht boven de zwaarste dumbbell is een totaal', () => {
    expect(dumbbellsAsTotal(bench, 'auto', rack, [56, 60])).toBe(true);
    expect(dumbbellsAsTotal(bench, 'auto', rack, [24, 28, 30])).toBe(false);
    expect(dumbbellsAsTotal(bench, 'auto', rack, [])).toBe(false);
    // Meer dan twee keer de zwaarste dumbbell kan ook geen totaal zijn.
    expect(dumbbellsAsTotal(bench, 'auto', rack, [90])).toBe(false);
  });
  it('vanzelf: een gewicht dat het rek net niet kent blijft per dumbbell', () => {
    // Het standaardrek gaat na 10 kg per 2,5 kg; 12 en 16 kg per dumbbell bestaan wel in een sportschool.
    expect(dumbbellsAsTotal(bench, 'auto', DEFAULT_PROFILE, [12, 16])).toBe(false);
  });
  it('de mogelijke gewichten zijn de sommen van twee gelijke dumbbells, in stappen van twee keer de stap', () => {
    const c = candidatesFor(bench, profileFor(rack, true), { bodyKg: 80, lastExternalKg: 56 })!;
    expect(c.slice(0, 3).map((x) => x.externalKg)).toEqual([4, 8, 12]);
    expect(c.some((x) => x.externalKg === 56)).toBe(true);
    expect(c.some((x) => x.externalKg === 58)).toBe(false);
    expect(Math.max(...c.map((x) => x.externalKg))).toBe(80);
  });
  it('de keuzes Per dumbbell en Totaal van twee gaan voor het logboek', () => {
    expect(dumbbellsAsTotal(bench, 'each', rack, [56])).toBe(false);
    expect(dumbbellsAsTotal(bench, 'total', rack, [20])).toBe(true);
  });
  it('een oefening met één dumbbell of zonder dumbbells wordt nooit verdubbeld', () => {
    expect(dumbbellsAsTotal(goblet, 'total', rack, [56])).toBe(false);
    expect(dumbbellsAsTotal(goblet, 'auto', rack, [56])).toBe(false);
    expect(dumbbellsAsTotal(exerciseById('back-squat'), 'total', rack, [100])).toBe(false);
  });
});
