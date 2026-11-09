// Een set in beeld in het workoutscherm van Forge (ForgeWorkout.tsx): net boven het invoerpaneel als dat openstaat,
// anders in het midden, en alleen als hij niet al helemaal te zien is, zodat het scherm niet onnodig beweegt.

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { FieldRef } from '../../engine/forgeInput';
import { reducedMotion } from '../../utils/motion';

export function useForgeScroll(pageRef: MutableRefObject<number>, dock: FieldRef | null, dockH: number, restH: number) {
  const scrollEl = useRef<HTMLDivElement>(null);
  const headerEl = useRef<HTMLElement>(null);
  const layout = useRef({ dockH: 0, restH: 0 });
  useEffect(() => {
    layout.current = { dockH, restH };
  });

  const scrollToRow = useCallback((rowId: string) => {
    const el = scrollEl.current?.querySelector(`[data-row-id="${CSS.escape(rowId)}"]`);
    // Met een oefening per scherm scrolt de pagina van die oefening, en alleen als die in beeld is:
    // Forge schuift nooit zelf naar een andere oefening.
    const pageEl = el?.closest<HTMLElement>('[data-forge-page]');
    if (pageEl && Number(pageEl.dataset.forgePage) !== pageRef.current) return;
    const root = pageEl ?? scrollEl.current;
    if (!root || !el) return;
    const r = el.getBoundingClientRect();
    const top = pageEl ? pageEl.getBoundingClientRect().top + 8 : (headerEl.current?.offsetHeight ?? 90) + 8;
    const bottom = window.innerHeight - layout.current.dockH - layout.current.restH - 8;
    if (r.top >= top && r.bottom <= bottom) return;
    const target = layout.current.dockH > 0 ? bottom - r.height : top + Math.max(0, (bottom - top - r.height) / 2);
    root.scrollTo({ top: root.scrollTop + r.top - target, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [pageRef]);

  const dockKey = dock ? `${dock.slot}:${dock.rowId}` : '';
  const dockRowId = dock?.rowId;
  useEffect(() => {
    if (!dockRowId || dockH === 0) return;
    scrollToRow(dockRowId);
  }, [dockKey, dockH, dockRowId, scrollToRow]);

  return { scrollEl, headerEl, scrollToRow };
}
