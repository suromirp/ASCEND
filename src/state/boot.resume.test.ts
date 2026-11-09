import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
vi.mock('../storage/externalActivities', () => ({
  syncWatchActivities: vi.fn(async () => {
    calls.push('intervals');
  }),
}));
vi.mock('../storage/healthConnect', () => ({
  syncHealthConnect: vi.fn(async () => {
    calls.push('health');
    return { status: 'too-soon' };
  }),
}));

import { resumeSync } from './boot';
import { syncHealthConnect } from '../storage/healthConnect';

beforeEach(() => {
  calls.length = 0;
});

describe('terug in de app', () => {
  it('kijkt eerst bij intervals.icu en dan bij Health Connect, los van het tabblad', async () => {
    await resumeSync();
    expect(calls).toEqual(['intervals', 'health']);
  });

  it('gooit nooit, ook als Health Connect faalt', async () => {
    vi.mocked(syncHealthConnect).mockRejectedValueOnce(new Error('kapot'));
    await expect(resumeSync()).resolves.toBeUndefined();
  });
});
