import { useId, useState } from 'react';
import { changeLabel, metersLinkLabel, type Gr5Readiness } from '../engine/gr5Readiness';
import { Gr5ReadinessSheet } from './Gr5ReadinessSheet';
import { Card, Eyebrow } from './ui';

// Klaar voor de GR5: het ene voortgangsgetal van de app, als boog, met altijd
// de zin eronder waaruit het bestaat. Een tik opent de vier meters. Het getal
// staat in Inter, de boog is een boog van drie kwart cirkel (ontwerp 03b).
// Op Ascend groot, op Je stand klein; beide tonen hetzelfde getal en dezelfde zin.

const R = 74;
const SWEEP = 0.75; // drie kwart van de cirkel
const CIRC = 2 * Math.PI * R;

export function Gr5Arc({ percent, size, numberSize, caption }: { percent: number; size: number; numberSize: number; caption?: string }) {
  const gradientId = useId();
  const track = CIRC * SWEEP;
  const fill = track * (Math.max(0, Math.min(100, percent)) / 100);
  // Drie cijfers (100) passen anders niet binnen de boog.
  const digitSize = percent >= 100 ? numberSize * 0.8 : numberSize;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size * 0.9 }}>
      <svg viewBox="0 0 190 190" width={size} height={size} className="absolute left-0 top-0" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--color-bronze)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-gold)' }} />
          </linearGradient>
        </defs>
        <g transform="rotate(135 95 95)">
          <circle cx="95" cy="95" r={R} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${track} ${CIRC}`} style={{ stroke: 'var(--color-card-border)' }} />
          {percent > 0 && (
            <circle cx="95" cy="95" r={R} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${Math.max(fill, 0.1)} ${CIRC}`} stroke={`url(#${gradientId})`} className="transition-[stroke-dasharray] duration-700" />
          )}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" style={{ paddingTop: size * 0.04 }}>
        <span className="font-sans font-medium leading-none tabular-nums" style={{ fontSize: digitSize, color: 'var(--color-ink)' }}>
          {percent}
          <span style={{ fontSize: digitSize / 2, color: 'var(--color-ink-dim)' }}>%</span>
        </span>
        {caption && <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{caption}</span>}
      </div>
    </div>
  );
}

export function Gr5ReadinessCard({ readiness, compact = false }: { readiness: Gr5Readiness; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const change = changeLabel(readiness.change);
  return (
    <>
      <button onClick={() => setOpen(true)} className="block w-full text-left">
        <Card texture className="flex flex-col gap-3">
          <Eyebrow>Klaar voor de GR5</Eyebrow>
          {compact ? (
            <div className="flex items-center gap-4">
              <div className="shrink-0"><Gr5Arc percent={readiness.percent} size={104} numberSize={30} /></div>
              {change && <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{change}</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Gr5Arc percent={readiness.percent} size={190} numberSize={56} caption={change} />
            </div>
          )}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{readiness.sentence}</p>
          {readiness.weakestSentence && <p className="-mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{readiness.weakestSentence}</p>}
          <span className="flex min-h-[44px] items-center justify-between text-sm font-medium" style={{ color: 'var(--color-gold)' }}>
            {metersLinkLabel(readiness.meters.length)}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </span>
        </Card>
      </button>
      {open && <Gr5ReadinessSheet readiness={readiness} onClose={() => setOpen(false)} />}
    </>
  );
}
