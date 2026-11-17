import { describe, expect, it } from 'vitest';
import type { SessionLog } from '../models/training';
import type { RunDetail, RunKm } from '../models/runDetail';
import { TEST_TEMPLATE_ID } from './raceBlock';
import { recordStrapWorn, recordZoneAnswer, zoneNotice, zoneOffer } from './zoneUpdate';
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

function test(id: string, date: string, minutes: number, hrs?: (number | undefined)[], strap = true): SessionLog {
  return {
    id, templateId: TEST_TEMPLATE_ID, type: 'cardio', completedDate: date, completedAt: `${date}T09:00:00.000Z`, variant: 'full', durationMinutes: minutes,
    cardioData: { distanceKm: 5, durationMinutes: minutes },
    ...(hrs ? { runDetail: detail(5, minutes, hrs) } : {}),
    ...(strap ? { detail: { quality: { chestStrapSeen: true } } } : {}),
  } as unknown as SessionLog;
}

const opts = { judgments: [], ask: true };

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

  it('een antwoord geldt voor het getal: een andere stand van de factor geeft hoogstens een nieuw voorstel', () => {
    const answers: ZoneAnswer[] = [{ logId: 't1', answer: 'accepted', date: '2026-10-21', lthrFrom: 160, lthrTo: 172 }];
    expect(zoneOffer({ logId: 't1', logs: [fresh], options: opts, heartRate: { lthr: 172 }, enabled: true, answers })).toBeUndefined();
    const friel = zoneOffer({ logId: 't1', logs: [fresh], options: opts, heartRate: { lthr: 172 }, enabled: true, answers, factor: 'friel' });
    expect(friel!.lthrTo).toBe(175);
    expect(friel!.basis).toBe('Gemeten met je borstband, over kilometer 2 tot en met 5 van je test, want de reeks van het horloge ontbrak.');
    expect([friel!.low, friel!.high]).toEqual([170, 180]);
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

describe('drie tests samen in het voorstel', () => {
  // Kilometer 2 tot en met 5 op `hr`: keer 0,98 geeft de schatting.
  const at = (id: string, date: string, hr: number, strap = true) => test(id, date, 25, [150, hr, hr, hr, hr], strap);
  const a = at('a', '2026-06-01', 178); // 174
  const b = at('b', '2026-08-01', 181); // 177
  const c = at('c', '2026-10-01', 180); // 176
  const today = '2026-11-17';

  it('het voorstel noemt de tests en het midden', () => {
    const offer = zoneOffer({ logId: 'c', logs: [a, b, c], options: opts, heartRate: { lthr: 170 }, enabled: true, today });
    expect(offer!.lthrTo).toBe(176);
    expect(offer!.tests).toBe('Je laatste drie tests: 174, 177 en 176. Het midden is 176.');
  });

  it('met terugwerkende kracht: een test die je al beantwoordde met één getal krijgt het midden als nieuw voorstel', () => {
    const answers: ZoneAnswer[] = [{ logId: 'c', answer: 'accepted', date: '2026-10-02', lthrFrom: 168, lthrTo: 172 }];
    const offer = zoneOffer({ logId: 'c', logs: [a, b, c], options: opts, heartRate: { lthr: 172 }, enabled: true, answers, today });
    expect(offer!.lthrFrom).toBe(172);
    expect(offer!.lthrTo).toBe(176);
    // Minder dan 3 slagen van wat er staat: niets.
    expect(zoneOffer({ logId: 'c', logs: [a, b, c], options: opts, heartRate: { lthr: 174 }, enabled: true, today })).toBeUndefined();
  });

  it('een test die Telt niet mee kreeg, telt ook niet voor je drempel', () => {
    const judged = { judgments: [{ logId: 'b', verdict: 'ignore' as const, date: '2026-08-02' }], ask: true };
    const offer = zoneOffer({ logId: 'c', logs: [a, b, c], options: judged, heartRate: { lthr: 170 }, enabled: true, today });
    expect(offer!.tests).toBe('Je laatste twee tests: 174 en 176. Het gemiddelde is 175.');
  });

  it('Liever niet en daarna een nieuwe test: de nieuwe krijgt een voorstel, de afgewezen test telt mee', () => {
    const answers: ZoneAnswer[] = [{ logId: 'c', answer: 'declined', date: '2026-10-02', lthrFrom: 170, lthrTo: 176 }];
    expect(zoneOffer({ logId: 'c', logs: [a, b, c], options: opts, heartRate: { lthr: 170 }, enabled: true, answers, today })).toBeUndefined();
    const d = at('d', '2026-11-10', 184); // 180
    const offer = zoneOffer({ logId: 'd', logs: [a, b, c, d], options: opts, heartRate: { lthr: 170 }, enabled: true, answers, today });
    expect(offer!.tests).toBe('Je laatste drie tests: 177, 176 en 180. Het midden is 177.');
  });

  it('een test zonder band telt niet; de laatste test zegt waarom en vraagt het als de band er meestal was', () => {
    const wrist = at('d', '2026-11-10', 190, false);
    expect(zoneOffer({ logId: 'd', logs: [a, b, c, wrist], options: opts, heartRate: { lthr: 170 }, enabled: true, today })).toBeUndefined();
    const notice = zoneNotice({ logId: 'd', logs: [a, b, c, wrist], options: opts, heartRate: { lthr: 176 }, enabled: true, today });
    expect(notice!.line).toBe("Bij deze test zag ASCEND geen borstband. Je tempo's tellen. Je drempel blijft 176.");
    expect(notice!.askStrap).toBe(true);
    // Na "Ik had hem wel om" telt hij: midden van 177, 176 en 186.
    const worn = recordStrapWorn(undefined, 'd');
    const offer = zoneOffer({ logId: 'd', logs: [a, b, c, wrist], options: opts, heartRate: { lthr: 170 }, enabled: true, today, strapWorn: worn });
    expect(offer!.lthrTo).toBe(177);
    expect(zoneNotice({ logId: 'd', logs: [a, b, c, wrist], options: opts, heartRate: { lthr: 176 }, enabled: true, today, strapWorn: worn })).toBeUndefined();
  });

  it('geen vraag als de band er bij je lopen meestal niet was', () => {
    const logs = [at('a', '2026-06-01', 178, false), at('b', '2026-08-01', 181, false), at('d', '2026-11-10', 190, false)];
    const notice = zoneNotice({ logId: 'd', logs, options: opts, heartRate: { lthr: 176 }, enabled: true, today });
    expect(notice!.askStrap).toBe(false);
  });
});
