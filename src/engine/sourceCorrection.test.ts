import { describe, it, expect } from 'vitest';
import type { SessionLog } from '../models/training';
import { activityToDraft, sourceNumbers, type ExternalActivity } from './activityImport';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { applyAlignment, restoreManual } from './watchAlign';
import {
  canRestoreSourceUpdate,
  changedAtSource,
  correctionFor,
  planCorrections,
  restoreSourceUpdate,
  sourceOfferLine,
  sourceUpdateLine,
  sourceUpdatePreviousLine,
  takeOverOffered,
} from './sourceCorrection';

// Made-up activities and logs only.
const templates = buildDefaultProgramData().templates;
const NOW = new Date('2026-10-25T08:00:00.000Z');

function activity(extra: Partial<ExternalActivity> = {}): ExternalActivity {
  return {
    externalId: 'intervals.icu:a1', source: 'garmin', start: '2026-10-22T07:30:00', kind: 'hike', durationSec: 180 * 60, distanceM: 12400,
    elevationGainM: 610, elevationLossM: 600, avgHeartRate: 118, maxHeartRate: 160, avgCadence: 82, treadmill: false, ...extra,
  };
}

// A log as it is made from the activity, with the fingerprint.
function tied(extra: Partial<SessionLog> = {}, a: ExternalActivity = activity()): SessionLog {
  const template = templates.find((t) => t.id === 'tpl_easy_run')!;
  const draft = activityToDraft(a, template);
  return { id: 'log_1', ...draft, rpe: 6, notes: 'Mooi weer', subjectiveFeel: 'better', painAreas: ['knie'], ...extra };
}

describe('the fingerprint', () => {
  it('is made when the log is made, with the numbers of the activity', () => {
    const log = tied();
    expect(log.sourceSync).toEqual({ seen: sourceNumbers(activity()) });
    expect(log.sourceSync?.seen).toMatchObject({ durationMinutes: 180, distanceKm: 12.4, elevationGainM: 610, avgHeartRate: 118, cadence: 82 });
  });

  it('is made when a hand-made log takes over the watch, and goes when it is put back', () => {
    const hand: SessionLog = {
      id: 'log_h', templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: '2026-10-22', completedAt: '2026-10-22T18:00:00.000Z',
      variant: 'full', durationMinutes: 170, source: 'manual', cardioData: { durationMinutes: 170, distanceKm: 12, source: 'manual' },
    };
    const aligned = applyAlignment(hand, activity({ kind: 'run' }), NOW);
    expect(aligned.sourceSync).toEqual({ seen: sourceNumbers(activity({ kind: 'run' })) });
    expect(restoreManual(aligned)).not.toHaveProperty('sourceSync');
  });

  it('tells what changed at the source and ignores a missing value and a difference nobody sees', () => {
    const seen = sourceNumbers(activity());
    const now = sourceNumbers(activity({ distanceM: 12430, elevationGainM: 540, avgHeartRate: undefined, maxHeartRate: 161 }));
    expect(changedAtSource(seen, now)).toEqual({ elevationGainM: 540, maxHeartRate: 161 });
  });
});

