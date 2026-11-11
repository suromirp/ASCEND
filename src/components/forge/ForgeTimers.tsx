// De klokken van het workoutscherm van Forge: de verstreken tijd, de rusttimer en de stapper voor de rust.

import { useEffect, useRef, useState } from 'react';
import { formatClock } from '../../engine/forgeWorkout';
import { REST_LIMITS } from '../../engine/strengthSettings';
import { animateEl, reducedMotion } from '../../utils/motion';
import { Icon } from '../icons';
import { activeSeconds, formatSessionClock, isPaused, type Pause } from '../../engine/forgeSession';
import { overTimeLine } from '../../engine/forgeTimeCap';
import type { ExercisePriority } from '../../models/training';
import { clock, type Rest } from './forgeWorkoutHelpers';

// Een klok die zichzelf ververst: alleen dit stukje, nooit de hele tabel.
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(clock);
  useEffect(() => {
    const id = window.setInterval(() => setNow(clock()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function ElapsedClock({ startedAt, pauses }: { startedAt: number | null; pauses: Pause[] }) {
  const paused = startedAt !== null && isPaused({ startedAt, pauses });
  const now = useNow(1000);
  return <span className="font-sans tabular-nums" aria-label="Verstreken tijd" style={paused ? { opacity: 0.7 } : undefined}>{formatSessionClock(startedAt === null ? 0 : activeSeconds({ startedAt, pauses }, now))}</span>;
}

// "Je zit op 64 minuten. Wat nog komt is bijwerk en extra; stoppen kan." De gedempte regel onder de klok
// (engine/forgeTimeCap.ts#overTimeLine), op de actieve tijd: pauzes tellen niet, en tijdens een pauze staat hij er niet.
// Ververst elke 15 seconden, alleen dit stukje.
export function OverTimeNote({ startedAt, pauses, reference, exercises, priorityOf }: {
  startedAt: number | null;
  pauses: Pause[];
  reference: number;
  exercises: readonly { slot: string; rows: readonly { kind: string; done: boolean }[] }[];
  priorityOf: (slot: string) => ExercisePriority;
}) {
  const now = useNow(15000);
  if (startedAt === null || isPaused({ startedAt, pauses })) return null;
  const line = overTimeLine({ activeSec: activeSeconds({ startedAt, pauses }, now), reference, exercises, priorityOf });
  if (!line) return null;
  return <p className="mx-row-in px-2 pb-2 text-xs leading-snug" role="status" data-testid="forge-over-tijd" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>;
}

// --- de rusttimer ----------------------------------------------------------------------

// De balk komt omhoog, de voortgang loopt vloeiend af naar de eindtijd (de bron;
// niet naar het aantal ticks), −15 en +30 laten het getal even schuiven, aan het
// eind pulseert hij zacht, en naar beneden vegen sluit hem (Overslaan).
export function RestBar({ rest, lift, onAdd, onSkip }: { rest: Rest; lift: number; onAdd: (seconds: number) => void; onSkip: () => void }) {
  const now = useNow(500);
  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
  const over = left === 0;
  const share = rest.total > 0 ? Math.min(1, 1 - Math.max(0, rest.endsAt - now) / (rest.total * 1000)) : 1;
  const bar = useRef<HTMLDivElement>(null);
  const slab = useRef<HTMLDivElement>(null);
  const clockText = useRef<HTMLParagraphElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  // De voortgang loopt als één beweging tot de eindtijd, zonder ticks.
  useEffect(() => {
    const total = rest.total * 1000;
    const remaining = Math.max(0, rest.endsAt - Date.now());
    const from = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 1;
    const a = animateEl(bar.current, [{ transform: `scaleX(${from})` }, { transform: 'scaleX(1)' }], { duration: remaining, easing: 'linear', fill: 'forwards' });
    return () => a?.cancel();
  }, [rest.endsAt, rest.total]);

  function add(seconds: number) {
    animateEl(clockText.current, [{ opacity: 0.3, transform: `translateY(${seconds > 0 ? 8 : -8}px)` }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    onAdd(seconds);
  }

  function skip() {
    const a = animateEl(slab.current, [{ transform: `translateY(${drag.current?.dy ?? 0}px)` }, { transform: 'translateY(110%)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
    if (a) a.onfinish = onSkip;
    else onSkip();
  }

  return (
    <div
      className="forge-up fixed inset-x-0 z-30"
      style={{ bottom: lift, transition: reducedMotion() ? undefined : 'bottom 0.25s cubic-bezier(0.22, 1, 0.36, 1)', ['--forge-fill' as string]: 'var(--color-surface)' }}
      role="timer"
      aria-live="off"
    >
      <div
        ref={slab}
        className="border-t"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)', paddingBottom: lift > 0 ? 0 : 'var(--rand-onder)', touchAction: 'none' }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          drag.current = { y: e.clientY, dy: 0 };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          d.dy = Math.max(0, e.clientY - d.y);
          e.currentTarget.style.transform = `translateY(${d.dy}px)`;
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (d.dy > 36) {
            drag.current = { y: 0, dy: d.dy };
            skip();
            return;
          }
          const el = e.currentTarget;
          if (d.dy > 0) {
            const a = animateEl(el, [{ transform: `translateY(${d.dy}px)` }, { transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(0.22, 1.12, 0.36, 1)' });
            if (!a) el.style.transform = '';
            else a.onfinish = () => (el.style.transform = '');
          }
        }}
        onPointerCancel={(e) => {
          drag.current = null;
          e.currentTarget.style.transform = '';
        }}
      >
        <div className="h-0.5 overflow-hidden" style={{ background: 'var(--color-card-border)' }}>
          <div ref={bar} className={`h-0.5 origin-left ${over ? 'forge-glow' : ''}`} style={{ transform: `scaleX(${share})`, background: over ? 'var(--color-success)' : 'var(--color-action)', transition: 'background-color 0.3s ease' }} />
        </div>
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-1.5">
          <div className="min-w-0 flex-1">
            <p ref={clockText} key={over ? 'over' : 'run'} className={`origin-left font-sans text-2xl leading-none tabular-nums ${over ? 'forge-pulse' : ''}`} style={{ color: over ? 'var(--color-success-text)' : 'var(--color-ink)' }}>{over ? 'Tijd om' : formatClock(left)}</p>
            <p className="mt-1 truncate text-xs" style={{ color: 'var(--color-ink-dim)' }}>Rust · {rest.name}</p>
          </div>
          {!over && (
            <>
              <button type="button" onClick={() => add(-15)} className="min-h-[44px] min-w-[44px] rounded-xl border px-2 font-sans text-sm tabular-nums" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }} aria-label="15 seconden korter">−15</button>
              <button type="button" onClick={() => add(30)} className="min-h-[44px] min-w-[44px] rounded-xl border px-2 font-sans text-sm tabular-nums" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }} aria-label="30 seconden langer">+30</button>
            </>
          )}
          <button type="button" onClick={skip} className="min-h-[44px] rounded-xl border px-3 text-sm" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}>
            {over ? 'Sluiten' : 'Overslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RestStepper({ seconds, onChange }: { seconds: number; onChange: (s: number) => void }) {
  const step = (d: number) => onChange(Math.min(REST_LIMITS.max, Math.max(REST_LIMITS.min, seconds + d)));
  const btn = 'flex h-11 w-11 items-center justify-center rounded-xl border';
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={() => step(-15)} className={btn} style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }} aria-label="15 seconden korter"><Icon name="min" size={18} /></button>
      <span className="w-12 text-center font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{formatClock(seconds)}</span>
      <button type="button" onClick={() => step(15)} className={btn} style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }} aria-label="15 seconden langer"><Icon name="plus" size={18} /></button>
    </span>
  );
}
