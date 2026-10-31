import { describe, expect, it } from 'vitest';
import { silenceKey, sourceSilence, type SourceWatchInput } from './sourceWatch';
import { addDays } from '../utils/dates';
import type { SessionLog } from '../models/training';

// Nagemaakte dagen. Vandaag is 31 oktober 2026.
const today = '2026-10-31';
const days = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};
const run = (date: string, extra: Partial<Pick<SessionLog, 'type' | 'externalId' | 'source'>> = {}) => ({ completedDate: date, type: 'cardio' as SessionLog['type'], source: 'manual' as SessionLog['source'], ...extra });

const base = (over: Partial<SourceWatchInput> = {}): SourceWatchInput => ({
  today,
  linked: true,
  fetchedAt: '2026-10-31T07:10:00.000Z',
  activitiesOn: true,
  morningsOn: true,
  activityDays: ['2026-10-25', '2026-10-29'],
  morningDays: days('2026-10-01', '2026-10-31'),
  logs: [],
  ...over,
});

describe('bronbewaking', () => {
  it('zegt niets als alles gewoon binnenkomt', () => {
    expect(sourceSilence(base())).toBeUndefined();
  });

  it('ziet dat de ochtenden stoppen, met de eerste dag zonder', () => {
    const s = sourceSilence(base({ morningDays: days('2026-10-01', '2026-10-28'), activityDays: ['2026-10-30'] }));
    expect(s?.kind).toBe('mornings');
    expect(s?.since).toBe('2026-10-29');
    expect(s?.text).toBe('Sinds 29 oktober komen er geen ochtendgetallen van je horloge meer binnen, terwijl de koppeling met intervals.icu werkt.');
  });

  it('twee dagen zonder ochtend is nog geen stilte', () => {
    expect(sourceSilence(base({ morningDays: days('2026-10-01', '2026-10-29') }))).toBeUndefined();
  });

  it('drie dagen zonder training is gewoon rust, tenzij je wel trainde', () => {
    const quiet = base({ activityDays: ['2026-10-26'] });
    expect(sourceSilence(quiet)).toBeUndefined();
    const s = sourceSilence({ ...quiet, logs: [run('2026-10-29')] });
    expect(s?.kind).toBe('activities');
    expect(s?.since).toBe('2026-10-27');
    expect(s?.text).toContain('komt er geen training van je horloge meer binnen, terwijl je wel trainde');
  });

  it('kracht en wat van het horloge zelf kwam tellen niet als bewijs dat je trainde', () => {
    const quiet = base({ activityDays: ['2026-10-26'] });
    expect(sourceSilence({ ...quiet, logs: [run('2026-10-29', { type: 'strength' })] })).toBeUndefined();
    expect(sourceSilence({ ...quiet, logs: [run('2026-10-29', { externalId: 'intervals.icu:i9' })] })).toBeUndefined();
    expect(sourceSilence({ ...quiet, logs: [run('2026-10-29', { source: 'macrofactor' })] })).toBeUndefined();
  });

  it('zonder ochtenden vraagt het twee zelf ingevulde trainingen', () => {
    const noMornings = base({ morningsOn: false, activityDays: ['2026-10-26'] });
    expect(sourceSilence({ ...noMornings, logs: [run('2026-10-28')] })).toBeUndefined();
    expect(sourceSilence({ ...noMornings, logs: [run('2026-10-28'), run('2026-10-30')] })?.kind).toBe('activities');
  });

  it('valt alles stil, dan is het één zin vanaf de vroegste dag', () => {
    const s = sourceSilence(base({ morningDays: days('2026-10-01', '2026-10-27'), activityDays: ['2026-10-25'], logs: [run('2026-10-29'), run('2026-10-30')] }));
    expect(s?.kind).toBe('both');
    expect(s?.since).toBe('2026-10-26');
    expect(s?.text).toBe('Sinds 26 oktober komt er niets meer van je horloge binnen, terwijl de koppeling met intervals.icu werkt.');
  });

  it('zwijgt als de koppeling zelf niet werkt of er nooit iets kwam', () => {
    const silent = { morningDays: days('2026-10-01', '2026-10-20') };
    expect(sourceSilence(base({ ...silent, linked: false }))).toBeUndefined();
    expect(sourceSilence(base({ ...silent, fetchedAt: undefined }))).toBeUndefined();
    expect(sourceSilence(base({ ...silent, fetchedAt: '2026-10-28T07:00:00.000Z' }))).toBeUndefined();
    expect(sourceSilence(base({ morningDays: [], activityDays: [] }))).toBeUndefined();
    expect(sourceSilence(base({ ...silent, morningsOn: false }))).toBeUndefined();
  });

  it('heeft een sleutel per stilte, zodat Begrepen alleen deze verbergt', () => {
    const s = sourceSilence(base({ morningDays: days('2026-10-01', '2026-10-27') }))!;
    expect(silenceKey(s)).toBe('mornings:2026-10-28');
  });
});
