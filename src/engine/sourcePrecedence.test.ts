import { describe, expect, it } from 'vitest';
import type { ExternalActivity } from './activityImport';
import type { SessionLog } from '../models/training';
import type { RecoveryMetric } from '../models/metrics';
import { durationsMatch, isSameMoment, momentOfActivity, momentOfLog, offeredActivities, orderBySource, sourcePrefix } from './sourcePrecedence';

// Nagemaakte activiteiten en logs.
function act(id: string, start: string, minutes: number, extra: Partial<ExternalActivity> = {}): ExternalActivity {
  return { externalId: id, source: id.startsWith('health-connect:') ? 'health-connect' : 'garmin', start, kind: 'run', durationSec: minutes * 60, treadmill: false, ...extra };
}

function log(id: string, externalId: string | undefined, start: string, minutes: number): SessionLog {
  const end = new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
  return {
    id,
    templateId: 'tpl_easy_run',
    type: 'cardio',
    completedDate: start.slice(0, 10),
    completedAt: end,
    variant: 'custom',
    durationMinutes: minutes,
    ...(externalId ? { externalId, source: externalId.startsWith('health-connect:') ? 'health-connect' : 'garmin' } : { source: 'manual' }),
  } as SessionLog;
}

describe('dezelfde activiteit uit twee bronnen', () => {
  it('kent de bron aan het begin van het id', () => {
    expect(sourcePrefix('intervals.icu:i42')).toBe('intervals.icu');
    expect(sourcePrefix('health-connect:abc')).toBe('health-connect');
    expect(sourcePrefix('zonder')).toBe('zonder');
  });

  it('ongeveer dezelfde duur: binnen vijf minuten of vijftien procent', () => {
    expect(durationsMatch(40, 43)).toBe(true);
    expect(durationsMatch(120, 136)).toBe(true);
    expect(durationsMatch(40, 52)).toBe(false);
  });

  it('zelfde start binnen vijf minuten en ongeveer dezelfde duur is dezelfde activiteit', () => {
    const a = momentOfActivity(act('intervals.icu:i1', '2026-10-20T07:30:00', 40));
    expect(isSameMoment(a, momentOfActivity(act('health-connect:x', '2026-10-20T07:33:00', 41)))).toBe(true);
    expect(isSameMoment(a, momentOfActivity(act('health-connect:x', '2026-10-20T07:40:00', 40)))).toBe(false);
    expect(isSameMoment(a, momentOfActivity(act('health-connect:x', '2026-10-20T07:31:00', 70)))).toBe(false);
  });

  it('een log zonder bron-id heeft geen moment om mee te vergelijken', () => {
    expect(momentOfLog(log('l1', undefined, '2026-10-20T07:30:00', 40))).toBeUndefined();
    const m = momentOfLog(log('l2', 'intervals.icu:i1', '2026-10-20T07:30:00', 40));
    expect(m?.minutes).toBe(40);
    expect(m?.startMs).toBe(new Date('2026-10-20T07:30:00').getTime());
  });
});

describe('wat er als voorstel komt (intervals.icu gaat voor)', () => {
  const icu = act('intervals.icu:i1', '2026-10-20T07:30:00', 40);
  const hcSame = act('health-connect:a', '2026-10-20T07:32:00', 41);
  const hcOther = act('health-connect:b', '2026-10-21T18:00:00', 60, { kind: 'hike' });

  it('een activiteit uit Health Connect die al via intervals.icu binnenkwam, valt weg', () => {
    expect(offeredActivities([icu], [hcSame, hcOther], []).map((a) => a.externalId)).toEqual(['intervals.icu:i1', 'health-connect:b']);
  });

  it('ook als intervals.icu hem alleen in de oudere lijst heeft', () => {
    expect(offeredActivities([], [hcSame], [], [icu]).map((a) => a.externalId)).toEqual([]);
  });

  it('een activiteit waarvan al een log uit een andere bron bestaat, wordt geen voorstel meer', () => {
    const fromIcu = log('l1', 'intervals.icu:i9', '2026-10-21T18:01:00', 59);
    expect(offeredActivities([], [hcOther], [fromIcu]).map((a) => a.externalId)).toEqual([]);
    // Andersom ook: eerst via Health Connect opgeslagen, later via intervals.icu binnen.
    const fromHc = log('l2', 'health-connect:a', '2026-10-20T07:32:00', 41);
    expect(offeredActivities([icu], [], [fromHc]).map((a) => a.externalId)).toEqual([]);
  });

  it('voor intervals.icu verandert er niets door een log uit een andere bron dan Health Connect', () => {
    const fromMf = log('l5', 'macrofactor:2026-10-20:benen a', '2026-10-20T07:31:00', 40);
    expect(offeredActivities([icu], [], [fromMf]).map((a) => a.externalId)).toEqual(['intervals.icu:i1']);
  });

  it('een log uit dezelfde bron laat de activiteit staan (die herkent de gewone voorstelronde aan het id)', () => {
    const own = log('l3', 'health-connect:b', '2026-10-21T18:00:00', 60);
    expect(offeredActivities([], [hcOther], [own]).map((a) => a.externalId)).toEqual(['health-connect:b']);
  });

  it('een log met de hand ingevuld telt hier niet mee', () => {
    const hand = log('l4', undefined, '2026-10-21T18:00:00', 60);
    expect(offeredActivities([], [hcOther], [hand]).map((a) => a.externalId)).toEqual(['health-connect:b']);
  });

  it('twee keer hetzelfde id uit Health Connect komt maar een keer', () => {
    expect(offeredActivities([], [hcOther, hcOther], []).length).toBe(1);
  });
});

describe('ochtendgetallen per bron', () => {
  it('Health Connect komt achter elke andere bron, verder blijft de volgorde', () => {
    const list: RecoveryMetric[] = [
      { id: 'health-connect:2026-10-20', date: '2026-10-20', restingHeartRate: 50, source: 'health-connect' },
      { id: 'intervals.icu:2026-10-20', date: '2026-10-20', restingHeartRate: 48, source: 'import' },
      { id: 'manual:2026-10-19', date: '2026-10-19', hrv: 60, source: 'manual' },
    ];
    expect(orderBySource(list).map((m) => m.id)).toEqual(['intervals.icu:2026-10-20', 'manual:2026-10-19', 'health-connect:2026-10-20']);
    // De lijst zelf blijft zoals hij was.
    expect(list[0].id).toBe('health-connect:2026-10-20');
  });
});