describe('a correction at the source', () => {
  it('takes over the numbers that changed, and only those, and keeps the old ones', () => {
    const log = tied();
    const corrected = activity({ durationSec: 150 * 60, distanceM: 10100, elevationGainM: 480, elevationLossM: 470 });
    const item = correctionFor(log, corrected, true, NOW)!;
    expect(item.kind).toBe('update');
    expect(item.changes.map((c) => c.field)).toEqual(['durationMinutes', 'distanceKm', 'elevationGainM', 'elevationLossM']);
    expect(item.next).toMatchObject({
      durationMinutes: 150,
      cardioData: { durationMinutes: 150, distanceKm: 10.1, elevationGainM: 480, elevationLossM: 470, avgHeartRate: 118, maxHeartRate: 160, cadence: 82 },
    });
    expect(item.next.sourceSync?.seen).toEqual(sourceNumbers(corrected));
    expect(item.next.sourceSync?.updated).toEqual({
      at: NOW.toISOString(),
      block: 'cardioData',
      previous: { durationMinutes: 180, distanceKm: 12.4, elevationGainM: 610, elevationLossM: 600 },
    });
  });

  it('never reads or changes what you filled in', () => {
    const log = tied({ workout: { reps: 4, repSeconds: 60 }, strengthRir: 2, legsAtStart: 'fris', plannedSessionId: 'ps_1', painReports: [{ area: 'knie', score: 3 }] as SessionLog['painReports'] });
    const item = correctionFor(log, activity({ distanceM: 9000 }), true, NOW)!;
    const { cardioData: _a, durationMinutes: _b, sourceSync: _c, ...rest } = item.next;
    const { cardioData: _d, durationMinutes: _e, sourceSync: _f, ...before } = log;
    void [_a, _b, _c, _d, _e, _f];
    expect(rest).toEqual(before);
  });

  it('adds a number that was not there and takes nothing away that the source no longer has', () => {
    const log = tied({}, activity({ avgCadence: undefined, avgHeartRate: undefined }));
    const item = correctionFor(log, activity({ avgCadence: 80, avgHeartRate: undefined }), true, NOW)!;
    expect(item.next.cardioData).toMatchObject({ cadence: 80 });
    expect(item.next.sourceSync?.updated?.previous).toEqual({ cadence: null });
    // The source loses its heart rate: the log keeps its own, nothing to do.
    const withHr = tied();
    expect(correctionFor(withHr, activity({ avgHeartRate: undefined }), true, NOW)).toBeUndefined();
  });

  it('does nothing in a second round without a change', () => {
    const log = tied();
    const corrected = activity({ distanceM: 10100 });
    const first = correctionFor(log, corrected, true, NOW)!;
    expect(correctionFor(first.next, corrected, true, new Date('2026-10-25T09:00:00.000Z'))).toBeUndefined();
    expect(planCorrections([corrected], [first.next], { on: true, now: NOW }).items).toEqual([]);
  });

  it('does not touch a log for a difference smaller than the log shows', () => {
    expect(correctionFor(tied(), activity({ distanceM: 12430 }), true, NOW)).toBeUndefined();
  });

  it('does not take a number back that ASCEND changed itself', () => {
    // The log differs from the source (cut by hand here), the source did not change: nothing.
    const own = tied({ durationMinutes: 150, cardioData: { durationMinutes: 150, distanceKm: 10.1, source: 'garmin' } });
    expect(correctionFor(own, activity(), true, NOW)).toBeUndefined();
  });

  it('only moves the fingerprint when the log already says it', () => {
    const log = tied({ cardioData: { durationMinutes: 180, distanceKm: 10.1, elevationGainM: 610, elevationLossM: 600, avgHeartRate: 118, maxHeartRate: 160, cadence: 82, source: 'garmin' } });
    const item = correctionFor(log, activity({ distanceM: 10100 }), true, NOW)!;
    expect(item.kind).toBe('quiet');
    expect(item.next.cardioData).toEqual(log.cardioData);
    expect(item.next.sourceSync?.updated).toBeUndefined();
    expect(item.next.sourceSync?.seen.distanceKm).toBe(10.1);
  });

  it('leaves the climb of a treadmill alone', () => {
    const a = activity({ kind: 'run', treadmill: true });
    const log = tied({}, a);
    const item = correctionFor(log, { ...a, elevationGainM: 20, distanceM: 9000 }, true, NOW)!;
    expect(item.changes.map((c) => c.field)).toEqual(['distanceKm']);
    expect(item.next.cardioData?.elevationGainM).toBe(610);
  });
});

