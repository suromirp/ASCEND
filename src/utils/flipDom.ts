import { applyOverride, flipDeltas, flipDuration, isArmed, FLIP_FADE_MS, FLIP_WAIT_MS, type FlipDelta, type FlipStyle, type Rect } from '../components/flip';

// Een verplaatste training schuift naar zijn nieuwe dag, het DOM-deel
// (docs/beslissingen/2026-10-28-vloeiende-overgangen-uitgroei.md). De rekensom staat in components/flip.ts.
//
// 1. `armFlip()` meet de plek van elke rij (`[data-session-row]`) in paginaruimte, vlak voor een handeling
//    die de planning verandert (applyProposal, Ongedaan maken). Zonder die voorbereiding animeert niets:
//    een synchronisatie op de achtergrond die later de gegevens aanpast, speelt dus nooit iets af.
// 2. Na het tekenen roept `useFlipList` `playFlip()` aan: de nieuwe plekken worden gemeten, de rijen die
//    minstens 4 px verschoven zijn worden meteen terug gezet naar de oude plek (nog voor het eerste
//    beeld) en schuiven dan met element.animate() naar hun plek. Rijen worden op id gekoppeld, niet op
//    element, want dezelfde training staat na een verplaatsing in een ander dagblok.
// 3. Ligt er nog een blad over de pagina (Akkoord op een voorstel), dan wachten de rijen omgekeerd tot het
//    weg is, hooguit 600 ms. Daarna staan ze gewoon op de eindplek; er blijft nooit een transform achter.

interface Armed {
  at: number;
  rects: Map<string, Rect>;
  days: Map<string, string>;
}

let armed: Armed | null = null;
let origin: { id: string; pageTop: number; at: number } | null = null;
let running: Animation[] = [];

const ROW = '[data-session-row]';
const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

const scroller = () => document.getElementById('app-scroll');

function measure(): { rects: Map<string, Rect>; days: Map<string, string> } {
  const sc = scroller();
  const st = sc?.scrollTop ?? 0;
  const sl = sc?.scrollLeft ?? 0;
  const rects = new Map<string, Rect>();
  const days = new Map<string, string>();
  for (const el of document.querySelectorAll<HTMLElement>(ROW)) {
    const id = el.dataset.sessionRow;
    if (!id) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    rects.set(id, { left: r.left + sl, top: r.top + st, width: r.width, height: r.height });
    days.set(id, el.closest<HTMLElement>('[data-week-day]')?.dataset.weekDay ?? '');
  }
  return { rects, days };
}

// Vlak voor een handeling die de planning verandert. Zijn er geen rijen in beeld, dan blijft het stil.
export function armFlip(): void {
  if (typeof document === 'undefined') return;
  try {
    const m = measure();
    armed = m.rects.size > 0 ? { at: performance.now(), ...m } : null;
  } catch {
    armed = null;
  }
}

// Na het loslaten van een zwevende rij: de rij begint waar die rij was, niet op zijn oude plek.
export function setFlipOrigin(id: string, viewportTop: number): void {
  if (typeof document === 'undefined') return;
  origin = { id, pageTop: viewportTop + (scroller()?.scrollTop ?? 0), at: performance.now() };
}

export function flipIsArmed(): boolean {
  return armed !== null && isArmed(armed.at, performance.now());
}

function stopRunning() {
  for (const a of running) a.cancel();
  running = [];
}

function sheetOpen(): boolean {
  return document.querySelector('.animate-sheet-in, .animate-sheet-out') !== null;
}

function rowEl(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-session-row="${CSS.escape(id)}"]`);
}

// Aanroepen in een layout effect, na het tekenen. Doet niets zonder voorbereiding; ziet het nog geen
// verschuiving (een andere render ertussen), dan blijft de voorbereiding staan tot ze verloopt.
export function playFlip(style: FlipStyle): void {
  if (typeof document === 'undefined' || !armed) return;
  const now = performance.now();
  if (!isArmed(armed.at, now)) {
    armed = null;
    origin = null;
    return;
  }
  try {
    stopRunning();
    const after = measure();
    const startRects = origin && isArmed(origin.at, now) ? applyOverride(armed.rects, origin.id, origin.pageTop) : armed.rects;
    const deltas = flipDeltas(startRects, after.rects);
    if (deltas.size === 0) return;
    const before = armed;
    armed = null;
    origin = null;
    if (style === 'none') return;

    // Omkeren, nog voor het eerste beeld. Rustig schuift niet: alleen de rij die van dag wisselde
    // verschijnt kort.
    const targets: { el: HTMLElement; id: string; delta: FlipDelta }[] = [];
    for (const [id, delta] of deltas) {
      const el = rowEl(id);
      if (!el) continue;
      if (style === 'fade' && before.days.get(id) === after.days.get(id)) continue;
      targets.push({ el, id, delta });
      if (style === 'slide') el.style.transform = `translate(${delta.dx}px, ${delta.dy}px)`;
      else el.style.opacity = '0';
    }
    if (targets.length === 0) return;

    const clear = () => {
      for (const t of targets) {
        t.el.style.removeProperty('transform');
        t.el.style.removeProperty('opacity');
        t.el.style.removeProperty('z-index');
      }
    };
    const play = () => {
      const live = targets.filter((t) => t.el.isConnected);
      for (const t of live) {
        t.el.style.removeProperty('transform');
        t.el.style.removeProperty('opacity');
        try {
          if (style === 'slide') {
            t.el.style.zIndex = '5';
            const a = t.el.animate(
              [{ transform: `translate(${t.delta.dx}px, ${t.delta.dy}px)` }, { transform: 'none' }],
              { duration: flipDuration(Math.hypot(t.delta.dx, t.delta.dy)), easing: EASING },
            );
            const done = () => t.el.style.removeProperty('z-index');
            a.addEventListener('finish', done);
            a.addEventListener('cancel', done);
            running.push(a);
          } else {
            running.push(t.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FLIP_FADE_MS, easing: 'ease-out' }));
          }
        } catch {
          t.el.style.removeProperty('z-index');
        }
      }
    };

    // Wachten tot een voorstelblad weg is; na de grens gewoon op de eindplek.
    if (!sheetOpen()) {
      play();
      return;
    }
    const started = performance.now();
    const poll = () => {
      if (!sheetOpen()) play();
      else if (performance.now() - started >= FLIP_WAIT_MS) clear();
      else window.setTimeout(poll, 40);
    };
    window.setTimeout(poll, 40);
  } catch {
    armed = null;
  }
}
