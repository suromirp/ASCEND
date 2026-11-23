// I-14 Eén plan, één stem per log (docs/visie/Ontwerp Eén plan.md, invariant 5). Testdata is nagemaakt.
import { describe, it, expect } from 'vitest';
import { oneVoicePerLog, VOICE_RANK } from './oneVoice';
import type { Advice } from './adviceShared';

const advice = (id: string, ruleId: string, relatedLogId?: string, priority = 1): Advice => ({
  id, trigger: 'plan_update', ruleId, title: id, effect: '', why: '', priority, ...(relatedLogId ? { relatedLogId } : {}),
});

describe('oneVoicePerLog', () => {
  it('de vaste volgorde: een nieuwe testpoging, dan rust na zwaar, dan twee keer licht', () => {
    expect(VOICE_RANK).toEqual(['TEST-RETRY', 'HARD-THEN-SPACE', 'LIGHT-TWICE']);
  });

  it('twee adviezen voor hetzelfde log worden er één: de belangrijkste wint, ongeacht de volgorde van binnenkomst', () => {
    const hard = advice('hard:log-a', 'HARD-THEN-SPACE', 'log-a', 4);
    const retry = advice('retest:2026-10-27', 'TEST-RETRY', 'log-a', 2);
    expect(oneVoicePerLog([hard, retry])).toEqual([retry]);
    expect(oneVoicePerLog([retry, hard])).toEqual([retry]);
  });

  it('elke combinatie uit de volgorde: de eerste in VOICE_RANK wint, ook met een lagere prioriteit', () => {
    for (let i = 0; i < VOICE_RANK.length; i++) {
      for (let j = i + 1; j < VOICE_RANK.length; j++) {
        const first = advice(`a-${i}`, VOICE_RANK[i], 'log-x', 1);
        const second = advice(`b-${j}`, VOICE_RANK[j], 'log-x', 9);
        expect(oneVoicePerLog([second, first])).toEqual([first]);
        expect(oneVoicePerLog([first, second])).toEqual([first]);
      }
    }
  });

  it('een regel buiten de volgorde wijkt voor een regel erin; twee erbuiten: hoogste prioriteit, dan id', () => {
    const known = advice('k', 'LIGHT-TWICE', 'log-y', 1);
    const other = advice('o', 'IETS-ANDERS', 'log-y', 9);
    expect(oneVoicePerLog([other, known])).toEqual([known]);
    const low = advice('b', 'X', 'log-z', 1);
    const high = advice('c', 'Y', 'log-z', 3);
    expect(oneVoicePerLog([low, high])).toEqual([high]);
    const tieA = advice('a', 'X', 'log-w', 2);
    const tieB = advice('b', 'Y', 'log-w', 2);
    expect(oneVoicePerLog([tieB, tieA])).toEqual([tieA]);
  });

  it('adviezen zonder log en voor andere logs blijven staan, in hun volgorde', () => {
    const list = [advice('x', 'REPEAT-WEEK'), advice('h1', 'HARD-THEN-SPACE', 'log-1'), advice('y', 'WEATHER'), advice('h2', 'HARD-THEN-SPACE', 'log-2')];
    expect(oneVoicePerLog(list)).toEqual(list);
  });

  it('de winnaar blijft op zijn eigen plek in de lijst', () => {
    const retry = advice('retest', 'TEST-RETRY', 'log-a');
    const list = [advice('hard', 'HARD-THEN-SPACE', 'log-a'), advice('x', 'REPEAT-WEEK'), retry];
    expect(oneVoicePerLog(list).map((a) => a.id)).toEqual(['x', 'retest']);
  });
});
