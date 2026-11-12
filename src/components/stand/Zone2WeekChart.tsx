import { useLayoutEffect, useRef, useState } from 'react';
import { tooltipBelow, tooltipLeftPx, type Zone2WeekChart as Chart } from '../../engine/zone2Chart';
import { formatPace } from '../../engine/aerobicTrend';
import { formatDayMonthNL } from '../../utils/dates';

// Tempo bij zone 2 op de kaart zelf: een stip per week, sneller boven. Een lijn alleen als
// engine/zone2Chart.ts#zone2WeekChart er een geeft (de lijn van de uitspraak, eindigend op de kop).
// Het eindlabel staat rechts naast zijn stip of het eind van de lijn. Geen animatie: de grafiek staat
// meteen op zijn eindstand, ook in Rustig en Uit. Een tik op de grafiek toont de dichtstbijzijnde week.

const W = 300;
const H = 120;
// De hoogte van de grafiek, ook voor de lege regel van de kaart: zonder loopje staat die op dezelfde hoogte.
export const ZONE2_CHART_H = H;
const TOP = 12;
const BOTTOM = 12;
const LEFT = 8;
// Rechts is ruimte voor het eindlabel: het staat rechts naast zijn stip, waar geen andere stip kan staan.
const RIGHT = 48;

export function Zone2WeekChart({ chart }: { chart: Chart }) {
  const [active, setActive] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  // De plek van de tooltip in px, gemeten na het tekenen en direct op het element gezet: binnen de
  // grafiek, ook op 360 px. Tot dan staat hij onzichtbaar.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const tip = tipRef.current;
    const dot = active !== null ? chart.dots[active] : undefined;
    if (!box || !tip || !dot) return;
    const boxW = box.getBoundingClientRect().width;
    const dotPx = ((LEFT + dot.x * (W - LEFT - RIGHT)) / W) * boxW;
    tip.style.left = `${tooltipLeftPx(dotPx, tip.getBoundingClientRect().width, boxW)}px`;
    tip.style.visibility = 'visible';
  }, [active, chart]);
  if (chart.dots.length === 0) return null;
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const range = chart.slowSec - chart.fastSec || 1;
  const x = (f: number) => LEFT + f * plotW;
  // Sneller (minder seconden) staat boven.
  const y = (sec: number) => TOP + ((sec - chart.fastSec) / range) * plotH;
  const { line, end } = chart;
  const weeks = chart.dots.length === 1 ? 'één week' : `${chart.dots.length} weken`;
  const summary = line
    ? `Tempo bij zone 2 per week, sneller staat boven. De lijn gaat van ${formatPace(line.sec1)} naar ${formatPace(line.sec2)} per km.`
    : `Tempo bij zone 2 per week, sneller staat boven: ${weeks}, nog zonder lijn.`;
  const pick = (clientX: number, rect: DOMRect) => {
    const rel = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    chart.dots.forEach((d, i) => {
      if (Math.abs(x(d.x) - rel) < Math.abs(x(chart.dots[best].x) - rel)) best = i;
    });
    setActive((a) => (a === best ? null : best));
  };
  const shown = active !== null ? chart.dots[active] : undefined;
  const pct = (px: number, total: number) => `${(px / total) * 100}%`;

  return (
    <div className="flex gap-2">
      <div className="flex shrink-0 flex-col justify-between text-xs" style={{ height: H, color: 'var(--color-ink-dim)' }} aria-hidden>
        <span>sneller</span>
        <span>trager</span>
      </div>
      <div ref={boxRef} className="relative min-w-0 flex-1 select-none">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none" role="img" aria-label={summary} onClick={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}>
          {chart.ticks.map((t) => (
            <line key={t} x1={LEFT} x2={LEFT + plotW} y1={y(t)} y2={y(t)} stroke="var(--color-card-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" aria-hidden />
          ))}
          {line && <line x1={x(line.x1)} y1={y(line.sec1)} x2={x(line.x2)} y2={y(line.sec2)} stroke="var(--color-progress)" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" {...(chart.lineUnclear ? { strokeDasharray: '2 5', opacity: 0.5 } : {})} />}
          {shown && <line x1={x(shown.x)} x2={x(shown.x)} y1={TOP - 6} y2={H - BOTTOM} stroke="var(--color-card-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" aria-hidden />}
        </svg>
        {/* De stippen als HTML, zodat ze rond blijven als de grafiek breder wordt dan zijn viewBox. */}
        {chart.dots.map((d, i) => (
          <span
            key={d.week}
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{ left: pct(x(d.x), W), top: pct(y(d.paceSec), H), background: 'var(--color-progress)', borderColor: 'var(--color-card)', outline: i === active ? '2px solid var(--color-progress)' : undefined }}
            aria-hidden
          />
        ))}
        {/* Het eindlabel wijkt zolang een week getoond wordt: de tooltip bedekt het dan nooit half. */}
        {end && !shown && (
          <span
            className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap pl-2 text-xs font-medium tabular-nums"
            style={{ left: pct(x(end.x), W), top: pct(y(end.paceSec), H), color: 'var(--color-ink)' }}
            data-end-label
          >
            {formatPace(end.paceSec)}
          </span>
        )}
        {shown && (
          // Gecentreerd op de stip, maar nooit buiten de grafiek (tooltipLeftPx, gemeten); bij een stip bovenin eronder.
          <div
            ref={tipRef}
            className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border px-2 py-1 text-xs ${tooltipBelow(y(shown.paceSec) / H) ? 'translate-y-3' : '-translate-y-[calc(100%+12px)]'}`}
            style={{ left: 0, top: pct(y(shown.paceSec), H), visibility: 'hidden', background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)' }}
            data-tooltip
          >
            <span style={{ color: 'var(--color-ink-dim)' }}>{`week van ${formatDayMonthNL(shown.week)}`}</span>{' '}
            <span style={{ color: 'var(--color-ink)' }}>{formatPace(shown.paceSec)}, {shown.runs === 1 ? 'één loop' : `${shown.runs} lopen`}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          <span>{formatDayMonthNL(chart.fromWeek)}</span>
          <span>deze week</span>
        </div>
      </div>
    </div>
  );
}
