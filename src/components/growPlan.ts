import type { MotionMode } from '../engine/motionSettings';

// De uitgroei van een rij tot een blad (docs/visie/Vloeiende overgangen.md, onderdeel 1a, en
// docs/beslissingen/2026-10-28-vloeiende-overgangen-uitgroei.md). Hier staat alleen de rekensom;
// het meten en afspelen zit in utils/sheetGrowDom.ts. Geen React, geen DOM.

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export type GrowPhase = 'open' | 'close';

export interface GrowPlan {
  from: Rect;
  to: Rect;
  durationMs: number;
  // Hoe lang de inhoud van het blad wacht (openen) voor hij zichtbaar wordt.
  delayContentMs: number;
}

export const GROW_OPEN_MS = 280;
export const GROW_CLOSE_MS = 240;
export const GROW_CONTENT_DELAY_MS = 100;
// De rij moet minstens voor de helft in beeld staan om iets te hebben waar het blad uit groeit.
const MIN_VISIBLE = 0.5;
// Een onthouden rij is na zo lang niet meer de rij waar je net op tikte.
export const ORIGIN_MAX_AGE_MS = 600;

const hasSize = (r: Rect) => Number.isFinite(r.width) && Number.isFinite(r.height) && r.width > 0 && r.height > 0;

function visibleShare(r: Rect, viewport: Viewport): number {
  const w = Math.min(r.left + r.width, viewport.width) - Math.max(r.left, 0);
  const h = Math.min(r.top + r.height, viewport.height) - Math.max(r.top, 0);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / (r.width * r.height);
}

// Null als er niets moet gebeuren: niet Normaal, een rechthoek zonder maat, een rij die niet (genoeg)
// in beeld staat, of een rij die groter is dan het blad (dan is er niets om uit te groeien).
export function growPlan(mode: MotionMode, from: Rect, to: Rect, viewport: Viewport, phase: GrowPhase = 'open'): GrowPlan | null {
  if (mode !== 'full') return null;
  if (!hasSize(from) || !hasSize(to) || viewport.width <= 0 || viewport.height <= 0) return null;
  if (visibleShare(from, viewport) < MIN_VISIBLE) return null;
  if (from.width > to.width + 0.5 || from.height > to.height + 0.5) return null;
  return {
    from,
    to,
    durationMs: phase === 'open' ? GROW_OPEN_MS : GROW_CLOSE_MS,
    delayContentMs: phase === 'open' ? GROW_CONTENT_DELAY_MS : 0,
  };
}

// Het vlak heeft de maat van het blad en begint linksboven op (0, 0). Openen: van de rij (verschoven en
// geschaald rond de linkerbovenhoek) naar het blad. Sluiten: andersom.
export function growKeyframes(from: Rect, to: Rect, phase: GrowPhase = 'open'): { transform: string }[] {
  const small = `translate(${from.left}px, ${from.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
  const big = `translate(${to.left}px, ${to.top}px) scale(1, 1)`;
  return phase === 'open' ? [{ transform: small }, { transform: big }] : [{ transform: big }, { transform: small }];
}

// De dekking van het vlak: in de eerste 60 ms erbij (de tekst van de rij verdwijnt niet in een beeld) en
// bij openen in de laatste 100 ms weer weg (het blad eronder is dan zichtbaar). Bij sluiten staat het
// vlak er meteen en blijft tot het einde.
export function growOpacity(durationMs: number, phase: GrowPhase = 'open'): { opacity: number; offset: number }[] {
  const fadeIn = Math.min(60 / durationMs, 0.5);
  if (phase === 'close') return [{ opacity: 0, offset: 0 }, { opacity: 1, offset: fadeIn }, { opacity: 1, offset: 1 }];
  const fadeOut = Math.max(1 - 100 / durationMs, fadeIn);
  return [{ opacity: 0, offset: 0 }, { opacity: 1, offset: fadeIn }, { opacity: 1, offset: fadeOut }, { opacity: 0, offset: 1 }];
}

export interface Origin {
  at: number;
}

// Een onthouden rij is geldig als hij jong genoeg is, nog in het document hangt en zichtbaar is.
export function isFreshOrigin(origin: Origin | null | undefined, now: number, el: { isConnected: boolean; width: number; height: number } | null | undefined): boolean {
  if (!origin || !el) return false;
  const age = now - origin.at;
  if (age < 0 || age > ORIGIN_MAX_AGE_MS) return false;
  return el.isConnected && el.width > 0 && el.height > 0;
}
