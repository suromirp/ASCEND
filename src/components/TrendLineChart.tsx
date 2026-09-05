import { useRef, useState } from 'react';
import type { TrendPoint } from '../engine/readiness';

const WIDTH = 320;

// A single-series inline SVG trend line — no chart library, consistent
// with the rest of the app. One series only, so no legend (the card's
// Eyebrow already names what's plotted): a 2px rounded line, an always-on
// end marker + direct label (the current value stays readable without
// touching anything), and a tap-to-inspect crosshair + tooltip for the
// points in between.
export function TrendLineChart({
  points,
  color = 'var(--color-gold)',
  height = 110,
  formatValue = (v: number) => `${Math.round(v)}`,
}: {
  points: TrendPoint[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length === 0) return null;

  const padX = 6;
  const padY = 16;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const n = points.length;

  const x = (i: number) => padX + (n === 1 ? 0 : (i / (n - 1)) * (WIDTH - padX * 2));
  const y = (v: number) => padY + (1 - (v - min) / range) * (height - padY * 2);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');

  function selectNearest(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const dist = Math.abs(x(i) - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }
    setActiveIndex(nearest);
  }

  const last = points[n - 1];
  const active = activeIndex !== null ? points[activeIndex] : undefined;

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Trend van ${points[0].label} tot ${last.label}: van ${formatValue(points[0].value)} naar ${formatValue(last.value)}`}
        onClick={(e) => selectNearest(e.clientX)}
      >
        <line x1={padX} y1={height - padY} x2={WIDTH - padX} y2={height - padY} stroke="var(--color-card-border)" strokeWidth="1" />

        {activeIndex !== null && (
          <line x1={x(activeIndex)} y1={padY - 6} x2={x(activeIndex)} y2={height - padY} stroke="var(--color-card-border)" strokeWidth="1" />
        )}

        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        <circle cx={x(n - 1)} cy={y(last.value)} r="4" fill={color} stroke="var(--color-card)" strokeWidth="2" />
        {activeIndex !== null && activeIndex !== n - 1 && (
          <circle cx={x(activeIndex)} cy={y(active!.value)} r="4" fill={color} stroke="var(--color-card)" strokeWidth="2" />
        )}
      </svg>

      <div className="pointer-events-none absolute right-0 top-0 text-xs font-medium" style={{ color: 'var(--color-ink)' }}>
        {formatValue(last.value)}
      </div>

      {active && activeIndex !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)] whitespace-nowrap rounded-lg border px-2 py-1 text-xs"
          style={{
            left: `${(x(activeIndex) / WIDTH) * 100}%`,
            top: `${(y(active.value) / height) * 100}%`,
            background: 'var(--color-charcoal)',
            borderColor: 'var(--color-card-border)',
          }}
        >
          <span style={{ color: 'var(--color-ink-dim)' }}>{active.label}</span>{' '}
          <span style={{ color: 'var(--color-ink)' }}>{formatValue(active.value)}</span>
        </div>
      )}

      <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--color-ink-dim)' }}>
        <span>{points[0].label}</span>
        <span>{last.label}</span>
      </div>
    </div>
  );
}
