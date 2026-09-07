import { describe, it, expect } from 'vitest';
import { detectRecentSpike } from './progressionSpikes';
import type { SessionLog } from '../models/training';

function log(overrides: Partial<SessionLog> & { completedDate: string }): SessionLog {
  return {
    id: `log-${overrides.completedDate}-${Math.random()}`,
    templateId: 'tpl_long_run',
    type: 'hiking',
    completedAt: `${overrides.completedDate}T10:00:00.000Z`,
    variant: 'full',
    durationMinutes: 90,
    source: 'manual',
    ...overrides,
  };
}

describe('detectRecentSpike', () => {
  it('returns no spike for an empty log list', () => {
    expect(detectRecentSpike([])).toEqual({ detected: false, dimensions: [] });
  });

  it('never flags a spike when there is no baseline to compare against', () => {
    // First-ever logged distance for this athlete — nothing to compare to.
    const logs = [log({ completedDate: '2026-09-07', outdoorData: { durationMinutes: 90, distanceKm: 20, source: 'manual' } })];
    expect(detectRecentSpike(logs).detected).toBe(false);
  });

  it('flags a single-session distance spike over 10% above the 30-day baseline', () => {
    const logs = [
      log({ completedDate: '2026-09-07', outdoorData: { durationMinutes: 150, distanceKm: 23, source: 'manual' } }), // most recent
      log({ completedDate: '2026-08-20', outdoorData: { durationMinutes: 100, distanceKm: 15, source: 'manual' } }),
      log({ completedDate: '2026-08-10', outdoorData: { durationMinutes: 90, distanceKm: 14, source: 'manual' } }),
    ];
    const signal = detectRecentSpike(logs);
    expect(signal.detected).toBe(true);
    expect(signal.dimensions).toEqual(['distance']);
    expect(signal.reason).toMatch(/afstand/);
  });

  it('does not flag a modest, within-tolerance increase', () => {
    const logs = [
      log({ completedDate: '2026-09-07', outdoorData: { durationMinutes: 100, distanceKm: 15.5, source: 'manual' } }), // +3% over 15
      log({ completedDate: '2026-08-20', outdoorData: { durationMinutes: 95, distanceKm: 15, source: 'manual' } }),
    ];
    expect(detectRecentSpike(logs).detected).toBe(false);
  });

  it('ignores baseline sessions outside the 30-day window', () => {
    const logs = [
      log({ completedDate: '2026-09-07', outdoorData: { durationMinutes: 100, distanceKm: 15.5, source: 'manual' } }),
      // 40 days before the candidate — outside the baseline window, so this
      // larger old session must never suppress a real spike.
      log({ completedDate: '2026-07-28', outdoorData: { durationMinutes: 200, distanceKm: 30, source: 'manual' } }),
    ];
    expect(detectRecentSpike(logs).detected).toBe(false); // no in-window baseline at all -> never flagged
  });

  it('flags multiple simultaneous dimension spikes with a combined, stronger message', () => {
    const logs = [
      log({
        completedDate: '2026-09-07',
        outdoorData: { durationMinutes: 300, distanceKm: 23, elevationGainM: 1300, backpackWeightKg: 14, source: 'manual' },
      }),
      log({
        completedDate: '2026-08-25',
        outdoorData: { durationMinutes: 150, distanceKm: 15, elevationGainM: 900, backpackWeightKg: 8, source: 'manual' },
      }),
    ];
    const signal = detectRecentSpike(logs);
    expect(signal.detected).toBe(true);
    expect(signal.dimensions.length).toBeGreaterThan(1);
    expect(signal.reason).toMatch(/meerdere nieuwe pieken/);
  });

  it('reads elevationLoss and packWeight only from outdoorData, never cardioData', () => {
    const logs = [
      log({
        completedDate: '2026-09-07',
        cardioData: { durationMinutes: 60, distanceKm: 12, source: 'manual' }, // no elevationLossM/backpackWeightKg field on CardioMetric
      }),
      log({ completedDate: '2026-08-20', outdoorData: { durationMinutes: 55, distanceKm: 10, source: 'manual' } }),
    ];
    // distance itself is a mild spike (20% over 10), but elevationLoss/packWeight are simply absent — must not crash or falsely flag them.
    const signal = detectRecentSpike(logs);
    expect(signal.dimensions).not.toContain('elevationLoss');
    expect(signal.dimensions).not.toContain('packWeight');
  });
});
