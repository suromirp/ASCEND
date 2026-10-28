// Het vegen van een set in Forge naar links: de rekensom, zonder DOM (de hook is useSwipeRow.ts).
// Een korte veeg laat de rij openstaan met een knop van OPEN_PX breed, een lange veeg of een snelle
// verwijdert meteen. Besluit: docs/beslissingen/2026-10-29-snelknoppen-in-forge.md.

// Na zoveel pixels beweging weet je of het horizontaal of verticaal is.
export const DIRECTION_SLOP = 8;
// De breedte van de knop als de rij openstaat.
export const OPEN_PX = 72;
// Voorbij dit deel van de breedte blijft de rij open staan, voorbij het tweede verwijdert hij.
export const OPEN_SHARE = 0.25;
export const DELETE_SHARE = 0.6;
// Een snelle veeg naar links (pixels per milliseconde) verwijdert, als hij ook ver genoeg ging.
export const FLING_SPEED = 1;

export type Axis = 'undecided' | 'horizontal' | 'vertical';

export function decideAxis(dx: number, dy: number): Axis {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < DIRECTION_SLOP) return 'undecided';
  return ax > ay ? 'horizontal' : 'vertical';
}

// Waar de rij staat terwijl je vinger beweegt: 1 op 1, nooit naar rechts voorbij de rustplek en nooit
// voorbij de breedte. `startOffset` is 0 (dicht) of -OPEN_PX (open).
export function followOffset(dx: number, startOffset: number, width: number): number {
  return Math.max(-width, Math.min(0, startOffset + dx));
}

export type SwipeEnd = 'delete' | 'open' | 'close';

export const deleteLine = (width: number) => width * DELETE_SHARE;
export const openLine = (width: number, wasOpen: boolean) => (wasOpen ? OPEN_PX / 2 : Math.max(OPEN_PX / 2, width * OPEN_SHARE));

// Wat er gebeurt bij loslaten. `velocity` in pixels per milliseconde, negatief is naar links.
export function swipeEnd(offset: number, width: number, velocity: number, wasOpen: boolean): SwipeEnd {
  const pulled = -offset;
  if (pulled >= deleteLine(width)) return 'delete';
  if (velocity <= -FLING_SPEED && pulled >= OPEN_PX) return 'delete';
  if (velocity >= FLING_SPEED) return 'close';
  return pulled >= openLine(width, wasOpen) ? 'open' : 'close';
}

// Het stuk dat de rij uiteindelijk heeft: open, dicht of helemaal weg.
export function restOffset(end: SwipeEnd, width: number): number {
  return end === 'open' ? -OPEN_PX : end === 'delete' ? -width : 0;
}

// De zone waar je vinger zich in bevindt, voor de tik bij het passeren van een drempel.
export type Zone = 'closed' | 'open' | 'delete';
export function zoneAt(offset: number, width: number, wasOpen: boolean): Zone {
  const pulled = -offset;
  if (pulled >= deleteLine(width)) return 'delete';
  return pulled >= openLine(width, wasOpen) ? 'open' : 'closed';
}
