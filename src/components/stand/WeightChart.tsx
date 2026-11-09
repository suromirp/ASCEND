import type { WeightOverview } from '../../engine/weightOverview';
import { weightChartSummary } from '../../engine/weightOverview';
import { formatDayMonthNL } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';

// De grafiek van het overzicht Gewicht: je wegingen als stippen en de trend als lijn eroverheen.
// Alles komt uit engine/weightOverview.ts; hier alleen tekenen. Geen animatie: de grafiek staat
// meteen op zijn eindstand, ook in Rustig en Uit.

const W = 320;
const H = 176;
const TOP = 10;
const BOTTOM = 26;
const LEFT = 8;
const RIGHT = 40;

export function WeightChart({ overview, trendOn }: { overview: WeightOverview; trendOn: boolean }) {
  const { dots, line, minKg, maxKg, ticks } = overview;
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const x = (f: number) => LEFT + f * plotW;
  const y = (kg: number) => TOP + (1 - (kg - minKg) / (maxKg - minKg || 1)) * plotH;
  const path = line.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.x).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  // Bij een jaar aan dagelijkse wegingen zijn de stippen kleiner, zodat de lijn leesbaar blijft.
  const r = dots.length > 60 ? 1.5 : dots.length > 30 ? 2 : 3;
  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={weightChartSummary(overview)}>
        {ticks.map((t) => (
          <g key={t} aria-hidden>
            <line x1={LEFT} x2={LEFT + plotW} y1={y(t)} y2={y(t)} stroke="var(--color-card-border)" strokeWidth={1} />
            <text x={W - 2} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--color-ink-dim)">{formatNumberNL(t, 1)}</text>
          </g>
        ))}
        {dots.map((d) => (
          <circle key={d.date} cx={x(d.x)} cy={y(d.kg)} r={r} fill="none" stroke="var(--color-ink-dim)" strokeWidth={1.25}>
            <title>{`${formatDayMonthNL(d.date)}: ${formatNumberNL(d.kg, 1)} kg`}</title>
          </circle>
        ))}
        {line.length >= 2 && <path d={path} fill="none" stroke="var(--color-progress)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
        {line.length === 1 && <circle cx={x(line[0].x)} cy={y(line[0].kg)} r={3} fill="var(--color-progress)" />}
        <text x={LEFT} y={H - 6} fontSize={12} fill="var(--color-ink-dim)">{formatDayMonthNL(overview.from)}</text>
        <text x={LEFT + plotW} y={H - 6} textAnchor="end" fontSize={12} fill="var(--color-ink-dim)">vandaag</text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full" style={{ background: 'var(--color-progress)' }} aria-hidden />{trendOn ? 'je trend' : 'je laatste weging'}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border" style={{ borderColor: 'var(--color-ink-dim)' }} aria-hidden />één weging</span>
      </div>
    </div>
  );
}
