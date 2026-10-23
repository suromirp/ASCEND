import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import type { SetLog } from '../models/training';
import { describePlannedSet, lastWeightMismatch, prescribe, warmupSets, type SessionInput } from './strengthModel';
import { resolveStrengthSettings } from './strengthSettings';
import { candidatesFor } from './strengthWeights';

const ex = (id: string) => exerciseById(id)!;
const settings = resolveStrengthSettings(undefined);
const profile = settings.profile;
const work = (reps: number, weightKg: number, rir?: number): SetLog => ({ reps, weightKg, ...(rir !== undefined ? { rir } : {}) });
const session = (date: string, sets: SetLog[]): SessionInput => ({ date, sets });

describe('opwarmen per spiergroep (besluit 2026-10-23)', () => {
  const squat = ex('back-squat');
  const squatC = candidatesFor(squat, profile, { lastExternalKg: 100 })!;

  it('een aanloopset is 70% voor 4, een voelset 65% voor 5', () => {
    expect(warmupSets(settings, squat, squatC, 100, 133, 'ramp')).toEqual([{ weightKg: 70, reps: 4 }]);
    expect(warmupSets(settings, squat, squatC, 100, 133, 'feel')).toEqual([{ weightKg: 65, reps: 5 }]);
  });

  it('niets op warme spieren', () => {
    expect(warmupSets(settings, squat, squatC, 100, 133, 'none')).toEqual([]);
  });

  it('leg press na squat krijgt hooguit één set', () => {
    const press = ex('leg-press');
    const c = candidatesFor(press, profile, {})!;
    expect(warmupSets(settings, press, c, 150, 200, 'ramp')).toHaveLength(1);
  });

  it('beencurls, leg extension en de andere isolatie krijgen nooit een opwarmset', () => {
    for (const id of ['seated-leg-curl', 'lying-leg-curl', 'seated-single-leg-curl', 'leg-extension', 'lateral-raise', 'face-pull']) {
      const e = ex(id);
      const c = candidatesFor(e, profile, { lastExternalKg: 40 })!;
      for (const kind of ['full', 'ramp', 'feel', 'light'] as const) expect(warmupSets(settings, e, c, 40, 60, kind)).toEqual([]);
    }
  });

  it('een fly op koude spieren krijgt één lichte set van 50% voor 8', () => {
    const fly = ex('pec-deck-fly');
    const c = candidatesFor(fly, profile, {})!;
    const w = warmupSets(settings, fly, c, 40, 60, 'light');
    expect(w).toHaveLength(1);
    expect(w[0].reps).toBe(8);
    expect(w[0].weightKg).toBe(20);
    expect(warmupSets(settings, fly, c, 8, 12, 'light')).toEqual([]);
  });

  it('zonder schatting (geen historie) uit het werkgewicht: 50% voor 8 en 80% voor 3', () => {
    expect(warmupSets(settings, squat, squatC, 100, undefined, 'full')).toEqual([{ weightKg: 50, reps: 8 }, { weightKg: 80, reps: 3 }]);
  });

  it('een stang met een klein deel lichaamsgewicht rondt af op het stanggewicht, niet op de last', () => {
    // roeien met 60 kg op de stang bij 80 kg lichaam: de last is 66,4 kg.
    const row = ex('barbell-row');
    const c = candidatesFor(row, profile, { lastExternalKg: 60, bodyKg: 80 })!;
    const strength = 66.4 * (1 + 10 / 30);
    const w = warmupSets(settings, row, c, 60, strength, 'full', 80);
    // 58% van de kracht is 51,3 kg last, dus 44,9 kg op de stang: 45, niet 52,5.
    expect(w.map((x) => x.weightKg)).toEqual([30, 45]);
  });
});

