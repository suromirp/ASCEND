// "Een oefening per scherm" in Forge (instelling "Oefeningen in een training", engine/forgeLayout.ts): opzij vegen
// met CSS scroll-snap. De pagina volgt de scrollpositie; alleen een andere pagina geeft een render.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { activeRow, exerciseComplete, type RowRef } from '../../engine/forgeInput';
import { pageAt } from '../../engine/forgeLayout';
import type { WorkoutExercise } from '../../engine/forgeWorkout';
import { haptics } from '../../utils/haptics';
import { reducedMotion } from '../../utils/motion';

// Timers die met het scherm meesterven.
export function useLater() {
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  return (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
}

export function useForgePager(layoutPaged: boolean, workout: WorkoutExercise[], activeRef: RowRef | undefined, later: (fn: () => void, ms: number) => void) {
  const paged = layoutPaged && workout.length > 0;
  const pagerEl = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(() => Math.max(0, workout.findIndex((e) => e.slot === activeRef?.slot)));
  const pageRef = useRef(page);
  // Bij het openen (en bij het aanzetten) meteen op de oefening die aan de beurt is, zonder te schuiven.
  const activeIndex = Math.max(0, workout.findIndex((e) => e.slot === activeRef?.slot));
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  useLayoutEffect(() => {
    const el = pagerEl.current;
    if (!paged || !el) return;
    pageRef.current = activeIndexRef.current;
    setPage(activeIndexRef.current);
    el.scrollLeft = pageRef.current * el.clientWidth;
  }, [paged]);
  const onPagerScroll = useCallback(() => {
    const el = pagerEl.current;
    if (!el) return;
    const p = pageAt(el.scrollLeft, el.clientWidth, el.childElementCount);
    if (p === pageRef.current) return;
    pageRef.current = p;
    setPage(p);
  }, []);
  // Een tik in de strook: naar die oefening, in Uit zonder te schuiven.
  const jumpTo = useCallback((i: number) => {
    const el = pagerEl.current;
    if (!el) return;
    haptics.tap();
    const off = reducedMotion() || document.documentElement.dataset.motion === 'off';
    el.scrollTo({ left: i * el.clientWidth, behavior: off ? 'auto' : 'smooth' });
  }, []);
  // Een oefening af in de stand een oefening per scherm: door naar de eerste oefening die nog open is (een
  // eerdere eerst), na het inklappen. Alles af: blijven staan.
  const pageToOpen = (list: WorkoutExercise[], delay: number) => {
    if (!paged) return;
    const i = list.findIndex((e) => !exerciseComplete(e));
    if (i < 0 || i === pageRef.current) return;
    later(() => {
      const el = pagerEl.current;
      if (!el) return;
      const off = reducedMotion() || document.documentElement.dataset.motion === 'off';
      el.scrollTo({ left: i * el.clientWidth, behavior: off ? 'auto' : 'smooth' });
    }, delay);
  };
  return { paged, pagerEl, page, pageRef, onPagerScroll, jumpTo, pageToOpen };
}

// De naam bij de rust en in de melding: de oefening van de set die hierna komt. Na de laatste set van een
// oefening is dat de volgende oefening, niet nog eens dezelfde (eigenaar, 7 november).
export function restNameAfter(list: WorkoutExercise[], slot: string, fallback: string): string {
  const done = list.find((e) => e.slot === slot);
  if (done && !exerciseComplete(done)) return fallback;
  const next = activeRow(list);
  return list.find((e) => e.slot === next?.slot)?.name ?? fallback;
}
