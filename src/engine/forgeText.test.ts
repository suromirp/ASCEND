import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { repsLabel, shortDateNL, deltaText, deltaTone, extraText, extraTone, signedKg, topSetText, valueText } from './forgeText';

describe('signedKg', () => {
  it('zet teken en eenheid erbij, met een komma', () => {
    expect(signedKg(2.5)).toBe('+2,5 kg');
    expect(signedKg(-1)).toBe('-1 kg');
    expect(signedKg(10)).toBe('+10 kg');
  });
  it('nul of bijna nul is gelijk', () => {
    expect(signedKg(0)).toBe('gelijk');
    expect(signedKg(0.04)).toBe('gelijk');
  });
  it('de toon is alleen bij vooruit anders: achteruit is niet rood', () => {
    expect(deltaTone(2.5)).toBe('up');
    expect(deltaTone(0)).toBe('flat');
    expect(deltaTone(-2)).toBe('flat');
    expect(deltaTone(undefined)).toBe('flat');
  });
});

describe('extraText', () => {
  it('herhalingen bij hetzelfde gewicht', () => {
    expect(extraText({ kind: 'reps_same_weight', delta: 2, atKg: 60 })).toBe('+2 herhalingen bij 60 kg');
    expect(extraText({ kind: 'reps_same_weight', delta: -1, atKg: 62.5 })).toBe('-1 herhaling bij 62,5 kg');
    expect(extraText({ kind: 'reps_same_weight', delta: 0, atKg: 60 })).toBe('Evenveel herhalingen bij 60 kg');
  });
  it('het zwaarste gewicht en het volume', () => {
    expect(extraText({ kind: 'top_weight', delta: 2.5 })).toBe('+2,5 kg in je zwaarste set');
    expect(extraText({ kind: 'volume', delta: 1200 })).toBe('+1.200 kg volume per training');
    expect(extraText({ kind: 'volume', delta: -120 })).toBe('-120 kg volume per training');
    expect(extraText({ kind: 'volume', delta: 0 })).toBe('Gelijk volume per training');
  });
  it('geen gedachtestreepjes in de teksten', () => {
    const all = [extraText({ kind: 'volume', delta: -5 }), extraText({ kind: 'top_weight', delta: -5 }), signedKg(-5)].join('');
    expect(all).not.toMatch(/[–—]/);
  });
  it('de toon: meer is vooruit, de rest gedempt', () => {
    expect(extraTone({ kind: 'volume', delta: 5 })).toBe('up');
    expect(extraTone({ kind: 'volume', delta: 0 })).toBe('flat');
    expect(extraTone({ kind: 'volume', delta: -5 })).toBe('flat');
  });
});

describe('oefeningen met hulp', () => {
  const pull = exerciseById('assisted-pull-up');
  it('met lichaamsgewicht is het wat je zelf optilt', () => {
    expect(valueText(-30, 'work_weight', pull, 80)).toBe('50 kg');
    expect(deltaText(5, 'work_weight', pull, 80)).toBe('+5 kg');
  });
  it('zonder lichaamsgewicht staat er hulp en meer is minder hulp', () => {
    expect(valueText(-30, 'work_weight', pull, undefined)).toBe('hulp 30 kg');
    expect(deltaText(5, 'work_weight', pull, undefined)).toBe('5 kg minder hulp');
    expect(deltaText(-5, 'work_weight', pull, undefined)).toBe('5 kg meer hulp');
  });
  it('de 1RM is gewoon kilo\'s', () => {
    expect(valueText(85.3, 'one_rm', pull, undefined)).toBe('85,3 kg');
  });
  it('de zwaarste set', () => {
    expect(topSetText(exerciseById('bench-press'), 60, 8)).toBe('60 kg x 8');
    expect(topSetText(pull, -30, 8)).toBe('hulp 30 kg x 8');
    expect(topSetText(pull, undefined, 8)).toBeUndefined();
  });
});

describe('shortDateNL', () => {
  it('dag en maand, het jaar alleen als het een ander jaar is', () => {
    expect(shortDateNL('2026-10-05', '2026-10-24')).toBe('5 okt');
    expect(shortDateNL('2025-12-31', '2026-10-24')).toBe('31 dec 2025');
  });
});

describe('herhalingen', () => {
  it('het getal en het verschil in herhalingen', () => {
    expect(valueText(12, 'reps', undefined, undefined)).toBe('12 herhalingen');
    expect(repsLabel(1)).toBe('1 herhaling');
    expect(deltaText(3, 'reps', undefined, undefined)).toBe('+3 herhalingen');
    expect(deltaText(-1, 'reps', undefined, undefined)).toBe('-1 herhaling');
    expect(deltaText(0, 'reps', undefined, undefined)).toBe('gelijk');
    expect(valueText(12, 'reps', undefined, undefined, true)).toBe('12 herh.');
    expect(deltaText(-2, 'reps', undefined, undefined, true)).toBe('-2 herh.');
    expect(extraText({ kind: 'total_reps', delta: 5 })).toBe('+5 herhalingen in totaal');
    expect(extraText({ kind: 'total_reps', delta: 0 })).toBe('Evenveel herhalingen in totaal');
  });
});
