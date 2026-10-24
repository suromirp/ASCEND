import { describe, it, expect } from 'vitest';
import { buildActivityDetail } from './activityDetail';
import { trimActivity } from './activityTrim';
import { clockLabel, isTrimmable, previewTrim, trimLog, trimOriginalLine, trimRangeLine, undoTrim } from './trimLog';
import { joinStreams, makeDrive, makeStreams } from './fixtures/runStreams';
import type { SessionLog } from '../models/training';

// Made-up series and logs only: a run of an hour, then a drive home with the
// watch still running.
const streams = joinStreams(
  makeStreams({ minutes: 60, pace: 360, hr: 150, cadence: 170, grade: (m) => (m < 20 ? 0.04 : m < 40 ? 0 : -0.04), startAltitude: 20 }),
  makeDrive({ minutes: 14, kmh: 50, walkSec: 60, standSec: 30, hr: 85 }),
);
const total = streams.timeSec[streams.timeSec.length - 1];
const own = trimActivity(streams, 0, total + 1)!;
const NOW = new Date('2026-10-24T10:00:00.000Z');

function watchLog(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_1', templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: '2026-10-22', completedAt: '2026-10-22T09:15:00.000Z',
    variant: 'custom', durationMinutes: own.durationMinutes, rpe: 5, notes: 'Rustig', subjectiveFeel: 'normal',
    cardioData: {
      durationMinutes: own.durationMinutes, distanceKm: own.distanceKm, elevationGainM: 140, elevationLossM: 138, avgHeartRate: 128, maxHeartRate: 171,
      cadence: 150, environment: 'outdoor', source: 'garmin',
    },
    externalId: 'intervals.icu:a1',
    detail: buildActivityDetail(streams, { source: 'garmin', conditions: { source: 'lookup', tempC: 12 } }),
    source: 'garmin',
    ...extra,
  };
}

// Compared as stored: what goes to IndexedDB and into a back-up has no undefined.
const plain = (log: SessionLog) => JSON.parse(JSON.stringify(log));

