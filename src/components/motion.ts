import { useLayoutEffect, useRef } from 'react';
import { useAppData } from '../state/AppDataContext';
import { resolveMotion, type MotionMode } from '../engine/motionSettings';
import { MOTION_KEY } from '../utils/updateFlag';

// Hoeveel de app beweegt (instelling "Beweging", docs/beslissingen/2026-10-24-beweging.md).
// `prefers-reduced-motion: reduce` telt altijd als Uit. De CSS leest dezelfde stand uit
// `data-motion` op <html>; deze hooks zijn voor wat alleen in code kan (optellen).

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useMotionMode(): MotionMode {
  const { settings } = useAppData();
  return resolveMotion(settings, prefersReducedMotion());
}

// Zet de stand op <html> zodat de stijlen er op kunnen sturen. Eén keer per wijziging.
// Zolang de instellingen nog laden (`ready` is onwaar) blijft de stand van de vorige keer staan.
export function useMotionAttribute(ready = true): void {
  const mode = useMotionMode();
  useLayoutEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.motion = mode;
    // De instellingen laden pas na het openingsscherm; de volgende keer zet
    // utils/updateFlag.ts deze stand alvast, zodat het logo in Rustig en Uit
    // meteen op de eindstand staat.
    try {
      localStorage.setItem(MOTION_KEY, mode);
    } catch {
      // geen opslag: de stand geldt dan pas als de instellingen geladen zijn
    }
  }, [mode, ready]);
}

// Telt een geheel getal kort op bij het eerste verschijnen (500 ms, ease-out). Schrijft
// rechtstreeks in de tekst via een ref: geen render per beeld, geen lus die blijft draaien.
// Daarna springt een nieuwe waarde gewoon naar zijn plek.
export function useCountUp(target: number, enabled: boolean, durationMs = 500) {
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = (n: number) => {
      el.textContent = String(Math.round(n));
    };
    if (!enabled || played.current || !Number.isFinite(target) || target <= 0) {
      played.current = true;
      show(target);
      return;
    }
    show(0);
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      show(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(step);
      else played.current = true;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      show(target);
    };
  }, [target, enabled, durationMs]);
  return ref;
}
