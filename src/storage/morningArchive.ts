// ASCEND: het archief met ochtenden (docs/beslissingen/2026-11-01-ochtenden-archief.md).
//
// Met "Ochtendgetallen in back-up" aan blijven de opgehaalde ochtenden (datum en vier getallen)
// ook na ontkoppelen op deze telefoon. Uitzetten zonder koppeling ruimt ze op; met een koppeling
// haalt de volgende keer ophalen het deel van langer dan 400 dagen geleden weg. De
// instellingenpagina vraagt dat eerst en biedt daarna Ongedaan maken.

import { RecoveryMetricsRepo } from './database';
import { getConnection, notifyWatchChange } from './externalActivities';
import { archiveToClear, morningsToPutBack } from '../engine/morningBackup';
import { INTERVALS_ADAPTER_ID } from '../integrations/intervalsIcu';
import type { RecoveryMetric } from '../models/metrics';
import { todayISO } from '../utils/dates';

export interface ArchivedMornings {
  // Er is een koppeling (ook met een verlopen sleutel): dan gaat alleen het oude deel weg.
  linked: boolean;
  list: RecoveryMetric[];
}

// Wat er verdwijnt als je de instelling uitzet. De pagina bewaart deze lijst voor Ongedaan maken.
export async function archivedMornings(today: string = todayISO()): Promise<ArchivedMornings> {
  const linked = !!(await getConnection());
  return { linked, list: archiveToClear(await RecoveryMetricsRepo.getAll(), { connected: linked, fetchedPrefix: `${INTERVALS_ADAPTER_ID}:`, today }) };
}

// Alles of niets, in één transactie.
export async function clearArchivedMornings(list: readonly RecoveryMetric[]): Promise<void> {
  if (list.length === 0) return;
  await RecoveryMetricsRepo.deleteMany(list.map((r) => r.id));
  notifyWatchChange();
}

// Ongedaan maken: alleen wat er nu niet staat komt terug.
export async function putBackMornings(list: readonly RecoveryMetric[]): Promise<void> {
  const back = morningsToPutBack(list, await RecoveryMetricsRepo.getAll());
  if (back.length === 0) return;
  await RecoveryMetricsRepo.putAll(back);
  notifyWatchChange();
}
