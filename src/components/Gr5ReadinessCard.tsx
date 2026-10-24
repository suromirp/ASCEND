import { useState } from 'react';
import { changeLabel, type Gr5Readiness } from '../engine/gr5Readiness';
import { Gr5ReadinessSheet } from './Gr5ReadinessSheet';
import { CountUp } from './CountUp';
import { Icon } from './icons';
import { Card, LightCard, Meter, StatusPill } from './ui';

// Klaar voor de GR5: het ene voortgangsgetal van de app, groot, met altijd de
// zin eronder waaruit het bestaat en de vier meters. Een tik opent het blad met
// per meter de uitleg. Op Je stand ligt de kaart licht op de lucht (`light`),
// op Ascend is het de gewone kaart; beide tonen hetzelfde getal en dezelfde zin.

export function Gr5ReadinessCard({ readiness, light = false }: { readiness: Gr5Readiness; light?: boolean }) {
  const [open, setOpen] = useState(false);
  const change = changeLabel(readiness.change);
  const Wrapper = light ? LightCard : Card;
  return (
    <>
      <button onClick={() => setOpen(true)} className="block w-full text-left" aria-label="Klaar voor de GR5, bekijk de meters">
        <Wrapper className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Klaar voor de GR5</span>
            <span aria-hidden="true" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap font-sans text-[56px] font-semibold leading-none tracking-[-0.04em] tabular-nums" style={{ color: 'var(--color-ink)' }}>
              <CountUp value={readiness.percent} />
              <span className="ml-0.5 text-[28px] tracking-normal">%</span>
            </span>
            {change && <StatusPill tone={(readiness.change ?? 0) > 0 ? 'progress' : 'neutral'}>{change}</StatusPill>}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{readiness.sentence}</p>
          <div className="flex flex-col gap-3">
            {readiness.meters.map((m) => (
              <div key={m.key} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="whitespace-nowrap text-sm" style={{ color: 'var(--color-ink)' }}>{m.label}</span>
                  <span className="ml-auto whitespace-nowrap text-sm font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{m.text}</span>
                </div>
                <Meter value={m.share} label={m.label} />
              </div>
            ))}
          </div>
          {readiness.weakestSentence && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{readiness.weakestSentence}</p>}
        </Wrapper>
      </button>
      {open && <Gr5ReadinessSheet readiness={readiness} onClose={() => setOpen(false)} />}
    </>
  );
}
