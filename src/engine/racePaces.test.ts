import { describe, it, expect } from 'vitest';
import { checkTargetTime, formatPace, paceLine, testMeaning, formatPaceRange, minutesAtVdot, paceForTemplate, racePaces, raceDayBand, vdotOf, MAX_GAIN } from './racePaces';
import type { TestResult } from './racePrediction';

// Made-up results. 29:05 for 5 km is the 5 km time of VDOT 32.
const t = (date: string, minutes: number, km = 5): TestResult => ({ date, km, minutes });

describe('VDOT', () => {
  it('matches the published table: 19:57 for 5 km is VDOT 50, 41:21 for 10 km as well', () => {
    expect(vdotOf(5, 19 + 57 / 60)).toBeCloseTo(50, 0);
    expect(vdotOf(10, 41 + 21 / 60)).toBeCloseTo(50, 0);
  });
  it('turns a VDOT back into a time over a distance', () => {
    expect(minutesAtVdot(vdotOf(5, 25), 5)).toBeCloseTo(25, 3);
    expect(minutesAtVdot(32, 10)).toBeCloseTo(60.4, 0);
    expect(minutesAtVdot(45, 10)).toBeCloseTo(45.2, 0);
  });
});

describe('training paces from a test', () => {
  const p = racePaces([t('2026-10-29', 29 + 5 / 60)])!;

  it('gives a score, and the paces in the right order: interval faster than threshold faster than easy', () => {
    expect(p.vdot).toBeCloseTo(32, 0);
    expect(p.interval.slow).toBeLessThan(p.threshold.fast);
    expect(p.threshold.slow).toBeLessThan(p.easy.fast);
    for (const r of [p.easy, p.threshold, p.interval]) expect(r.fast).toBeLessThan(r.slow);
  });

  it('puts the paces where the tables have them for VDOT 32 (to the 5 seconds)', () => {
    expect(formatPaceRange(p.threshold)).toBe('6:05 tot 6:20 per km');
    expect(formatPaceRange(p.easy)).toBe('7:15 tot 8:20 per km');
    // 5 km pace is 5:49 per km: 2% either way.
    expect(formatPaceRange(p.interval)).toBe('5:40 tot 5:55 per km');
  });

  it('predicts the 10 km as the same range the Ascend screen shows', () => {
    // Riegel: 29:05 x 2^1.06 = 60:38, plus and minus 2.5%.
    expect(p.race!.minutes).toBeCloseTo(60.64, 1);
    expect(p.race!.low).toBeCloseTo(p.race!.minutes * 0.975, 5);
    expect(p.race!.high).toBeCloseTo(p.race!.minutes * 1.025, 5);
  });

  it('a faster test moves every pace', () => {
    const fast = racePaces([t('2027-02-18', 25)])!;
    expect(fast.vdot).toBeGreaterThan(p.vdot);
    expect(fast.easy.fast).toBeLessThan(p.easy.fast);
    expect(fast.threshold.fast).toBeLessThan(p.threshold.fast);
  });

  it('works on a test that was not exactly 5 km', () => {
    const a = racePaces([t('2026-10-29', 29 + 5 / 60, 5)])!;
    const b = racePaces([t('2026-10-29', 28.2, 4.85)])!;
    expect(Math.abs(a.vdot - b.vdot)).toBeLessThan(0.6);
  });

  it('says nothing without a test', () => {
    expect(racePaces([])).toBeUndefined();
  });

  it('gives no race time past the half marathon, but the paces stay', () => {
    const m = racePaces([t('2026-10-29', 29)], 42.2)!;
    expect(m.race).toBeUndefined();
    expect(m.threshold.fast).toBeGreaterThan(0);
  });

  it('flags a test clearly slower than the one before as doubtful, not one within the spread', () => {
    expect(racePaces([t('2026-10-29', 29), t('2026-12-01', 31)])!.doubtful).toBe(true);
    expect(racePaces([t('2026-10-29', 29), t('2026-12-01', 29.8)])!.doubtful).toBe(false);
    expect(racePaces([t('2026-10-29', 29), t('2026-12-01', 27)])!.doubtful).toBe(false);
    expect(racePaces([t('2026-10-29', 29)])!.doubtful).toBe(false);
  });

  it('uses the latest test', () => {
    const two = racePaces([t('2026-10-29', 30), t('2026-12-01', 27)])!;
    expect(two.test.date).toBe('2026-12-01');
    expect(two.vdot).toBeCloseTo(racePaces([t('2026-12-01', 27)])!.vdot, 5);
  });
});

