// ASCEND — shared body-area vocabularies for chip/dropdown pickers.
//
// Both lists back plain string[]/string fields that are deliberately NOT
// closed union types (StrengthProgramStrategy.musclePriorities/
// muscleMaintenance, models/injury.ts's InjuryNote.bodyPart) — the model
// never needs a change to record a value outside this list. This file only
// gives the UI a fast, typo-proof default menu; every picker built on it
// still allows free text for anything not listed here.

export const MUSCLE_GROUP_OPTIONS = [
  'Borst', 'Rug', 'Schouders', 'Armen', 'Benen', 'Core', 'Onderrug', 'Nek',
] as const;

export const BODY_PART_OPTIONS = [
  'Knie', 'Enkel', 'Heup', 'Onderrug', 'Bovenrug', 'Schouder', 'Elleboog', 'Pols',
  'Nek', 'Hamstring', 'Kuit', 'Voet', 'Achillespees', 'Quadriceps', 'Scheen',
] as const;

// After a run or a hike: the spots that usually speak up first.
export const PAIN_AREA_OPTIONS = [
  'Knie', 'Scheen', 'Kuit', 'Achillespees', 'Enkel', 'Voet', 'Heup', 'Hamstring', 'Onderrug',
] as const;
