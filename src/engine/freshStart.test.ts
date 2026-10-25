import { describe, expect, it } from 'vitest';
import { isEmptyStart, needsFirstPlan, restoreSafetyLines, shouldOfferRestore } from './freshStart';

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

describe('isEmptyStart', () => {
  const empty = { programs: 0, plannedSessions: 0, sessionLogs: 0, trainingGoals: 0 };
  it('is empty only when nothing was chosen or done', () => {
    expect(isEmptyStart(empty)).toBe(true);
  });
  it.each(['programs', 'plannedSessions', 'sessionLogs', 'trainingGoals'] as const)('is not empty with a single %s', (key) => {
    expect(isEmptyStart({ ...empty, [key]: 1 })).toBe(false);
  });
});

describe('restoreSafetyLines', () => {
  it('says what comes in on an empty device, and does not talk about removal or a copy', () => {
    const text = restoreSafetyLines(true).join(' ');
    expect(text).toContain('komt erbij');
    expect(text).not.toContain('kopie');
    expect(text).not.toMatch(/verwijder|verdwijn/);
  });
  it('keeps the usual sentences on a device with data', () => {
    const text = restoreSafetyLines(false).join(' ');
    expect(text).toContain('kopie van je huidige gegevens');
    expect(text).toContain('nooit verwijderd');
  });
  it('has no long dashes', () => {
    expect([...restoreSafetyLines(true), ...restoreSafetyLines(false)].join(' ')).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('needsFirstPlan', () => {
  it('is true without a program and without planning, whatever else is on the device', () => {
    expect(needsFirstPlan({ programs: 0, plannedSessions: 0 })).toBe(true);
  });
  it('is false as soon as there is a program or something planned (an existing installation)', () => {
    expect(needsFirstPlan({ programs: 1, plannedSessions: 0 })).toBe(false);
    expect(needsFirstPlan({ programs: 0, plannedSessions: 3 })).toBe(false);
    expect(needsFirstPlan({ programs: 1, plannedSessions: 120 })).toBe(false);
  });
});
