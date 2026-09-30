import { describe, it, expect } from 'vitest';
import { extractEvidenceFromLog } from './capability';
import { computeDemand } from './demand';
import { computeCapacity } from './capacity';
import { logSport, isIndoorLog } from './sports';
import { inferCapabilityKeysForTemplate } from './sessionContribution';
import type { SessionLog, SessionTemplate } from '../models/training';

const ride = (id: string, modality: 'bike_outdoor' | 'bike_indoor', extra: Partial<NonNullable<SessionLog['cardioData']>> = {}): SessionLog => ({
  id, templateId: 'tpl_bike', type: 'cardio', completedDate: '2026-09-27', completedAt: '2026-09-27T10:00:00.000Z', variant: 'full', durationMinutes: 150, source: 'manual',
  cardioData: { durationMinutes: 150, distanceKm: 60, elevationGainM: 800, modality, source: 'manual', ...extra },
});

describe('cycling transfer (Fase 4)', () => {
  it('recognises a ride by its modality, also on older logs without a sport field', () => {
    expect(logSport(ride('r', 'bike_outdoor'))).toBe('cycling');
    expect(isIndoorLog(ride('r', 'bike_indoor'))).toBe(true);
    expect(isIndoorLog(ride('r', 'bike_outdoor'))).toBe(false);
  });

  it('an outdoor ride: aerobic fully, own cycling keys in km, hiking climbing at half as proxy — never time on feet, descent or pack', () => {
    const ev = extractEvidenceFromLog(ride('r', 'bike_outdoor', { elevationGainM: 800 }));
    const byKey = Object.fromEntries(ev.map((e) => [e.key.discipline ? `${e.key.dimension}:${e.key.discipline}` : e.key.dimension, e]));
    expect(byKey.aerobic_engine.measured).toEqual({ amount: 150, unit: 'min' });
    expect(byKey['endurance_duration:cycling'].measured).toEqual({ amount: 60, unit: 'km' });
    expect(byKey['ascent_capacity:cycling'].measured.amount).toBe(800);
    expect(byKey.ascent_capacity).toMatchObject({ measured: { amount: 400, unit: 'm_elevation_gain' }, evidenceType: 'proxy' });
    expect(Object.keys(byKey).some((k) => k.includes('hiking') || k.includes('running'))).toBe(false);
    expect(byKey.descent_tolerance).toBeUndefined();
    expect(byKey.load_carriage).toBeUndefined();
  });

  it('an indoor ride gives no climbing credit at all', () => {
    const ev = extractEvidenceFromLog(ride('r', 'bike_indoor', { elevationGainM: 500 }));
    expect(ev.some((e) => e.key.dimension === 'ascent_capacity')).toBe(false);
    expect(computeCapacity([ride('r', 'bike_indoor', { elevationGainM: 500 })], 28, '2026-09-29').climbing).toBe(0);
  });

  it('readiness: outdoor ride climbing at half, and bike kilometres are not time on feet', () => {
    const cap = computeCapacity([ride('r', 'bike_outdoor', { elevationGainM: 1000 })], 28, '2026-09-29');
    expect(cap.climbing).toBe(50); // 500 of the 1000 D+ reference
    expect(cap.endurance).toBe(0);
  });

  it('a cycling goal climbs on the bike and asks no descent or rucksack', () => {
    const demand = computeDemand([
      { id: 'd', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 120, unit: 'km' }, discipline: 'cycling' },
      { id: 'g', kind: 'elevationGain', scope: 'SINGLE_EVENT', target: { amount: 1500, unit: 'm_elevation_gain' } },
      { id: 'l', kind: 'elevationLoss', scope: 'SINGLE_EVENT', target: { amount: 1500, unit: 'm_elevation_loss' } },
      { id: 'p', kind: 'packWeight', scope: 'SINGLE_EVENT', target: { amount: 6, unit: 'kg' } },
    ]);
    expect(demand.map((d) => (d.key.discipline ? `${d.key.dimension}:${d.key.discipline}` : d.key.dimension)).sort()).toEqual([
      'ascent_capacity:cycling', 'endurance_duration:cycling', 'mechanical_tolerance:cycling',
    ]);
    expect(demand.find((d) => d.key.dimension === 'endurance_duration')?.demand).toEqual({ amount: 120, unit: 'km' });
  });

  it('a cycling template contributes to cycling keys and hiking climbing, not to running', () => {
    const tpl: SessionTemplate = { id: 'tpl_bike', name: 'Fietstocht', type: 'cardio', sport: 'cycling', durationVariants: { full: 90 } };
    const keys = inferCapabilityKeysForTemplate(tpl);
    expect(keys).toContainEqual({ dimension: 'endurance_duration', discipline: 'cycling' });
    expect(keys).toContainEqual({ dimension: 'ascent_capacity' });
    expect(keys.some((k) => k.discipline === 'running')).toBe(false);
  });
});

describe('weeklyPatternTemplates / fixedFrequencySports', () => {
  it('drops sports that are off and lists only enabled sports with a number per week', async () => {
    const { weeklyPatternTemplates, fixedFrequencySports } = await import('./sports');
    const run: SessionTemplate = { id: 'run', name: 'Easy Run', type: 'cardio', durationVariants: { full: 30 }, defaultDayOfWeek: 2 };
    const bike: SessionTemplate = { id: 'tpl_bike', name: 'Fietstocht', type: 'cardio', sport: 'cycling', durationVariants: { full: 90 } };
    const on = { running: true, hiking: true, cycling: true };
    expect(weeklyPatternTemplates([run, bike], { enabledSports: on }).map((t) => t.id)).toEqual(['run']);
    expect(weeklyPatternTemplates([run, bike], { enabledSports: { ...on, running: false } })).toEqual([]);
    expect(fixedFrequencySports({ enabledSports: { ...on, hiking: false }, sportFrequency: { cycling: 2, hiking: 1, running: undefined } })).toEqual(['cycling']);
  });
});
