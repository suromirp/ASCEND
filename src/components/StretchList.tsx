import { useState } from 'react';
import type { Stretch } from '../models/training';
import { Card } from './ui';
import { CountdownTimer } from './CountdownTimer';

import { Icon } from './icons';

// "45 sec · per kant": de tijd en de aanwijzing in één korte regel.
function metaOf(s: Stretch): string {
  return [s.durationSec ? `${s.durationSec} sec` : '', s.note ?? ''].filter(Boolean).join(' · ');
}

// Eén rekoefening per rij: de naam met eronder de tijd, rechts een video en een timer
// als ronde knoppen van 44 px, zoals de rest van de app.
export function StretchItems({ stretches, className = 'mt-3 flex flex-col' }: { stretches: Stretch[]; className?: string }) {
  const [timerFor, setTimerFor] = useState<Stretch | null>(null);
  const roundButton = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border';

  return (
    <>
      <ul className={className}>
        {stretches.map((s, i) => (
          <li key={s.name} className={`flex min-h-[60px] items-center gap-3 py-2 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--color-card-border)' }}>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-snug" style={{ color: 'var(--color-ink)' }}>{s.name}</p>
              {metaOf(s) && <p className="mt-0.5 font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{metaOf(s)}</p>}
            </div>
            {s.videoUrl && (
              <a href={s.videoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label={`Video van ${s.name}`} className={roundButton} style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>
                <Icon name="video" size={20} />
              </a>
            )}
            {s.durationSec !== undefined && (
              <button type="button" onClick={() => setTimerFor(s)} aria-label={`Timer voor ${s.name}`} className={roundButton} style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-bronze)' }}>
                <Icon name="timer" size={20} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {timerFor && (
        <CountdownTimer initialSeconds={timerFor.durationSec ?? 30} label={timerFor.name} onClose={() => setTimerFor(null)} />
      )}
    </>
  );
}

export function StretchList({
  title,
  stretches,
  className = 'mt-5',
}: {
  title: string;
  stretches: Stretch[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className={className}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="min-h-[44px] flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{title}</span>
        <span className="flex items-center gap-1 font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          {stretches.length} oefeningen
          <span className="transition-transform" style={{ transform: open ? 'rotate(90deg)' : undefined }}><Icon name="verder" size={16} /></span>
        </span>
      </button>
      {open && <StretchItems stretches={stretches} />}
    </Card>
  );
}
