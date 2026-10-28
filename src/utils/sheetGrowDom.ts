import { resolveMotion, type MotionMode } from '../engine/motionSettings';
import { growKeyframes, growOpacity, growPlan, isFreshOrigin, type GrowPhase, type Rect } from '../components/growPlan';

// De uitgroei van een rij tot een blad, het DOM-deel (docs/beslissingen/2026-10-28-vloeiende-overgangen-uitgroei.md).
// Een rij of kaart met `data-sheet-from` onthoudt bij een tik waar je op tikte; het blad dat daarna opent
// (useSheetClose, via `sheetRef`) laat een stil vlak in de kleur van het blad van de rij naar het paneel
// groeien en bij sluiten terug krimpen. De rekensom staat in components/growPlan.ts. Alleen transform en
// opacity, met element.animate(); faalt iets, dan wordt het vlak weggehaald en blijft het gewone blad.

let installed = false;
let last: { el: Element; at: number } | null = null;

// Eén luisteraar op document (capture, passief). Een tik buiten een rij met `data-sheet-from` wist de
// onthouden rij, zodat een blad dat niet uit een rij komt er nooit uit groeit.
export function installSheetOrigin(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as Element | null;
      const el = target && typeof target.closest === 'function' ? target.closest('[data-sheet-from]') : null;
      last = el ? { el, at: performance.now() } : null;
    },
    { capture: true, passive: true },
  );
}

// De stand van Beweging zoals useMotionAttribute hem op <html> zet; `prefers-reduced-motion` telt als Uit.
export function documentMotion(): MotionMode {
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return resolveMotion({ motion: document.documentElement.dataset.motion }, reduced);
}

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

const viewportOf = () => ({ width: window.innerWidth, height: window.innerHeight });

export interface SheetGrow {
  // Speelt het krimpen naar de rij en geeft de duur in ms, of 0 als er niets te krimpen valt.
  close: () => number;
  // Haalt het vlak weg (het paneel verdwijnt).
  dispose: () => void;
}

// De rij waar net op getikt is, als hij nog geldig is. Wordt opgebruikt door het eerste blad.
function takeOrigin(): Element | null {
  const origin = last;
  last = null;
  if (!origin) return null;
  const r = origin.el.getBoundingClientRect();
  return isFreshOrigin({ at: origin.at }, performance.now(), { isConnected: origin.el.isConnected, width: r.width, height: r.height }) ? origin.el : null;
}

// Aanroepen zodra het paneel in het document staat (de ref van het blad). Null als dit blad niet uit een
// rij komt of als er niets te animeren valt; het blad doet dan wat het altijd deed.
export function startSheetGrow(panel: HTMLElement): SheetGrow | null {
  if (typeof document === 'undefined' || typeof panel.animate !== 'function') return null;
  const row = takeOrigin();
  if (!row) return null;
  if (documentMotion() !== 'full') return null;

  let veil: HTMLElement | null = null;
  const removeVeil = () => {
    veil?.remove();
    veil = null;
  };

  // Het attribuut gaat eerst op het paneel: de bladanimatie schuift dan niet meer, dus de maat die we
  // meten is de eindmaat. Lukt het niet, dan gaat het er weer af.
  panel.setAttribute('data-grow', '');
  const play = (from: Rect, to: Rect, phase: GrowPhase): number => {
    const plan = growPlan('full', from, to, viewportOf(), phase);
    if (!plan) return 0;
    removeVeil();
    try {
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      Object.assign(el.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        width: `${to.width}px`,
        height: `${to.height}px`,
        boxSizing: 'border-box',
        transformOrigin: '0 0',
        pointerEvents: 'none',
        zIndex: '60',
        opacity: '0',
        background: 'var(--color-card)',
        border: '1px solid var(--color-card-border)',
        borderRadius: '20px 20px 0 0',
        willChange: 'transform, opacity',
      });
      document.body.appendChild(el);
      veil = el;
      const move = el.animate(growKeyframes(plan.from, plan.to, phase), { duration: plan.durationMs, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' });
      el.animate(growOpacity(plan.durationMs, phase), { duration: plan.durationMs, easing: 'linear', fill: 'both' });
      const done = () => {
        if (veil === el) removeVeil();
      };
      move.addEventListener('finish', done);
      move.addEventListener('cancel', done);
      return plan.durationMs;
    } catch {
      removeVeil();
      return 0;
    }
  };

  try {
    if (!play(rectOf(row), rectOf(panel), 'open')) {
      panel.removeAttribute('data-grow');
      return null;
    }
  } catch {
    removeVeil();
    panel.removeAttribute('data-grow');
    return null;
  }

  return {
    close: () => {
      try {
        const r = row.getBoundingClientRect();
        if (!row.isConnected || r.width <= 0 || r.height <= 0) return 0;
        panel.setAttribute('data-grow', '');
        const ms = play(rectOf(row), rectOf(panel), 'close');
        if (!ms) panel.removeAttribute('data-grow');
        return ms;
      } catch {
        removeVeil();
        return 0;
      }
    },
    dispose: () => {
      removeVeil();
      panel.removeAttribute('data-grow');
    },
  };
}
