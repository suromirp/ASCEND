// ASCEND: de stappen die Route voorstellen laat zien zolang er gezocht wordt. Alleen tekst en een
// aandeel voor de balk; plant niets. Docs: docs/beslissingen/2026-11-11-route-kaart-2.md.

export type SearchStep = 'locate' | 'terrain' | 'routes';

const TEXT: Record<SearchStep, string> = {
  locate: 'Je plek bepalen',
  terrain: 'Heuvels en paden zoeken',
  routes: 'Lussen berekenen',
};

export const searchStepText = (step: SearchStep): string => TEXT[step];

// Bij Waar je nu bent komt je plek eerst; anders begint het bij de heuvels.
export const searchSteps = (locate: boolean): SearchStep[] => (locate ? ['locate', 'terrain', 'routes'] : ['terrain', 'routes']);

// Hoe ver de balk staat: de stap die loopt telt half, zodat hij nooit vol is zolang er gezocht wordt.
export function searchStepShare(steps: SearchStep[], current: SearchStep): number {
  const i = Math.max(0, steps.indexOf(current));
  return (i + 0.5) / steps.length;
}

// De balk schuift alleen in Vol, binnen 150 tot 400 ms en één keer per stap; in Rustig en Uit staat hij meteen goed.
export const searchBarTransition = (motion: 'full' | 'calm' | 'off'): string => (motion === 'full' ? 'width 300ms ease-out' : 'none');

// De balk op tijd (Vol): één doorlopende, vertragende beweging van 0 naar ongeveer 90 procent in de
// grens van de zoektocht, nooit vol voor hij klaar is en geen herhaling. Een nieuwe stap zet de vloer
// hoger (het begin van die stap); de balk schuift daar in 300 ms ease-out naartoe en loopt dan door.
// Uitzondering op 150 tot 400 ms voor een voortgangsbalk op tijd (besluit 2026-11-11-route-start.md).
export const SEARCH_BAR_CAP = 0.9;
// Na de hele grens staat de balk op 1 - e^-3 van de cap, ongeveer 86 procent.
const BAR_EASE = 3;
export function searchBarTimeShare(elapsedMs: number, limitMs: number): number {
  if (!(elapsedMs > 0) || !(limitMs > 0)) return 0;
  return SEARCH_BAR_CAP * (1 - Math.exp((-BAR_EASE * elapsedMs) / limitMs));
}
// Het begin van de stap die loopt, als vloer onder de tijd; de eerste stap begint bij 0.
export function searchStepFloor(steps: SearchStep[], current: SearchStep): number {
  const i = Math.max(0, steps.indexOf(current));
  return (SEARCH_BAR_CAP * i) / steps.length;
}
export const STEP_SLIDE_MS = 300;
// Hoe ver de balk staat in Vol: de vloer van de stap die loopt (met de 300 ms ease-out van de vorige
// vloer naar de nieuwe, `sinceStepMs` na de nieuwe stap), plus de tijd over het stuk tussen die vloer en de
// cap. Zo loopt hij altijd door, ook na een stap, en komt hij nooit boven de cap.
export function searchBarShare(elapsedMs: number, limitMs: number, floor: { from: number; to: number; sinceStepMs: number }): number {
  const t = Math.min(1, Math.max(0, floor.sinceStepMs / STEP_SLIDE_MS));
  const eased = 1 - (1 - t) ** 3;
  const base = Math.min(SEARCH_BAR_CAP, Math.max(0, floor.from + (floor.to - floor.from) * eased));
  const time = searchBarTimeShare(elapsedMs, limitMs) / SEARCH_BAR_CAP;
  return Math.min(SEARCH_BAR_CAP, base + (SEARCH_BAR_CAP - base) * time);
}

// De grens in tijd, in een zin; de getallen komen uit de constanten van de aanroeper.
export function searchLimitLine(locateMs: number | undefined, searchMs: number): string {
  const s = (ms: number) => Math.round(ms / 1000);
  return locateMs === undefined
    ? `Dat duurt hoogstens ${s(searchMs)} seconden.`
    : `Je plek duurt hoogstens ${s(locateMs)} seconden, het zoeken daarna hoogstens ${s(searchMs)}.`;
}
