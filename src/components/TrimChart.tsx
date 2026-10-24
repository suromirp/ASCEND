import { useId } from 'react';
import type { TrimChart as TrimChartData } from '../engine/activityTrim';
import { clockLabel } from '../engine/trimLog';

const WIDTH = 320;
const HEIGHT = 120;
const PAD_TOP = 10;
const PAD_BOTTOM = 6;

// De snelheid over de tijd van een training, met de hoogte gedempt erachter en
// twee grepen voor het begin en het eind. Wat je houdt is mint, wat je weghaalt
// blijft gedempt staan. Een kleine eigen SVG in tokens, zonder bibliotheek (zoals
// TrendLineChart). De schuiven eronder doen het werk; de grepen hier laten zien
// waar ze staan. Tekst staat in HTML, niet in de SVG, zodat hij nooit onder de
// 12 px schaalt.
export function TrimChart({ chart, startSec, endSec }: { chart: TrimChartData; startSec: number; endSec: number }) {
  const clipId = useId();
  const n = chart.kmh.length;
  const top = Math.max(10, ...chart.kmh.map((v) => v ?? 0)) * 1.1;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const x = (sec: number) => (Math.min(chart.totalSec, Math.max(0, sec)) / chart.totalSec) * WIDTH;
  const bucketX = (i: number) => ((i + 0.5) / n) * WIDTH;
  const y = (kmh: number) => PAD_TOP + (1 - kmh / top) * plotH;

  const speedPoints = chart.kmh.map((v, i) => (v === null ? null : ([bucketX(i), y(v)] as const)));
  const line = speedPoints
    .filter((p): p is readonly [number, number] => p !== null)
    .map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`)
    .join(' ');
  const firstX = speedPoints.find((p) => p)?.[0] ?? 0;
  const lastX = [...speedPoints].reverse().find((p) => p)?.[0] ?? WIDTH;
  const area = line ? `${line} L ${lastX.toFixed(1)} ${(HEIGHT - PAD_BOTTOM).toFixed(1)} L ${firstX.toFixed(1)} ${(HEIGHT - PAD_BOTTOM).toFixed(1)} Z` : '';

  // The altitude behind it, in the lower part of the picture.
  let altitude = '';
  if (chart.altitudeM) {
    const values = chart.altitudeM.filter((v): v is number => v !== null);
    if (values.length > 1) {
      const lo = Math.min(...values);
      const span = Math.max(20, Math.max(...values) - lo);
      const ay = (v: number) => HEIGHT - PAD_BOTTOM - ((v - lo) / span) * plotH * 0.55;
      const pts = chart.altitudeM.map((v, i) => (v === null ? null : ([bucketX(i), ay(v)] as const))).filter((p): p is readonly [number, number] => p !== null);
      altitude = `${pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' ')} L ${pts[pts.length - 1][0].toFixed(1)} ${HEIGHT - PAD_BOTTOM} L ${pts[0][0].toFixed(1)} ${HEIGHT - PAD_BOTTOM} Z`;
    }
  }

  const xs = x(startSec);
  const xe = x(endSec);
  const grip = (gx: number) => (
    <g>
      <line x1={gx} y1={PAD_TOP - 4} x2={gx} y2={HEIGHT - PAD_BOTTOM} stroke="var(--color-action)" strokeWidth="2" strokeLinecap="round" />
      <circle cx={gx} cy={HEIGHT / 2} r="6" fill="var(--color-action)" stroke="var(--color-card)" strokeWidth="2" />
    </g>
  );

  return (
    <div>
      <p className="mb-1 font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
        Snelheid, tot {Math.round(top / 1.1)} km/u, met de hoogte gedempt erachter
      </p>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto w-full"
          style={{ overflow: 'visible' }}
          role="img"
          aria-label={`Snelheid over de tijd van ${clockLabel(0)} tot ${clockLabel(chart.totalSec)}. Je houdt ${clockLabel(startSec)} tot ${clockLabel(endSec)}.`}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={xs} y="0" width={Math.max(0, xe - xs)} height={HEIGHT} />
            </clipPath>
          </defs>
          {altitude && <path d={altitude} fill="var(--color-track)" opacity="0.7" />}
          <line x1="0" y1={HEIGHT - PAD_BOTTOM} x2={WIDTH} y2={HEIGHT - PAD_BOTTOM} stroke="var(--color-card-border)" strokeWidth="1" />
          {line && <path d={line} fill="none" stroke="var(--color-ink-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />}
          {line && (
            <g clipPath={`url(#${clipId})`}>
              <path d={area} fill="var(--color-action)" opacity="0.16" />
              <path d={line} fill="none" stroke="var(--color-action)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
          {grip(xs)}
          {grip(xe)}
        </svg>
      </div>
      <div className="mt-1 flex justify-between font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
        <span>{clockLabel(0)}</span>
        <span>{clockLabel(chart.totalSec / 2)}</span>
        <span>{clockLabel(chart.totalSec)}</span>
      </div>
    </div>
  );
}
