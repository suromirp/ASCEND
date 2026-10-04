import { useEffect } from 'react';

// Every bottom sheet and dialog in ASCEND is a full-screen `fixed inset-0`
// backdrop that closes when tapped. This makes them behave as real dialogs
// for keyboard and screen reader users without touching each sheet
// (audit 2026-10, 3.5):
// - role="dialog" and aria-modal on the backdrop,
// - focus moves into the sheet when it opens and back to where it was when
//   it closes,
// - Escape closes the topmost sheet the same way a tap on the backdrop does.
const OVERLAY_SELECTOR = '.fixed.inset-0';
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
        const first = el.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? el).focus({ preventScroll: true });
      }
      for (const [el, previous] of returnFocus) {
        if (open.includes(el)) continue;
        returnFocus.delete(el);
        if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
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
