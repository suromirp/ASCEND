// ASCEND: het verloop van een training in Forge, zoals het wordt bewaard. Geen React, geen opslag;
// de regels staan in engine/forgeLog.ts. Besluit: docs/beslissingen/2026-10-28-forge-logboek.md.

export const FORGE_EVENT_KINDS = ['bijgestuurd', 'doorgevoerd', 'eigen', 'onder', 'past-niet', 'spotter', 'toegevoegd', 'weggehaald'] as const;
export type ForgeEventKind = (typeof FORGE_EVENT_KINDS)[number];

// De stand van een set: kilo's, herhalingen en reserve.
export interface ForgeSetState {
  kg?: number;
  reps?: number;
  rir?: number;
}

export interface ForgeEvent {
  id: string;
  // Het moment, in milliseconden sinds 1970.
  at: number;
  exerciseId: string;
  // De naam van de oefening zoals die toen op het scherm stond.
  exercise: string;
  rowId: string;
  // "1", "2" voor een werkset, "W1" voor een opwarmset, "1 tot 3" bij een heel voorschrift.
  set: string;
  kind: ForgeEventKind;
  from?: ForgeSetState;
  to?: ForgeSetState;
  // Een korte zin met het feit erbij ("Geen gewicht van dit toestel past bij 8 tot 10 herhalingen.").
  fact?: string;
  // Bij doorgevoerd: de set waar je wijziging vandaan kwam.
  via?: string;
}
