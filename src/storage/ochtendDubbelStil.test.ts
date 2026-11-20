import { beforeEach, describe, expect, it, vi } from 'vitest';

// Het opruimen van dubbele ochtenden gooit hier altijd: wat eromheen staat mag daar niet van vallen
// (docs/beslissingen/2026-11-20-ochtend-zonder-bron.md, Warden G3). Nagemaakte ochtenden.
vi.mock('../engine/morningDouble', async (original) => ({
  ...(await original<typeof import('../engine/morningDouble')>()),
  doubleMornings: () => {
    throw new Error('opruimen hapert');
  },
}));

import { RecoveryMetricsRepo, wipeAllData } from './database';
import { clearConnection, getConnection, saveConnection } from './externalActivities';
import { syncWellness, tidyDoubleMornings } from './wellness';
import type { RecoveryMetric } from '../models/metrics';

const TODAY = '2026-11-20';
const CONNECTION = { athleteId: 'i12345', apiKey: 'nagemaakte-sleutel-0123' };
const sourceless: RecoveryMetric = { id: 'import:2026-11-10', date: '2026-11-10', source: 'import', restingHeartRate: 58 };
const fetched: RecoveryMetric = { id: 'intervals.icu:2026-11-10', date: '2026-11-10', source: 'import', restingHeartRate: 50 };

beforeEach(async () => {
  await wipeAllData();
});

describe('opruimen dat hapert', () => {
  it('de stap zelf gooit en laat de opslag gelijk', async () => {
    await RecoveryMetricsRepo.putAll([sourceless, fetched]);
    await expect(tidyDoubleMornings()).rejects.toThrow('opruimen hapert');
    expect(await RecoveryMetricsRepo.getAll()).toEqual([sourceless, fetched]);
  });

  it('ontkoppelen slaagt toch: de sleutel is weg en de ochtend zonder bron staat er nog', async () => {
    await saveConnection(CONNECTION);
    await RecoveryMetricsRepo.putAll([sourceless, fetched]);
    await expect(clearConnection()).resolves.toBeUndefined();
    expect(await getConnection()).toBeFalsy();
    expect((await RecoveryMetricsRepo.getAll()).map((m) => m.id)).toContain('import:2026-11-10');
  });

  it('een ronde ophalen slaagt toch', async () => {
    await RecoveryMetricsRepo.putAll([sourceless]);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ id: '2026-11-10', restingHR: 50 }]), { status: 200 })) as unknown as typeof fetch;
    expect(await syncWellness(CONNECTION, { fetchImpl, today: TODAY })).toMatchObject({ status: 'ok', days: 1 });
    expect((await RecoveryMetricsRepo.getAll()).map((m) => m.id).sort()).toEqual(['import:2026-11-10', 'intervals.icu:2026-11-10']);
  });
});
