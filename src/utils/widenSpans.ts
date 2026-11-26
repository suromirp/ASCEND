// Tikdoelen naast elkaar op één lijn (het jaaroverzicht, I-20): elk vak wordt minstens `min` breed door de grens met
// een buur op te schuiven, zolang die buur zelf minstens `min` houdt. De vakken blijven aansluiten en binnen lo..hi.
// Past het niet (te veel smalle vakken), dan zo breed als het kan. Puur; geeft nieuwe grenzen terug.
export function widenSpans(spans: Array<[number, number]>, min: number, lo: number, hi: number): Array<[number, number]> {
  if (spans.length === 0) return [];
  // Grenzen: b[0] links, b[n] rechts; de buitenste schuiven naar lo en hi.
  const b = [lo, ...spans.slice(1).map((s) => s[0]), hi];
  const width = (i: number) => b[i + 1] - b[i];
  for (let i = 0; i < spans.length; i++) {
    let need = min - width(i);
    if (need <= 0) continue;
    const roomL = i > 0 ? Math.max(0, width(i - 1) - min) : 0;
    const roomR = i < spans.length - 1 ? Math.max(0, width(i + 1) - min) : 0;
    let takeL = Math.min(roomL, need / 2);
    let takeR = Math.min(roomR, need - takeL);
    takeL = Math.min(roomL, need - takeR);
    b[i] -= takeL;
    b[i + 1] += takeR;
    need -= takeL + takeR;
  }
  return spans.map((_, i) => [b[i], b[i + 1]]);
}
