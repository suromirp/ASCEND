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
export function edgeScroll(y: number, top: number, height: number): number {
  if (y < top + EDGE_TOP) return -EDGE_STEP;
  if (y > height - EDGE_BOTTOM) return EDGE_STEP;
  return 0;
}

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
}

interface StartEvent { button?: number; clientY: number; preventDefault: () => void }

export function useVerticalDrag() {
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const start = useCallback(<T,>(e: StartEvent, h: VerticalDragHandlers<T>) => {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    cleanup.current?.();
    const scroller = document.getElementById('app-scroll');
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
        scroller.scrollTop += edgeScroll(lastY, scroller.getBoundingClientRect().top, window.innerHeight);
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
    };
    const up = () => {
      stop();
      if (!picked) { h.onTap?.(); return; }
      h.onDrop(h.locate(lastY));
    };
    const cancel = () => { stop(); if (picked || threshold === 0) h.onCancel(); };
    cleanup.current = stop;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    if (threshold === 0) pick();
  }, []);

  // Stopt een lopend slepen zonder iets te doen (een andere week, een blad dat opent).
  const cancel = useCallback(() => { cleanup.current?.(); }, []);

  return { start, cancel };
}
