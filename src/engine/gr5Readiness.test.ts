import { describe, it, expect } from 'vitest';
import { changeLabel, computeGr5Readiness, THUIS_DAGEN_OP_RIJ } from './gr5Readiness';
import { estimatedHikingMinutes } from './goalRoute';
import type { GoalRequirement } from '../models/goals';
import type { SessionLog } from '../models/training';

// Nagemaakte gegevens: een GR5-dag van 20 km met 1.000 m omhoog en omlaag,
// een rugzakdoel van 14 kg en een langste etappe van zes dagen.
const TODAY = '2026-10-21';
const req = (kind: GoalRequirement['kind'], amount: number, unit: string, scope: GoalRequirement['scope']): GoalRequirement => ({
  id: `${kind}-${scope}`, kind, scope, target: { amount, unit } as GoalRequirement['target'],
});
const GR5: GoalRequirement[] = [
  req('distance', 20, 'km', 'PER_DAY'),
  req('elevationGain', 1000, 'm', 'PER_DAY'),
  req('elevationLoss', 1000, 'm', 'PER_DAY'),
  req('packWeight', 14, 'kg', 'SINGLE_EVENT'),
  req('consecutiveDays', 6, 'days', 'CONSECUTIVE_DAYS'),
];
const DAY_MINUTES = estimatedHikingMinutes(20, 1000, 1000);

let n = 0;
const hike = (date: string, minutes: number, upDown: number, packKg?: number): SessionLog => ({
  id: `l${n++}`, templateId: 'tpl_mountain_hike', type: 'hiking', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full',
  durationMinutes: minutes, source: 'manual',
  outdoorData: { durationMinutes: minutes, elevationGainM: upDown, elevationLossM: upDown, backpackWeightKg: packKg, source: 'manual' },
});

describe('Klaar voor de GR5', () => {
  it('leeg: 0%, vier meters, en niets om mee te vergelijken', () => {
    const r = computeGr5Readiness(GR5, [], TODAY)!;
    expect(r.percent).toBe(0);
    expect(r.meters.map((m) => m.key)).toEqual(['rugzak', 'langsteDag', 'hoogte', 'dagen']);
    expect(r.meters.every((m) => m.share === 0)).toBe(true);
    expect(r.change).toBeUndefined();
    expect(r.sentence).toContain('Het gemiddelde van vier dingen die de GR5 vraagt');
    expect(r.sentence).toContain('je rugzak 0 van 14 kg');
  });

  it('halverwege: het gemiddelde van de vier meters, elk gedeeld door wat de GR5 vraagt', () => {
    const logs = [hike('2026-10-10', DAY_MINUTES / 2, 500, 7), hike('2026-10-11', 120, 200)];
    const r = computeGr5Readiness(GR5, logs, TODAY)!;
    const by = Object.fromEntries(r.meters.map((m) => [m.key, m.share]));
    expect(by.rugzak).toBeCloseTo(0.5);
    expect(by.langsteDag).toBeCloseTo(0.5, 1);
    expect(by.hoogte).toBeCloseTo((0.5 + 0.5) / 2);
    expect(by.dagen).toBe(1); // twee lange dagen op rij, en thuis oefen je er twee
    expect(r.percent).toBe(Math.round(((by.rugzak + by.langsteDag + by.hoogte + by.dagen) / 4) * 100));
    expect(r.percent).toBeGreaterThan(55);
    expect(r.percent).toBeLessThan(70);
    expect(r.sentence).toContain('je rugzak 7 van 14 kg');
    expect(r.sentence).toContain('je stijging en daling 500 en 500 van 1.000 m');
    expect(r.weakest?.key).not.toBe('dagen');
    expect(r.weakestSentence).toMatch(/^Het zwakst: /);
  });

  it('klaar: 100% alleen als alle vier de meters vol zijn', () => {
    const logs = [hike('2026-10-10', DAY_MINUTES, 1000, 14), hike('2026-10-11', 150, 400, 14)];
    const r = computeGr5Readiness(GR5, logs, TODAY)!;
    expect(r.percent).toBe(100);
    expect(r.weakest).toBeUndefined();
    expect(r.weakestSentence).toBeUndefined();
  });

  it('een meter die meer dan vol is maakt een ander tekort niet goed', () => {
    const r = computeGr5Readiness(GR5, [hike('2026-10-10', DAY_MINUTES * 2, 3000, 25)], TODAY)!;
    const by = Object.fromEntries(r.meters.map((m) => [m.key, m.share]));
    expect(by.rugzak).toBe(1);
    expect(by.langsteDag).toBe(1);
    expect(by.hoogte).toBe(1);
    expect(by.dagen).toBe(0.5); // één dag van de twee
    expect(r.percent).toBe(88);
  });

  it('een gemiddelde dat op 100 zou afronden, blijft 99 zolang er iets mist', () => {
    // Alles vol, maar de rugzak net te licht: 13,9 van 14 kg.
    const logs = [hike('2026-10-10', DAY_MINUTES, 1000, 13.9), hike('2026-10-11', 120, 100, 13.9)];
    const r = computeGr5Readiness(GR5, logs, TODAY)!;
    expect(r.percent).toBe(99);
  });

  it('telt alleen de laatste acht weken: een oude tocht valt weg', () => {
    const r = computeGr5Readiness(GR5, [hike('2026-07-01', DAY_MINUTES, 1000, 14)], TODAY)!;
    expect(r.percent).toBe(0);
  });

  it('dagen achter elkaar is begrensd op wat je thuis oefent, en het scherm zegt waarom', () => {
    const r = computeGr5Readiness(GR5, [], TODAY)!;
    const dagen = r.meters.find((m) => m.key === 'dagen')!;
    expect(dagen.parts[0].need).toBe(THUIS_DAGEN_OP_RIJ);
    expect(dagen.text).toBe('0 van 2');
    expect(dagen.why).toContain('tot 6 dagen achter elkaar');
  });

  it('een eis die ontbreekt telt niet mee en de zin noemt alleen wat meetelt', () => {
    const r = computeGr5Readiness(GR5.filter((x) => x.kind === 'packWeight'), [hike('2026-10-10', 60, 0, 7)], TODAY)!;
    expect(r.meters).toHaveLength(1);
    expect(r.percent).toBe(50);
    expect(r.sentence).toBe('Dit meet één ding dat de GR5 vraagt: je rugzak 7 van 14 kg.');
    expect(computeGr5Readiness([], [], TODAY)).toBeUndefined();
  });

  it('het verschil met vier weken terug', () => {
    const r = computeGr5Readiness(GR5, [hike('2026-10-15', DAY_MINUTES, 1000, 14)], TODAY)!;
    expect(r.change).toBe(r.percent); // vier weken terug was er niets
    const later = computeGr5Readiness(GR5, [hike('2026-09-01', DAY_MINUTES / 2, 500, 7), hike('2026-10-15', DAY_MINUTES, 1000, 14)], TODAY)!;
    expect(later.change).toBeLessThan(later.percent);
    expect(changeLabel(6)).toBe('+6 in 4 weken');
    expect(changeLabel(-3)).toBe('-3 in 4 weken');
    expect(changeLabel(0)).toBe('gelijk aan 4 weken geleden');
    expect(changeLabel(undefined)).toBeUndefined();
  });
});
