import { describe, it, expect } from 'vitest';
import { logSport } from './sports';

describe('logSport follows the way it was done', () => {
  it('a long run logged as a run is running, even if stored as hiking', () => {
    expect(logSport({ type: 'hiking', sport: 'hiking', outdoorData: { modality: 'long_run_outdoor', durationMinutes: 60, source: 'manual' } as never })).toBe('running');
    expect(logSport({ type: 'hiking', sport: 'running', outdoorData: { modality: 'long_hike_outdoor', durationMinutes: 60, source: 'manual' } as never })).toBe('hiking');
  });
});

describe('the sport of every way of training is written down', () => {
  it('has a fixed sport for every modality key, and stairs never count as running', async () => {
    const { allModalityKeys, hasFixedSport, modalitySport } = await import('../data/modalities');
    for (const key of allModalityKeys()) expect(hasFixedSport(key), key).toBe(true);
    expect(modalitySport('stairmaster_intervals')).toBe('hiking');
    expect(modalitySport('long_hike_outdoor')).toBe('hiking');
    expect(modalitySport('bike_outdoor')).toBe('cycling');
    expect(modalitySport('rest')).toBeUndefined();
  });
});
