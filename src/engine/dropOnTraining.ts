// ASCEND: wat loslaten op een training in Week doet (instelling "Loslaten op een training",
// docs/beslissingen/2026-11-02-ruilen-zoals-verplaatsen.md). Ruilen is het advies: staat er op de dag precies
// één training die mag bewegen, dan ruilen de twee van dag (engine/weekSwap.ts). Samen is hoe het eerst was:
// de training komt erbij op die dag. Het actieblad biedt Ruilen altijd, los van deze keuze.

import type { AppSettings } from '../storage/database';

// Het veld staat in AppSettings (storage/databaseSettings.ts); de back-up laat een kapotte waarde weg
// (storage/backupClean.ts#cleanSettings). Afwezig of onbekend is het advies.
export type DropOnTraining = NonNullable<AppSettings['dropOnTraining']>;
const DROP_ON_TRAINING_ADVICE: DropOnTraining = 'swap';

export function resolveDropOnTraining(s: Pick<AppSettings, 'dropOnTraining'> | undefined): DropOnTraining {
  return s?.dropOnTraining === 'together' ? 'together' : DROP_ON_TRAINING_ADVICE;
}
