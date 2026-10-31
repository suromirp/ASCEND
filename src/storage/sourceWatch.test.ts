import { beforeEach, describe, expect, it } from 'vitest';
import { MetaRepo, RecoveryMetricsRepo, wipeAllData } from './database';
import { saveConnection } from './externalActivities';
import { dismissSourceSilence, readSourceSilence } from './sourceWatch';
import { addDays, todayISO } from '../utils/dates';

// Nagemaakte koppeling en ochtenden: geen netwerk, geen echte sleutel.
const today = todayISO();

beforeEach(async () => {
  await wipeAllData();
  await saveConnection({ athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' });
  await MetaRepo.set('watchActivities', { fetchedAt: new Date().toISOString(), activities: [], history: [] });
  const mornings = [10, 9, 8, 7, 6, 5, 4].map((n) => ({ id: `intervals.icu:${addDays(today, -n)}`, date: addDays(today, -n), source: 'import' as const, restingHeartRate: 50 }));
  await RecoveryMetricsRepo.putAll(mornings);
});

describe('bronbewaking in de opslag', () => {
  it('ziet dat de ochtenden stoppen en verbergt het na Begrepen', async () => {
    const silence = await readSourceSilence([], {}, today);
    expect(silence?.kind).toBe('mornings');
    await dismissSourceSilence(silence!);
    expect(await readSourceSilence([], {}, today)).toBeUndefined();
  });

  it('zegt niets als de instelling uit staat of er geen koppeling is', async () => {
    expect(await readSourceSilence([], { watchSilence: false }, today)).toBeUndefined();
    await MetaRepo.set('intervalsIcuConnection', null);
    expect(await readSourceSilence([], {}, today)).toBeUndefined();
  });
});
