import { describe, expect, it } from 'vitest';
import type { SessionLog } from '../models/training';
import type { RunDetail, RunKm } from '../models/runDetail';
import { TEST_TEMPLATE_ID } from './raceBlock';
import { LTHR_FROM_5K, lthrFromTest, recordZoneAnswer, zoneOffer } from './zoneUpdate';
import { MAX_ZONE_ANSWERS, type ZoneAnswer } from '../models/zoneAnswer';

// Nagemaakte testlopen: 5 km op het horloge, met de hartslag per kilometer.
function km(index: number, hr: number | undefined, sec = 300): RunKm {
  return { index, startM: (index - 1) * 1000, endM: index * 1000, distanceM: 1000, sec, paceSecKm: sec, ...(hr ? { hrAvg: hr } : {}) };
}

function detail(totalKm: number, minutes: number, hrs: (number | undefined)[]): RunDetail {
  const kms = hrs.map((hr, i) => km(i + 1, hr));
  return {
    version: 1, wholeKm: totalKm, wholeMinutes: minutes, builtAt: '2026-10-20T10:00:00.000Z', totalM: totalKm * 1000, movingSec: minutes * 60, pauseSec: 0, kms,
    line: { n: 2, distM: [0, totalKm * 1000], timeSec: [0, minutes * 60], paceSecKm: [300, 300], hr: [150, 170], altitudeM: [0, 0] },
    bestFive: { startM: 0, endM: 5000, startSec: 0, sec: 1500, kms },
  };
}

function test(id: string, date: string, minutes: number, hrs?: (number | undefined)[]): SessionLog {
  return {
    id, templateId: TEST_TEMPLATE_ID, type: 'cardio', completedDate: date, completedAt: `${date}T09:00:00.000Z`, variant: 'full', durationMinutes: minutes,
    cardioData: { distanceKm: 5, durationMinutes: minutes },
    ...(hrs ? { runDetail: detail(5, minutes, hrs) } : {}),
  } as SessionLog;
}

const opts = { judgments: [], ask: true };

describe('drempelhartslag uit een testloop', () => {
  it('neemt kilometer 2 tot en met 5 van de snelste 5 km, keer 0,98', () => {
    const t = test('t1', '2026-10-20', 25, [160, 172, 174, 176, 178]);
    expect(lthrFromTest(t)).toBe(Math.round(175 * LTHR_FROM_5K));
  });

  it('zonder hartslag of met te weinig kilometers geen schatting', () => {
    expect(lthrFromTest(test('t1', '2026-10-20', 25))).toBeUndefined();
    expect(lthrFromTest(test('t1', '2026-10-20', 25, [160, 172, undefined, undefined, undefined]))).toBeUndefined();
  });

  it('een kilometertabel van andere totalen (een correctie bij de bron) telt niet', () => {
    const t = test('t1', '2026-10-20', 25, [160, 172, 174, 176, 178]);
    const stale = { ...t, cardioData: { ...t.cardioData!, distanceKm: 5.4, durationMinutes: 27 } };
    expect(lthrFromTest(stale)).toBeUndefined();
  });
});

describe('zones bijwerken na een test', () => {
  const older = test('t0', '2026-09-20', 26);
  const fresh = test('t1', '2026-10-20', 25, [160, 172, 174, 176, 178]);

  it('stelt per zone het oude en het nieuwe getal voor, en de tempo\'s die meeveranderen', () => {
    const offer = zoneOffer({ logId: 't1', logs: [older, fresh], options: opts, heartRate: { lthr: 165 }, enabled: true });
    expect(offer).toBeDefined();
    expect(offer!.lthrFrom).toBe(165);
    expect(offer!.lthrTo).toBe(172);
    expect(offer!.hrRows).toHaveLength(4);
    expect(offer!.hrRows[0]).toEqual({ label: 'Zone 1', from: '109 tot 134 bpm', to: '114 tot 139 bpm' });
    expect(offer!.paceRows.length).toBeGreaterThan(0);
    expect(offer!.paceRows.map((r) => r.label)).toContain('Tempoloop');
  });

  it('nooit voor een test die niet meetelt of niet de laatste is', () => {
    expect(zoneOffer({ logId: 't1', logs: [older, fresh], options: { judgments: [{ logId: 't1', verdict: 'ignore', date: '2026-10-21' }], ask: true }, heartRate: { lthr: 165 }, enabled: true })).toBeUndefined();
    const newer = test('t2', '2026-10-30', 24.5);
    expect(zoneOffer({ logId: 't1', logs: [older, fresh, newer], options: opts, heartRate: { lthr: 165 }, enabled: true })).toBeUndefined();
  });

  it('niets als het verschil klein is, de instelling uit staat of je al antwoordde', () => {
    expect(zoneOffer({ logId: 't1', logs: [fresh], options: opts, heartRate: { lthr: 171 }, enabled: true })).toBeUndefined();
    expect(zoneOffer({ logId: 't1', logs: [fresh], options: opts, heartRate: { lthr: 160 }, enabled: false })).toBeUndefined();
    const answers: ZoneAnswer[] = [{ logId: 't1', answer: 'declined', date: '2026-10-21', lthrFrom: 160, lthrTo: 172 }];
    expect(zoneOffer({ logId: 't1', logs: [fresh], options: opts, heartRate: { lthr: 160 }, enabled: true, answers })).toBeUndefined();
  });

  it('zonder drempelhartslag: de zones van nu uit je maximale hartslag, of nog geen', () => {
    const none = zoneOffer({ logId: 't1', logs: [fresh], options: opts, heartRate: undefined, enabled: true });
    expect(none!.lthrFrom).toBeUndefined();
    expect(none!.hrRows[1].from).toBe('nog geen');
    const max = zoneOffer({ logId: 't1', logs: [fresh], options: opts, heartRate: { maxHr: 190 }, enabled: true });
    expect(max!.hrRows[0].from).toBe('95 tot 114 bpm');
  });

  it('een drempel boven je maximale hartslag stelt hij niet voor', () => {
    expect(zoneOffer({ logId: 't1', logs: [fresh], options: opts, heartRate: { maxHr: 170 }, enabled: true })).toBeUndefined();
  });

  it('het antwoord per test, de nieuwste vervangt de oude, hoogstens de grens', () => {
    const list = recordZoneAnswer(undefined, { logId: 't1', answer: 'declined', date: '2026-10-21', lthrTo: 172 });
    const again = recordZoneAnswer(list, { logId: 't1', answer: 'accepted', date: '2026-10-22', lthrTo: 172 });
    expect(again).toEqual([{ logId: 't1', answer: 'accepted', date: '2026-10-22', lthrTo: 172 }]);
    let many: ZoneAnswer[] | undefined;
    for (let i = 0; i < MAX_ZONE_ANSWERS + 5; i++) many = recordZoneAnswer(many, { logId: `t${i}`, answer: 'declined', date: '2026-10-21', lthrTo: 170 });
    expect(many).toHaveLength(MAX_ZONE_ANSWERS);
    expect(many![0].logId).toBe('t5');
  });
});
