import { describe, it, expect } from 'vitest';
import type { SessionLog, SessionTemplate } from '../models/training';
import { bootBreakInStatus, bootReminderLine, breakInTotals, DEFAULT_BREAKIN_KM } from './bootBreakIn';
import { normalizeJourneyState, mergeJourneyState } from './journey';

function log(id: string, date: string, over: Partial<SessionLog> = {}, km?: number, gain?: number): SessionLog {
  return {
    id, templateId: 'tpl_mountain_hike', type: 'hiking', sport: 'hiking', completedDate: date, completedAt: `${date}T10:00:00Z`,
    variant: 'full', durationMinutes: 120, source: 'manual',
    outdoorData: { durationMinutes: 120, distanceKm: km, elevationGainM: gain, source: 'manual' },
    ...over,
  };
}

const DEPARTURE = '2027-08-01';
const boots = { since: '2027-01-04', name: 'Bergschoenen' };

describe('kilometers en stijging vanaf de datum', () => {
  it('telt alleen wandelingen en tochten vanaf de datum', () => {
    const logs = [
      log('voor', '2027-01-03', {}, 20, 500),
      log('a', '2027-01-04', {}, 12, 300),
      log('b', '2027-02-01', { type: 'adventure', sport: undefined }, 18.5, 900),
      log('run', '2027-02-02', { type: 'cardio', sport: 'running', templateId: 'tpl_run' }, 10, 100),
      log('kracht', '2027-02-03', { type: 'strength', sport: undefined, outdoorData: undefined }),
      log('loopband', '2027-02-04', { outdoorData: { durationMinutes: 60, distanceKm: 5, environment: 'treadmill', source: 'manual' } }),
    ];
    const t = breakInTotals(logs, '2027-01-04');
    expect(t.km).toBeCloseTo(30.5);
    expect(t.gainM).toBe(1200);
    expect(t.count).toBe(2);
  });

  it('telt een tocht zonder andere sport, maar een fietstocht als avontuur niet', () => {
    const logs = [
      log('tocht', '2027-02-01', { type: 'adventure', sport: undefined }, 20),
      log('fiets', '2027-02-02', { type: 'adventure', sport: 'cycling' }, 40),
      log('fiets2', '2027-02-03', { type: 'adventure', sport: undefined, outdoorData: { durationMinutes: 120, distanceKm: 35, modality: 'bike_outdoor', source: 'manual' } }),
    ];
    expect(breakInTotals(logs, '2027-01-04')).toMatchObject({ km: 20, count: 1 });
  });

  it('leest de afstand ook uit cardioData en slaat logs zonder afstand over', () => {
    const l = log('c', '2027-03-01', { outdoorData: undefined, cardioData: { durationMinutes: 90, distanceKm: 7, source: 'manual' } });
    expect(breakInTotals([l, log('leeg', '2027-03-02')], '2027-01-01').km).toBe(7);
  });
});

describe('de stand van het inlopen', () => {
  const base = { goalKm: DEFAULT_BREAKIN_KM, departure: DEPARTURE };

  it('zonder datum is er nog niets vastgelegd', () => {
    const s = bootBreakInStatus({ ...base, boots: undefined, logs: [], today: '2027-01-10' });
    expect(s.kind).toBe('none');
    expect(s.line).toMatch(/datum/i);
  });

  it('is bezig tot het doel gehaald is, met weken voor vertrek', () => {
    const s = bootBreakInStatus({ ...base, boots, logs: [log('a', '2027-02-01', {}, 40)], today: '2027-02-10' });
    expect(s.kind).toBe('busy');
    expect(s.km).toBe(40);
    expect(s.weeksBeforeDeparture).toBe(29);
    expect(s.line).toContain('40');
    expect(s.line).toContain('100');
  });

  it('is af als het doel gehaald is en het minstens 6 weken voor vertrek was', () => {
    const logs = [log('a', '2027-02-01', {}, 60), log('b', '2027-03-01', {}, 45)];
    const s = bootBreakInStatus({ ...base, boots, logs, today: '2027-03-05' });
    expect(s.kind).toBe('done');
    expect(s.reachedOn).toBe('2027-03-01');
  });

  it('is te laat als de datum minder dan 6 weken voor vertrek ligt', () => {
    const s = bootBreakInStatus({ ...base, boots: { since: '2027-06-27' }, logs: [log('a', '2027-07-01', {}, 30)], today: '2027-07-05' });
    expect(s.kind).toBe('late');
    expect(s.line).toContain('Te laat voor 6 weken: loop ze zo veel mogelijk in');
  });

  it('zegt dat het te laat is als de datum nog niet vastligt maar vertrek binnen 6 weken is', () => {
    const s = bootBreakInStatus({ ...base, boots: undefined, logs: [], today: '2027-07-01' });
    expect(s.kind).toBe('none');
    expect(s.line).toContain('Te laat voor 6 weken');
  });

  it('werkt zonder vertrekdatum op alleen de kilometers', () => {
    const s = bootBreakInStatus({ goalKm: 50, departure: undefined, boots, logs: [log('a', '2027-02-01', {}, 55)], today: '2027-02-10' });
    expect(s.kind).toBe('done');
    expect(s.weeksBeforeDeparture).toBeUndefined();
  });
});

