import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById } from '../data/exercises';
import { newWarmState, noteWorked, warmthOf, warmupKind } from './warmup';

const ex = (id: string) => exerciseById(id)!;

describe('warmupKind: wat is er warm in deze training', () => {
  it('de eerste zware oefening van een lichaamsdeel krijgt de volle opbouw', () => {
    const s = newWarmState();
    expect(warmupKind(ex('back-squat'), s)).toBe('full');
    noteWorked(s, ex('back-squat'));
    // het bovenlichaam is nog koud
    expect(warmupKind(ex('bench-press'), s)).toBe('full');
  });

  it('leg press na squat: hetzelfde patroon, spieren warm, een aanloopset', () => {
    const s = newWarmState();
    noteWorked(s, ex('back-squat'));
    expect(warmupKind(ex('leg-press'), s)).toBe('ramp');
  });

  it('een nieuw patroon op warme spieren (RDL na squat, roeien na bankdrukken) krijgt een voelset', () => {
    const legs = newWarmState();
    noteWorked(legs, ex('back-squat'));
    expect(warmupKind(ex('romanian-deadlift'), legs)).toBe('feel');
    const upper = newWarmState();
    noteWorked(upper, ex('bench-press'));
    expect(warmupKind(ex('barbell-row'), upper)).toBe('feel');
    expect(warmupKind(ex('overhead-press'), upper)).toBe('feel');
  });

  it('isolatie op warme spieren krijgt niets, op koude spieren een lichte set', () => {
    const s = newWarmState();
    expect(warmupKind(ex('pec-deck-fly'), s)).toBe('light');
    noteWorked(s, ex('bench-press'));
    expect(warmupKind(ex('pec-deck-fly'), s)).toBe('none');
    expect(warmupKind(ex('cable-fly'), s)).toBe('none');
  });

  it('hulpspieren tellen voor de helft: triceps na bankdrukken is warm genoeg', () => {
    const s = newWarmState();
    noteWorked(s, ex('bench-press'));
    expect(warmthOf({ primary: ['triceps'] }, s)).toBeGreaterThanOrEqual(0.5);
  });

  it('isolatie warmt het lichaamsdeel niet op, een samengestelde oefening wel', () => {
    const s = newWarmState();
    noteWorked(s, ex('lateral-raise'));
    expect(s.regions.size).toBe(0);
    expect(warmupKind(ex('bench-press'), s)).toBe('full');
  });
});

describe('de oefenlijst', () => {
  it('flyes, pullover, straight-arm pulldown en Kelso shrug zijn isolatie, face pull een schouderisolatie', () => {
    for (const id of ['cable-fly', 'pec-deck-fly', 'low-to-high-cable-fly', 'low-incline-dumbbell-fly', 'straight-arm-pulldown', 'dumbbell-pullover', 'kelso-shrug']) {
      expect(ex(id).pattern).toBe('isolation_upper');
    }
    expect(ex('face-pull').pattern).toBe('isolation_shoulder');
  });
  it('elke oefening heeft een patroon', () => {
    expect(EXERCISES.every((e) => e.pattern.length > 0)).toBe(true);
  });
});
