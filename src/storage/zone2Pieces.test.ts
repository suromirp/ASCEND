import { beforeEach, describe, expect, it } from 'vitest';
import { ActivityStreamsRepo, SessionLogsRepo, wipeAllData } from './database';
import { ensureZone2Pieces } from './zone2Pieces';
import { migrateLogZone2Pieces } from './migrations';
import { packStreams } from '../engine/streamPack';
import type { StreamSet } from '../models/activityDetail';
import type { SessionLog } from '../models/training';

// Nagemaakt: 40 minuten vlak op 3 m/s, hartslag 140, één punt per seconde.
function flatRun(): StreamSet {
  const timeSec: number[] = [];
  const distanceM: number[] = [];
  const heartRate: number[] = [];
  const altitudeM: number[] = [];
  for (let t = 0; t < 2400; t++) {
    timeSec.push(t);
    distanceM.push(3 * (t + 1));
    heartRate.push(140 + (t % 3) - 1);
    altitudeM.push(20);
  }
  return { timeSec, distanceM, heartRate, altitudeM };
}

const KM = 7.2;
const MINUTES = 40;
const log = (over: Partial<SessionLog> = {}): SessionLog => ({
  id: 'log_z',
  templateId: 'tpl_easy_run',
  type: 'cardio',
  sport: 'running',
  completedDate: '2026-11-05',
  completedAt: '2026-11-05T08:00:00.000Z',
  variant: 'custom',
  durationMinutes: MINUTES,
  source: 'garmin',
  externalId: 'bron:z',
  cardioData: { durationMinutes: MINUTES, distanceKm: KM, avgHeartRate: 140, environment: 'outdoor', source: 'garmin' },
  ...over,
});

describe('stabiele stukken op het log', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('zet ze één keer op een oudere loop met een bewaarde reeks en raakt geen gemeten getal aan', async () => {
    await SessionLogsRepo.put(log());
    await ActivityStreamsRepo.put(packStreams(flatRun(), { logId: 'log_z', externalId: 'bron:z', fetchedAt: '2026-11-05T09:00:00.000Z', wholeKm: KM, wholeMinutes: MINUTES })!);
    expect(await ensureZone2Pieces()).toBe(true);
    const after = (await SessionLogsRepo.getAll())[0];
    expect(after.zone2Pieces?.pieces).toHaveLength(1);
    expect({ ...after, zone2Pieces: undefined }).toEqual({ ...log(), zone2Pieces: undefined });
    // Een tweede keer: niets erbij, niets overschreven.
    expect(await ensureZone2Pieces()).toBe(false);
    expect((await SessionLogsRepo.getAll())[0].zone2Pieces).toEqual(after.zone2Pieces);
  });

  it('schrijft een bestaand veld voor dezelfde totalen nooit over', async () => {
    const kept = { version: 1 as const, wholeKm: KM, wholeMinutes: MINUTES, builtAt: 'eerder', pieces: [] };
    await SessionLogsRepo.put(log({ zone2Pieces: kept }));
    await ActivityStreamsRepo.put(packStreams(flatRun(), { logId: 'log_z', externalId: 'bron:z', fetchedAt: '2026-11-05T09:00:00.000Z', wholeKm: KM, wholeMinutes: MINUTES })!);
    expect(await ensureZone2Pieces()).toBe(false);
    expect((await SessionLogsRepo.getAll())[0].zone2Pieces).toEqual(kept);
  });

  it('niet op een loopband en niet zonder bewaarde reeks', async () => {
    await SessionLogsRepo.put(log({ cardioData: { durationMinutes: MINUTES, distanceKm: KM, environment: 'treadmill', source: 'garmin' } }));
    await ActivityStreamsRepo.put(packStreams(flatRun(), { logId: 'log_z', externalId: 'bron:z', fetchedAt: '2026-11-05T09:00:00.000Z', wholeKm: KM, wholeMinutes: MINUTES })!);
    expect(await ensureZone2Pieces()).toBe(false);
    await wipeAllData();
    await SessionLogsRepo.put(log());
    expect(await ensureZone2Pieces()).toBe(false);
  });
});

describe('migrateLogZone2Pieces', () => {
  const pieces = { version: 1, wholeKm: KM, wholeMinutes: MINUTES, builtAt: '2026-11-05T09:00:00.000Z', pieces: [{ from: 'stream', startSec: 600, endSec: 2400, sec: 1800, distanceM: 5400, hr: 140, paceSecKm: 333.3, flat: true, gradePct: 0 }] };

  it('laat een log van voor de stukken zoals het was', () => {
    expect(migrateLogZone2Pieces(log())).toEqual(log());
  });

  it('houdt een heel veld en laat een beschadigd veld vallen, met de rest van het log', () => {
    expect(migrateLogZone2Pieces({ ...log(), zone2Pieces: pieces } as SessionLog).zone2Pieces).toEqual(pieces);
    const damaged = migrateLogZone2Pieces({ ...log(), zone2Pieces: { ...pieces, pieces: [{ ...pieces.pieces[0], hr: -1 }] } } as unknown as SessionLog);
    expect('zone2Pieces' in damaged).toBe(false);
    expect(damaged).toEqual(log());
  });
});