describe('which pace belongs to which training', () => {
  const p = racePaces([t('2026-10-29', 29)])!;
  it('tempo run and hills with descending are threshold, intervals are 5 km pace, other trainings have none', () => {
    expect(paceForTemplate('tpl_tempo_run', p)?.range).toBe(p.threshold);
    expect(paceForTemplate('tpl_hills_descent', p)?.range).toBe(p.threshold);
    expect(paceForTemplate('tpl_intervals', p)?.range).toBe(p.interval);
    expect(paceForTemplate('tpl_long_run', p)).toBeUndefined();
    expect(paceForTemplate('tpl_upper_a', p)).toBeUndefined();
  });
  it('writes one plain sentence for the guide, only for the trainings with a pace of their own', () => {
    expect(paceLine('tpl_tempo_run', p)).toBe('Je tempo: 6:05 tot 6:20 per km, uit je test van 29 oktober.');
    expect(paceLine('tpl_intervals', p)).toMatch(/^Je tempo: \d:\d\d tot \d:\d\d per km, uit je test van 29 oktober\.$/);
    expect(paceLine('tpl_tempo_run', undefined)).toBe('Je tempo komt hier te staan zodra je een testloop hebt gedaan.');
    expect(paceLine('tpl_long_run', p)).toBeUndefined();
    expect(paceLine('tpl_long_run', undefined)).toBeUndefined();
  });
  it('formats to the 5 seconds', () => {
    expect(formatPace(365)).toBe('6:05');
    expect(formatPace(367)).toBe('6:05');
    expect(formatPace(368)).toBe('6:10');
    expect(formatPace(599)).toBe('10:00');
  });
});

describe('what the test means', () => {
  it('names the result, the predicted race and the three paces in plain words', () => {
    const m = testMeaning(racePaces([t('2026-10-29', 29 + 5 / 60)])!);
    expect(m.headline).toContain('Je liep 5 km in 29:05.');
    expect(m.headline).toMatch(/10 km in ongeveer 61 minuten, ergens tussen 59 en 62 minuten\./);
    expect(m.rows.map((r) => r.label)).toEqual(['Rustige loop', 'Tempoloop', 'Intervallen']);
    expect(m.rows[1].value).toBe('6:05 tot 6:20 per km');
    expect(m.note).toContain('VDOT');
    expect(m.note).toContain('32');
    expect(JSON.stringify(m)).not.toMatch(/[\u2013\u2014]/);
  });
  it('a doubtful test says to repeat it before trusting the paces', () => {
    const m = testMeaning(racePaces([t('2026-10-29', 29), t('2026-12-01', 31)])!);
    expect(m.note).toContain('nog eens');
  });
});

describe('the band for race day', () => {
  it('is the prediction itself, widened by its own spread, with no weeks left', () => {
    const b = raceDayBand(60, 0);
    expect(b.low).toBe(59); // 58.5 rounded up
    expect(b.high).toBe(62); // 61.5 rounded up
  });

  it('21 weeks out from 60 minutes: about 50 to 57 minutes, middle 53 or 54', () => {
    const b = raceDayBand(60, 21);
    expect(b.low).toBeGreaterThanOrEqual(49);
    expect(b.low).toBeLessThanOrEqual(51);
    expect(b.high).toBeGreaterThanOrEqual(56);
    expect(b.high).toBeLessThanOrEqual(58);
    expect(b.suggested).toBeGreaterThanOrEqual(53);
    expect(b.suggested).toBeLessThanOrEqual(54);
    expect(b.weeks).toBe(21);
  });

  it('never promises more than 15% faster, however many weeks', () => {
    const b = raceDayBand(60, 200);
    expect(b.low).toBeGreaterThanOrEqual(Math.floor(60 * (1 - MAX_GAIN) * 0.975));
    expect(b.suggested).toBeGreaterThanOrEqual(Math.round(60 * (1 - MAX_GAIN)));
  });
});

describe('a goal time against the test', () => {
  // A made-up first test, 20 weeks and a bit before the race: 29:05 for 5 km.
  const paces = racePaces([t('2026-10-29', 29 + 5 / 60)])!;
  const raceDate = '2027-03-20';

  it('45 minutes is out of reach: ambitious, and the proposal lands inside the band', () => {
    const c = checkTargetTime(paces, 45, raceDate)!;
    expect(c.verdict).toBe('ambitious');
    expect(c.suggested).toBeGreaterThan(c.band.low - 1);
    expect(c.suggested).toBeLessThanOrEqual(c.band.high);
    expect(c.suggested).toBeGreaterThanOrEqual(53);
    expect(c.suggested).toBeLessThanOrEqual(55);
  });

  it('a goal inside the band is left alone, also at its edges', () => {
    const band = checkTargetTime(paces, 45, raceDate)!.band;
    expect(checkTargetTime(paces, 53, raceDate)).toBeUndefined();
    expect(checkTargetTime(paces, band.low, raceDate)).toBeUndefined();
    expect(checkTargetTime(paces, band.high, raceDate)).toBeUndefined();
    expect(checkTargetTime(paces, band.low - 1, raceDate)?.verdict).toBe('ambitious');
  });

  it('a goal far slower than the band is called easy', () => {
    expect(checkTargetTime(paces, 75, raceDate)?.verdict).toBe('easy');
  });

  it('says nothing when the test is doubtful, the race is past, or no race time exists', () => {
    const doubtful = racePaces([t('2026-10-29', 29), t('2026-12-01', 31)])!;
    expect(checkTargetTime(doubtful, 45, raceDate)).toBeUndefined();
    expect(checkTargetTime(paces, 45, '2026-10-01')).toBeUndefined();
    expect(checkTargetTime(racePaces([t('2026-10-29', 29)], 42.2)!, 200, raceDate)).toBeUndefined();
  });

  it('closer to the race the band narrows, so the same goal turns from fine into ambitious', () => {
    const late = racePaces([t('2027-02-18', 29 + 5 / 60)])!;
    expect(checkTargetTime(paces, 52, raceDate)).toBeUndefined();
    expect(checkTargetTime(late, 52, raceDate)?.verdict).toBe('ambitious');
  });
});
