import { describe, expect, it } from 'vitest';
import { shouldOfferRestore } from './freshStart';

const base = { seededAt: '2026-10-09T19:33:00.000Z', today: '2026-10-11', logCount: 0 };

describe('shouldOfferRestore', () => {
  it('offers a restore in the first days after an empty start', () => {
    expect(shouldOfferRestore(base)).toBe(true);
  });
  it('not on a device that was seeded before this existed', () => {
    expect(shouldOfferRestore({ ...base, seededAt: undefined })).toBe(false);
  });
  it('not once there is something of your own, or after choosing to start fresh', () => {
    expect(shouldOfferRestore({ ...base, logCount: 1 })).toBe(false);
    expect(shouldOfferRestore({ ...base, lastExportedAt: '2026-10-10T10:00:00.000Z' })).toBe(false);
    expect(shouldOfferRestore({ ...base, dismissedAt: '2026-10-10T10:00:00.000Z' })).toBe(false);
  });
  it('not after two weeks', () => {
    expect(shouldOfferRestore({ ...base, today: '2026-10-23' })).toBe(false);
  });
});
