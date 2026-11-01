// ASCEND: het archief met ochtenden (docs/beslissingen/2026-11-01-ochtenden-archief.md).
//
// Met "Ochtendgetallen in back-up" aan blijven de opgehaalde ochtenden (datum en vier getallen)
// ook na ontkoppelen op deze telefoon. Alleen het uitzetten van die instelling zonder koppeling
// ruimt ze op; de instellingenpagina vraagt dat eerst en biedt daarna Ongedaan maken.

import { RecoveryMetricsRepo } from './database';
import { getConnection } from './externalActivities';
import { archiveToClear, morningsToPutBack } from '../engine/morningBackup';
import { INTERVALS_ADAPTER_ID } from '../integrations/intervalsIcu';
import type { RecoveryMetric } from '../models/metrics';

// De ochtenden die alleen nog voor de back-up bewaard worden: leeg zolang er een koppeling is.
export async function archivedMornings(): Promise<RecoveryMetric[]> {
  const connected = !!(await getConnection());
  return archiveToClear(await RecoveryMetricsRepo.getAll(), { connected, fetchedPrefix: `${INTERVALS_ADAPTER_ID}:` });
}

// Ruimt ze op en geeft terug wat weg is, zodat Ongedaan maken het kan terugzetten.
export async function clearArchivedMornings(): Promise<RecoveryMetric[]> {
  const removed = await archivedMornings();
  for (const r of removed) await RecoveryMetricsRepo.delete(r.id);
  return removed;
}

// Ongedaan maken: alleen wat er nu niet staat komt terug.
export async function putBackMornings(removed: readonly RecoveryMetric[]): Promise<void> {
  const back = morningsToPutBack(removed, await RecoveryMetricsRepo.getAll());
  if (back.length > 0) await RecoveryMetricsRepo.putAll(back);
}
