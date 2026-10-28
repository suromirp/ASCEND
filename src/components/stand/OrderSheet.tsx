import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Icon } from '../icons';
import { PrimaryButton, SecondaryButton } from '../ui';
import { Sheet } from '../settings/Sheet';
import { useVerticalDrag } from '../useVerticalDrag';
import { useAppData } from '../../state/AppDataContext';
import {
  STAND_BLOCKS, blockIndexAtY, defaultOrder, handleLabel, isDefaultOrder, moveBlock, orderAnnouncement, resolveCardOrder,
} from '../../engine/cardOrder';

// Het blad "Volgorde aanpassen": de blokken van Je stand onder elkaar, elk met een greep om te
// slepen. Dezelfde hook en greep als de doelen op Ascend; het blad scrolt zelf, dus de randscroll
// werkt in het blad. Met het toetsenbord: greep focussen, spatie pakt op, pijltjes verplaatsen,
// spatie laat los, Escape annuleert. Voor schermlezers en wie niet slepen kan: Hoger en Lager in het
// menu van de rij. Falen van het wegschrijven zet de oude volgorde terug en zegt dat
// (docs/beslissingen/2026-10-28-forge-en-volgorde.md).

const PAGE = 'stand' as const;
const SAVE_FAILED = 'Dat lukte niet. De volgorde staat nog zoals eerst.';

interface Drag {
  id: string;
  mode: 'pointer' | 'key';
  target: number;
}

function RowMenu({ name, index, count, onStep, onClose }: { name: string; index: number; count: number; onStep: (dir: 'up' | 'down') => void; onClose: () => void }) {
  const item = (dir: 'up' | 'down', title: string, disabled: boolean, close: () => void) => (
    <button
      key={dir}
      type="button"
      disabled={disabled}
      onClick={() => { onStep(dir); close(); }}
      className="flex min-h-[56px] w-full items-center gap-3 border-b px-4 py-2 text-left last:border-b-0 disabled:opacity-40"
      style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
    >
      <span className={dir === 'up' ? 'flex rotate-180' : 'flex'}><Icon name="omlaag" size={20} /></span>
      <span className="text-base">{title}</span>
    </button>
  );
  return (
    <Sheet eyebrow="Dit blok" title={name} line={`Plek ${index + 1} van ${count}.`} onClose={onClose}>
      {(close) => (
        <div className="st-list">
          {item('up', 'Hoger', index === 0, close)}
          {item('down', 'Lager', index === count - 1, close)}
        </div>
      )}
    </Sheet>
  );
}

