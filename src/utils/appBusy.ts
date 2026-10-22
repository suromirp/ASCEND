// ASCEND — staat er nu iets open of wordt er iets ingevuld?
//
// Gebruikt door het automatisch bijwerken (utils/swUpdate.ts): de app mag
// zichzelf alleen herladen op een rustig moment. Drie eenvoudige tekens dat
// het niet rustig is:
// 1. Er ligt een sheet, dialoog of scherm over de app. Elke sheet, wizard en
//    logger in ASCEND is een volledig scherm `fixed inset-0` (zie ook
//    components/useOverlayA11y.ts, dat dezelfde regel gebruikt).
// 2. Er staat een invoerveld in focus (toetsenbord open, je typt).
// 3. Er is in de laatste twee minuten iets getypt of gekozen in een veld,
//    ook als het veld intussen zijn focus kwijt is.

export const OVERLAY_SELECTOR = '.fixed.inset-0';

const EDITABLE_SELECTOR =
  'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select, [contenteditable=""], [contenteditable="true"]';

export const RECENT_INPUT_MS = 2 * 60 * 1000;

let lastInputAt = Number.NEGATIVE_INFINITY;
let tracking = false;

// Eén keer aanroepen bij het starten; luistert in de capture-fase zodat geen
// enkel veld het kan missen.
export function trackUserInput(): void {
  if (tracking || typeof document === 'undefined') return;
  tracking = true;
  const mark = () => {
    lastInputAt = Date.now();
  };
  document.addEventListener('input', mark, true);
  document.addEventListener('change', mark, true);
}

export function noteUserInput(at: number = Date.now()): void {
  lastInputAt = at;
}

export function isAppBusy(now: number = Date.now(), doc: Document | undefined = typeof document === 'undefined' ? undefined : document): boolean {
  if (!doc) return false;
  if (doc.querySelector(OVERLAY_SELECTOR)) return true;
  const active = doc.activeElement;
  if (active && active !== doc.body && active.matches(EDITABLE_SELECTOR)) return true;
  return now - lastInputAt < RECENT_INPUT_MS;
}
