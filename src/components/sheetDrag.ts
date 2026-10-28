// Bladen die je vinger volgen (docs/beslissingen/2026-10-28-vloeiende-overgangen.md).
// Alleen rekensom, zonder DOM: het gebaar zelf staat in utils/sheetDragDom.ts.

// Hoe ver het blad omlaag moet voor het dichtgaat, als deel van zijn hoogte.
export const CLOSE_FRACTION = 0.3;
// Of sneller dan dit (px per ms), met minstens CLOSE_MIN_PX afstand.
export const CLOSE_VELOCITY = 0.5;
export const CLOSE_MIN_PX = 24;
// Vanaf hoeveel pixels beweging het gebaar zich laat zien, en wanneer het verticaal genoeg is.
export const INTENT_PX = 8;
// Alleen de laatste meetpunten tellen voor de snelheid.
export const VELOCITY_WINDOW_MS = 100;

// Naar boven past het blad niet mee, er is geen rek.
export function sheetFollow(dy: number): number {
  return Math.max(0, dy);
}

export function sheetRelease({ dy, velocity, height }: { dy: number; velocity: number; height: number }): 'close' | 'back' {
  if (dy <= 0) return 'back';
  if (height > 0 && dy > height * CLOSE_FRACTION) return 'close';
  if (velocity > CLOSE_VELOCITY && dy >= CLOSE_MIN_PX) return 'close';
  return 'back';
}

export type DragSample = { t: number; y: number };

// Snelheid omlaag in px per ms, uit de metingen van de laatste 100 ms. Eén meetpunt, of
// metingen zonder tijdsverschil, geven 0.
export function velocityOf(samples: DragSample[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const recent = samples.filter((s) => last.t - s.t <= VELOCITY_WINDOW_MS);
  const first = recent.length >= 2 ? recent[0] : samples[samples.length - 2];
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (last.y - first.y) / dt;
}

// De inhoud mag alleen het gebaar starten als alles wat eronder kan scrollen bovenaan staat.
export function canStartInContent(chain: { scrollTop: number }[]): boolean {
  return chain.every((c) => c.scrollTop <= 0);
}

// Verticaal genoeg om over te nemen: minstens 8 px omlaag en meer omlaag dan opzij.
// Een beweging omhoog of opzij is nooit van het blad.
export function dragIntent(dx: number, dy: number): boolean {
  return dy >= INTENT_PX && Math.abs(dy) > Math.abs(dx);
}
