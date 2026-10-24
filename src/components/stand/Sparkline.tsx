import type { TrendPoint } from '../../engine/readiness';

// A line of a few points without axes: the shape of the last weeks. Bronze,
// 1,6 px, round ends, like the icons. Fewer than two points: a dashed baseline,
// because there is no shape to show yet.
export function Sparkline({ points, height = 24 }: { points: TrendPoint[]; height?: number }) {
  const w = 100;
  const pad = 2;
  if (points.length < 2) {
    return (
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden="true">
        <line x1={pad} y1={height - pad} x2={w - pad} y2={height - pad} stroke="var(--color-card-border)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden="true">
      <path d={path} fill="none" stroke="var(--color-progress)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
