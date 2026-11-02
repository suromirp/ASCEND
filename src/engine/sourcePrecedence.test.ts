import { describe, expect, it } from 'vitest';
import type { ExternalActivity } from './activityImport';
import type { SessionLog } from '../models/training';
import type { RecoveryMetric } from '../models/metrics';
import { durationsMatch, isSameMoment, momentOfActivity, momentOfLog, offeredActivities, orderBySource, sourcePrefix } from './sourcePrecedence';

// Nagemaakte activiteiten en logs.
function act(id: string, start: string, minutes: number, extra: Partial<ExternalActivity> = {}): ExternalActivity {
  return { externalId: id, source: id.startsWith('health-connect:') ? 'health-connect' : 'garmin', start, kind: 'run', durationSec: minutes * 60, treadmill: false, ...extra };
}

function log(id: string, externalId: string | undefined, start: string, minutes: number, type: SessionLog['type'] = 'cardio'): SessionLog {
  const end = new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
  return {
    id,
    templateId: 'tpl_easy_run',
    type,
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

  it('ongeveer dezelfde duur: bereiken die elkaar raken, met vijf minuten of tien procent marge', () => {
    const r = (minMinutes: number, maxMinutes = minMinutes) => ({ minMinutes, maxMinutes });
    expect(durationsMatch(r(40), r(43))).toBe(true);
    expect(durationsMatch(r(120), r(131))).toBe(true);
    expect(durationsMatch(r(40), r(52))).toBe(false);
    // Bewegingstijd 240, totaal 300: een duur van start tot eind van 300 past erin.
    expect(durationsMatch(r(240, 300), r(300))).toBe(true);
    expect(durationsMatch(r(240), r(300))).toBe(false);
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
    expect([m?.minMinutes, m?.maxMinutes, m?.strength]).toEqual([40, 60, false]);
    expect(momentOfLog(log('l3', 'health-connect:x', '2026-10-20T07:30:00', 40))?.maxMinutes).toBe(40);
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

  it('een tocht met een uur pauze: bewegingstijd en totale tijd van intervals.icu, start tot eind van Health Connect', () => {
    // Vier uur lopen, een uur stil: intervals.icu zegt 240 minuten in beweging en 300 in totaal.
    const tocht = act('intervals.icu:t1', '2026-10-25T09:00:00', 240, { kind: 'hike', elapsedSec: 300 * 60 });
    const hcTocht = act('health-connect:t', '2026-10-25T09:01:00', 300, { kind: 'hike' });
    expect(offeredActivities([tocht], [hcTocht], []).map((a) => a.externalId)).toEqual(['intervals.icu:t1']);
    // Andersom: eerst via Health Connect opgeslagen (300 minuten), daarna komt dezelfde via intervals.icu.
    const hcLog = log('l6', 'health-connect:t', '2026-10-25T09:01:00', 300);
    expect(offeredActivities([tocht], [], [hcLog]).map((a) => a.externalId)).toEqual([]);
    // Zonder de totale tijd zou het twee tochten lijken.
    const zonder = act('intervals.icu:t2', '2026-10-25T09:00:00', 240, { kind: 'hike' });
    expect(offeredActivities([zonder], [hcTocht], []).map((a) => a.externalId)).toEqual(['intervals.icu:t2', 'health-connect:t']);
  });

  it('een log uit intervals.icu kent alleen de bewegingstijd: een duur tot anderhalf keer past erbij', () => {
    // 200 minuten in beweging opgeslagen; Health Connect zegt 290 minuten van start tot eind.
    const icuLog = log('l10', 'intervals.icu:t9', '2026-10-26T09:00:00', 200);
    const hcLang = act('health-connect:l', '2026-10-26T09:02:00', 290, { kind: 'hike' });
    expect(offeredActivities([], [hcLang], [icuLog]).map((a) => a.externalId)).toEqual([]);
    // Ruim meer dan anderhalf keer (plus de marge) is een andere training.
    const hcTeLang = act('health-connect:m', '2026-10-26T09:02:00', 340, { kind: 'hike' });
    expect(offeredActivities([], [hcTeLang], [icuLog]).map((a) => a.externalId)).toEqual(['health-connect:m']);
    // Een log uit een andere bron krijgt die ruimte niet.
    const otherLog = log('l11', 'garmin:t9', '2026-10-26T09:00:00', 200);
    expect(offeredActivities([], [hcLang], [otherLog]).map((a) => a.externalId)).toEqual(['health-connect:l']);
  });

  it('kracht en cardio zijn nooit dezelfde training', () => {
    const kracht = log('l7', 'intervals.icu:k1', '2026-10-21T18:00:00', 60, 'strength');
    expect(offeredActivities([], [hcOther], [kracht]).map((a) => a.externalId)).toEqual(['health-connect:b']);
    const hcKracht = act('health-connect:k', '2026-10-21T18:00:00', 60, { kind: 'strength' });
    expect(offeredActivities([], [hcKracht], [kracht]).map((a) => a.externalId)).toEqual([]);
    expect(offeredActivities([act('intervals.icu:r', '2026-10-21T18:00:00', 60)], [hcKracht], []).map((a) => a.externalId)).toEqual(['intervals.icu:r', 'health-connect:k']);
  });

  it('een log uit MacroFactor zonder eigen tijd (12:00) telt niet als moment', () => {
    const geschat = log('l8', 'macrofactor:2026-10-22:benen a', '2026-10-22T12:00:00', 60, 'strength');
    expect(momentOfLog(geschat)).toBeUndefined();
    const hcMiddag = act('health-connect:m', '2026-10-22T12:02:00', 60, { kind: 'strength' });
    expect(offeredActivities([], [hcMiddag], [geschat]).map((a) => a.externalId)).toEqual(['health-connect:m']);
    // Met een echte tijd wel.
    const echt = log('l9', 'macrofactor:2026-10-22:benen b', '2026-10-22T18:00:00', 60, 'strength');
    expect(momentOfLog(echt)).toBeDefined();
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
