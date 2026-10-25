// ASCEND: de instelling "Intensiteit tellen" (docs/beslissingen/2026-10-25-intensiteit-gemeten.md).
// Je stand telt je loop- en wandelminuten naar je hartslag (het advies) of naar
// het plan. Optioneel en zonder migratie: ontbreekt de sleutel of staat er iets
// geks, dan geldt het advies.

export type IntensityCounting = 'heartrate' | 'plan';
export const INTENSITY_COUNTINGS: IntensityCounting[] = ['heartrate', 'plan'];
export const DEFAULT_INTENSITY_COUNTING: IntensityCounting = 'heartrate';

export function resolveIntensityCounting(raw: { intensityCounting?: unknown } | undefined): IntensityCounting {
  return INTENSITY_COUNTINGS.find((c) => c === raw?.intensityCounting) ?? DEFAULT_INTENSITY_COUNTING;
}
