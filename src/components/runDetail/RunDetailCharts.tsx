// De grafieken van "Run in detail" (docs/visie/Run in detail.md, 4.4, 4.5, 4.7 en 4.9): kleine
// eigen SVG's in tokens, 320 breed in de viewBox, zonder bibliotheek. Alle tekst staat in HTML,
// zodat hij nooit onder de 12 px schaalt. Mint is tempo, de hartslag is inkt met de zones als
// dun streepje, de hoogte een gedempt vlak. Een tik kiest een plek; er wordt hier niets berekend
// wat de engine al weet (engine/runDetailView.ts).

import type { PointerEvent, ReactNode } from 'react';
import type { RunLine } from '../../models/runDetail';
import type { PaceBars } from '../../engine/runDetailView';
import type { HeartRateSettings } from '../../engine/heartRateZones';
import { hrZoneOf } from '../../engine/runDetailView';
import { formatPace } from '../../engine/aerobicTrend';
import { formatNumberNL } from '../../utils/number';
import { EFFORT_COLOR } from '../effortColor';
import { isNum } from '../../utils/guards';

const W = 320;

// The place of a tap as a fraction of the width.
function tapFraction(e: PointerEvent<HTMLElement>): number {
  const r = e.currentTarget.getBoundingClientRect();
  return r.width > 0 ? Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) : 0;
}

const dim = { color: 'var(--color-ink-dim)' };

// --- tempo per kilometer -----------------------------------------------------------------------

