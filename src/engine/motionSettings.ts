// ASCEND: de instelling "Beweging" (docs/beslissingen/2026-10-24-beweging.md).
// Optioneel en zonder migratie: ontbreekt de sleutel of staat er iets geks, dan
// geldt het advies (Normaal). `prefers-reduced-motion: reduce` gedraagt zich
// altijd als Uit, wat hier ook gekozen is.
//
// - 'full' (Normaal): tikfeedback, overgangen, vullen en optellen, de adem van de missiekaart.
// - 'calm' (Rustig): alleen tikfeedback en overgangen, geen adem, puls of optellen.
// - 'off' (Uit): alles direct op de eindstand.
export type MotionMode = 'full' | 'calm' | 'off';

export const MOTION_MODES: MotionMode[] = ['full', 'calm', 'off'];
export const DEFAULT_MOTION: MotionMode = 'full';

export function resolveMotion(raw: { motion?: unknown } | undefined, prefersReduced = false): MotionMode {
  if (prefersReduced) return 'off';
  return MOTION_MODES.find((m) => m === raw?.motion) ?? DEFAULT_MOTION;
}
