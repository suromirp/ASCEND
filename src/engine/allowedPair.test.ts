import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { allowedPairs } from './allowedPair';

const { templates } = buildDefaultProgramData();
const s = (id: string, templateId: string, date: string, status: PlannedSession['status'] = 'planned'): PlannedSession => ({
  id, templateId, scheduledDate: date, weekStartDate: '2026-10-26', status, order: 0,
});
const pairs = (list: PlannedSession[]) => allowedPairs(list, templates, []);

describe('allowedPairs', () => {
  it('beenkracht op zondag en een rustige lange loop op maandag: de loop is de tweede, ook over de weekgrens', () => {
    const map = pairs([s('a', 'tpl_lower_a', '2026-11-01'), s('b', 'tpl_long_run', '2026-11-02')]);
    expect([...map.keys()]).toEqual(['b']);
    expect(map.get('b')).toMatchObject({ withId: 'a', kind: 'run-after-strength', rowNote: 'mag na beenkracht' });
    expect(map.get('b')!.sheetText).toContain('de dag na beenkracht');
  });

  it('de loop eerst en beenkracht erna: de beendag is de tweede', () => {
    const map = pairs([s('a', 'tpl_long_run', '2026-10-27'), s('b', 'tpl_lower_a', '2026-10-28')]);
    expect([...map.keys()]).toEqual(['b']);
    expect(map.get('b')).toMatchObject({ kind: 'strength-after-run', rowNote: 'mag na rustige loop' });
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

  it('beenkracht, loop, beenkracht: allebei de tweede van een paar', () => {
    const map = pairs([s('a', 'tpl_lower_a', '2026-10-27'), s('b', 'tpl_long_run', '2026-10-28'), s('c', 'tpl_lower_b', '2026-10-29')]);
    expect([...map.keys()].sort()).toEqual(['b', 'c']);
  });

  it('twee krachttrainingen met een dag ertussen zijn geen paar', () => {
    const list = [s('a', 'tpl_lower_a', '2026-10-27'), s('b', 'tpl_lower_b', '2026-10-29')];
    expect(pairs(list).size).toBe(0);
  });
});
