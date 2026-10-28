import { canStartInContent, dragIntent, sheetFollow, sheetRelease, velocityOf, type DragSample } from '../components/sheetDrag';

// Het gebaar "blad omlaag slepen om te sluiten" (docs/beslissingen/2026-10-28-vloeiende-overgangen.md).
// De luisteraars zitten op het paneel zelf, niet op het document. Het blad scrolt, dus er is
// geen `touch-action: none`: `touchmove` is niet-passief en roept alleen `preventDefault` aan
// bij een gebaar dat het blad heeft overgenomen. Dat besluit valt bij het begin en verandert
// niet halverwege. Het blad volgt met de eigenschap `translate`, los van de `transform` van de
// bladanimatie, en sluit via de bestaande sluitweg (useSheetClose: terugknop en canClose).
// Volgen is 1 op 1 in elke stand van Beweging; het terugveren (klasse `sheet-snap`) en het
// wegschuiven lopen via de animatie en overgang uit index.css, die in Uit en bij beperkte
// beweging meteen op de eindstand staan.

export type SheetDragOptions = {
  requestClose: () => void;
  canClose: () => boolean;
  isClosing: () => boolean;
};

const SNAP_MS = 200;
const FAST_CLOSE_MS = 160;
// Een snelle veeg laat de uitgang korter duren, zodat het gebaar niet vertraagt.
const FAST_VELOCITY = 1;

type El = {
  parentElement: El | null;
  scrollTop?: number;
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
};

// Wat zelf sleept of typt, begint nooit een bladgebaar.
export function ownsGesture(el: El): boolean {
  const tag = (el.tagName ?? '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (el.getAttribute?.('data-no-sheet-drag') != null) return true;
  const role = el.getAttribute?.('role');
  return role === 'slider' || role === 'spinbutton';
}

export function attachSheetDrag(panel: HTMLElement, options: SheetDragOptions): () => void {
  let state: 'idle' | 'pending' | 'ignored' | 'dragging' = 'idle';
  let startX = 0;
  let startY = 0;
  let baseY = 0;
  let dy = 0;
  let samples: DragSample[] = [];
  let snapTimer: ReturnType<typeof setTimeout> | undefined;

  const touchOf = (e: TouchEvent) => e.touches[0] ?? e.changedTouches[0];

  function clearSnap() {
    if (!snapTimer) return;
    clearTimeout(snapTimer);
    snapTimer = undefined;
    panel.classList.remove('sheet-snap');
    panel.style.removeProperty('translate');
  }

  function reset() {
    state = 'idle';
    dy = 0;
    samples = [];
  }

  function onStart(e: TouchEvent) {
    if (e.touches.length !== 1 || options.isClosing() || !options.canClose()) {
      // Een tweede vinger of een blad dat niet dicht mag: een lopend gebaar wordt netjes afgebroken.
      if (state === 'dragging') snapBack();
      state = 'ignored';
      return;
    }
    const target = e.target as unknown as El | null;
    // De hele keten tot het paneel: invoer en sliders blijven van zichzelf, en elke scrollende
    // voorouder moet bovenaan staan.
    const chain: { scrollTop: number }[] = [];
    let owns = false;
    for (let el: El | null = target; el; el = el.parentElement) {
      if (ownsGesture(el)) owns = true;
      chain.push({ scrollTop: el.scrollTop ?? 0 });
      if (el === (panel as unknown as El)) break;
    }
    clearSnap();
    const t = touchOf(e);
    startX = t.clientX;
    startY = t.clientY;
    samples = [{ t: e.timeStamp, y: t.clientY }];
    dy = 0;
    state = owns || !canStartInContent(chain) ? 'ignored' : 'pending';
  }

  function onMove(e: TouchEvent) {
    if (state === 'idle' || state === 'ignored') return;
    if (e.touches.length !== 1) {
      if (state === 'dragging') snapBack();
      state = 'ignored';
      return;
    }
    const t = touchOf(e);
    const moveX = t.clientX - startX;
    const moveY = t.clientY - startY;
    if (state === 'pending') {
      if (Math.abs(moveX) < 8 && Math.abs(moveY) < 8) return;
      if (!dragIntent(moveX, moveY)) {
        // Omhoog of opzij: de inhoud (of de bediening) houdt het gebaar.
        state = 'ignored';
        return;
      }
      state = 'dragging';
      // 1 op 1 vanaf het moment dat het blad het overneemt, zonder sprong.
      baseY = t.clientY;
      clearSnap();
    }
    if (e.cancelable) e.preventDefault();
    dy = sheetFollow(t.clientY - baseY);
    samples.push({ t: e.timeStamp, y: t.clientY });
    if (samples.length > 8) samples.shift();
    panel.style.translate = `0 ${dy}px`;
  }

  function snapBack() {
    state = 'idle';
    if (dy <= 0) {
      panel.style.removeProperty('translate');
      reset();
      return;
    }
    panel.classList.add('sheet-snap');
    panel.style.translate = '0 0';
    snapTimer = setTimeout(() => {
      snapTimer = undefined;
      panel.classList.remove('sheet-snap');
      panel.style.removeProperty('translate');
    }, SNAP_MS + 20);
    reset();
  }

  function onEnd() {
    if (state !== 'dragging') {
      reset();
      return;
    }
    const velocity = velocityOf(samples);
    const height = panel.getBoundingClientRect().height;
    const verdict = options.canClose() ? sheetRelease({ dy, velocity, height }) : 'back';
    if (verdict === 'close') {
      // De translate blijft staan: de uitgang loopt er overheen vanaf waar je vinger was.
      if (velocity > FAST_VELOCITY) panel.style.animationDuration = `${FAST_CLOSE_MS}ms`;
      reset();
      options.requestClose();
    } else {
      snapBack();
    }
  }

  function onCancel() {
    if (state === 'dragging') snapBack();
    else reset();
  }

  panel.addEventListener('touchstart', onStart, { passive: true });
  panel.addEventListener('touchmove', onMove, { passive: false });
  panel.addEventListener('touchend', onEnd, { passive: true });
  panel.addEventListener('touchcancel', onCancel, { passive: true });
  return () => {
    clearSnap();
    panel.removeEventListener('touchstart', onStart);
    panel.removeEventListener('touchmove', onMove);
    panel.removeEventListener('touchend', onEnd);
    panel.removeEventListener('touchcancel', onCancel);
  };
}
