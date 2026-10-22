import { describe, it, expect } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { applyPlanChangeItems } from './proposalEngine';
import { previewProposal } from './proposalPreview';
import { weatherAdvice } from './weatherSwap';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import type { WeatherHour } from '../models/weather';
import { makeForecast } from './fixtures/weatherFixture';

// The week of Monday 2026-09-28, today Wednesday 30 September: the Saturday hike is three days away.
const asOf = '2026-09-30';
const NOW = new Date(2026, 8, 30, 9, 0);
const week = '2026-09-28';
const heavy = { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'moderate', intensity: 'moderate' } as const;
const light = { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'low' } as const;
const tpl = (id: string, name: string, type: SessionTemplate['type'], stress: typeof heavy | typeof light, minutes = 60): SessionTemplate => ({ id, name, type, durationVariants: { full: minutes }, baseStressProfile: stress });
const templates = [
  tpl('hike', 'Bergtocht', 'hiking', heavy, 180),
  tpl('run', 'Easy Run', 'cardio', light, 45),
  tpl('lower', 'Benen A', 'strength', heavy, 50),
  tpl('upper', 'Bovenlichaam A', 'strength', light, 50),
  tpl('rest', 'Herstel', 'recovery', light, 20),
];
const ps = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: week, status: 'planned', order: 0, ...extra });

const THUNDER: Partial<WeatherHour> = { code: 95, precipMm: 3, windKmh: 30, gustKmh: 60 };
// Bad on the given dates between 08.00 and 20.00.
const badOn = (...dates: string[]) => (date: string, hour: number) => (dates.includes(date) && hour >= 8 && hour < 20 ? THUNDER : undefined);
const forecastFor = (...bad: string[]) => makeForecast('2026-09-28', badOn(...bad));

function inputs(overrides: Partial<AdviceInputs> & { bad?: string[]; leave?: LeavePeriod[] } = {}): AdviceInputs {
  const { bad = [], leave, ...rest } = overrides;
  return {
    logs: [], plannedSessions: [], templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic',
    respondedIds: new Set(), asOf, weather: { forecast: forecastFor(...bad), now: NOW, leave }, ...rest,
  };
}
const byId = new Map(templates.map((t) => [t.id, t]));

// Thursday Benen A, Saturday Bergtocht: Friday is too close to Thursday's heavy legs, Sunday is free.
const baseWeek = () => [ps('lower1', 'lower', '2026-10-01'), ps('hike1', 'hike', '2026-10-03')];

