import type { HeartRateDeviation } from '../../engine/influence';
import { deviationPaceText, deviationSentence } from '../../engine/influence';
import { Icon } from '../icons';

// De afwijking bovenaan het blad: één zin met het getal, een kleine grafiek met je vergelijkbare
// loopjes in je band en deze loop als amber punt, en één regel over waar de vergelijking op steunt.
const W = 320;
const H = 72;
const PAD_X = 12;
const PAD_Y = 8;

function Chart({ d }: { d: HeartRateDeviation }) {
  const values = [...d.points.map((p) => p.value), d.band.low, d.band.high];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 1);
  const y = (v: number) => H - PAD_Y - ((v - lo) / span) * (H - 2 * PAD_Y);
  const x = (i: number) => PAD_X + (d.points.length === 1 ? 0 : (i / (d.points.length - 1)) * (W - 2 * PAD_X));
  const text = `${deviationSentence(d)}. ${d.points.length - 1} vorige loopjes ernaast.`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={text} style={{ display: 'block', maxHeight: H }}>
      <rect x={0} y={y(d.band.high)} width={W} height={Math.max(y(d.band.low) - y(d.band.high), 2)} rx={4} fill="color-mix(in srgb, var(--color-ink-dim) 14%, transparent)" />
      {d.points.map((p, i) => (
        <circle key={`${p.label}-${i}`} cx={x(i)} cy={y(p.value)} r={p.current ? 5.5 : 4.5} fill={p.current ? 'var(--color-warning)' : 'var(--color-ink-dim)'} />
      ))}
    </svg>
  );
}

export function DeviationBlock({ deviation }: { deviation: HeartRateDeviation }) {
  return (
    <div>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0" style={{ color: 'var(--color-warning)' }}><Icon name="hartslag" size={20} /></span>
        <p className="text-base font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{deviationSentence(deviation)}</p>
      </div>
      <p className="mt-3 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{deviationPaceText(deviation)}</p>
      <div className="mt-2"><Chart d={deviation} /></div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[3px]" style={{ background: 'color-mix(in srgb, var(--color-ink-dim) 14%, transparent)' }} aria-hidden />je normaal</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-ink-dim)' }} aria-hidden />vorige loopjes</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-warning)' }} aria-hidden />deze loop</span>
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{deviation.basisText}</p>
    </div>
  );
}
