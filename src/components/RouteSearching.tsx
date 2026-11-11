// ASCEND: wat er staat zolang Route voorstellen zoekt, op de plek van de kaart en met dezelfde vaste
// hoogte, zodat niets verspringt als de lussen er zijn: een rustige regel "Lussen zoeken…", de stappen (je plek, heuvels en paden, lussen) en een balk die per
// stap één keer verder schuift. Geen lus van beweging; in Rustig en Uit staat de balk meteen goed.
// Rendert alleen: de stappen en de grenzen komen uit engine/routeSearchSteps.ts.
// Docs: docs/beslissingen/2026-11-11-route-kaart-2.md.

import { searchBarTransition, searchStepShare, searchStepText, type SearchStep } from '../engine/routeSearchSteps';
import { ROUTE_MAP_HEIGHT } from '../engine/routeSheet';
import { useMotionMode } from './motion';
import { Icon } from './icons';

export function RouteSearching({ steps, current, limitLine }: { steps: SearchStep[]; current: SearchStep; limitLine: string }) {
  const motion = useMotionMode();
  const at = steps.indexOf(current);
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full flex-col justify-center gap-2.5 overflow-hidden rounded-xl border px-5 py-3"
      style={{ height: ROUTE_MAP_HEIGHT, borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
    >
      <p className="text-base font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>Lussen zoeken…</p>
      <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-track)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.round(searchStepShare(steps, current) * 100)}%`, background: 'var(--color-status)', transition: searchBarTransition(motion) }}
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
