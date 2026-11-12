// Eén tekenwijze voor de grafieken op de schermen van Je stand (docs/visie/Ontwerp Stand minimaal.md, 4 en 6):
// één lijn, het label bij zijn stip, en het label dat met je vinger meeloopt. Hier alleen de pure keuzes; de
// component tekent (components/stand/StandLineChart.tsx). Alleen weergave: geen berekening van benen of
// belasting verandert hier.

// De stip die het dichtst bij een plek op de grafiek ligt (beide als deel van de breedte, 0 tot 1).
export function nearestIndex(xs: readonly number[], at: number): number {
  let best = 0;
  xs.forEach((x, i) => {
    if (Math.abs(x - at) < Math.abs(xs[best] - at)) best = i;
  });
  return best;
}

// Wat een beweging van je vinger is: pas na een paar pixels weet je het. Opzij is schuiven langs de grafiek, op of
// neer is gewoon scrollen; dan doet de grafiek niets.
export const SCRUB_START_PX = 8;
export function scrubIntent(dx: number, dy: number): 'scrub' | 'scroll' | undefined {
  if (Math.abs(dx) < SCRUB_START_PX && Math.abs(dy) < SCRUB_START_PX) return undefined;
  return Math.abs(dx) > Math.abs(dy) ? 'scrub' : 'scroll';
}

// Met het toetsenbord: de pijltjes lopen langs de stippen, Home en End naar de eerste en de laatste, Escape terug
// naar de vaste stip (vandaag of deze week). Een andere toets doet niets.
export function keyStep(current: number, rest: number, count: number, key: string): number | undefined {
  if (count <= 0) return undefined;
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  if (key === 'ArrowLeft' || key === 'ArrowDown') return clamp(current - 1);
  if (key === 'ArrowRight' || key === 'ArrowUp') return clamp(current + 1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'Escape') return rest;
  return undefined;
}

// De plek op de hoogte (0 is boven, 1 is onder). `top` zegt wat boven staat: bij Frisheid de lage index (frisser
// boven), bij belasting de hoge waarde (meer boven).
export function yFraction(value: number, min: number, max: number, top: 'low' | 'high'): number {
  const range = max - min || 1;
  const f = (Math.min(max, Math.max(min, value)) - min) / range;
  return top === 'low' ? f : 1 - f;
}