describe('Forge-voorschrift, de punten van de controle', () => {
  const bench = ex('bench-press');

  it('B1: bij hetzelfde gewicht vraagt de zin niet meer dan de rij invult', () => {
    const s = [session('2026-10-01', [work(7, 60, 2), work(7, 60, 2), work(7, 60, 2)])];
    const p = prescribe({ exercise: bench, sessions: s, date: '2026-10-08', settings })!;
    expect(p.sets[0].weightKg).toBe(60);
    expect(p.targetReps).toBeGreaterThanOrEqual(7);
    expect(p.reason.includes('één herhaling meer') ? p.targetReps > 7 : p.reason.includes(`${p.targetReps}`)).toBe(true);
  });

  it('B1: staat de rij op evenveel als vorige keer, dan staat de zin op weer evenveel', () => {
    const s = [session('2026-10-01', [work(5, 100, 2), work(5, 100, 2), work(5, 100, 2)]), session('2026-10-08', [work(6, 102.5, 2), work(6, 102.5, 2), work(6, 102.5, 2)])];
    const p = prescribe({ exercise: ex('back-squat'), sessions: s, date: '2026-10-15', settings })!;
    if (p.sets[0].weightKg === 102.5) {
      expect(p.targetReps).toBeGreaterThanOrEqual(6);
      expect(p.reason.includes('één herhaling meer')).toBe(p.targetReps > 6);
    }
  });

  it('B2: een latere set springt niet een hele stap omlaag en het bereik rekt niet op', () => {
    const s = [session('2026-10-01', [work(13, 8, 2), work(12, 8, 2), work(12, 8, 2)])];
    const p = prescribe({ exercise: ex('lateral-raise'), sessions: s, date: '2026-10-08', settings })!;
    for (const set of p.sets) expect(set.repsHigh).toBe(p.sets[0].repsHigh);
  });

  it('B2: bij een grove stap blijft het gewicht gelijk met een lagere onderkant', () => {
    // een stapel van 5 kg bij 20 kg is een stap van 25%
    const s = [session('2026-10-01', [work(12, 20, 2), work(12, 20, 2), work(11, 20, 2), work(11, 20, 2)])];
    const p = prescribe({ exercise: ex('triceps-pushdown'), sessions: s, date: '2026-10-08', settings })!;
    const weights = p.sets.map((x) => x.weightKg);
    // set 2 en 3 houden 20 kg met een lagere onderkant, pas als ook dat te weinig is gaat het omlaag
    expect(weights.slice(0, 3)).toEqual([20, 20, 20]);
    expect(p.sets[1].repsLow).toBeLessThan(p.sets[0].repsLow);
    expect(p.sets[2].repsLow).toBeLessThan(p.sets[1].repsLow);
    expect(p.sets[2].repsLow).toBeGreaterThanOrEqual(p.sets[0].repsLow - 2);
    for (const set of p.sets) expect(set.repsHigh).toBe(p.sets[0].repsHigh);
  });

  it('B4: een gewicht buiten het profiel geeft met nearestOnMismatch het dichtstbijzijnde gewicht en een zin', () => {
    const db = ex('incline-dumbbell-press');
    const s = [session('2026-10-01', [work(9, 24, 2), work(9, 24, 2), work(9, 24, 2)])];
    const base = { exercise: db, sessions: s, date: '2026-10-08', settings };
    expect(lastWeightMismatch(base)).toBe(true);
    expect(prescribe(base)).toBeUndefined();
    const p = prescribe({ ...base, nearestOnMismatch: true })!;
    expect(p.notice).toMatch(/past niet bij je sportschool/);
    expect(p.notice).toMatch(/24 kg/);
    expect(p.sets[0].weightKg).toBeGreaterThan(0);
    const ok = prescribe({ exercise: db, sessions: [session('2026-10-01', [work(9, 25, 2), work(9, 25, 2)])], date: '2026-10-08', settings, nearestOnMismatch: true })!;
    expect(ok.notice).toBeUndefined();
  });

  it('B7: het bereik en de RIR van het plan winnen van wat uit de historie volgt', () => {
    const s = [session('2026-10-01', [work(8, 60, 2), work(8, 60, 2), work(8, 60, 2)])];
    const derived = prescribe({ exercise: bench, sessions: s, date: '2026-10-08', settings })!;
    const planned = prescribe({ exercise: bench, sessions: s, date: '2026-10-08', settings, plan: { low: 4, high: 6, rir: 1 } })!;
    expect(planned.range).toEqual({ low: 4, high: 6, rir: 1 });
    expect(planned.sets[0].repsLow).toBe(4);
    expect(planned.sets[0].rir).toBe(1);
    const noRir = prescribe({ exercise: bench, sessions: s, date: '2026-10-08', settings, plan: { low: 4, high: 6 } })!;
    expect(noRir.range.rir).toBe(derived.range.rir);
  });

  it('B9: bij hulp heet het hulp, niet gewicht', () => {
    const pull = ex('assisted-pull-up');
    const s = [session('2026-10-01', [work(9, -30, 2), work(9, -30, 2), work(8, -30, 2)])];
    const p = prescribe({ exercise: pull, sessions: s, date: '2026-10-08', settings, bodyKg: 80 })!;
    expect(p.reason).not.toMatch(/gewicht/);
    expect(describePlannedSet(pull, p.sets[0])).toMatch(/^hulp \d/);
  });

  it('B12: na één training staat er niet dat je geschatte kracht gestegen is', () => {
    const s = [session('2026-10-01', [work(6, 100, 2), work(6, 100, 2), work(6, 100, 2)])];
    const p = prescribe({ exercise: ex('back-squat'), sessions: s, date: '2026-10-08', settings })!;
    expect(p.reason).not.toMatch(/geschatte kracht is gestegen/);
  });
});
