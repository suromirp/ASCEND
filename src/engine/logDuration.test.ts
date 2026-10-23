import { describe, expect, it } from 'vitest';
import { plausibleStrengthMinutes, withPlausibleDurations } from './logDuration';
import type { SessionLog, SessionTemplate } from '../models/training';

const template = { id: 'tpl_a', durationVariants: { full: 55 } } as unknown as SessionTemplate;
const log = (over: Partial<SessionLog>) => ({ id: 'l', templateId: 'tpl_a', type: 'strength', durationMinutes: 60, completedDate: '2026-09-09', ...over }) as SessionLog;

describe('withPlausibleDurations', () => {
  it('leest een krachtworkout van dagen als de duur van de training', () => {
    const [read] = withPlausibleDurations([log({ durationMinutes: 11472 })], [template]);
    expect(read.durationMinutes).toBe(55);
  });

  it('laat een gewone krachtduur en een lange tocht staan, en geeft dan dezelfde lijst terug', () => {
    const logs = [log({ durationMinutes: 90 }), log({ type: 'hiking', durationMinutes: 480 })];
    expect(withPlausibleDurations(logs, [template])).toBe(logs);
  });

  it('valt terug op 60 min zonder training', () => {
    const [read] = withPlausibleDurations([log({ templateId: 'weg', durationMinutes: 900 })], [template]);
    expect(read.durationMinutes).toBe(60);
  });
});

describe('plausibleStrengthMinutes', () => {
  it('neemt alleen een duur tussen 1 en 240 min', () => {
    expect(plausibleStrengthMinutes(75)).toBe(75);
    expect(plausibleStrengthMinutes(241)).toBeUndefined();
    expect(plausibleStrengthMinutes(0)).toBeUndefined();
    expect(plausibleStrengthMinutes(undefined)).toBeUndefined();
  });
});
