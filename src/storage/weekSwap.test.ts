// Een ruil schrijft beide rijen of geen van beide; ongedaan maken zet ze allebei terug.
import { describe, it, expect, beforeEach } from 'vitest';
import { wipeAllData, seedIfEmpty, PlannedSessionsRepo, SessionLogsRepo } from './database';
import { writeSwap, SWAP_STALE } from './weekSwap';
import { undoPlanChangeNow } from './undoPlanChange';
import type { PlannedSession, SessionLog } from '../models/training';

const lock = { by: 'user' as const, at: '2026-09-29T08:00:00.000Z' };
const a: PlannedSession = { id: 'ruil-a', templateId: 'tpl_easy_run', scheduledDate: '2026-10-01', weekStartDate: '2026-09-28', status: 'planned', order: 1 };
const b: PlannedSession = { id: 'ruil-b', templateId: 'tpl_upper_a', scheduledDate: '2026-10-03', weekStartDate: '2026-09-28', status: 'planned', order: 1 };
const change = { aId: a.id, aFrom: a.scheduledDate, bId: b.id, bFrom: b.scheduledDate };

describe('een ruil wegschrijven', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty({ withProgram: false });
    await PlannedSessionsRepo.put(a);
    await PlannedSessionsRepo.put(b);
  });

  it('beide ruilen van dag, met jouw slot en waar ze vandaan kwamen', async () => {
    await writeSwap(change, lock);
    const rows = await PlannedSessionsRepo.getAll();
    expect(rows.find((s) => s.id === a.id)).toMatchObject({ scheduledDate: '2026-10-03', status: 'moved', movedFromDate: '2026-10-01', lock });
    expect(rows.find((s) => s.id === b.id)).toMatchObject({ scheduledDate: '2026-10-01', status: 'moved', movedFromDate: '2026-10-03', lock });
  });

  it('is er intussen een gelogd, dan blijven ze allebei staan', async () => {
    await SessionLogsRepo.put({ id: 'log-b', plannedSessionId: b.id, templateId: b.templateId, type: 'strength', variant: 'full', completedDate: '2026-10-03', completedAt: '2026-10-03T08:00:00.000Z', source: 'manual', durationMinutes: 50 } as unknown as SessionLog);
    await expect(writeSwap(change, lock)).rejects.toThrow(SWAP_STALE);
    const rows = await PlannedSessionsRepo.getAll();
    expect(rows.find((s) => s.id === a.id)).toEqual(a);
    expect(rows.find((s) => s.id === b.id)).toEqual(b);
  });

  it('staat er een al op een andere dag, dan schrijft hij niets', async () => {
    await expect(writeSwap({ ...change, bFrom: '2026-10-02' }, lock)).rejects.toThrow(SWAP_STALE);
    expect((await PlannedSessionsRepo.getAll()).find((s) => s.id === a.id)).toEqual(a);
  });

  it('ongedaan maken zet beide terug', async () => {
    const { before } = await writeSwap(change, lock);
    await undoPlanChangeNow({ id: 'u1', trigger: 'session_moved', title: 'Rustige duurloop en Bovenlichaam A geruild', lines: [], why: '', before, addedIds: [], createdAt: lock.at });
    const rows = await PlannedSessionsRepo.getAll();
    expect(rows.find((s) => s.id === a.id)).toEqual(a);
    expect(rows.find((s) => s.id === b.id)).toEqual(b);
  });
});
