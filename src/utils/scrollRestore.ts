// ASCEND: terug op dezelfde hoogte.
//
// De pagina is niet meteen klaar als je terugkomt: een pagina die op aanvraag
// geladen wordt, gegevens die uit de opslag komen. Terug scrollen naar 1800 px
// kan pas als de pagina zo lang is. Daarom wordt er gewacht tot hij dat is,
// met een grens in de tijd, en gestopt zodra jij zelf scrolt of tikt.

export interface RestoreInput {
  target: number;
  scrollHeight: number;
  clientHeight: number;
  elapsedMs: number;
  timeoutMs: number;
}

// `set`: naar welke hoogte nu (null: nog niets doen); `done`: klaar.
export function planRestore(input: RestoreInput): { set: number | null; done: boolean } {
  const target = Math.max(0, Math.round(input.target));
  if (target === 0) return { set: 0, done: true };
  const max = Math.max(0, input.scrollHeight - input.clientHeight);
  if (max >= target) return { set: target, done: true };
  // De pagina blijft korter dan toen: dan zo ver als kan.
  if (input.elapsedMs >= input.timeoutMs) return { set: max, done: true };
  return { set: null, done: false };
}

const USER_EVENTS = ['touchstart', 'wheel', 'pointerdown', 'keydown'] as const;

export interface RestoreHandle {
  cancel: () => void;
}

// Zet de scrollhoogte van `el` terug naar `target`, zodra de pagina lang
// genoeg is. `onSettled` komt precies één keer (klaar, te lang geduurd,
// onderbroken of geannuleerd).
export function restoreScroll(el: HTMLElement, target: number, onSettled: () => void, timeoutMs = 2500): RestoreHandle {
  const start = performance.now();
  let frame = 0;
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    for (const type of USER_EVENTS) el.removeEventListener(type, finish);
    onSettled();
  }

  function tick() {
    if (finished) return;
    const plan = planRestore({ target, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, elapsedMs: performance.now() - start, timeoutMs });
    if (plan.set !== null) el.scrollTop = plan.set;
    if (plan.done) {
      finish();
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  for (const type of USER_EVENTS) el.addEventListener(type, finish, { passive: true });
  tick();
  return { cancel: finish };
}
