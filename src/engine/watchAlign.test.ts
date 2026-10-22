import { describe, it, expect } from 'vitest';
import type { SessionLog } from '../models/training';
import { pairWithManualLogs, pendingProposals, type ExternalActivity } from './activityImport';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { legFatigueOn } from './legFatigue';
import {
  AUTO_DAYS,
  HISTORY_MAX_DAYS,
  alignItemFor,
  applyAlignment,
  describeChanges,
  describeManualLine,
  historyStart,
  mergeActivities,
  planAlignment,
  restoreManual,
} from './watchAlign';

// Made-up activities and logs only.
const templates = buildDefaultProgramData().templates;
const NOW = new Date('2026-10-22T08:00:00.000Z');

function activity(extra: Partial<ExternalActivity> = {}): ExternalActivity {
  return {
    externalId: 'test:a1',
    source: 'garmin',
    start: '2026-10-15T07:30:00',
    kind: 'run',
    durationSec: 55 * 60 + 10,
    distanceM: 7100,
    elevationGainM: 42.4,
    elevationLossM: 40.2,
    avgHeartRate: 152,
    maxHeartRate: 171,
    treadmill: false,
    ...extra,
  };
}

function hand(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_1', templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: '2026-10-15', completedAt: '2026-10-15T18:00:00.000Z',
    variant: 'full', durationMinutes: 55, source: 'manual',
    cardioData: { durationMinutes: 55, distanceKm: 6.9, elevationGainM: 30, source: 'manual' },
    rpe: 4, subjectiveFeel: 'better', notes: 'Rustig, wind tegen', painAreas: ['knie'],
    ...extra,
  };
}

describe('pairWithManualLogs', () => {
  it('pairs the same day, the same sort and about the same length', () => {
    const pairs = pairWithManualLogs([activity()], [hand()]);
    expect(pairs.map((p) => [p.activity.externalId, p.log.id])).toEqual([['test:a1', 'log_1']]);
  });

  it('pairs a length that is far off when it is the only one of that sort that day', () => {
    expect(pairWithManualLogs([activity({ durationSec: 95 * 60 })], [hand()])).toHaveLength(1);
  });

  it('does not pair another day, another sort or a log that already belongs to a watch', () => {
    expect(pairWithManualLogs([activity()], [hand({ completedDate: '2026-10-14' })])).toHaveLength(0);
    expect(pairWithManualLogs([activity({ kind: 'ride' })], [hand()])).toHaveLength(0);
    expect(pairWithManualLogs([activity()], [hand({ externalId: 'test:other', source: 'garmin' })])).toHaveLength(0);
  });

  it('pairs a strength activity with a strength log, but not with a run', () => {
    const lift = hand({ id: 'lift', templateId: 'tpl_lower_a', type: 'strength', sport: undefined, cardioData: undefined });
    expect(pairWithManualLogs([activity({ kind: 'strength' })], [lift])).toHaveLength(1);
    expect(pairWithManualLogs([activity({ kind: 'strength' })], [hand()])).toHaveLength(0);
  });

  it('pairs two runs of one day by length, each log and activity once', () => {
    const logs = [hand({ id: 'short', durationMinutes: 20 }), hand({ id: 'long', durationMinutes: 45 })];
    const acts = [
      activity({ externalId: 'test:long', start: '2026-10-15T17:00:00', durationSec: 44 * 60 }),
      activity({ externalId: 'test:short', start: '2026-10-15T07:00:00', durationSec: 22 * 60 }),
    ];
    const pairs = pairWithManualLogs(acts, logs);
    expect(pairs.map((p) => `${p.log.id}:${p.activity.externalId}`).sort()).toEqual(['long:test:long', 'short:test:short']);
  });

  it('leaves the second activity a proposal when one log can hold only one', () => {
    const pairs = pairWithManualLogs(
      [activity({ externalId: 'test:warm', durationSec: 12 * 60 }), activity({ externalId: 'test:main', durationSec: 56 * 60 })],
      [hand()],
    );
    expect(pairs.map((p) => p.activity.externalId)).toEqual(['test:main']);
  });

  it('does not guess when two logs and one activity are all far apart', () => {
    const logs = [hand({ id: 'a', durationMinutes: 15 }), hand({ id: 'b', durationMinutes: 120 })];
    expect(pairWithManualLogs([activity({ durationSec: 60 * 60 })], logs)).toHaveLength(0);
  });

  it('keeps a walk next to a typed-in run apart: the walk stays a proposal', () => {
    const walk = activity({ externalId: 'test:walk', kind: 'hike', durationSec: 40 * 60, start: '2026-10-15T12:00:00' });
    expect(pairWithManualLogs([walk], [hand()])).toHaveLength(0);
    const planned = [{ id: 'p1', templateId: 'tpl_easy_run', scheduledDate: '2026-10-15', weekStartDate: '2026-10-12', status: 'planned' as const, order: 0 }];
    expect(pendingProposals([walk, activity()], [], planned, templates, [hand()]).map((p) => p.activity.externalId)).toEqual(['test:walk']);
  });

  it('pairs a walk with a rest-day walk typed in by hand', () => {
    const walkLog = hand({ id: 'walk', templateId: 'tpl_herstel', type: 'recovery', sport: undefined, durationMinutes: 35, cardioData: { durationMinutes: 35, modality: 'recovery_walk', source: 'manual' } });
    const walk = activity({ externalId: 'test:walk', kind: 'hike', durationSec: 38 * 60 });
    expect(pairWithManualLogs([walk], [walkLog]).map((p) => p.log.id)).toEqual(['walk']);
  });
});

