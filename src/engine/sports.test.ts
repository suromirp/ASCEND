import { describe, it, expect } from 'vitest';
import { logSport } from './sports';

describe('logSport follows the way it was done', () => {
  it('a long run logged as a run is running, even if stored as hiking', () => {
    expect(logSport({ type: 'hiking', sport: 'hiking', outdoorData: { modality: 'long_run_outdoor', durationMinutes: 60, source: 'manual' } as never })).toBe('running');
    expect(logSport({ type: 'hiking', sport: 'running', outdoorData: { modality: 'long_hike_outdoor', durationMinutes: 60, source: 'manual' } as never })).toBe('hiking');
  });
});
