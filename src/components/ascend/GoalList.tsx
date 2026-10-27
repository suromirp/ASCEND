import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { PRIORITY_NAME } from '../../engine/goalLabels';
import { moveGoal, type MoveResult, type NextKeySession } from '../../engine/goalList';
import { GoalCard } from './GoalCard';
import type { GoalView } from './useGoalViews';

// De doelen onder elkaar, met slepen om de volgorde te kiezen. De greep pakt een doel op; waar je
// loslaat komt het te staan, en het label volgt die plek (moveGoal). Een ander label is een
// voorstel met Akkoord: dat regelt de pagina in `onMove`. Met het toetsenbord: greep focussen,
// spatie pakt op, pijltjes verplaatsen, spatie laat los, Escape annuleert. Zonder slepen kan het
// ook met Hoger en Lager in het blad van het doel.

interface Drag {
  id: string;
  mode: 'pointer' | 'key';
  target: number;
  dy: number;
}

export function GoalList({
  views, isOpen, next, onToggle, onDetails, onLabel, onMove,
}: {
  views: GoalView[];
  isOpen: (id: string, index: number) => boolean;
  next?: NextKeySession;
  onToggle: (id: string) => void;
  onDetails: (id: string) => void;
  onLabel: (id: string) => void;
  onMove: (id: string, result: MoveResult) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announce, setAnnounce] = useState('');
  const cards = useRef(new Map<string, HTMLDivElement>());
  const live = useRef({ views, onMove, drag });
  useEffect(() => { live.current = { views, onMove, drag }; });
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const listed = views.map((v) => v.item);
  const say = (id: string, target: number) => {
    const r = moveGoal(listed, id, target);
    setAnnounce(`Plek ${target + 1} van ${views.length}, label ${PRIORITY_NAME[r.priority]}`);
  };

  function targetAt(id: string, y: number): number {
    let idx = 0;
    for (const v of live.current.views) {
      if (v.item.goal.id === id) continue;
      const el = cards.current.get(v.item.goal.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y > r.top + r.height / 2) idx++;
    }
    return idx;
  }

  function startPointer(id: string, e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    const scroller = document.getElementById('app-scroll');
    const startY = e.clientY;
    const startScroll = scroller?.scrollTop ?? 0;
    let lastY = startY;
    let raf = 0;
    const update = () => {
      const dy = lastY - startY + ((scroller?.scrollTop ?? 0) - startScroll);
      setDrag({ id, mode: 'pointer', target: targetAt(id, lastY), dy });
    };
    const loop = () => {
      if (scroller) {
        const top = scroller.getBoundingClientRect().top;
        if (lastY < top + 90) scroller.scrollTop -= 10;
        else if (lastY > window.innerHeight - 130) scroller.scrollTop += 10;
        update();
      }
      raf = requestAnimationFrame(loop);
    };
    const move = (ev: globalThis.PointerEvent) => { lastY = ev.clientY; update(); };
    const stop = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      cleanup.current = null;
    };
    const up = () => {
      stop();
      const target = targetAt(id, lastY);
      setDrag(null);
      const result = moveGoal(live.current.views.map((v) => v.item), id, target);
      if (result.changed) live.current.onMove(id, result);
    };
    const cancel = () => { stop(); setDrag(null); };
    cleanup.current = stop;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    raf = requestAnimationFrame(loop);
    update();
  }

  function keyDown(id: string, index: number, e: KeyboardEvent<HTMLButtonElement>) {
    const d = drag?.id === id && drag.mode === 'key' ? drag : null;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!d) { setDrag({ id, mode: 'key', target: index, dy: 0 }); say(id, index); return; }
      setDrag(null);
      const result = moveGoal(listed, id, d.target);
      if (result.changed) onMove(id, result);
      else setAnnounce('Op dezelfde plek gelaten');
    } else if (d && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const target = Math.max(0, Math.min(views.length - 1, d.target + (e.key === 'ArrowUp' ? -1 : 1)));
      setDrag({ ...d, target });
      say(id, target);
    } else if (d && (e.key === 'Escape' || e.key === 'Tab')) {
      if (e.key === 'Escape') e.preventDefault();
      setDrag(null);
      setAnnounce('Niet verplaatst');
    }
  }

  const preview = drag ? moveGoal(listed, drag.id, drag.target) : null;
  const others = drag ? views.filter((v) => v.item.goal.id !== drag.id) : views;
  const line = (key: string) => (
    <div key={key} className="relative -my-1 flex items-center gap-2" aria-hidden="true">
      <span className="h-[3px] flex-1 rounded-full" style={{ background: 'var(--color-action)' }} />
      {preview?.changesLabel && <span className="text-xs font-semibold" style={{ color: 'var(--color-action)' }}>Wordt {PRIORITY_NAME[preview.priority]}</span>}
    </div>
  );

  const renderCard = (v: GoalView, index: number) => {
    const id = v.item.goal.id;
    const isDrag = drag?.id === id;
    return (
      <GoalCard
        key={id}
        ref={(el) => { if (el) cards.current.set(id, el); else cards.current.delete(id); }}
        view={v}
        open={isOpen(id, index)}
        first={index === 0}
        next={index === 0 ? next : undefined}
        dragging={isDrag}
        dragStyle={isDrag && drag.mode === 'pointer' ? { transform: `translateY(${drag.dy}px)`, pointerEvents: 'none' } : isDrag ? { borderColor: 'var(--color-action)' } : undefined}
        handle={{ active: isDrag, onPointerDown: (e) => startPointer(id, e), onKeyDown: (e) => keyDown(id, index, e) }}
        onToggle={() => onToggle(id)}
        onDetails={() => onDetails(id)}
        onLabel={() => onLabel(id)}
      />
    );
  };

  let k = 0;
  return (
    <div className="flex flex-col gap-3">
      {views.map((v, index) => {
        const id = v.item.goal.id;
        const isDrag = drag?.id === id;
        const before = drag && !isDrag && drag.target === k ? line(`line-${k}`) : null;
        if (!isDrag) k++;
        return (
          <Fragment key={id}>
            {before}
            {renderCard(v, index)}
          </Fragment>
        );
      })}
      {drag && drag.target === others.length && line('line-end')}
      <p className="sr-only" aria-live="polite">{announce}</p>
    </div>
  );
}