export function PaceBarsChart({ bars, selected, onSelect, label }: { bars: PaceBars; selected: number | null; onSelect: (index: number) => void; label: (index: number) => string }) {
  const H = 112;
  const n = bars.bars.length;
  const slot = W / n;
  const gap = n > 20 ? 1 : 2;
  const meanY = H - bars.meanHeight * (H - 8);
  // With many bars only every fifth number fits underneath.
  const every = n > 12 ? 5 : 1;
  const picked = bars.bars.find((b) => b.index === selected);
  return (
    <div>
      <p className="mb-2 min-h-[20px] font-sans text-sm tabular-nums" style={{ color: picked ? 'var(--color-ink)' : 'var(--color-ink-dim)' }} aria-live="polite">
        {picked ? label(picked.index) : `Tik op een staaf voor ${bars.by === 'km' ? 'een kilometer' : 'een ronde'}.`}
      </p>
      <div
        className="relative cursor-pointer select-none"
        role="img"
        aria-label={`Tempo per ${bars.by === 'km' ? 'kilometer' : 'ronde'}, ${n} staven. Kies hieronder in de lijst om er een te bekijken.`}
        onPointerUp={(e) => onSelect(bars.bars[Math.min(n - 1, Math.floor(tapFraction(e) * n))].index)}
      >
        <svg viewBox={`0 0 ${W} ${H + 8}`} className="mx-chart-in block h-auto w-full" style={{ overflow: 'visible' }} aria-hidden="true">
          {bars.bars.map((b, i) => {
            const bw = Math.max(1, slot * b.width - gap);
            const x = i * slot + (slot - bw) / 2;
            const h = b.height * (H - 8);
            const fill = b.counts ? 'var(--color-action)' : 'var(--color-ink-dim)';
            return (
              <g key={b.index}>
                <rect x={x} y={H - h} width={bw} height={h} rx={Math.min(4, bw / 2)} fill={fill} opacity={b.counts ? (selected === null || selected === b.index ? 1 : 0.55) : 0.3} />
                {b.off && <circle cx={x + bw / 2} cy={H - h - 6} r={2.5} fill="var(--color-warning)" />}
                {selected === b.index && <rect x={x} y={H + 4} width={bw} height={3} rx={1.5} fill="var(--color-action)" />}
              </g>
            );
          })}
          <line x1="0" y1={H} x2={W} y2={H} stroke="var(--color-card-border)" strokeWidth="1" />
          <line x1="0" y1={meanY} x2={W} y2={meanY} stroke="var(--color-ink-dim)" strokeWidth="1" strokeDasharray="3 4" opacity="0.8" />
        </svg>
        <div className="mt-1 flex font-sans text-xs tabular-nums" style={dim} aria-hidden="true">
          {bars.bars.map((b, i) => (
            <span key={b.index} className="text-center" style={{ width: `${100 / n}%` }}>
              {i % every === 0 || i === n - 1 ? (b.partial ? formatNumberNL(b.distanceM / 1000, 1) : b.index) : ''}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 font-sans text-xs tabular-nums leading-snug" style={dim}>
        De balken beginnen bij {formatPace(bars.basePace)} per km, zodat verschillen te zien zijn. Hoger is sneller. De stippellijn is het gemiddelde van je kilometers zonder stilstaan, {formatPace(bars.meanPace)} per km.
        {bars.bars.some((b) => b.off) ? ' Een amber stip: meer dan 5 procent van je gemiddelde af.' : ''}
      </p>
    </div>
  );
}

// --- over de afstand -----------------------------------------------------------------------------

type Band = { startM: number; endM: number };

function pathOf(xs: number[], ys: (number | null)[]): string {
  let d = '';
  let pen = false;
  ys.forEach((y, i) => {
    if (y === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'} ${xs[i].toFixed(1)} ${y.toFixed(1)} `;
    pen = true;
  });
  return d.trim();
}

const range = (vals: (number | null | undefined)[]) => {
  const v = vals.filter(isNum);
  return v.length > 1 ? { lo: Math.min(...v), hi: Math.max(...v) } : undefined;
};

export function DistanceCharts({
  line,
  best,
  selectedKm,
  hr,
  cursor,
  onCursor,
}: {
  line: RunLine;
  best?: Band;
  selectedKm?: Band;
  hr?: HeartRateSettings;
  cursor: number | null;
  onCursor: (i: number) => void;
}) {
  const total = line.distM[line.n - 1] || 1;
  const xs = line.distM.map((d) => (d / total) * W);
  const xOf = (m: number) => (Math.max(0, Math.min(total, m)) / total) * W;
  const H = 80;
  const pad = 6;

  // Pace: faster is higher. A few slow points (a stop, a walk) do not stretch the scale.
  const paces = line.paceSecKm.filter(isNum).sort((a, b) => a - b);
  const pLo = paces.length ? paces[Math.floor(paces.length * 0.02)] : 0;
  const pHi = paces.length ? paces[Math.floor(paces.length * 0.98)] : 1;
  const span = Math.max(10, pHi - pLo);
  const paceY = line.paceSecKm.map((p) => (isNum(p) ? pad + (Math.min(Math.max(p, pLo - 5), pHi + 5) - (pLo - 5)) / (span + 10) * (H - 2 * pad) : null));
  const hrR = range(line.hr);
  const hrY = line.hr.map((v) => (isNum(v) && hrR ? H - pad - ((v - hrR.lo) / Math.max(5, hrR.hi - hrR.lo)) * (H - 2 * pad) : null));
  const altRaw = range(line.altitudeM);
  // A flat road (or a treadmill) has no height worth a layer.
  const altR = altRaw && altRaw.hi - altRaw.lo >= 3 ? altRaw : undefined;
  const altSpan = altR ? Math.max(15, altR.hi - altR.lo) : 1;
  const altY = line.altitudeM.map((v) => (isNum(v) && altR ? H - pad - ((v - altR.lo) / altSpan) * (H - 2 * pad) : null));
  const altPath = pathOf(xs, altY);
  const altArea = altPath ? `${altPath} L ${xs[line.n - 1].toFixed(1)} ${H} L ${xs[0].toFixed(1)} ${H} Z` : '';
  const zones = line.hr.map((v) => hrZoneOf(v, hr));
  const hasZones = zones.some((z) => z !== undefined);

  const layer = (title: string, children: ReactNode, sub?: string) => (
    <div className="mt-3 first:mt-0">
      <div className="mb-1 flex items-baseline justify-between gap-2 font-sans text-xs tabular-nums" style={dim}>
        <span>{title}</span>
        {sub && <span>{sub}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" style={{ overflow: 'visible' }} aria-hidden="true">
        {best && <rect x={xOf(best.startM)} y="0" width={xOf(best.endM) - xOf(best.startM)} height={H} fill="var(--color-action)" opacity="0.1" />}
        {selectedKm && <rect x={xOf(selectedKm.startM)} y="0" width={xOf(selectedKm.endM) - xOf(selectedKm.startM)} height={H} fill="var(--color-ink)" opacity="0.06" />}
        <line x1="0" y1={H} x2={W} y2={H} stroke="var(--color-card-border)" strokeWidth="1" />
        {children}
        {cursor !== null && <line x1={xs[cursor]} y1="0" x2={xs[cursor]} y2={H} stroke="var(--color-ink-dim)" strokeWidth="1" />}
      </svg>
    </div>
  );

  const c = cursor;
  const label = c === null
    ? 'Tik in een grafiek voor een plek.'
    : [
        `${formatNumberNL(line.distM[c] / 1000, 1)} km`,
        isNum(line.paceSecKm[c]) ? `${formatPace(line.paceSecKm[c] as number)} /km` : undefined,
        isNum(line.hr[c]) ? `${line.hr[c]} bpm` : undefined,
        isNum(line.altitudeM[c]) ? `${Math.round(line.altitudeM[c] as number)} m hoog` : undefined,
      ].filter(Boolean).join(' · ');

  return (
    <div>
      <p className="mb-2 min-h-[20px] font-sans text-sm tabular-nums" style={{ color: c === null ? 'var(--color-ink-dim)' : 'var(--color-ink)' }} aria-live="polite">{label}</p>
      {best && <p className="mb-1 font-sans text-xs" style={{ color: 'var(--color-action)', marginLeft: `${(xOf(best.startM) / W) * 100}%` }}>Beste 5 km</p>}
      <div className="cursor-pointer select-none" role="img" aria-label="Tempo, hartslag en hoogte over de afstand" onPointerUp={(e) => onCursor(Math.round(tapFraction(e) * (line.n - 1)))}>
        {layer(
          'Tempo, hoger is sneller',
          <path d={pathOf(xs, paceY)} fill="none" stroke="var(--color-action)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-chart-in" />,
          paces.length ? `${formatPace(pLo)} tot ${formatPace(pHi)}` : undefined,
        )}
        {hrR &&
          layer(
            'Hartslag',
            <>
              <path d={pathOf(xs, hrY)} fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-chart-in" />
              {hasZones && zones.map((z, i) => (z && i < line.n - 1 ? <rect key={i} x={xs[i]} y={H - 4} width={Math.max(0.5, xs[i + 1] - xs[i])} height={4} fill={EFFORT_COLOR[z]} /> : null))}
            </>,
            `${Math.round(hrR.lo)} tot ${Math.round(hrR.hi)} bpm`,
          )}
        {altArea &&
          layer(
            'Hoogte',
            <>
              <path d={altArea} fill="var(--color-track)" opacity="0.8" />
              <path d={altPath} fill="none" stroke="var(--color-card-border)" strokeWidth="1" />
            </>,
            altR ? `${Math.round(altR.lo)} tot ${Math.round(altR.hi)} m` : undefined,
          )}
      </div>
      {hasZones && <p className="mt-1 font-sans text-xs" style={dim}>Het streepje onder de hartslag is je zone, van Z1 tot Z5.</p>}
      <div className="mt-1 flex justify-between font-sans text-xs tabular-nums" style={dim}>
        <span>0 km</span>
        <span>{formatNumberNL(total / 2000, 1)} km</span>
        <span>{formatNumberNL(total / 1000, 1)} km</span>
      </div>
    </div>
  );
}

// --- een lijn per kilometer (loopvorm, vergelijking) -----------------------------------------------

export function KmLineChart({ points, compare, color = 'var(--color-ink)', invert = false, format }: {
  points: { km: number; value: number }[];
  compare?: { km: number; value: number }[];
  color?: string;
  // Pace: a faster (lower) number is higher.
  invert?: boolean;
  format: (v: number) => string;
}) {
  const H = 88;
  const pad = 8;
  const all = [...points, ...(compare ?? [])].map((p) => p.value);
  if (points.length < 2 || all.length === 0) return null;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const s = Math.max(1e-6, hi - lo);
  const kms = [...points, ...(compare ?? [])].map((p) => p.km);
  const k0 = Math.min(...kms);
  const k1 = Math.max(...kms);
  const x = (km: number) => (k1 > k0 ? ((km - k0) / (k1 - k0)) * W : W / 2);
  const y = (v: number) => (invert ? pad + ((v - lo) / s) * (H - 2 * pad) : H - pad - ((v - lo) / s) * (H - 2 * pad));
  const d = (ps: { km: number; value: number }[]) => ps.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.km).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 font-sans text-xs tabular-nums" style={dim}>{format(points[0].value)}</span>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto min-w-0 flex-1" style={{ overflow: 'visible' }} aria-hidden="true">
          <line x1="0" y1={H} x2={W} y2={H} stroke="var(--color-card-border)" strokeWidth="1" />
          {compare && compare.length > 1 && <path d={d(compare)} fill="none" stroke="var(--color-ink-dim)" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />}
          <path d={d(points)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-chart-in" />
          {points.map((p) => <circle key={p.km} cx={x(p.km)} cy={y(p.value)} r="2.5" fill={color} stroke="var(--color-card)" strokeWidth="1.5" />)}
        </svg>
        <span className="w-12 shrink-0 text-right font-sans text-xs tabular-nums" style={dim}>{format(points[points.length - 1].value)}</span>
      </div>
      <div className="mt-1 flex justify-between px-14 font-sans text-xs tabular-nums" style={dim}>
        <span>km {k0}</span>
        <span>km {k1}</span>
      </div>
    </div>
  );
}