describe('alignItemFor and describeChanges', () => {
  it('tells what changes in plain words', () => {
    const item = alignItemFor(hand(), activity())!;
    expect(describeChanges(item)).toEqual([
      '55 min blijft',
      '6,9 km wordt 7,1 km',
      'stijging 30 m wordt 42 m',
      'daling 40 m komt erbij',
      'hartslag 152 komt erbij',
      'hoogste hartslag 171 komt erbij',
    ]);
  });

  it('tells a changed length as a change', () => {
    const item = alignItemFor(hand({ durationMinutes: 50, cardioData: { durationMinutes: 50, source: 'manual' } }), activity())!;
    expect(describeChanges(item)[0]).toBe('50 min wordt 55 min');
  });

  it('leaves a value alone that is the same at the precision you see', () => {
    const item = alignItemFor(hand(), activity({ distanceM: 6930, elevationGainM: 30, elevationLossM: undefined, avgHeartRate: undefined, maxHeartRate: undefined }));
    expect(item).toBeUndefined();
  });

  it('is nothing for a log from a watch, a strength session or an activity that says nothing new', () => {
    expect(alignItemFor(hand({ source: 'garmin', externalId: 'test:x' }), activity())).toBeUndefined();
    expect(alignItemFor(hand({ type: 'strength' }), activity())).toBeUndefined();
  });

  it('keeps the climb of a treadmill as it was typed, and fills it only into a gap', () => {
    const treadmill = activity({ treadmill: true, elevationGainM: 5, elevationLossM: 4 });
    const typed = hand({ cardioData: { durationMinutes: 55, distanceKm: 6.9, elevationGainM: 80, environment: 'treadmill', estimatedElevation: true, source: 'manual' } });
    const item = alignItemFor(typed, treadmill)!;
    expect(item.changes.map((c) => c.field)).not.toContain('elevationGainM');
    const noClimb = hand({ cardioData: { durationMinutes: 55, distanceKm: 6.9, source: 'manual' } });
    const gap = alignItemFor(noClimb, treadmill)!;
    expect(gap.changes.map((c) => c.field)).toContain('elevationGainM');
    const applied = applyAlignment(noClimb, treadmill, NOW);
    expect(applied.cardioData?.estimatedElevation).toBe(true);
    expect(restoreManual(applied)).toEqual(noClimb);
  });
});

