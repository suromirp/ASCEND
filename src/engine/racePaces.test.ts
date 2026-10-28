import { describe, it, expect } from 'vitest';
import { formatRaceTime } from './racePrediction';
import { checkTargetTime, formatPace, paceLine, testMeaning, formatPaceRange, minutesAtVdot, paceForTemplate, racePaces, raceOutlook, outlookSaid, outlookMinutes, outlookWeeksSaid, vdotOf } from './racePaces';
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

describe('race day from one calculation', () => {
  it('is the prediction itself with no weeks left', () => {
    const o = raceOutlook(60, 59, 0);
    expect(o.atRaceDay).toBe(60);
    expect(o.fits).toBe(false);
  });

  it('21 weeks out from 55:40 at 0,55% per week: about 50 minutes, 45:00 asks about 39 weeks', () => {
    const o = raceOutlook(55 + 40 / 60, 45, 21);
    expect(outlookMinutes(o)).toBe(50);
    expect(o.work).toBeCloseTo(38.6, 1);
    expect(o.fits).toBe(false);
    expect(outlookWeeksSaid(o)).toEqual({ need: 39, left: 21 });
  });

  it('a goal inside the average growth fits, and a goal slower than now needs no weeks', () => {
    expect(raceOutlook(55.67, 52, 21).fits).toBe(true);
    expect(raceOutlook(55.67, 60, 21).work).toBe(0);
  });

  it('never says "about 21 weeks; there are 21" when it just does not fit', () => {
    const o = raceOutlook(60, 60 * Math.pow(1 - 0.0055, 21.3), 21);
    expect(o.fits).toBe(false);
    const said = outlookWeeksSaid(o);
    expect(said.need).toBeGreaterThan(said.left);
  });
});

describe('the proposal always fits after Akkoord', () => {
  it('over a grid of expected times and weeks, the suggested minute fits and the one below does not', () => {
    for (const growth of ['average', 'careful'] as const) {
      for (let predicted = 22.3; predicted < 130; predicted += 3.37) {
        for (let weeks = 0.5; weeks < 60; weeks += 2.9) {
          const o = raceOutlook(predicted, predicted * 0.7, weeks, growth);
          const m = outlookMinutes(o);
          expect(raceOutlook(predicted, m, weeks, growth).fits).toBe(true);
          expect(raceOutlook(predicted, m - 1, weeks, growth).fits).toBe(false);
          expect(m).toBeGreaterThanOrEqual(Math.floor(o.atRaceDay));
          expect(m).toBeLessThanOrEqual(Math.ceil(o.atRaceDay));
        }
      }
    }
  });

  it('a goal time set to the proposal is no longer asked about, and its outlook says it fits', () => {
    const paces = racePaces([t('2026-10-29', 29 + 5 / 60)])!;
    for (const raceDate of ['2026-12-20', '2027-01-30', '2027-03-20', '2027-05-01', '2027-08-01']) {
      for (const target of [40, 44.5, 47.75, 50, 52.2]) {
        const c = checkTargetTime(paces, target, raceDate);
        if (!c || c.verdict !== 'ambitious') continue;
        const after = raceOutlook(paces.race!.minutes, c.suggested, c.outlook.weeksLeft);
        expect(after.fits).toBe(true);
        expect(checkTargetTime(paces, c.suggested, raceDate)).toBeUndefined();
      }
    }
  });

  it('the day after Akkoord the card still says it fits: within the spread of the prediction counts as fits', () => {
    for (const growth of ['average', 'careful'] as const) {
      for (let predicted = 17.3; predicted < 130; predicted += 3.37) {
        for (let weeks = 1; weeks < 60; weeks += 2.9) {
          const m = outlookMinutes(raceOutlook(predicted, predicted * 0.7, weeks, growth));
          // One day later, and a week later: the card never contradicts the proposal.
          expect(raceOutlook(predicted, m, weeks - 1 / 7, growth).holds).toBe(true);
          expect(raceOutlook(predicted, m, weeks - 1, growth).holds).toBe(true);
        }
      }
    }
  });

  it('a goal well beyond the spread does not hold, so TARGET-TIME and the card go quiet together', () => {
    const o = raceOutlook(60, 45, 10);
    expect(o.fits).toBe(false);
    expect(o.holds).toBe(false);
    expect(raceOutlook(60, o.atRaceDay * 0.99, 10).holds).toBe(true);
    expect(raceOutlook(60, o.atRaceDay * 0.99, 10).fits).toBe(false);
  });

  it('says the time on race day as a clock up to 10 km, and as whole minutes above', () => {
    const o = raceOutlook(21.5, 19, 10);
    expect(outlookSaid(o, 5)).toBe(`ongeveer ${formatRaceTime(o.atRaceDay)}`);
    expect(outlookSaid(o, 5)).toMatch(/^ongeveer 20:\d{2}$/);
    expect(outlookSaid(o, 10)).toMatch(/^ongeveer \d+:\d{2}$/);
    expect(outlookSaid(o, 21.1)).toBe(`ongeveer ${o.wholeMinutes} minuten`);
    expect(outlookSaid(o, 42.2)).toMatch(/minuten$/);
  });

  it('careful growth gives a slower time on race day than average growth', () => {
    expect(raceOutlook(60, 50, 20, 'careful').atRaceDay).toBeGreaterThan(raceOutlook(60, 50, 20).atRaceDay);
  });
});