describe('WEATHER-SWAP', () => {
  it('proposes the next good day when the hike lands in thunder, as a move with Akkoord', () => {
    const [advice] = weatherAdvice(inputs({ plannedSessions: baseWeek(), bad: ['2026-10-03'] }), byId);
    expect(advice).toMatchObject({ id: 'weather:hike1', ruleId: 'WEATHER-SWAP', trigger: 'plan_update' });
    expect(advice.title).toBe('Zaterdag: onweer bij Bergtocht');
    expect(advice.proposal?.changes).toEqual([
      expect.objectContaining({ plannedSessionId: 'hike1', action: 'move', fromDate: '2026-10-03', toDate: '2026-10-04', generatedBy: ['engine/weatherSwap.ts', 'WEATHER-SWAP'] }),
    ]);
    expect(advice.effect).toContain('Slecht weer: onweer');
    expect(advice.effect).toContain('Voorstel: Bergtocht naar zondag');
    expect(advice.why).toMatch(/Liever niet/);
    expect(advice.why).toMatch(/Open-Meteo/);
  });

  it('never proposes a day within 48 hours of heavy legs, even with better weather there', () => {
    // Friday 2 October is dry but sits right after Thursday's Benen A.
    const [advice] = weatherAdvice(inputs({ plannedSessions: baseWeek(), bad: ['2026-10-03'] }), byId);
    const dates = [advice.proposal, ...(advice.options ?? []).map((o) => o.proposal)].flatMap((p) => p?.changes.map((c) => c.toDate) ?? []);
    expect(dates).not.toContain('2026-10-02');
    // With the legs on Monday instead, Friday is fine and, being nearer, comes first.
    const early = [ps('lower1', 'lower', '2026-09-28'), ps('hike1', 'hike', '2026-10-03')];
    const [other] = weatherAdvice(inputs({ plannedSessions: early, bad: ['2026-10-03'] }), byId);
    expect(other.proposal?.changes[0].toDate).toBe('2026-10-02');
    expect(other.options?.map((o) => o.proposal.changes[0].toDate)).toEqual(['2026-10-02', '2026-10-04', '2026-10-01']);
  });

  it('offers up to three days, the best weather first and the nearest first among equals', () => {
    const early = [ps('hike1', 'hike', '2026-10-03')];
    // Friday evening is only so-so (rain); Sunday, Thursday and Wednesday are fine.
    const rainy = makeForecast('2026-09-28', (date, h) => (date === '2026-10-03' && h >= 8 && h < 20 ? THUNDER : date === '2026-10-02' && h >= 16 && h < 23 ? { precipMm: 1 } : undefined));
    const found = weatherAdvice(inputs({ plannedSessions: early, weather: { forecast: rainy, now: NOW } }), byId);
    const dates = found[0].options!.map((o) => o.proposal.changes[0].toDate);
    expect(dates).toEqual(['2026-10-04', '2026-10-01', '2026-09-30']);
    expect(dates).not.toContain('2026-10-02');
  });

  it('shows up in "Zo ziet je week eruit" and applies as a move that is locked in place', () => {
    const planned = baseWeek();
    const [advice] = weatherAdvice(inputs({ plannedSessions: planned, bad: ['2026-10-03'] }), byId);
    const items = advice.proposal!.changes;
    const preview = previewProposal(items, planned, templates);
    expect(preview.moves).toEqual([{ name: 'Bergtocht', action: 'move', from: '2026-10-03', to: '2026-10-04' }]);
    const applied = applyPlanChangeItems(items, planned, undefined, { by: 'proposal', at: 'now' });
    expect(applied.sessions.find((s) => s.id === 'hike1')).toMatchObject({ scheduledDate: '2026-10-04', status: 'moved', movedFromDate: '2026-10-03', lock: { by: 'proposal' } });
  });

  it('says nothing when the weather is fine, only a bit off, or the other days are bad too', () => {
    expect(weatherAdvice(inputs({ plannedSessions: baseWeek() }), byId)).toEqual([]);
    const windy = makeForecast('2026-09-28', (date, h) => (date === '2026-10-03' && h >= 8 && h < 20 ? { windKmh: 45 } : undefined));
    expect(weatherAdvice(inputs({ plannedSessions: baseWeek(), weather: { forecast: windy, now: NOW } }), byId)).toEqual([]);
    const all = ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
    expect(weatherAdvice(inputs({ plannedSessions: baseWeek(), bad: all }), byId)).toEqual([]);
  });

  it('only looks at trainings that happen outside', () => {
    const planned = [ps('lower1', 'lower', '2026-10-01'), ps('rest1', 'rest', '2026-10-02')];
    expect(weatherAdvice(inputs({ plannedSessions: planned, bad: ['2026-10-01', '2026-10-02'] }), byId)).toEqual([]);
  });

  it('leaves done, skipped, past and race sessions alone', () => {
    const race: SessionTemplate = tpl('tpl_race', 'Wedstrijd', 'cardio', heavy, 60);
    const done: SessionLog = { id: 'l', plannedSessionId: 'hike1', templateId: 'hike', type: 'hiking', completedDate: '2026-10-03', completedAt: '2026-10-03T12:00:00.000Z', variant: 'full', durationMinutes: 170, source: 'manual' };
    const planned = baseWeek();
    expect(weatherAdvice(inputs({ plannedSessions: planned, logs: [done], bad: ['2026-10-03'] }), byId)).toEqual([]);
    expect(weatherAdvice(inputs({ plannedSessions: [{ ...planned[1], status: 'skipped' }], bad: ['2026-10-03'] }), byId)).toEqual([]);
    expect(weatherAdvice(inputs({ plannedSessions: [ps('h', 'hike', '2026-09-28')], bad: ['2026-09-28'] }), byId)).toEqual([]);
    expect(weatherAdvice(inputs({ templates: [...templates, race], plannedSessions: [ps('r', 'tpl_race', '2026-10-03')], bad: ['2026-10-03'] }), new Map([...byId, ['tpl_race', race]]))).toEqual([]);
  });

  it('does not ask again after Liever niet, for that training only', () => {
    const planned = [...baseWeek(), ps('run1', 'run', '2026-10-02')];
    const both = inputs({ plannedSessions: planned, bad: ['2026-10-02', '2026-10-03'] });
    expect(weatherAdvice(both, byId).map((a) => a.id)).toEqual(['weather:run1', 'weather:hike1']);
    expect(weatherAdvice({ ...both, respondedIds: new Set(['weather:hike1']) }, byId).map((a) => a.id)).toEqual(['weather:run1']);
  });

  it('never sends two proposals to the same day', () => {
    // Friday run and Saturday hike are both in bad weather; each gets its own day.
    const planned = [ps('run1', 'run', '2026-10-02'), ps('hike1', 'hike', '2026-10-03')];
    const found = weatherAdvice(inputs({ plannedSessions: planned, bad: ['2026-10-02', '2026-10-03'] }), byId);
    expect(found).toHaveLength(2);
    const targets = (a: (typeof found)[number]) => new Set((a.options ?? [{ proposal: a.proposal! }]).map((o) => o.proposal.changes[0].toDate));
    expect(targets(found[1]).has(found[0].proposal!.changes[0].toDate)).toBe(false);
  });

  it('keeps to the days of the same week, from today on', () => {
    const found = weatherAdvice(inputs({ plannedSessions: [ps('h', 'hike', '2026-10-03')], bad: ['2026-10-03'] }), byId);
    const dates = (found[0].options ?? [{ proposal: found[0].proposal! }]).map((o) => o.proposal.changes[0].toDate!);
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) expect(d >= asOf && d <= '2026-10-04').toBe(true);
    // A training in next week's bad weather is not touched from here.
    expect(weatherAdvice(inputs({ plannedSessions: [ps('n', 'hike', '2026-10-04', { weekStartDate: '2026-10-05' })], bad: ['2026-10-04'] }), byId)).toEqual([]);
  });

  it('waits until the day is within three days: further ahead the forecast changes too often', () => {
    const planned = [ps('h', 'hike', '2026-10-04')]; // four days from Wednesday
    expect(weatherAdvice(inputs({ plannedSessions: planned, bad: ['2026-10-04'] }), byId)).toEqual([]);
    // The day after, it is three days away and the proposal comes.
    const tomorrow = inputs({ plannedSessions: planned, bad: ['2026-10-04'], asOf: '2026-10-01', weather: { forecast: forecastFor('2026-10-04'), now: new Date(2026, 9, 1, 9) } });
    expect(weatherAdvice(tomorrow, byId)).toHaveLength(1);
  });

  it('stays off a holiday day', () => {
    const holiday: LeavePeriod[] = [{ id: 'p1', kind: 'no_training', startDate: '2026-10-04', endDate: '2026-10-04' }];
    const [advice] = weatherAdvice(inputs({ plannedSessions: baseWeek(), bad: ['2026-10-03'], leave: holiday }), byId);
    // Friday is too close to the legs and Sunday is a holiday, and the days before need 72 hours
    // after a hike's legs too: what is left is a swap with Thursday's Benen A.
    expect(advice.proposal?.changes).toEqual([
      expect.objectContaining({ plannedSessionId: 'hike1', toDate: '2026-10-01' }),
      expect.objectContaining({ plannedSessionId: 'lower1', toDate: '2026-10-03' }),
    ]);
    const all = [advice.proposal, ...(advice.options ?? []).map((o) => o.proposal)].flatMap((p) => p!.changes.map((c) => c.toDate));
    expect(all).not.toContain('2026-10-04');
  });

  it('keeps to the time you have on a day', () => {
    const budget: AdviceInputs['dailyTimeBudget'] = { sun: { preferredMinutes: 60, softFlexMinutes: 0, hardMaximumMinutes: 90 } };
    // Sunday allows 90 minutes at most and the hike takes 180: Sunday is out.
    const [advice] = weatherAdvice(inputs({ plannedSessions: baseWeek(), bad: ['2026-10-03'], dailyTimeBudget: budget }), byId);
    expect(advice.proposal?.changes[0]).toMatchObject({ plannedSessionId: 'hike1' });
    expect(advice.proposal?.changes[0].toDate).not.toBe('2026-10-04');
    // Without that limit Sunday is the first choice.
    expect(weatherAdvice(inputs({ plannedSessions: baseWeek(), bad: ['2026-10-03'] }), byId)[0].proposal?.changes[0].toDate).toBe('2026-10-04');
  });

  it('swaps with a strength training when no free day is left', () => {
    // Every other day has something; Sunday's Bovenlichaam A is the only one that does not mind the weather.
    const planned = [
      ps('rest1', 'rest', '2026-09-28'), ps('r1', 'run', '2026-09-29'), ps('r2', 'run', '2026-09-30'), ps('r3', 'run', '2026-10-01'), ps('r4', 'run', '2026-10-02'),
      ps('hike1', 'hike', '2026-10-03'), ps('upper1', 'upper', '2026-10-04'),
    ];
    const [advice] = weatherAdvice(inputs({ plannedSessions: planned, bad: ['2026-10-03'] }), byId);
    expect(advice.proposal?.changes).toEqual([
      expect.objectContaining({ plannedSessionId: 'hike1', action: 'move', fromDate: '2026-10-03', toDate: '2026-10-04' }),
      expect.objectContaining({ plannedSessionId: 'upper1', action: 'move', fromDate: '2026-10-04', toDate: '2026-10-03' }),
    ]);
    expect(advice.effect).toContain('Bergtocht naar zondag 4 oktober en Bovenlichaam A naar zaterdag 3 oktober');
    const applied = applyPlanChangeItems(advice.proposal!.changes, planned);
    expect(applied.sessions.find((s) => s.id === 'hike1')?.scheduledDate).toBe('2026-10-04');
    expect(applied.sessions.find((s) => s.id === 'upper1')?.scheduledDate).toBe('2026-10-03');
  });

  it('does not move a training you pinned yourself, and does not swap one away either', () => {
    const pinned = { by: 'user', at: '2026-09-29T10:00:00.000Z' } as const;
    // Your own pinned hike stays where it is, however bad the weather.
    expect(weatherAdvice(inputs({ plannedSessions: [ps('hike1', 'hike', '2026-10-03', { lock: pinned }), ps('lower1', 'lower', '2026-10-01')], bad: ['2026-10-03'] }), byId)).toEqual([]);
    expect(weatherAdvice(inputs({ plannedSessions: [ps('hike1', 'hike', '2026-10-03', { status: 'moved' })], bad: ['2026-10-03'] }), byId)).toEqual([]);
    // The only strength training that could swap is pinned too: no swap.
    const full = [
      ps('rest1', 'rest', '2026-09-28'), ps('r1', 'run', '2026-09-29'), ps('r2', 'run', '2026-09-30'), ps('r3', 'run', '2026-10-01'), ps('r4', 'run', '2026-10-02'),
      ps('hike1', 'hike', '2026-10-03'), ps('upper1', 'upper', '2026-10-04', { lock: pinned }),
    ];
    expect(weatherAdvice(inputs({ plannedSessions: full, bad: ['2026-10-03'] }), byId)).toEqual([]);
    // Without the pin the swap is there.
    expect(weatherAdvice(inputs({ plannedSessions: full.map((x) => ({ ...x, lock: undefined })), bad: ['2026-10-03'] }), byId)).toHaveLength(1);
  });

  it('does not swap two outdoor trainings with each other', () => {
    const planned = [
      ps('rest1', 'rest', '2026-09-28'), ps('r1', 'run', '2026-09-29'), ps('r2', 'run', '2026-09-30'), ps('r3', 'run', '2026-10-01'), ps('r4', 'run', '2026-10-02'),
      ps('hike1', 'hike', '2026-10-03'), ps('r5', 'run', '2026-10-04'),
    ];
    expect(weatherAdvice(inputs({ plannedSessions: planned, bad: ['2026-10-03'] }), byId)).toEqual([]);
  });

  it('says nothing without a forecast, when ill, or beyond the forecast', () => {
    expect(weatherAdvice(inputs({ plannedSessions: baseWeek(), bad: ['2026-10-03'], weather: undefined }), byId)).toEqual([]);
    const ill = [{ id: 'i', kind: 'fever', startDate: '2026-09-28' }] as unknown as AdviceInputs['illnessEpisodes'];
    expect(weatherAdvice(inputs({ plannedSessions: baseWeek(), bad: ['2026-10-03'], illnessEpisodes: ill }), byId)).toEqual([]);
    const short = makeForecast('2026-09-28', badOn('2026-10-03'), { days: 3 });
    expect(weatherAdvice(inputs({ plannedSessions: baseWeek(), weather: { forecast: short, now: NOW } }), byId)).toEqual([]);
  });

  it('comes through computeAdvice next to the other advice', () => {
    const all = computeAdvice(inputs({ plannedSessions: baseWeek(), bad: ['2026-10-03'] }));
    expect(all.find((a) => a.ruleId === 'WEATHER-SWAP')?.id).toBe('weather:hike1');
    expect(computeAdvice(inputs({ plannedSessions: baseWeek(), bad: ['2026-10-03'], respondedIds: new Set(['weather:hike1']) })).some((a) => a.ruleId === 'WEATHER-SWAP')).toBe(false);
  });
});