export function OrderSheet({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const [order, setOrder] = useState(() => resolveCardOrder(PAGE, settings.cardOrder));
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announce, setAnnounce] = useState('');
  const [failed, setFailed] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLDivElement>());
  const listRef = useRef<HTMLDivElement>(null);
  const live = useRef({ order });
  useEffect(() => { live.current = { order }; });
  const dragger = useVerticalDrag();

  const block = (id: string) => STAND_BLOCKS.find((b) => b.id === id)!;

  async function save(next: string[], before: string[], reset = false) {
    setOrder(next);
    setFailed(false);
    try {
      await updateSettings({ cardOrder: reset ? undefined : { [PAGE]: next } });
    } catch {
      setOrder(before);
      setFailed(true);
    }
  }

  function targetAt(y: number): number {
    const rects = live.current.order.map((id) => rows.current.get(id)?.getBoundingClientRect() ?? { top: 0, bottom: 0 });
    return blockIndexAtY(rects, y);
  }

  function drop(id: string, wanted: number) {
    const before = live.current.order;
    const next = moveBlock(PAGE, before, id, wanted);
    setDrag(null);
    if (next.join() === before.join()) { setAnnounce(orderAnnouncement(PAGE, before, id, 'cancelled')); return; }
    setAnnounce(orderAnnouncement(PAGE, next, id, 'dropped'));
    void save(next, before);
  }

  function startPointer(id: string, e: PointerEvent<HTMLButtonElement>) {
    dragger.start<number>(e, {
      locate: (y) => targetAt(y),
      onChange: (target) => setDrag({ id, mode: 'pointer', target }),
      onDrop: (target) => drop(id, target),
      onCancel: () => setDrag(null),
      threshold: 6,
      scroller: listRef.current?.closest<HTMLElement>('.st-sheet-body') ?? null,
    });
  }

  function keyDown(id: string, index: number, e: KeyboardEvent<HTMLButtonElement>) {
    const d = drag?.id === id && drag.mode === 'key' ? drag : null;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!d) { setDrag({ id, mode: 'key', target: index }); setAnnounce(orderAnnouncement(PAGE, order, id, 'moving')); return; }
      drop(id, d.target);
    } else if (d && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const wanted = Math.max(0, Math.min(order.length - 1, d.target + (e.key === 'ArrowUp' ? -1 : 1)));
      const target = moveBlock(PAGE, order, id, wanted).indexOf(id);
      setDrag({ ...d, target });
      setAnnounce(orderAnnouncement(PAGE, moveBlock(PAGE, order, id, wanted), id, 'moving'));
    } else if (d && (e.key === 'Escape' || e.key === 'Tab')) {
      if (e.key === 'Escape') e.preventDefault();
      setDrag(null);
      setAnnounce(orderAnnouncement(PAGE, order, id, 'cancelled'));
    }
  }

  function step(id: string, dir: 'up' | 'down') {
    const before = live.current.order;
    const next = moveBlock(PAGE, before, id, before.indexOf(id) + (dir === 'up' ? -1 : 1));
    if (next.join() === before.join()) return;
    setAnnounce(orderAnnouncement(PAGE, next, id, 'dropped'));
    void save(next, before);
  }

  // Waar de mint lijn komt: op de plek waar het blok na loslaten terechtkomt.
  const landing = drag ? moveBlock(PAGE, order, drag.id, drag.target).indexOf(drag.id) : -1;
  const from = drag ? order.indexOf(drag.id) : -1;
  const line = <div className="relative -my-1 h-[3px] rounded-full" aria-hidden="true" style={{ background: 'var(--color-action)' }} />;

  return (
    <>
      <Sheet eyebrow="Je stand" title="Volgorde aanpassen" line="Sleep de blokken in de volgorde die jij wilt. Je planning en je cijfers veranderen er niet door." onClose={onClose}>
        {(close) => (
          <div className="flex flex-col gap-4">
            <div ref={listRef} className="flex flex-col gap-2">
              {order.map((id, index) => {
                const b = block(id);
                const isDrag = drag?.id === id;
                return (
                  <div key={id} className="flex flex-col gap-2">
                    {drag && !isDrag && landing === index && landing < from && line}
                    <div
                      ref={(el) => { if (el) rows.current.set(id, el); else rows.current.delete(id); }}
                      className="flex min-h-[56px] items-center gap-1 rounded-2xl border pl-4 pr-1"
                      style={{ borderColor: isDrag ? 'var(--color-action)' : 'var(--color-card-border)', background: 'var(--color-card)' }}
                    >
                      <div className="min-w-0 flex-1 py-2">
                        <span className="block text-base" style={{ color: 'var(--color-ink)' }}>{b.name}</span>
                        <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{b.line}</span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Meer voor ${b.name}`}
                        onClick={() => setMenuFor(id)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                        style={{ color: 'var(--color-ink-dim)' }}
                      >
                        <Icon name="meer" size={20} />
                      </button>
                      <button
                        type="button"
                        aria-label={handleLabel(PAGE, order, id)}
                        aria-pressed={isDrag}
                        onPointerDown={(e) => startPointer(id, e)}
                        onKeyDown={(e) => keyDown(id, index, e)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                        style={{ touchAction: 'none', color: isDrag ? 'var(--color-action)' : 'var(--color-ink-dim)', cursor: 'grab' }}
                      >
                        <Icon name="greep" size={22} />
                      </button>
                    </div>
                    {drag && !isDrag && landing === index && landing > from && line}
                  </div>
                );
              })}
            </div>
            <p className="sr-only" aria-live="polite">{announce}</p>
            {failed && <p className="text-sm" role="status" aria-live="polite" style={{ color: 'var(--color-warning)' }}>{SAVE_FAILED}</p>}
            <div className="flex flex-col gap-3">
              <PrimaryButton onClick={close}>Klaar</PrimaryButton>
              <SecondaryButton disabled={isDefaultOrder(PAGE, order)} onClick={() => void save(defaultOrder(PAGE), live.current.order, true)}>Terug naar standaard</SecondaryButton>
            </div>
          </div>
        )}
      </Sheet>
      {menuFor && (
        <RowMenu
          name={block(menuFor).name}
          index={order.indexOf(menuFor)}
          count={order.length}
          onStep={(dir) => step(menuFor, dir)}
          onClose={() => setMenuFor(null)}
        />
      )}
    </>
  );
}
