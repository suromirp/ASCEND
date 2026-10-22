import { describe, it, expect } from 'vitest';
import { runTrends, type RunTrendsInput } from './runTrends';
import { aerobicTrend } from './aerobicTrend';
import { EASY, TEMPLATES, runLog } from './fixtures/runLogs';
import type { RunSpec } from './fixtures/runStreams';
import type { SessionLog } from '../models/training';

// Made-up logs and series only. Today is a Tuesday; the twelve weeks start on
// Monday 2026-08-03.
const TODAY = '2026-10-20';
const HR = { lthr: 170, restingHr: 50 };
const cool = { tempC: 12, feelsC: 11, windKmh: 10, gustKmh: 18, rainMm: 0, source: 'lookup' as const };

function input(logs: SessionLog[], over: Partial<RunTrendsInput> = {}): RunTrendsInput {
  return { logs, templates: TEMPLATES, program: null, hr: HR, settings: undefined, detailsOn: true, today: TODAY, ...over };
}
const row = (logs: SessionLog[], key: string, over: Partial<RunTrendsInput> = {}) => runTrends(input(logs, over)).rows.find((r) => r.key === key)!;
const easyRun = (id: string, date: string, spec: RunSpec = EASY) => runLog({ id, date, spec: { ...spec, seed: id.length * 7 + date.length }, conditions: cool, strap: true });

describe('efficiency: the same trend as the card Tempo bij zone 2', () => {
  const earlier = ['2026-09-16', '2026-09-23'].map((d, i) => easyRun(`a${i}`, d, { ...EASY, pace: 380 }));
  const recent = ['2026-10-13', '2026-10-16'].map((d, i) => easyRun(`b${i}`, d, { ...EASY, pace: 350 }));

  it('reads aerobicTrend and gives the same line and the same change', () => {
    const logs = [...earlier, ...recent];
    const r = row(logs, 'efficiency');
    const trend = aerobicTrend(logs, TEMPLATES, null, HR, TODAY);
    expect(r.points.map((p) => p.value)).toEqual(trend.points.map((p) => p.value));
    expect(r.word).toBe('Beter');
    expect(r.model.figures.difference).toBe(`${Math.round(Math.abs(trend.changeSec!))} s per km sneller`);
    expect(r.model.figures.today).toBe(`${Math.floor(trend.recentSec! / 60)}:${String(Math.round(trend.recentSec! % 60)).padStart(2, '0')} per km`);
    expect(r.model.strengthText).toContain('dezelfde trend als de kaart Tempo bij zone 2');
  });

  it('is Normaal for a small change, Slechter for a clearly slower one and has too little data otherwise', () => {
    const same = [...earlier, ...['2026-10-13', '2026-10-16'].map((d, i) => easyRun(`c${i}`, d, { ...EASY, pace: 378 }))];
    expect(row(same, 'efficiency').word).toBe('Normaal');
    const worse = [...earlier, ...['2026-10-13', '2026-10-16'].map((d, i) => easyRun(`d${i}`, d, { ...EASY, pace: 410 }))];
    expect(row(worse, 'efficiency').word).toBe('Slechter');
    const few = row(recent, 'efficiency');
    expect(few.word).toBe('Te weinig gegevens');
    expect(few.model.figures.today).toBe('nog niet');
    expect(row([], 'efficiency').word).toBe('Te weinig gegevens');
  });

  it('works without the details switch: it does not need a profile', () => {
    const logs = [...earlier, ...recent].map((l) => ({ ...l, detail: undefined }));
    expect(row(logs, 'efficiency', { detailsOn: false }).word).toBe('Beter');
  });
});

describe('long days: drift', () => {
  const long = { ...EASY, minutes: 85 };
  const mk = (i: number, drift: number) =>
    runLog({ id: `l${i}`, date: ['2026-08-08', '2026-08-15', '2026-08-22', '2026-09-05', '2026-09-19', '2026-10-03', '2026-10-10', '2026-10-17'][i], spec: { ...long, hr: (m) => (m < 45 ? 140 : 140 + drift), seed: i + 5 }, templateId: 'tpl_long_run', conditions: cool, strap: true });

  it('says Beter when the last three drift clearly less than the three before', () => {
    const logs = [8, 8, 8, 2, 2, 2].map((d, i) => mk(i, d));
    const r = row(logs, 'longDays');
    expect(r.word).toBe('Beter');
    expect(r.points).toHaveLength(6);
    expect(r.model.figures.difference).toMatch(/procentpunt lager$/);
  });

  it('says Slechter when it is clearly higher, Normaal when it is about equal', () => {
    expect(row([2, 2, 2, 9, 9, 9].map((d, i) => mk(i, d)), 'longDays').word).toBe('Slechter');
    expect(row([3, 3, 3, 3.5, 3.5, 3.5].map((d, i) => mk(i, d)), 'longDays').word).toBe('Normaal');
  });

  it('needs six long runs and says how many there are', () => {
    const r = row([8, 2, 2, 2, 2].map((d, i) => mk(i, d)), 'longDays');
    expect(r.word).toBe('Te weinig gegevens');
    expect(r.model.strengthText).toContain('Er zijn 5 lange loopjes');
    expect(r.points).toHaveLength(5);
  });
});

