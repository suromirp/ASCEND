import { useState } from 'react';
import type { SessionTemplate } from '../models/training';
import { WARMUP_LOWER, WARMUP_UPPER, warmupTotalMinutes } from '../data/strengthWarmup';
import { isLegHeavyTemplate } from '../engine/scheduler';
import { WarmupSheet } from './WarmupSheet';
import { Icon } from './icons';

// One quiet row on a strength day: the warm-up that fits it, a tap away.
export function WarmupRow({ template }: { template: SessionTemplate }) {
  const [open, setOpen] = useState(false);
  if (template.type !== 'strength') return null;
  const legs = isLegHeavyTemplate(template);
  const warmup = legs ? WARMUP_LOWER : WARMUP_UPPER;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border px-3 text-left"
        style={{ borderColor: 'var(--color-card-border)' }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-action)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.5 2 3 0-3 0-5 1-7.5z" />
        </svg>
        <span className="flex-1">
          <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>Warming-up · {warmupTotalMinutes(warmup)} min</span>
          <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{legs ? 'Enkels en heupen los, dan opwarmsets' : 'Schouders klaar, dan opwarmsets'}</span>
        </span>
        <span style={{ color: 'var(--color-ink-dim)' }} aria-hidden><Icon name="verder" size={16} /></span>
      </button>
      {open && <WarmupSheet title={template.name} warmup={warmup} onClose={() => setOpen(false)} />}
    </>
  );
}
