import { describe, expect, it } from 'vitest';
import { resolveLegEase, resolveLegEaseHow } from './legEaseSettings';
import { legSorenessList } from './legSoreness';

describe('de instellingen van Lichter bij vermoeide benen', () => {
  it('zonder sleutel geldt het advies', () => {
    expect(resolveLegEase(undefined)).toBe('voorstel');
    expect(resolveLegEase({})).toBe('voorstel');
    expect(resolveLegEaseHow(undefined)).toBe('standaard');
    expect(resolveLegEaseHow({})).toBe('standaard');
  });

  it('kent de drie standen en de drie manieren', () => {
    expect(resolveLegEase({ legEase: 'regel' })).toBe('regel');
    expect(resolveLegEase({ legEase: 'uit' })).toBe('uit');
    expect(resolveLegEaseHow({ legEaseHow: 'alleen-gewicht' })).toBe('alleen-gewicht');
    expect(resolveLegEaseHow({ legEaseHow: 'extra' })).toBe('extra');
  });

  it('een beschadigde waarde telt als het advies', () => {
    expect(resolveLegEase({ legEase: 'rommel' })).toBe('voorstel');
    expect(resolveLegEase({ legEase: 5 })).toBe('voorstel');
    expect(resolveLegEaseHow({ legEaseHow: null })).toBe('standaard');
  });
});

describe('spierpijn voor de beenindex', () => {
  const note = (bodyPart: string, date: string, kind: 'spierpijn' | 'stijf' | 'pijn' = 'spierpijn') => ({ id: bodyPart + date, date, bodyPart, severity: 'licht' as const, kind });

  it('een melding op een beenplek geeft dezelfde ondergrens als Spierpijn in de ochtendcheck', () => {
    const list = legSorenessList([{ date: '2026-10-21', legs: 'spierpijn' }, { date: '2026-10-22', legs: 'flink' }, { date: '2026-10-23', legs: 'fris' }], [note('Knie links', '2026-10-24')]);
    expect(list).toEqual([
      { date: '2026-10-21', level: 'spierpijn' },
      { date: '2026-10-22', level: 'flink' },
      { date: '2026-10-24', level: 'spierpijn' },
    ]);
  });

  it('stijf, pijn en een plek buiten de benen tellen niet', () => {
    expect(legSorenessList(undefined, [note('Knie links', '2026-10-24', 'stijf'), note('Kuit links', '2026-10-24', 'pijn'), note('Nek midden', '2026-10-24')])).toEqual([]);
  });
});