describe('applyAlignment', () => {
  it('takes over what the watch measured and ties the log to the activity', () => {
    const aligned = applyAlignment(hand(), activity(), NOW);
    expect(aligned.source).toBe('garmin');
    expect(aligned.externalId).toBe('test:a1');
    expect(aligned.durationMinutes).toBe(55);
    expect(aligned.cardioData).toMatchObject({ durationMinutes: 55, distanceKm: 7.1, elevationGainM: 42, elevationLossM: 40, avgHeartRate: 152, maxHeartRate: 171, source: 'garmin' });
    expect(aligned.manualMeasured).toMatchObject({ at: NOW.toISOString(), block: 'cardioData', blockSource: 'manual', values: { distanceKm: 6.9, elevationGainM: 30, elevationLossM: null, avgHeartRate: null, maxHeartRate: null } });
    expect(aligned.manualMeasured?.values.durationMinutes).toBeUndefined();
  });

  it('never touches what the user filled in himself', () => {
    const typed = hand({
      type: 'hiking',
      cardioData: undefined,
      outdoorData: { durationMinutes: 55, backpackWeightKg: 12, poles: true, terrain: 'bospad', weatherNotes: 'regen', source: 'manual' },
      workout: { reps: 4 },
      legsAtStart: 'zwaar',
    });
    const aligned = applyAlignment(typed, activity({ kind: 'hike' }), NOW);
    expect(aligned.outdoorData).toMatchObject({ backpackWeightKg: 12, poles: true, terrain: 'bospad', weatherNotes: 'regen' });
    for (const key of ['rpe', 'subjectiveFeel', 'notes', 'painAreas', 'workout', 'legsAtStart', 'variant', 'completedAt', 'templateId', 'plannedSessionId'] as const) {
      expect(aligned[key]).toEqual(typed[key]);
    }
  });

  it('keeps the hand-made value where the watch has none', () => {
    const aligned = applyAlignment(hand(), activity({ distanceM: undefined, elevationGainM: undefined, elevationLossM: undefined, maxHeartRate: undefined }), NOW);
    expect(aligned.cardioData).toMatchObject({ distanceKm: 6.9, elevationGainM: 30, avgHeartRate: 152 });
    expect(aligned.cardioData?.maxHeartRate).toBeUndefined();
    expect(aligned.manualMeasured?.values).toEqual({ avgHeartRate: null });
  });

  it('makes the block when the log had none, and takes it away again on restore', () => {
    const bare = hand({ cardioData: undefined });
    const aligned = applyAlignment(bare, activity(), NOW);
    expect(aligned.cardioData).toMatchObject({ distanceKm: 7.1, avgHeartRate: 152, source: 'garmin' });
    expect(aligned.manualMeasured?.blockAdded).toBe(true);
    expect(restoreManual(aligned)).toEqual(bare);
  });

  it('puts every hand-made number back, also with a changed length and a hike', () => {
    const typed = hand({ type: 'hiking', cardioData: undefined, outdoorData: { durationMinutes: 130, distanceKm: 11, elevationGainM: 600, backpackWeightKg: 9, source: 'manual' }, durationMinutes: 130 });
    const walk = activity({ kind: 'hike', durationSec: 141 * 60, distanceM: 12800, elevationGainM: 655 });
    const aligned = applyAlignment(typed, walk, NOW);
    expect(aligned.durationMinutes).toBe(141);
    expect(aligned.outdoorData?.durationMinutes).toBe(141);
    expect(restoreManual(aligned)).toEqual(typed);
  });

  it('does nothing to a log the watch has nothing new for', () => {
    const typed = hand();
    expect(applyAlignment(typed, activity({ distanceM: 6930, elevationGainM: 30, elevationLossM: undefined, avgHeartRate: undefined, maxHeartRate: undefined }), NOW)).toBe(typed);
  });

  it('keeps the feedback given after the watch took over when putting back', () => {
    const aligned = applyAlignment(hand({ rpe: undefined }), activity(), NOW);
    const answered = { ...aligned, rpe: 6 };
    expect(restoreManual(answered).rpe).toBe(6);
  });

  it('a second pass finds nothing: the log is tied to the activity now', () => {
    const logs = [hand()];
    const acts = [activity()];
    const first = planAlignment(acts, logs);
    expect(first).toHaveLength(1);
    const aligned = logs.map((l) => applyAlignment(l, first[0].activity, NOW));
    expect(planAlignment(acts, aligned)).toEqual([]);
  });
});