describe('what it never touches', () => {
  it('a log without a fingerprint only gets one, with the numbers of now', () => {
    const { sourceSync: _gone, ...old } = tied();
    void _gone;
    const item = correctionFor(old as SessionLog, activity({ distanceM: 9000 }), true, NOW)!;
    expect(item.kind).toBe('baseline');
    expect(item.next.cardioData).toEqual(old.cardioData);
    expect(item.next.sourceSync).toEqual({ seen: sourceNumbers(activity({ distanceM: 9000 })) });
  });

  it('a log made by hand, a strength log and another id', () => {
    const hand = tied({ externalId: undefined, source: 'manual' });
    expect(correctionFor(hand, activity(), true, NOW)).toBeUndefined();
    const strength = tied({ type: 'strength' });
    expect(correctionFor(strength, activity({ distanceM: 9000 }), true, NOW)).toBeUndefined();
    expect(correctionFor(tied(), activity({ externalId: 'intervals.icu:other', distanceM: 9000 }), true, NOW)).toBeUndefined();
    const mf = tied({ externalId: 'macrofactor:w1', source: 'macrofactor' });
    expect(correctionFor(mf, activity({ externalId: 'macrofactor:w1', distanceM: 9000 }), true, NOW)).toBeUndefined();
  });

  it('an activity that is gone at the source: nothing is deleted or changed', () => {
    const logs = [tied()];
    expect(planCorrections([], logs, { on: true, now: NOW }).items).toEqual([]);
    expect(planCorrections([activity({ externalId: 'intervals.icu:zz' })], logs, { on: true, now: NOW }).items).toEqual([]);
  });

  it('with the switch off nothing is written, and what changed is taken over when it goes on', () => {
    const log = tied();
    const corrected = activity({ distanceM: 10100 });
    expect(correctionFor(log, corrected, false, NOW)).toBeUndefined();
    expect(correctionFor(log, corrected, true, NOW)?.kind).toBe('update');
    // Without a fingerprint the switch does not matter: it is only a note.
    const { sourceSync: _x, ...bare } = log;
    void _x;
    expect(correctionFor(bare as SessionLog, corrected, false, NOW)?.kind).toBe('baseline');
  });
});

describe('a log the watch took over by hand-made numbers', () => {
  const hand: SessionLog = {
    id: 'log_h', templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: '2026-10-22', completedAt: '2026-10-22T18:00:00.000Z',
    variant: 'full', durationMinutes: 170, source: 'manual', cardioData: { durationMinutes: 170, distanceKm: 11.5, source: 'manual' }, rpe: 5,
  };
  const run = activity({ kind: 'run', durationSec: 180 * 60, distanceM: 12400, elevationGainM: undefined, elevationLossM: undefined });

  it('gets the new watch numbers, keeps manualMeasured, and the hand-made numbers still come back', () => {
    const aligned = applyAlignment(hand, run, NOW);
    const item = correctionFor(aligned, { ...run, distanceM: 10000 }, true, new Date('2026-10-26T08:00:00.000Z'))!;
    expect(item.kind).toBe('update');
    expect(item.next.cardioData?.distanceKm).toBe(10);
    expect(item.next.manualMeasured).toEqual(aligned.manualMeasured);
    const back = restoreManual(item.next);
    expect(back).toMatchObject({ durationMinutes: 170, source: 'manual', rpe: 5, cardioData: { durationMinutes: 170, distanceKm: 11.5, source: 'manual' } });
    expect(back).not.toHaveProperty('externalId');
    expect(back).not.toHaveProperty('sourceSync');
  });
});

describe('putting the previous numbers back', () => {
  const corrected = activity({ durationSec: 150 * 60, distanceM: 10100, elevationGainM: 480, avgCadence: undefined });

  it('gives back exactly what the log had, keeps the fingerprint, and the same correction is not written again', () => {
    const log = tied();
    const updated = correctionFor(log, corrected, true, NOW)!.next;
    const back = restoreSourceUpdate(updated);
    const { sourceSync: s1, ...restBack } = back;
    const { sourceSync: s0, ...restOld } = log;
    void [s0];
    expect(restBack).toEqual(restOld);
    // The source lost its cadence: the fingerprint keeps the last it knew.
    expect(s1).toEqual({ seen: { ...sourceNumbers(activity()), ...sourceNumbers(corrected) } });
    expect(correctionFor(back, corrected, true, NOW)).toBeUndefined();
  });

  it('takes a field away again that the update added', () => {
    const log = tied({}, activity({ avgCadence: undefined }));
    const updated = correctionFor(log, activity({ avgCadence: 80 }), true, NOW)!.next;
    expect(restoreSourceUpdate(updated).cardioData).not.toHaveProperty('cadence');
  });

  it('is not offered while the log is cut, and a log without an update comes back as it was', () => {
    const updated = correctionFor(tied(), corrected, true, NOW)!.next;
    const cut = { ...updated, trim: { at: NOW.toISOString(), startSec: 0, endSec: 100, totalSec: 200, block: 'cardioData' as const, original: { durationMinutes: 150 } } };
    expect(canRestoreSourceUpdate(cut)).toBe(false);
    expect(restoreSourceUpdate(cut)).toBe(cut);
    const plain = tied();
    expect(restoreSourceUpdate(plain)).toBe(plain);
  });
});

