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

// De grens in tijd, in een zin; de getallen komen uit de constanten van de aanroeper.
export function searchLimitLine(locateMs: number | undefined, searchMs: number): string {
  const s = (ms: number) => Math.round(ms / 1000);
  return locateMs === undefined
    ? `Dat duurt hoogstens ${s(searchMs)} seconden.`
    : `Je plek duurt hoogstens ${s(locateMs)} seconden, het zoeken daarna hoogstens ${s(searchMs)}.`;
}