describe('cutting a log', () => {
  it('replaces the numbers the cut changes and keeps the old ones in `trim`', () => {
    const log = watchLog();
    const cut = trimLog(log, streams, 0, 3600, NOW)!;
    expect(cut.durationMinutes).toBe(60);
    expect(cut.cardioData?.durationMinutes).toBe(60);
    expect(cut.cardioData?.distanceKm).toBeCloseTo(10, 0);
    expect(cut.cardioData?.elevationGainM).toBeGreaterThanOrEqual(139);
    expect(cut.cardioData?.avgHeartRate).toBe(150);
    expect(cut.cardioData?.maxHeartRate).toBe(150);
    expect(cut.trim).toMatchObject({
      at: NOW.toISOString(), startSec: 0, endSec: 3600, totalSec: Math.round(total), block: 'cardioData',
      original: { durationMinutes: log.durationMinutes, distanceKm: log.cardioData?.distanceKm, elevationGainM: 140, elevationLossM: 138, avgHeartRate: 128, maxHeartRate: 171 },
    });
  });

  it('never touches what the user filled in, or what the cut does not change', () => {
    const cut = trimLog(watchLog(), streams, 0, 3600, NOW)!;
    expect(cut).toMatchObject({ rpe: 5, notes: 'Rustig', subjectiveFeel: 'normal', externalId: 'intervals.icu:a1', completedAt: '2026-10-22T09:15:00.000Z', source: 'garmin' });
    expect(cut.cardioData).toMatchObject({ cadence: 150, environment: 'outdoor', source: 'garmin' });
  });

  it('makes the profile again from what is kept', () => {
    const log = watchLog();
    const cut = trimLog(log, streams, 0, 3600, NOW)!;
    expect(log.detail!.movingSec).toBeGreaterThan(4400);
    expect(cut.detail!.movingSec).toBeGreaterThan(3590);
    expect(cut.detail!.movingSec).toBeLessThanOrEqual(3600);
    expect(cut.detail!.slices).toHaveLength(48);
    // The weather of that day belongs to the training, not to the cut.
    expect(cut.detail!.conditions).toEqual(log.detail!.conditions);
    expect(cut.trim!.original.detail).toEqual(log.detail);
  });

  it('gives the log back exactly, whatever was cut', () => {
    for (const [start, end] of [[0, 3600], [0, 3690], [600, total], [300, 3600], [1200, 2400]] as const) {
      const log = watchLog();
      const cut = trimLog(log, streams, start, end, NOW)!;
      expect(cut, `${start}-${end}`).toBeDefined();
      expect(plain(undoTrim(cut))).toEqual(plain(log));
      expect('trim' in undoTrim(cut)).toBe(false);
    }
  });

  it('puts back only what the cut replaced: what you add afterwards stays', () => {
    const cut = trimLog(watchLog(), streams, 0, 3600, NOW)!;
    const edited = { ...cut, rpe: 7, notes: 'Zwaarder dan gedacht', subjectiveFeel: 'worse' as const };
    const back = undoTrim(edited);
    expect(back).toMatchObject({ rpe: 7, notes: 'Zwaarder dan gedacht', subjectiveFeel: 'worse' });
    expect(back.durationMinutes).toBe(own.durationMinutes);
    expect(back.cardioData?.elevationGainM).toBe(140);
  });

  it('does not add a number the log did not have, and does not make a profile', () => {
    const lean = watchLog({ detail: undefined, cardioData: { durationMinutes: own.durationMinutes, distanceKm: own.distanceKm, source: 'garmin' } });
    delete lean.detail;
    const cut = trimLog(lean, streams, 0, 3600, NOW)!;
    expect(cut.cardioData).not.toHaveProperty('avgHeartRate');
    expect(cut.cardioData).not.toHaveProperty('elevationGainM');
    expect(cut).not.toHaveProperty('detail');
    expect(Object.keys(cut.trim!.original).sort()).toEqual(['distanceKm', 'durationMinutes']);
    expect(plain(undoTrim(cut))).toEqual(plain(lean));
  });

  it('drops a profile that would be made of too little, and gives it back with the undo', () => {
    const log = watchLog();
    const cut = trimLog(log, streams, 0, 200, NOW)!;
    expect(cut).not.toHaveProperty('detail');
    expect(cut.trim!.original.detail).toEqual(log.detail);
    expect(plain(undoTrim(cut))).toEqual(plain(log));
  });

  it('keeps a block duration that was not the same as the log', () => {
    const log = watchLog();
    log.cardioData = { ...log.cardioData!, durationMinutes: own.durationMinutes - 1 };
    const cut = trimLog(log, streams, 0, 3600, NOW)!;
    expect(cut.trim!.original.blockDurationMinutes).toBe(own.durationMinutes - 1);
    expect(plain(undoTrim(cut))).toEqual(plain(log));
  });

  it('works on the outdoor block of a hike', () => {
    const hike = watchLog({
      type: 'hiking', sport: 'hiking', templateId: 'tpl_mountain_hike', cardioData: undefined,
      outdoorData: { durationMinutes: own.durationMinutes, distanceKm: own.distanceKm, elevationGainM: 140, elevationLossM: 138, backpackWeightKg: 8, poles: true, source: 'garmin' },
    });
    delete hike.cardioData;
    const cut = trimLog(hike, streams, 0, 3600, NOW)!;
    expect(cut.trim!.block).toBe('outdoorData');
    expect(cut.outdoorData).toMatchObject({ durationMinutes: 60, backpackWeightKg: 8, poles: true });
    expect(plain(undoTrim(cut))).toEqual(plain(hike));
  });

  it('leaves the climb of a treadmill alone: it is an estimate, not altitude', () => {
    const belt = watchLog({ cardioData: { durationMinutes: own.durationMinutes, distanceKm: own.distanceKm, elevationGainM: 55, estimatedElevation: true, environment: 'treadmill', source: 'garmin' } });
    const cut = trimLog(belt, streams, 0, 3600, NOW)!;
    expect(cut.cardioData?.elevationGainM).toBe(55);
    expect(cut.cardioData?.estimatedElevation).toBe(true);
    expect(cut.cardioData?.durationMinutes).toBe(60);
    expect(cut.trim!.original).not.toHaveProperty('elevationGainM');
    expect(plain(undoTrim(cut))).toEqual(plain(belt));
  });

  it('refuses what it should not touch', () => {
    expect(trimLog(watchLog({ externalId: undefined, source: 'manual' }), streams, 0, 3600, NOW)).toBeUndefined();
    expect(trimLog(watchLog({ externalId: 'macrofactor:w1' }), streams, 0, 3600, NOW)).toBeUndefined();
    expect(trimLog(watchLog({ type: 'strength', cardioData: undefined }), streams, 0, 3600, NOW)).toBeUndefined();
    expect(trimLog(watchLog({ cardioData: undefined }), streams, 0, 3600, NOW)).toBeUndefined();
    // Nothing to cut, or nothing left.
    expect(trimLog(watchLog(), streams, 0, total, NOW)).toBeUndefined();
    expect(trimLog(watchLog(), streams, total + 10, total + 20, NOW)).toBeUndefined();
    // Cut already: undo first.
    const cut = trimLog(watchLog(), streams, 0, 3600, NOW)!;
    expect(trimLog(cut, streams, 0, 1800, NOW)).toBeUndefined();
  });

  it('says which logs can be cut', () => {
    expect(isTrimmable(watchLog())).toBe(true);
    expect(isTrimmable(watchLog({ externalId: undefined }))).toBe(false);
    expect(isTrimmable(watchLog({ type: 'strength' }))).toBe(false);
    expect(isTrimmable(watchLog({ cardioData: undefined }))).toBe(false);
  });

  it('gives a log that is not cut back as it was', () => {
    const log = watchLog();
    expect(undoTrim(log)).toBe(log);
  });
});

