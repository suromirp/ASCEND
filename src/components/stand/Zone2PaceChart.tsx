import type { Zone2Chart } from '../../engine/zone2Chart';
import { dotLabel } from '../../engine/zone2Chart';
import { formatPace } from '../../engine/aerobicTrend';
import { formatDayMonthNL } from '../../utils/dates';

// Tempo bij zone 2 achter de i: elke loop van de laatste 8 weken als stip, de lijn van de
// uitspraak met de waaier van de band eromheen, sneller boven. Alles komt uit
// engine/zone2Chart.ts; hier alleen tekenen. Geen animatie: de grafiek staat meteen op zijn
// eindstand, ook in Rustig en Uit.

const W = 320;
const H = 168;
const TOP = 8;
const BOTTOM = 26;
const LEFT = 8;
const RIGHT = 44;

export function Zone2PaceChart({ chart }: { chart: Zone2Chart }) {
  if (chart.dots.length === 0) return null;
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const range = chart.slowSec - chart.fastSec || 1;
  const x = (f: number) => LEFT + f * plotW;
  // Sneller (minder seconden) staat boven.
  const y = (sec: number) => TOP + ((sec - chart.fastSec) / range) * plotH;
  const { line, fan } = chart;
  const fanPath = fan ? `M${x(fan.x1)},${y(fan.fast1)} L${x(fan.x2)},${y(fan.fast2)} L${x(fan.x2)},${y(fan.slow2)} L${x(fan.x1)},${y(fan.slow1)} Z` : '';
  const summary = line
    ? `Tempo bij zone 2 per loop, de laatste 8 weken. De lijn gaat van ${formatPace(line.sec1)} naar ${formatPace(line.sec2)} per km.`
    : `Tempo bij zone 2 per loop, de laatste 8 weken: ${chart.dots.length === 1 ? 'één loop' : `${chart.dots.length} lopen`}, nog zonder lijn.`;

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={summary}>
        {chart.ticks.map((t) => (
          <g key={t} aria-hidden>
            <line x1={LEFT} x2={LEFT + plotW} y1={y(t)} y2={y(t)} stroke="var(--color-card-border)" strokeWidth={1} />
            <text x={W - 2} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--color-ink-dim)">{formatPace(t)}</text>
          </g>
        ))}
        <line x1={LEFT} x2={LEFT + plotW} y1={TOP + plotH} y2={TOP + plotH} stroke="var(--color-card-border)" strokeWidth={1} />
        {fanPath && <path d={fanPath} fill="var(--color-progress)" opacity={0.12} />}
        {line && <line x1={x(line.x1)} y1={y(line.sec1)} x2={x(line.x2)} y2={y(line.sec2)} stroke="var(--color-progress)" strokeWidth={2} strokeLinecap="round" />}
        {chart.dots.map((d) => (
          <circle
            key={d.logId}
            cx={x(d.x)}
            cy={y(d.paceSec)}
            r={4}
            fill={d.counts ? 'var(--color-progress)' : 'none'}
            stroke={d.counts ? 'var(--color-card)' : 'var(--color-ink-dim)'}
            strokeWidth={1.5}
          >
            <title>{`${formatDayMonthNL(d.date)}: ${dotLabel(d)}`}</title>
          </circle>
        ))}
        <text x={LEFT} y={H - 6} fontSize={12} fill="var(--color-ink-dim)">{formatDayMonthNL(chart.fromDate)}</text>
        <text x={LEFT + plotW} y={H - 6} textAnchor="end" fontSize={12} fill="var(--color-ink-dim)">vandaag</text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-progress)' }} aria-hidden />één loop</span>
        {chart.warmRuns > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border" style={{ borderColor: 'var(--color-ink-dim)' }} aria-hidden />warm, telt niet mee</span>}
        {fan && <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: 'var(--color-progress)', opacity: 0.25 }} aria-hidden />de band om de lijn</span>}
        <span>sneller staat boven</span>
      </div>
    </div>
  );
}
