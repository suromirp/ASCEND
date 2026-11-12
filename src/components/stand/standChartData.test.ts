import { describe, expect, it } from 'vitest';
import { effortHintShown, FRESHNESS_INFO, freshnessPoints, intensityInfo, LOAD_INFO, loadPoints } from './standChartData';
import { FATIGUE_BAND, FATIGUE_THRESHOLDS } from '../../engine/legFatigue';
import { LOAD_JUMP, type FreshnessPoint, type IntensityMix, type WeekLoad } from '../../engine/standing';

const day = (date: string, index: number, sessions: FreshnessPoint['sessions'] = []): FreshnessPoint => ({ date, index, sessions });
const zero = { lopen: 0, kracht: 0, wandelen: 0, overig: 0 };
const week = (weekStart: string, doneTotal: number, plannedTotal = 0, isCurrent = false): WeekLoad => ({
  weekStart, items: [], done: zero, planned: zero, doneTotal, plannedTotal, estimated: 0, isRestWeek: false, isCurrent,
});

describe('Frisheid in de nieuwe stijl', () => {
  const points = [
    day('2026-10-29', 6),
    day('2026-10-30', 3, [{ id: 'a', name: 'Benen A', mark: 'legs', logged: true }]),
    day('2026-10-31', 2),
    day('2026-11-01', 4, [{ id: 'b', name: 'Testloop 5 km', mark: 'test', logged: false }]),
    day('2026-11-02', 5, [{ id: 'c', name: 'Rustige duurloop', mark: 'easy', logged: false }]),
  ];
  const p = freshnessPoints(points, 2);

  it('tot vandaag vol, daarna gestippeld; de index blijft de index', () => {
    expect(p.map((x) => !!x.dashed)).toEqual([false, false, false, true, true]);
    expect(p.map((x) => x.value)).toEqual([6, 3, 2, 4, 5]);
    expect(p[0].x).toBe(0);
    expect(p[4].x).toBe(1);
  });

  it('een ruit voor een test, een stip voor je benen, niets voor een rustige dag; gepland is open', () => {
    expect(p[1]).toMatchObject({ mark: 'dot', open: false });
    expect(p[3]).toMatchObject({ mark: 'diamond', open: true });
    expect(p[4].mark).toBeUndefined();
  });

  it('de uitleg achter de i noemt de echte grenzen en marge', () => {
    const text = FRESHNESS_INFO.join(' ');
    expect(text).toContain('Frisser staat boven');
    expect(text).toContain(`marge van ongeveer ${FATIGUE_BAND} punten`);
    expect(text).toContain(`test hoort bij beenindex ${FATIGUE_THRESHOLDS.test.fresh}`);
    expect(text).toContain(`hard hoort bij ${FATIGUE_THRESHOLDS.hard.fresh}`);
    // Erboven is fris: de grafiek zet de lage index bovenaan (top="low").
    expect(text).not.toMatch(/daaronder|haarlijn/);
  });
});

describe('Belasting per week in de nieuwe stijl', () => {
  it('een stip per week; deze week vol voor gedaan en open erboven voor gepland; de week erna gestippeld en open', () => {
    const weeks = [week('2026-10-12', 500), week('2026-10-19', 540), week('2026-10-26', 224, 200, true), week('2026-11-02', 0, 430)];
    const p = loadPoints(weeks);
    expect(p.map((x) => x.value)).toEqual([500, 540, 224, 430]);
    expect(p[2]).toMatchObject({ ahead: 424, open: false, dashed: false });
    expect(p[3]).toMatchObject({ open: true, dashed: true });
    expect(p[0].ahead).toBeUndefined();
  });

  it('zonder iets gepland deze week geen open stip erboven', () => {
    expect(loadPoints([week('2026-10-26', 300, 0, true)])[0].ahead).toBeUndefined();
  });

  it('de uitleg achter de i: de punten, meer boven, en de grens van de sprong uit de code', () => {
    const text = LOAD_INFO.join(' ');
    expect(text).toContain('45 minuten op zwaarte 6 is 270 punten');
    expect(text).toContain('meer staat boven');
    expect(text).toContain(`${Math.round((LOAD_JUMP - 1) * 100)}% hoger`);
  });
});

describe('Intensiteit achter de i', () => {
  const mix: IntensityMix = {
    sessions: { easy: 6, middle: 2, hard: 1 }, minutes: { easy: 300, middle: 60, hard: 40 }, totalMinutes: 400,
    measuredSessions: 9, plannedSessions: 0, unit: 'minutes', easyShare: 0.75, easyTooHard: [], total: 9,
  };
  it('zegt wat er geteld is, waarvandaan en waar de streep staat', () => {
    expect(intensityInfo(mix)).toEqual([
      'Je loop- en wandelminuten van de laatste vier weken, naar je hartslag.',
      'Uit je hartslag.',
      'De streep op de balk staat op 80% rustig: zoveel doen goede duursporters ongeveer.',
    ]);
    expect(intensityInfo({ ...mix, unit: 'sessions' })[0]).toBe('Je loop- en wandeltrainingen van de laatste vier weken, per training geteld.');
  });
});

describe('de zwaarte ontbreekt: één keer op het scherm', () => {
  const item = (estimated: boolean) => ({ date: '2026-10-26', name: 'Rustige duurloop', sport: 'lopen' as const, minutes: 56, effort: 4, load: 224, planned: false, estimated });
  const est = { ...week('2026-10-26', 224, 0, true), estimated: 224, items: [item(true)] };
  const plain = { ...week('2026-10-19', 300), items: [item(false)] };
  it('de gekozen week toont de ±-regel: geen tweede zin', () => {
    expect(effortHintShown([plain, est], 1)).toBe(false);
  });
  it('een andere week gekozen zonder ±: de zin staat er', () => {
    expect(effortHintShown([plain, est], 0)).toBe(true);
  });
  it('nergens een geschatte zwaarte: geen zin', () => {
    expect(effortHintShown([plain], 0)).toBe(false);
  });
});
