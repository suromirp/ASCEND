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

// De ondergrens van het openingsscherm (state/AppDataContext.tsx). Het laden
// wacht hier nooit op: dit is alleen een vloer, zodat een snelle start de
// opbouw van het logo niet afknipt. Normaal: de opbouw duurt 2,2 s
// (.alogo-play in index.css) plus een korte stilte waarin het lichtpuntje al omhoog begint. Rustig: het korte tekenen
// van 0,8 s. Uit: het logo staat meteen, het blijft even in beeld.
export function splashMinimumMs(mode: MotionMode): number {
  if (mode === 'off') return 600;
  if (mode === 'calm') return 1200;
  return 2600;
}