describe('de herinnering bij een lange tocht', () => {
  const tpl = (over: Partial<SessionTemplate>): SessionTemplate => ({
    id: 'tpl', name: 'x', type: 'hiking', sport: 'hiking', focus: '', durationVariants: { full: 120 }, ...over,
  } as SessionTemplate);
  const busy = bootBreakInStatus({ goalKm: 100, departure: DEPARTURE, boots, logs: [log('a', '2027-02-01', {}, 40)], today: '2027-02-10' });
  const done = bootBreakInStatus({ goalKm: 100, departure: DEPARTURE, boots, logs: [log('a', '2027-02-01', {}, 120)], today: '2027-02-10' });
  const none = bootBreakInStatus({ goalKm: 100, departure: DEPARTURE, boots: undefined, logs: [], today: '2027-02-10' });

  it('staat bij een bergtocht en een wandeling met rugzak zolang het doel niet gehaald is', () => {
    const hike = tpl({ outdoorTarget: { targetElevationM: 500, backpackWeightKg: 6 } });
    expect(bootReminderLine(hike, busy, true)).toBe('Loop je nieuwe bergschoenen in: 40 van 100 km.');
    expect(bootReminderLine(tpl({ type: 'adventure', sport: undefined }), busy, true)).toBeDefined();
  });

  it('zwijgt als het doel gehaald is, de datum ontbreekt of de herinnering uit staat', () => {
    const hike = tpl({ outdoorTarget: { targetElevationM: 500, backpackWeightKg: 6 } });
    expect(bootReminderLine(hike, done, true)).toBeUndefined();
    expect(bootReminderLine(hike, none, true)).toBeUndefined();
    expect(bootReminderLine(hike, busy, false)).toBeUndefined();
    expect(bootReminderLine(hike, undefined, true)).toBeUndefined();
  });

  it('zwijgt bij hardlopen, kracht en een wandeling zonder rugzak', () => {
    expect(bootReminderLine(tpl({ sport: 'running', outdoorTarget: { targetElevationM: 100, backpackWeightKg: 6 } }), busy, true)).toBeUndefined();
    expect(bootReminderLine(tpl({ type: 'strength', sport: undefined }), busy, true)).toBeUndefined();
    expect(bootReminderLine(tpl({}), busy, true)).toBeUndefined();
  });
});

describe('opslag in de reisplanner', () => {
  it('leest de schoenen defensief en houdt ze bij samenvoegen', () => {
    const { state } = normalizeJourneyState({ v: 1, done: {}, boots: { since: '2027-01-04', name: ' Bergschoenen ' } });
    expect(state?.boots).toEqual({ since: '2027-01-04', name: 'Bergschoenen' });
    const bad = normalizeJourneyState({ v: 1, done: {}, boots: { since: 'morgen' } });
    expect(bad.state?.boots).toBeUndefined();
    expect(bad.skipped).toBe(1);
    const merged = mergeJourneyState({ v: 1, done: {} }, { v: 1, done: {}, boots: { since: '2027-01-04' } });
    expect(merged?.boots?.since).toBe('2027-01-04');
    expect(mergeJourneyState({ v: 1, done: {}, boots: { since: '2027-02-01' } }, { v: 1, done: {}, boots: { since: '2027-01-04' } })?.boots?.since).toBe('2027-02-01');
  });
});