describe('planAlignment', () => {
  const acts = [activity(), activity({ externalId: 'test:a2', start: '2026-10-20T07:30:00' })];
  const logs = [hand(), hand({ id: 'log_2', completedDate: '2026-10-20' })];

  it('lists the newest first', () => {
    expect(planAlignment(acts, logs).map((i) => i.log.id)).toEqual(['log_2', 'log_1']);
  });

  it('leaves out what was refused or taken back, and what is older than asked', () => {
    expect(planAlignment(acts, logs, { declined: ['test:a2'] }).map((i) => i.log.id)).toEqual(['log_1']);
    expect(planAlignment(acts, logs, { since: '2026-10-16' }).map((i) => i.log.id)).toEqual(['log_2']);
  });

  it('does not let a refused activity hand its log to a neighbour', () => {
    const near = activity({ externalId: 'test:near', start: '2026-10-15T19:00:00', durationSec: 56 * 60 });
    const items = planAlignment([activity(), near], [hand()], { declined: ['test:a1', 'test:near'] });
    expect(items).toEqual([]);
  });

  it('never uses an activity another log already carries', () => {
    const taken = hand({ id: 'log_t', completedDate: '2026-10-15', durationMinutes: 56, source: 'garmin', externalId: 'test:a1' });
    expect(planAlignment([acts[0]], [taken, hand()])).toEqual([]);
  });

  it('leaves out strength activities', () => {
    expect(planAlignment([activity({ kind: 'strength' })], [hand({ type: 'strength' })])).toEqual([]);
  });
});

describe('helpers', () => {
  it('merges the recent and the old activities without doubles', () => {
    const merged = mergeActivities([activity({ externalId: 'x', avgHeartRate: 150 })], [activity({ externalId: 'x', avgHeartRate: 1 }), activity({ externalId: 'y' })]);
    expect(merged.map((a) => a.externalId)).toEqual(['x', 'y']);
    expect(merged[0].avgHeartRate).toBe(150);
  });

  it('starts the old fetch at the oldest typed-in log, 120 days at most', () => {
    expect(HISTORY_MAX_DAYS).toBe(120);
    expect(AUTO_DAYS).toBe(7);
    expect(historyStart([hand({ completedDate: '2026-10-01' }), hand({ id: 'b', completedDate: '2026-10-10' })], '2026-10-22')).toBe('2026-10-01');
    expect(historyStart([hand({ completedDate: '2025-01-01' })], '2026-10-22')).toBe('2026-06-24');
    expect(historyStart([hand({ source: 'garmin', externalId: 'x' }), hand({ id: 'c', type: 'strength' })], '2026-10-22')).toBeUndefined();
  });

  it('lists the hand-made numbers of a matched log', () => {
    expect(describeManualLine(applyAlignment(hand(), activity(), NOW))).toBe('Eerst met de hand: 6,9 km, stijging 30 m');
    expect(describeManualLine(hand())).toBe('');
    const filled = applyAlignment(hand(), activity({ distanceM: 6930, elevationGainM: 30, elevationLossM: undefined, maxHeartRate: undefined }), NOW);
    expect(describeManualLine(filled)).toBe('Het horloge vulde aan: hartslag. Je eigen cijfers bleven staan.');
  });
});

describe('the planning counts with the new numbers', () => {
  it('the leg index reads the descent and length of the aligned log', () => {
    const typed = hand({
      id: 'hike', templateId: 'tpl_mountain_hike', type: 'hiking', sport: 'hiking', durationMinutes: 120, cardioData: undefined,
      outdoorData: { durationMinutes: 120, distanceKm: 9, elevationGainM: 300, elevationLossM: 300, backpackWeightKg: 8, source: 'manual' },
    });
    const watchHike = activity({ kind: 'hike', durationSec: 190 * 60, distanceM: 13000, elevationGainM: 1100, elevationLossM: 1080 });
    const aligned = applyAlignment(typed, watchHike, NOW);
    const index = (log: SessionLog) => legFatigueOn('2026-10-16', { logs: [log], plannedSessions: [], templates, today: '2026-12-31' }).index;
    expect(aligned.durationMinutes).toBe(190);
    expect(index(aligned)).toBeGreaterThan(index(typed));
    // And putting back gives the old index again.
    expect(index(restoreManual(aligned))).toBe(index(typed));
  });
});
