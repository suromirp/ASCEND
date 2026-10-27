import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import type { SessionLog } from '../models/training';
import type { ActivityStreams } from '../models/activityStreams';

// The upgrade from version 8, the one before the store of full series. A user who has the app
// installed opens it after the update: nothing may be lost, and the new store must be there.
// This file has its own database (every test file does), so it can build version 8 by hand.

const V8_STORES = [
  'meta', 'programs', 'sessionTemplates', 'plannedSessions', 'sessionLogs', 'objectives', 'milestoneProgress',
  'recoveryMetrics', 'bodyMetrics', 'nutritionMetrics', 'injuryNotes', 'backupSnapshots', 'trainingGoals',
  'goalMilestones', 'goalMilestoneProgress', 'trainingPrescriptions', 'capabilityEvidence', 'planChangeProposals',
  'strengthProgramStrategies', 'strengthProgramRecommendations', 'weeklyPrescriptions',
];

describe('upgrading the database from version 8', () => {
  it('keeps every row of the old stores and adds the store of series', async () => {
    const old = await openDB('ascend-db', 8, {
      upgrade(db) {
        for (const name of V8_STORES) {
          if (name === 'meta') db.createObjectStore(name);
          else {
            const store = db.createObjectStore(name, { keyPath: 'id' });
            if (name === 'plannedSessions') {
              store.createIndex('by-week', 'weekStartDate');
              store.createIndex('by-date', 'scheduledDate');
            }
            if (name === 'sessionLogs') store.createIndex('by-date', 'completedDate');
            if (name === 'milestoneProgress') store.createIndex('by-objective', 'objectiveId');
            if (name === 'goalMilestones' || name === 'goalMilestoneProgress') store.createIndex('by-goal', 'goalId');
            if (name === 'trainingPrescriptions') store.createIndex('by-plannedSession', 'plannedSessionId');
            if (name === 'weeklyPrescriptions') store.createIndex('by-week', 'weekStartDate');
          }
        }
      },
    });
    expect(old.objectStoreNames.contains('activityStreams')).toBe(false);
    const log: SessionLog = {
      id: 'log_old',
      templateId: 'tpl_easy_run',
      type: 'cardio',
      sport: 'running',
      completedDate: '2026-09-01',
      completedAt: '2026-09-01T07:00:00.000Z',
      variant: 'custom',
      durationMinutes: 40,
      externalId: 'intervals.icu:i1',
      source: 'garmin',
      bestEffort: { km: 5, minutes: 28 },
    };
    await old.put('sessionLogs', log);
    await old.put('meta', { restDay: 3, keepStreams: undefined }, 'settings');
    await old.put('trainingGoals', { id: 'goal_1', name: 'Doel' });
    old.close();

    const database = await import('./database');
    // The old rows are all there, untouched.
    expect(await database.SessionLogsRepo.getAll()).toEqual([log]);
    expect((await database.SettingsRepo.get()).restDay).toBe(3);
    expect((await database.TrainingGoalsRepo.getAll()).map((g) => g.id)).toEqual(['goal_1']);
    // The new store is there and empty, and works.
    const db = await database.getDB();
    expect(db.version).toBe(9);
    expect(db.objectStoreNames.contains('activityStreams')).toBe(true);
    expect(await database.ActivityStreamsRepo.getAll()).toEqual([]);
    const row: ActivityStreams = {
      logId: 'log_old', externalId: 'intervals.icu:i1', version: 1, fetchedAt: '2026-10-27T10:00:00.000Z', wholeKm: 6, wholeMinutes: 40, sampleCount: 2,
      series: { time: { type: 'u32', scale: 1, missing: 0xffffffff, data: new Uint32Array([0, 1]).buffer } },
    };
    await database.ActivityStreamsRepo.put(row);
    const back = await database.ActivityStreamsRepo.get('log_old');
    expect(back?.series.time?.data.byteLength).toBe(8);
    expect(Array.from(new Uint32Array(back!.series.time!.data))).toEqual([0, 1]);
    expect(await database.ActivityStreamsRepo.totalBytes()).toEqual({ bytes: 8, rows: 1 });

    // A log that goes takes its series with it; "Alles verwijderen" empties the store.
    await database.SessionLogsRepo.delete('log_old');
    expect(await database.ActivityStreamsRepo.get('log_old')).toBeUndefined();
    await database.ActivityStreamsRepo.put(row);
    await database.wipeAllData();
    expect(await database.ActivityStreamsRepo.getAll()).toEqual([]);
    // The reset behind the button "Alles verwijderen" does the same.
    await database.ActivityStreamsRepo.put(row);
    await database.resetToDemoData();
    expect(await database.ActivityStreamsRepo.getAll()).toEqual([]);
  });
});