describe('climbing and descending', () => {
  const hikeSpec = (pace: number, hr = 150): RunSpec => ({
    minutes: 90, pace: (m) => (m >= 15 && m < 45 ? pace : m >= 60 && m < 85 ? 560 : 560), grade: (m) => (m < 15 ? 0 : m < 45 ? 0.12 : m >= 60 && m < 85 ? -0.1 : 0),
    hr: (m) => (m >= 15 && m < 45 ? hr : 115), baroNoise: 0.8,
  });
  const dates = ['2026-08-08', '2026-08-15', '2026-08-22', '2026-09-05', '2026-09-19', '2026-10-03'];
  const hikes = (paces: number[], hr = 150) => paces.map((p, i) => runLog({ id: `h${i}`, date: dates[i], spec: { ...hikeSpec(p, hr), seed: i + 3 }, templateId: 'tpl_mountain_hike', packKg: 8, conditions: cool }));

  it('says Beter when the climbs of the last three are clearly faster at the same heart rate', () => {
    const r = row(hikes([800, 800, 800, 700, 700, 700]), 'climbing');
    expect(r.word).toBe('Beter');
    expect(r.model.figures.difference).toMatch(/% sneller$/);
    expect(r.model.strengthText).toContain('Bergaf: 6 dalingen');
    expect(r.model.strengthText).toContain('geen oordeel over dalen');
  });

  it('says Normaal for an equal speed and too little data for fewer than six climbs', () => {
    expect(row(hikes([780, 790, 780, 785, 780, 790]), 'climbing').word).toBe('Normaal');
    const few = row(hikes([800, 800, 700]), 'climbing');
    expect(few.word).toBe('Te weinig gegevens');
    expect(few.model.strengthText).toContain('Er zijn 3 klimmen gevonden');
  });
});

describe('form: ground contact time at the same pace', () => {
  const base: RunSpec = { ...EASY, minutes: 45, stanceTimeMs: 240, stepLengthM: 1.1 };
  const dates = ['2026-09-08', '2026-09-12', '2026-09-16', '2026-09-20', '2026-10-06', '2026-10-13'];
  const mk = (i: number, stance: number, pace = 360) => easyRun(`f${i}`, dates[i], { ...base, stanceTimeMs: stance, pace });

  it('says Slechter only when the last two runs in a row show a clearly longer contact time', () => {
    const r = row([240, 241, 239, 240, 262, 264].map((s, i) => mk(i, s)), 'form');
    expect(r.word).toBe('Slechter');
    expect(r.model.figures.difference).toMatch(/ms langer$/);
    const onlyLatest = row([240, 241, 239, 240, 241, 264].map((s, i) => mk(i, s)), 'form');
    expect(onlyLatest.word).toBe('Normaal');
  });

  it('says Beter when the last two are clearly shorter', () => {
    expect(row([250, 251, 249, 250, 228, 226].map((s, i) => mk(i, s)), 'form').word).toBe('Beter');
  });

  it('has too little data without three earlier runs at about the same pace', () => {
    const slowEarlier = [0, 1, 2, 3].map((i) => mk(i, 240, 450));
    const r = row([...slowEarlier, mk(4, 241), mk(5, 264)], 'form');
    expect(r.word).toBe('Te weinig gegevens');
    expect(r.model.strengthText).toContain('drie eerdere loopjes');
  });

  it('has nothing without loopvorm at all', () => {
    const logs = [0, 1, 2].map((i) => easyRun(`n${i}`, dates[i], EASY));
    expect(row(logs, 'form').word).toBe('Te weinig gegevens');
  });
});

describe('the switches', () => {
  const logs = [easyRun('a', '2026-10-13'), easyRun('b', '2026-10-16')];
  it('with the details switch off every row except efficiency says so, with no line', () => {
    const t = runTrends(input(logs, { detailsOn: false }));
    for (const r of t.rows.filter((x) => x.key !== 'efficiency')) {
      expect(r.word).toBe('Te weinig gegevens');
      expect(r.points).toEqual([]);
      expect(r.model.strengthText).toContain('staan uit');
    }
  });

  it('a topic that is switched off has no row', () => {
    const t = runTrends(input(logs, { settings: { topics: { longDays: false, form: false } } }));
    expect(t.rows.map((r) => r.key)).toEqual(['efficiency', 'climbing']);
  });

  it('all four rows by default, in the fixed order', () => {
    expect(runTrends(input(logs)).rows.map((r) => r.key)).toEqual(['efficiency', 'longDays', 'climbing', 'form']);
  });

  it('only words, no score', () => {
    for (const r of runTrends(input(logs)).rows) expect(['Beter', 'Normaal', 'Slechter', 'Te weinig gegevens']).toContain(r.word);
  });
});
