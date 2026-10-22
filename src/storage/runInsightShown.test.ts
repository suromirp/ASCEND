import { describe, it, expect, beforeEach } from 'vitest';
import { MetaRepo, wipeAllData } from './database';
import { getShownInsights, recordShownInsights } from './runInsightShown';
import { buildBackupEnvelope } from './backup';

describe('what the loopinzicht showed, for the brake', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('is remembered per training and replaced when the same training is recorded again', async () => {
    await recordShownInsights('a', [{ topic: 'efficiency', tone: 'better', strength: 1.7 }], '2026-10-10');
    await recordShownInsights('b', [{ topic: 'drift', tone: 'watch', strength: -1.2 }], '2026-10-14');
    await recordShownInsights('a', [{ topic: 'efficiency', tone: 'better', strength: 2.1 }], '2026-10-10');
    const shown = await getShownInsights();
    expect(shown.map((s) => `${s.logId}:${s.topic}:${s.strength}`)).toEqual(['b:drift:-1.2', 'a:efficiency:2.1']);
  });

  it('keeps only a short list and reads rubbish as nothing', async () => {
    for (let i = 0; i < 40; i++) await recordShownInsights(`l${i}`, [{ topic: 'form', tone: 'watch', strength: -1.6 }], '2026-10-01');
    expect((await getShownInsights()).length).toBeLessThanOrEqual(24);
    await MetaRepo.set('runInsightShown', [{ logId: 1 }, 'x', null]);
    expect(await getShownInsights()).toEqual([]);
    await MetaRepo.set('runInsightShown', 'rommel');
    expect(await getShownInsights()).toEqual([]);
  });

  it('is not part of a backup', async () => {
    await recordShownInsights('a', [{ topic: 'efficiency', tone: 'better', strength: 1.7 }], '2026-10-10');
    const text = JSON.stringify(await buildBackupEnvelope());
    expect(text).not.toContain('runInsightShown');
    expect(text).not.toContain('"efficiency"');
  });
});