describe('a log that was cut in ASCEND', () => {
  function cutLog(): SessionLog {
    const log = tied();
    return {
      ...log,
      durationMinutes: 120,
      cardioData: { ...log.cardioData!, durationMinutes: 120, distanceKm: 9.8, elevationGainM: 500 },
      trim: { at: '2026-10-23T08:00:00.000Z', startSec: 0, endSec: 7200, totalSec: 10800, block: 'cardioData', original: { durationMinutes: 180, distanceKm: 12.4, elevationGainM: 610 } },
    };
  }

  it('is not written over: the new numbers are offered', () => {
    const log = cutLog();
    const item = correctionFor(log, activity({ distanceM: 10100, elevationGainM: 480 }), true, NOW)!;
    expect(item.kind).toBe('offer');
    expect(item.next.cardioData).toEqual(log.cardioData);
    expect(item.next.durationMinutes).toBe(120);
    expect(item.next.trim).toEqual(log.trim);
    expect(item.next.sourceSync?.offered).toEqual({ distanceKm: 10.1, elevationGainM: 480 });
    expect(sourceOfferLine(item.next)).toMatch(/10,1 km, 480 m D\+/);
    // A second round says nothing new.
    expect(correctionFor(item.next, activity({ distanceM: 10100, elevationGainM: 480 }), true, NOW)).toBeUndefined();
  });

  it('keeps adding to the offer when the source changes again', () => {
    const first = correctionFor(cutLog(), activity({ distanceM: 10100 }), true, NOW)!.next;
    const second = correctionFor(first, activity({ distanceM: 10100, avgHeartRate: 121 }), true, NOW)!.next;
    expect(second.sourceSync?.offered).toEqual({ distanceKm: 10.1, avgHeartRate: 121 });
  });

  it('takes the offered numbers on request: the cut goes, the old numbers are kept', () => {
    const offered = correctionFor(cutLog(), activity({ distanceM: 10100, elevationGainM: 480 }), true, NOW)!.next;
    const taken = takeOverOffered(offered, NOW)!;
    expect(taken).not.toHaveProperty('trim');
    expect(taken.durationMinutes).toBe(180);
    expect(taken.cardioData).toMatchObject({ durationMinutes: 180, distanceKm: 10.1, elevationGainM: 480, elevationLossM: 600 });
    expect(taken.sourceSync?.offered).toBeUndefined();
    expect(taken.sourceSync?.updated?.previous).toEqual({ distanceKm: 12.4, elevationGainM: 610 });
    expect(sourceUpdateLine(taken)).toMatch(/^Bijgewerkt uit intervals\.icu op 25 oktober/);
    expect(sourceUpdatePreviousLine(taken)).toBe('Eerder: 12,4 km, 610 m D+');
    // And the way back.
    expect(restoreSourceUpdate(taken).cardioData).toMatchObject({ distanceKm: 12.4, elevationGainM: 610 });
  });

  it('has nothing to take over without a cut or without an offer', () => {
    expect(takeOverOffered(tied(), NOW)).toBeUndefined();
    expect(takeOverOffered(cutLog(), NOW)).toBeUndefined();
  });

  it('takes the offer by itself once the cut is undone ("Inkorten ongedaan maken")', () => {
    const offered = correctionFor(cutLog(), activity({ distanceM: 10100 }), true, NOW)!.next;
    const { trim: _t, ...undone } = offered;
    void _t;
    const log = { ...undone, durationMinutes: 180, cardioData: { ...offered.cardioData!, durationMinutes: 180, distanceKm: 12.4 } };
    const item = correctionFor(log, activity({ distanceM: 10100 }), true, NOW)!;
    expect(item.kind).toBe('update');
    expect(item.next.cardioData?.distanceKm).toBe(10.1);
    expect(item.next.sourceSync?.offered).toBeUndefined();
  });
});
