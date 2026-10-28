import { useEffect } from 'react';
import { OVERLAY_SELECTOR } from '../utils/appBusy';
import { noteOverlayClosed } from '../utils/overlayGuard';

// Every bottom sheet and dialog in ASCEND is a full-screen `fixed inset-0`
// backdrop that closes when tapped. This makes them behave as real dialogs
// for keyboard and screen reader users without touching each sheet
// (audit 2026-10, 3.5):
// - role="dialog" and aria-modal on the backdrop,
// - focus moves into the sheet when it opens and back to where it was when
//   it closes,
// - Escape closes the topmost sheet the same way a tap on the backdrop does.
function overlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR));
}

export function useOverlayA11y(): void {
  useEffect(() => {
    const returnFocus = new Map<HTMLElement, Element | null>();
    const sync = () => {
      const open = overlays();
      for (const el of open) {
        if (returnFocus.has(el)) continue;
        returnFocus.set(el, document.activeElement);
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        // Focus goes to the sheet itself, never to its first button: that is
        // often a destructive one ("Verwijderen") and it would show a focus
        // ring right after opening. A field that asked for focus keeps it.
        if (el.contains(document.activeElement) && document.activeElement !== el) continue;
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.style.outline = 'none';
        el.focus({ preventScroll: true });
      }
      for (const [el, previous] of returnFocus) {
        if (open.includes(el)) continue;
        returnFocus.delete(el);
        // De tabbalk negeert een tweede tik vlak hierna (utils/overlayGuard.ts).
        noteOverlayClosed();
        if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Een onderdeel dat Escape zelf afhandelt (een lopend slepen annuleren) zegt dat met preventDefault.
      if (e.defaultPrevented) return;
      const top = overlays().at(-1);
      if (!top) return;
      e.preventDefault();
      // The same as tapping the backdrop: each sheet decides whether it may
      // close right now (an import that is running does not).
      top.click();
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', onKey);
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', onKey);
    };
  }, []);
}
