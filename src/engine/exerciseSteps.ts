// ASCEND: de drie stappen van een tekening bij een oefening, het rekenwerk
// (docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen.md). Zuiver en getest.

export type Step = 1 | 2 | 3;

// Een stap verder of terug, rond: na 3 komt 1, voor 1 komt 3. Alles wat geen 1, 2 of 3 is telt als 3, de eindstand.
export function stepBy(current: number, delta: number): Step {
  const base = current === 1 || current === 2 || current === 3 ? current : 3;
  return ((((base - 1 + delta) % 3) + 3) % 3 + 1) as Step;
}

// De rem op de tik bij een stap die je zelf zet: snel vegen mag niet gaan zoemen.
export const STEP_TAP_GAP_MS = 140;
export function mayTap(lastAt: number, now: number, gapMs = STEP_TAP_GAP_MS): boolean {
  return now - lastAt >= gapMs;
}

// Een veeg telt vanaf deze afstand (px) en alleen als hij meer horizontaal dan verticaal is.
export const SWIPE_MIN_PX = 36;
export function swipeDelta(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

// Hoe lang de opening duurt (ms) in een stand van Beweging: 900 in Normaal, half zo lang in Rustig, niets in Uit.
export const OPENING_MS = 900;
export function openingMs(mode: 'full' | 'calm' | 'off'): number {
  return mode === 'full' ? OPENING_MS : mode === 'calm' ? OPENING_MS / 2 : 0;
}