describe('the numbers for the sheet', () => {
  it('tells the old and the new numbers, or nothing when nothing is cut', () => {
    const log = watchLog();
    const preview = previewTrim(log, streams, 0, 3600)!;
    expect(preview.before.durationMinutes).toBe(log.durationMinutes);
    expect(preview.after.durationMinutes).toBe(60);
    expect(preview.before.elevationGainM).toBe(140);
    expect(previewTrim(log, streams, 0, total)).toBeUndefined();
  });
});

describe('the words', () => {
  const base = { at: NOW.toISOString(), totalSec: 3720, block: 'cardioData' as const, original: { durationMinutes: 62, distanceKm: 9.8, elevationGainM: 410, avgHeartRate: 141 } };
  it('writes a time as hours and minutes', () => {
    expect(clockLabel(0)).toBe('0:00');
    expect(clockLabel(300)).toBe('0:05');
    expect(clockLabel(3180)).toBe('0:53');
    expect(clockLabel(4320)).toBe('1:12');
    expect(clockLabel(-5)).toBe('0:00');
  });

  it('tells what is kept', () => {
    expect(trimRangeLine({ ...base, startSec: 300, endSec: 3180 })).toBe('Ingekort: van 0:05 tot 0:53');
    expect(trimRangeLine({ ...base, startSec: 0, endSec: 3180 })).toBe('Ingekort: tot 0:53');
    expect(trimRangeLine({ ...base, startSec: 300, endSec: 3720 })).toBe('Ingekort: vanaf 0:05');
  });

  it('tells the numbers from before', () => {
    expect(trimOriginalLine({ ...base, startSec: 0, endSec: 3180 })).toBe('Eerst 62 min, 9,8 km, 410 m D+, hartslag 141');
  });
});
