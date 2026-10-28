import { useCallback, useEffect, useRef } from 'react';

// Het slepen met de vinger of muis, gedeeld door de doelen op Ascend en de trainingen in Week: de
// luisteraars op `window` zodra je de greep aanraakt, de pagina (#app-scroll) die meescrolt aan de
// randen, het opruimen en het annuleren. Wat een plek of dag is weet de lijst zelf: de hook krijgt
// `locate(y)` (welk doel hoort bij dit y), `onChange(doel, dy)`, `onDrop(doel)` en `onCancel()`.
// De hook verandert niets aan de pagina en schrijft geen adres om; het slepen is geen laag in de
// terugknop (utils/backLayers).

const EDGE_TOP = 90;
const EDGE_BOTTOM = 130;
const EDGE_STEP = 10;

// Hoeveel pixels de pagina per beeld scrolt: omhoog binnen 90 px van de bovenkant van de pagina,
// omlaag binnen 130 px van de onderkant van het scherm, anders niet.
// In een eigen bak (een blad) tellen de randen van de bak en zijn ze smaller: `edges`.
export function edgeScroll(y: number, top: number, height: number, edges: { top: number; bottom: number } = { top: EDGE_TOP, bottom: EDGE_BOTTOM }): number {
  if (y < top + edges.top) return -EDGE_STEP;
  if (y > height - edges.bottom) return EDGE_STEP;
  return 0;
}

// De rand van een eigen bak waarin gescrold wordt.
export const BOX_EDGES = { top: 40, bottom: 40 };

export interface VerticalDragHandlers<T> {
  // Welk doel hoort bij deze hoogte op het scherm.
  locate: (y: number) => T;
  // Elke beweging en elk beeld tijdens het scrollen: het doel en hoe ver de vinger is gegaan (met de scrol erbij).
  onChange: (target: T, dy: number) => void;
  // Losgelaten: het doel waar de vinger stond.
  onDrop: (target: T) => void;
  // Geannuleerd door de browser of de app (pointercancel): niets verandert.
  onCancel: () => void;
  // Pas oppakken na zoveel pixels verticaal bewegen; eerder loslaten is geen slepen maar een tik. 0: meteen.
  threshold?: number;
  // Oppakken (de drempel is gehaald); niet bij een drempel van 0.
  onPickUp?: () => void;
  // Losgelaten zonder dat de drempel is gehaald.
  onTap?: () => void;
  // De bak waarin gescrold wordt, als element of als selector. Standaard de pagina (#app-scroll).
  // Een blad is zijn eigen bak: dan scrolt de randscroll daarin en tellen de randen van de bak.
  scroller?: HTMLElement | string | null;
}

interface StartEvent { button?: number; clientY: number; preventDefault: () => void }

export function useVerticalDrag() {
  const cleanup = useRef<(() => void) | null>(null);
  const abort = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const start = useCallback(<T,>(e: StartEvent, h: VerticalDragHandlers<T>) => {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    // Een nieuw slepen terwijl er nog een loopt (een tweede vinger): het oude wordt netjes afgebroken,
    // zodat er geen zwevende rij blijft staan.
    abort.current?.();
    const custom = h.scroller !== undefined;
    const scroller = typeof h.scroller === 'string' ? document.querySelector<HTMLElement>(h.scroller) : custom ? h.scroller : document.getElementById('app-scroll');
    const startY = e.clientY;
    const startScroll = scroller?.scrollTop ?? 0;
    const threshold = h.threshold ?? 0;
    let lastY = startY;
    let raf = 0;
    let picked = false;
    const update = () => {
      const dy = lastY - startY + ((scroller?.scrollTop ?? 0) - startScroll);
      h.onChange(h.locate(lastY), dy);
    };
    const loop = () => {
      if (scroller) {
        const box = scroller.getBoundingClientRect();
        scroller.scrollTop += custom ? edgeScroll(lastY, box.top, box.bottom, BOX_EDGES) : edgeScroll(lastY, box.top, window.innerHeight);
        update();
      }
      raf = requestAnimationFrame(loop);
    };
    const pick = () => {
      picked = true;
      h.onPickUp?.();
      raf = requestAnimationFrame(loop);
      update();
    };
    const move = (ev: globalThis.PointerEvent) => {
      lastY = ev.clientY;
      if (!picked) {
        if (Math.abs(lastY - startY) > threshold) pick();
        return;
      }
      update();
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      cleanup.current = null;
      abort.current = null;
    };
    const up = () => {
      stop();
      if (!picked) { h.onTap?.(); return; }
      h.onDrop(h.locate(lastY));
    };
    const cancel = () => { stop(); if (picked || threshold === 0) h.onCancel(); };
    cleanup.current = stop;
    abort.current = cancel;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    if (threshold === 0) pick();
  }, []);

  // Stopt een lopend slepen zonder iets te doen (een andere week, een blad dat opent).
  const cancel = useCallback(() => { cleanup.current?.(); }, []);

  return { start, cancel };
}
