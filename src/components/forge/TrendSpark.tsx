// ASCEND: het kleine lijntje naast een oefening in de lijst van Forge, het verloop van
// de laatste trainingen in één oogopslag. Versiering naast het getal, dus verborgen voor
// een schermlezer; het puntje is de laatste training, in de kleur van voortgang.

const W = 48;
const H = 20;
const PAD = 2.5;

export function TrendSpark({ values }: { values: number[] }) {
  if (values.length < 3) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (values.length - 1);
  // Een vlakke lijn staat in het midden, niet onderaan.
  const y = (v: number) => (max === min ? H / 2 : H - PAD - ((v - min) * (H - 2 * PAD)) / span);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" className="shrink-0">
      <path d={d} fill="none" stroke="var(--color-ink-dim)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <circle cx={x(last)} cy={y(values[last])} r={2.5} fill="var(--color-progress)" />
    </svg>
  );
}
