import { describe, it, expect, afterEach } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { allowedPairs } from './allowedPair';
import { setLongRunThenLegs } from './scheduler';

const { templates } = buildDefaultProgramData();
const s = (id: string, templateId: string, date: string, status: PlannedSession['status'] = 'planned'): PlannedSession => ({
  id, templateId, scheduledDate: date, weekStartDate: '2026-10-26', status, order: 0,
});
const pairs = (list: PlannedSession[]) => allowedPairs(list, templates, []);

describe('allowedPairs', () => {
  afterEach(() => setLongRunThenLegs(false));

  // Tot 2 november 2026 mochten de lange duurloop en beenkracht in elke volgorde op twee dagen achter elkaar.
  // Sinds docs/beslissingen/2026-11-02-48-uur-lange-duurloop.md is het 48 uur, en alleen met de instelling
  // Beenkracht de dag na de lange duurloop mag kracht de dag na de lange loop. Andersom nooit.
  it('standaard geen toegestaan paar meer, in geen van beide volgordes', () => {
    expect(pairs([s('a', 'tpl_lower_a', '2026-11-01'), s('b', 'tpl_long_run', '2026-11-02')]).size).toBe(0);
    expect(pairs([s('a', 'tpl_long_run', '2026-10-27'), s('b', 'tpl_lower_a', '2026-10-28')]).size).toBe(0);
  });

  it('met de instelling: de loop eerst en beenkracht erna, de beendag is de tweede, ook over de weekgrens', () => {
    setLongRunThenLegs(true);
    const map = pairs([s('a', 'tpl_long_run', '2026-11-01'), s('b', 'tpl_lower_a', '2026-11-02')]);
    expect([...map.keys()]).toEqual(['b']);
    expect(map.get('b')).toMatchObject({ withId: 'a', kind: 'strength-after-run', rowNote: 'mag na rustige loop' });
  });

  it('met de instelling: beenkracht eerst en dan de lange loop blijft geen paar', () => {
    setLongRunThenLegs(true);
    expect(pairs([s('a', 'tpl_lower_a', '2026-11-01'), s('b', 'tpl_long_run', '2026-11-02')]).size).toBe(0);
  });

  it('met de instelling: geen paar na het weekendblok, dat zouden drie zware beendagen op rij zijn', () => {
    setLongRunThenLegs(true);
    expect(pairs([s('h', 'tpl_hill_intervals', '2026-10-31'), s('a', 'tpl_long_run', '2026-11-01'), s('b', 'tpl_lower_a', '2026-11-02')]).size).toBe(0);
  });

  it('niet bij een harde loop, een test of twee krachttrainingen', () => {
    expect(pairs([s('a', 'tpl_lower_a', '2026-10-27'), s('b', 'tpl_tempo_run', '2026-10-28')]).size).toBe(0);
    expect(pairs([s('a', 'tpl_lower_a', '2026-10-27'), s('b', 'tpl_test_run', '2026-10-28')]).size).toBe(0);
    expect(pairs([s('a', 'tpl_lower_a', '2026-10-27'), s('b', 'tpl_lower_b', '2026-10-28')]).size).toBe(0);
  });

  it('niet bij een bergtocht, een dag ertussen, dezelfde dag of een overgeslagen training', () => {
    expect(pairs([s('a', 'tpl_mountain_hike', '2026-10-27'), s('b', 'tpl_lower_a', '2026-10-28')]).size).toBe(0);
    expect(pairs([s('a', 'tpl_lower_a', '2026-10-27'), s('b', 'tpl_long_run', '2026-10-29')]).size).toBe(0);
    expect(pairs([s('a', 'tpl_lower_a', '2026-10-27'), s('b', 'tpl_long_run', '2026-10-27')]).size).toBe(0);
    expect(pairs([s('a', 'tpl_lower_a', '2026-10-27', 'skipped'), s('b', 'tpl_long_run', '2026-10-28')]).size).toBe(0);
  });

  it('beenkracht, loop, beenkracht: ook met de instelling geen paar, de loop staat te dicht na de eerste beendag', () => {
    setLongRunThenLegs(true);
    expect(pairs([s('a', 'tpl_lower_a', '2026-10-27'), s('b', 'tpl_long_run', '2026-10-28'), s('c', 'tpl_lower_b', '2026-10-29')]).size).toBe(0);
  });

  it('twee krachttrainingen met een dag ertussen zijn geen paar', () => {
    const list = [s('a', 'tpl_lower_a', '2026-10-27'), s('b', 'tpl_lower_b', '2026-10-29')];
    expect(pairs(list).size).toBe(0);
  });
});
