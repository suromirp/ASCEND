// ASCEND: wat loslaten op een training in Week doet (instelling "Loslaten op een training",
// docs/beslissingen/2026-11-02-ruilen-zoals-verplaatsen.md). Ruilen is het advies: staat er op de dag precies
// één training die mag bewegen, dan ruilen de twee van dag (engine/weekSwap.ts). Samen is hoe het eerst was:
// de training komt erbij op die dag. Het actieblad biedt Ruilen altijd, los van deze keuze.

import type { AppSettings } from '../storage/database';

export type DropOnTraining = 'swap' | 'together';
export const DROP_ON_TRAINING_ADVICE: DropOnTraining = 'swap';

// Het veld hoort bij AppSettings. storage/database.ts wordt in ronde 3 opgesplitst en blijft daarom nu
// ongemoeid: tot dan staat het hier, via declaration merging. Afwezig is het advies; een back-up zonder dit
// veld blijft gewoon te lezen, en een onbekende waarde telt als het advies (resolveDropOnTraining).
declare module '../storage/database' {
  interface AppSettings {
    dropOnTraining?: DropOnTraining;
  }
}

export function resolveDropOnTraining(s: Pick<AppSettings, 'dropOnTraining'> | undefined): DropOnTraining {
  return s?.dropOnTraining === 'together' ? 'together' : DROP_ON_TRAINING_ADVICE;
}