describe('a goal time against the test', () => {
  // A made-up first test, 20 weeks and a bit before the race: 29:05 for 5 km.
  const paces = racePaces([t('2026-10-29', 29 + 5 / 60)])!;
  const raceDate = '2027-03-20';

  it('45 minutes is out of reach: ambitious, and the proposal is the time at average growth', () => {
    const c = checkTargetTime(paces, 45, raceDate)!;
    expect(c.verdict).toBe('ambitious');
    expect(c.outlook.fits).toBe(false);
    expect(c.suggested).toBe(outlookMinutes(c.outlook));
    expect(c.suggested).toBeGreaterThanOrEqual(53);
    expect(c.suggested).toBeLessThanOrEqual(55);
  });

  it('a goal that fits average growth is left alone, and so is one within the spread of the outlook', () => {
    expect(checkTargetTime(paces, 55, raceDate)).toBeUndefined();
    const c = checkTargetTime(paces, 45, raceDate)!;
    expect(checkTargetTime(paces, c.suggested - 1, raceDate)).toBeUndefined();
    expect(checkTargetTime(paces, c.suggested * 0.9, raceDate)?.verdict).toBe('ambitious');
  });

  it('a goal slower than the test now is called easy', () => {
    expect(checkTargetTime(paces, 75, raceDate)?.verdict).toBe('easy');
  });

  it('counts the weeks from the day you give, not from the test', () => {
    const early = checkTargetTime(paces, 50, raceDate, '2026-10-29')!;
    expect(early.verdict).toBe('ambitious');
    expect(checkTargetTime(paces, 50, raceDate, '2026-12-01')!.outlook.weeksLeft).toBeLessThan(early.outlook.weeksLeft);
  });

  it('says nothing when the test is doubtful, the race is past, or no race time exists', () => {
    const doubtful = racePaces([t('2026-10-29', 29), t('2026-12-01', 31)])!;
    expect(checkTargetTime(doubtful, 45, raceDate)).toBeUndefined();
    expect(checkTargetTime(paces, 45, '2026-10-01')).toBeUndefined();
    expect(checkTargetTime(racePaces([t('2026-10-29', 29)], 42.2)!, 200, raceDate)).toBeUndefined();
  });

  it('closer to the race the same goal turns from fine into ambitious', () => {
    const late = racePaces([t('2027-02-18', 29 + 5 / 60)])!;
    expect(checkTargetTime(paces, 54, raceDate)).toBeUndefined();
    expect(checkTargetTime(late, 54, raceDate)?.verdict).toBe('ambitious');
  });
});

describe('twijfel op dezelfde basis', () => {
  it('een vorige test op de beste 5 km tegen een nieuwe op de hele run vergelijkt beide op de hele run', () => {
    const prev = { date: '2026-09-01', km: 5, minutes: 25, basis: 'effort' as const, wholeKm: 6, wholeMinutes: 32 };
    const latest = { date: '2026-10-01', km: 6, minutes: 32.5, basis: 'whole' as const, wholeKm: 6, wholeMinutes: 32.5 };
    expect(racePaces([prev, latest])?.doubtful).toBe(false);
  });
});
