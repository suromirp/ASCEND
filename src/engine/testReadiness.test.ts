import { describe, expect, it } from 'vitest';
import { NO_RUN_YET, medianStepSec, testReadiness, testReadyLine } from './testReadiness';
import { migrateStrapWorn } from '../storage/migrationsLogs';

const facts = (o: Partial<Parameters<typeof testReadiness>[0] & object> = {}) => ({ logId: 'r', date: '2026-11-16', strapSeen: true, stepSec: 1, rr: true, ...o });

describe('Klaar voor je test', () => {
  it('zonder loop met reeks één regel, en niets in de Briefing', () => {
    const r = testReadiness(undefined);
    expect(r).toEqual({ empty: NO_RUN_YET, facts: [] });
    expect(testReadyLine(r)).toBeUndefined();
  });

  it('alles in orde: drie rustige feiten en geen regel in de Briefing', () => {
    const r = testReadiness(facts());
    expect(r.facts.map((f) => f.ok)).toEqual([true, true, true]);
    expect(testReadyLine(r)).toBeUndefined();
  });

  it('de Briefing noemt alleen het eerste dat je test raakt: eerst de band, dan de opslag; de RR-reeks zwijgt', () => {
    expect(testReadyLine(testReadiness(facts({ strapSeen: false, stepSec: 4, rr: false })))).toContain('Borstband om');
    const smart = testReadiness(facts({ stepSec: 4 }));
    expect(smart.facts[1].line).toBe('Je horloge sloeg ongeveer elke 4 seconden een punt op. Zet de opslag op Elke seconde.');
    expect(testReadyLine(smart)).toContain('Elke seconde');
    expect(testReadyLine(testReadiness(facts({ rr: false })))).toBeUndefined();
  });

  it('de tijd tussen punten: de mediaan, een pauze weegt niet', () => {
    expect(medianStepSec([0, 1, 2, 3, 300, 301, 302])).toBe(1);
    expect(medianStepSec([0, 4, 8, 13, 17])).toBe(4);
    expect(medianStepSec([5])).toBeUndefined();
  });
});

describe('"Ik had hem wel om" in een back-up', () => {
  it('leest een lijst van log-id\'s, laat rommel weg en telt die', () => {
    expect(migrateStrapWorn(undefined)).toEqual({ list: undefined, skipped: 0 });
    expect(migrateStrapWorn('x')).toEqual({ list: undefined, skipped: 1 });
    expect(migrateStrapWorn(['a', '', 3, 'b', 'a'])).toEqual({ list: ['b', 'a'], skipped: 2 });
  });
});
