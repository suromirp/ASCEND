import { describe, expect, it } from 'vitest';
import type { WeightEntry } from '../models/metrics';
import type { SweatEntry, SweatPre } from '../models/sweat';
import { asksSweat, buildSweatEntry, clearSweatPre, preWeightForLog, preWeightOn, setSweatPre, sweatActivityOfTemplate, weightSuggestion } from './sweatMoments';
import { entryResultLine, isSweatLog } from './sweat';

const pre = (date: string, weightKg = 80): SweatPre => ({ date, weightKg, updatedAt: `${date}T06:00:00.000Z` });
const log = (id: string, completedDate: string) => ({ id, completedDate });

describe('sweatActivityOfTemplate', () => {
  it('volgt de regel van isSweatLog: lopen, wandelen en een tocht', () => {
    expect(sweatActivityOfTemplate({ type: 'cardio' })).toBe('run');
    expect(sweatActivityOfTemplate({ type: 'hiking' })).toBe('walk');
    expect(sweatActivityOfTemplate({ type: 'adventure' })).toBe('walk');
  });
  it('geeft kracht, herstel en fietsen niets', () => {
    expect(sweatActivityOfTemplate({ type: 'strength' })).toBeUndefined();
    expect(sweatActivityOfTemplate({ type: 'recovery' })).toBeUndefined();
    expect(sweatActivityOfTemplate({ type: 'cardio', sport: 'cycling' })).toBeUndefined();
    expect(sweatActivityOfTemplate({ type: 'adventure', sport: 'cycling' })).toBeUndefined();
  });
  it('kiest voor een template hetzelfde als voor de log ervan', () => {
    for (const type of ['cardio', 'hiking', 'adventure', 'strength', 'recovery'] as const) {
      expect(sweatActivityOfTemplate({ type }) !== undefined).toBe(isSweatLog({ type, sport: undefined, cardioData: undefined, outdoorData: undefined }));
    }
  });
});

describe('asksSweat', () => {
  it('staat standaard aan', () => {
    expect(asksSweat(undefined)).toBe(true);
    expect(asksSweat(true)).toBe(true);
    expect(asksSweat(false)).toBe(false);
  });
});

describe('preWeightForLog', () => {
  it('geeft het voorgewicht van de dag van de log', () => {
    expect(preWeightForLog([pre('2026-10-26', 79), pre('2026-10-27', 80)], [], log('l1', '2026-10-27'))).toBe(80);
  });
  it('geeft niets voor een andere dag of zonder voorgewicht', () => {
    expect(preWeightForLog([pre('2026-10-26')], [], log('l1', '2026-10-27'))).toBeUndefined();
    expect(preWeightForLog(undefined, undefined, log('l1', '2026-10-27'))).toBeUndefined();
  });
  it('geeft niets meer als de log al een meting heeft', () => {
    const e: SweatEntry = { id: 's1', logId: 'l1', date: '2026-10-27', activity: 'run', durationMinutes: 50, weightBeforeKg: 80, updatedAt: 'x' };
    expect(preWeightForLog([pre('2026-10-27')], [e], log('l1', '2026-10-27'))).toBeUndefined();
  });
  it('geeft het niet nog eens aan een tweede training van dezelfde dag', () => {
    const e: SweatEntry = { id: 's1', logId: 'l1', date: '2026-10-27', activity: 'run', durationMinutes: 50, weightBeforeKg: 80, weightAfterKg: 79, updatedAt: 'x' };
    expect(preWeightForLog([pre('2026-10-27', 80)], [e], log('l2', '2026-10-27'))).toBeUndefined();
  });
});

describe('setSweatPre', () => {
  it('bewaart er één per dag en het nieuwste vervangt het oude', () => {
    const a = setSweatPre([], pre('2026-10-27', 80), '2026-10-27');
    const b = setSweatPre(a, pre('2026-10-27', 79.6), '2026-10-27');
    expect(b).toHaveLength(1);
    expect(preWeightOn(b, '2026-10-27')?.weightKg).toBe(79.6);
  });
  it('laat een voorgewicht van meer dan twee weken oud vallen', () => {
    const list = setSweatPre([pre('2026-10-01'), pre('2026-10-20')], pre('2026-10-27'), '2026-10-27');
    expect(list.map((p) => p.date)).toEqual(['2026-10-20', '2026-10-27']);
  });
  it('bewaart geen onmogelijk gewicht', () => {
    expect(setSweatPre([], pre('2026-10-27', 5), '2026-10-27')).toEqual([]);
    expect(setSweatPre([], pre('2026-10-27', Number.NaN), '2026-10-27')).toEqual([]);
  });
  it('haalt een voorgewicht weg', () => {
    expect(clearSweatPre([pre('2026-10-26'), pre('2026-10-27')], '2026-10-27').map((p) => p.date)).toEqual(['2026-10-26']);
  });
});

describe('weightSuggestion', () => {
  const w = (date: string, kg: number, extra: Partial<WeightEntry> = {}): WeightEntry => ({ date, kg, source: 'macrofactor', ...extra });
  it('stelt een weging van vandaag of gisteren voor, de nieuwste eerst', () => {
    expect(weightSuggestion([w('2026-10-26', 80), w('2026-10-27', 79.8)], true, '2026-10-27')).toEqual({ kg: 79.8, date: '2026-10-27', source: 'macrofactor' });
    expect(weightSuggestion([w('2026-10-26', 80)], true, '2026-10-27')?.kg).toBe(80);
  });
  it('neemt het weegschaalgewicht boven het trendgewicht', () => {
    expect(weightSuggestion([w('2026-10-27', 79.8, { basis: 'scale', scaleKg: 80.4 })], true, '2026-10-27')?.kg).toBe(80.4);
  });
  it('zwijgt bij een oudere weging en als MacroFactor is uitgezet', () => {
    expect(weightSuggestion([w('2026-10-20', 80)], true, '2026-10-27')).toBeUndefined();
    expect(weightSuggestion([w('2026-10-27', 80)], false, '2026-10-27')).toBeUndefined();
    expect(weightSuggestion(undefined, undefined, '2026-10-27')).toBeUndefined();
  });
});

describe('buildSweatEntry', () => {
  const run = { id: 'l1', completedDate: '2026-10-27', durationMinutes: 60, type: 'cardio' as const, sport: undefined, cardioData: undefined, outdoorData: undefined };
  it('maakt een gewone meting aan de log en laat lege velden weg', () => {
    const e = buildSweatEntry(run, { weightBeforeKg: 80, weightAfterKg: 79.2, drankMl: undefined }, undefined, 'sweat_1', '2026-10-27T08:00:00.000Z');
    expect(e).toEqual({ id: 'sweat_1', logId: 'l1', date: '2026-10-27', activity: 'run', durationMinutes: 60, weightBeforeKg: 80, weightAfterKg: 79.2, updatedAt: '2026-10-27T08:00:00.000Z' });
    expect('drankMl' in e).toBe(false);
    expect(entryResultLine(e)).toContain('800 ml');
  });
  it('houdt het id van een bestaande meting', () => {
    expect(buildSweatEntry(run, { watchMl: 900 }, { id: 'oud' }, 'nieuw', 'nu').id).toBe('oud');
  });
  it('maakt van een log zonder eigen soort een wandeling', () => {
    expect(buildSweatEntry({ ...run, type: 'recovery' }, { watchMl: 900 }, undefined, 'x', 'nu').activity).toBe('walk');
  });
});
