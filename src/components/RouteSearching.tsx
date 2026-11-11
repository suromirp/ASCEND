// ASCEND: wat er staat zolang Route voorstellen zoekt, op de plek van de kaart en met dezelfde vaste
// hoogte, zodat niets verspringt als de lussen er zijn: een rustige regel "Lussen zoeken…", de stappen (je
// plek, heuvels en paden, lussen) en een balk. In Vol loopt de balk op tijd: één doorlopende, vertragende
// beweging naar ongeveer 90 procent in de grens, en bij een nieuwe stap 300 ms ease-out naar het begin
// van die stap; geen herhaling. In Rustig en Uit staat hij stil op het aandeel van de stap.
// Rendert alleen: de stappen, de grenzen en de curve komen uit engine/routeSearchSteps.ts.
// Docs: docs/beslissingen/2026-11-11-route-kaart-2.md, docs/beslissingen/2026-11-11-route-start.md.

import { useEffect, useRef, useState } from 'react';
import { searchBarShare, searchStepFloor, searchStepShare, searchStepText, STEP_SLIDE_MS, type SearchStep } from '../engine/routeSearchSteps';
import { ROUTE_MAP_HEIGHT } from '../engine/routeSheet';
import { useMotionMode } from './motion';
import { Icon } from './icons';

// De balk in Vol: elke frame de breedte uit de tijd sinds het begin, rechtstreeks op het element (geen
// render per frame). Stopt bij de cap en bij het weghalen; een nieuwe zoektocht is een nieuw element (key).
function useTimedBar(on: boolean, limitMs: number, floor: number) {
  const bar = useRef<HTMLDivElement>(null);
  const start = useRef<number | undefined>(undefined);
  const step = useRef({ from: 0, to: floor, at: 0 });
  useEffect(() => {
    const now = typeof performance === 'undefined' ? Date.now() : performance.now();
    if (step.current.to !== floor) {
      const s = step.current;
      // Van waar de vloer nu staat naar de nieuwe, in 300 ms.
      const t = Math.min(1, (now - s.at) / STEP_SLIDE_MS);
      step.current = { from: s.from + (s.to - s.from) * (1 - (1 - t) ** 3), to: floor, at: now };
    }
  }, [floor]);
  useEffect(() => {
    if (!on || typeof requestAnimationFrame !== 'function') return;
    let frame = 0;
    const tick = (now: number) => {
      if (start.current === undefined) {
        start.current = now;
        step.current = { ...step.current, at: now };
      }
      const s = step.current;
      const share = searchBarShare(now - start.current, limitMs, { from: s.from, to: s.to, sinceStepMs: now - s.at });
      if (bar.current) bar.current.style.width = `${(share * 100).toFixed(2)}%`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on, limitMs]);
  return bar;
}

// `height`: een lagere vaste hoogte (de Briefing); anders die van het blad. `limitMs`: de grens van de
// hele zoektocht (je plek en het zoeken), voor de balk op tijd.
export function RouteSearching({ steps, current, limitLine, height, limitMs }: { steps: SearchStep[]; current: SearchStep; limitLine: string; height?: string; limitMs: number }) {
  const motion = useMotionMode();
  const at = steps.indexOf(current);
  const timed = motion === 'full';
  // De grens van deze zoektocht staat vast bij het begin: anders verspringt de curve als je plek binnen is.
  const [limit] = useState(limitMs);
  const bar = useTimedBar(timed, limit, searchStepFloor(steps, current));
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full flex-col justify-center gap-2.5 overflow-hidden rounded-xl border px-5 py-3"
      style={{ height: ROUTE_MAP_HEIGHT, ...(height ? { height } : {}), borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
    >
      <p className="text-base font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>Lussen zoeken…</p>
      <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-track)' }}>
        <div
          ref={bar}
          data-bar={timed ? 'time' : 'step'}
          className="h-full rounded-full"
          // Vol: de breedte komt per frame uit useTimedBar en begint bij 0. Rustig en Uit: stil op de stap, zonder overgang.
          style={{ width: timed ? '0%' : `${Math.round(searchStepShare(steps, current) * 100)}%`, background: 'var(--color-status)', transition: 'none' }}
        />
      </div>
      <ol className="flex flex-col gap-1.5">
        {steps.map((step, i) => {
          const done = i < at;
          const now = i === at;
          return (
            <li key={step} className="flex items-center gap-2 text-sm leading-snug" style={{ color: now ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                {done ? <Icon name="vinkje" size={16} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: now ? 'var(--color-ink)' : 'var(--color-track)' }} />}
              </span>
              <span>{searchStepText(step)}{done ? '' : now ? '…' : ''}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{limitLine}</p>
    </div>
  );
}
