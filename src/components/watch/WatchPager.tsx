// ASCEND: de pagina's van het horloge naast elkaar, veegbaar met scroll-snap zoals op het horloge zelf, met
// puntjes van 44 bij 44 px eronder. Een tik op een puntje wisselt vloeiend alleen als de beweging op Normaal
// staat (engine/watchFields.ts#pageScrollBehavior); Rustig, Uit en beperkte beweging springen naar de eindstand.

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { WatchModel } from '../../data/watchModels';
import { pageDotLabel, pageScrollBehavior } from '../../engine/watchFields';
import { useMotionMode } from '../motion';
import { WatchFace } from './WatchFace';

export function WatchPager({
  model,
  pages,
  page,
  onPageChange,
  selected,
  onPick,
  contentKey,
}: {
  model: WatchModel;
  pages: readonly (readonly string[])[];
  page: number;
  onPageChange: (page: number) => void;
  selected?: { page: number; cell: number };
  onPick: (page: number, cell: number) => void;
  // Verandert als een andere soort of versie in beeld komt: dan zet de strook zich meteen op de pagina.
  contentKey: string;
}) {
  const motion = useMotionMode();
  const strip = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const pageNow = useRef(page);
  // Een layout-effect, en vóór het springen hieronder: na Pagina erbij moet de sprong de nieuwe pagina kennen.
  useLayoutEffect(() => {
    pageNow.current = page;
  }, [page]);

  const jump = useCallback((index: number, behavior: ScrollBehavior) => {
    const el = strip.current;
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior });
  }, []);

  // Een andere soort of versie, of een pagina erbij of weg: de strook staat meteen op de bedoelde pagina.
  useLayoutEffect(() => {
    // Alleen bij een andere inhoud of een ander aantal pagina's, niet bij elke veeg.
    jump(Math.min(pageNow.current, pages.length - 1), 'auto');
  }, [contentKey, pages.length, jump]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = strip.current;
      if (!el || el.clientWidth === 0) return;
      const index = Math.min(pages.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
      if (index !== page) onPageChange(index);
    }, 60);
  };

  const current = Math.min(page, pages.length - 1);
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={strip}
        onScroll={onScroll}
        className="flex w-full snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: 'none', overscrollBehaviorX: 'contain' }}
      >
        {pages.map((fields, p) => (
          <div key={p} className="w-full flex-none snap-center px-1 py-2">
            <WatchFace model={model} fields={fields} page={p} selected={selected?.page === p ? selected.cell : undefined} onPick={(cell) => onPick(p, cell)} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {pages.map((_, p) => (
          <button
            key={p}
            type="button"
            aria-label={pageDotLabel(p, pages.length)}
            aria-current={p === current ? 'true' : undefined}
            className="flex h-11 w-11 items-center justify-center"
            onClick={() => {
              onPageChange(p);
              jump(p, pageScrollBehavior(motion));
            }}
          >
            <span aria-hidden className="block h-2.5 w-2.5 rounded-full" style={{ background: p === current ? 'var(--color-ink)' : 'var(--color-card-border)' }} />
          </button>
        ))}
      </div>
      <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{pageDotLabel(current, pages.length)}</p>
    </div>
  );
}
