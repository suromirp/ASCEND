// ASCEND: de terugknop sluit eerst wat er over de pagina ligt.
//
// Elk blad, elke dialoog en elk scherm dat over de app komt ("laag") zet bij
// het openen één geschiedenisstap neer. Die stap heeft dezelfde URL als de
// pagina eronder (HashRouter ziet geen verandering) en een markering in de
// state. De terugknop haalt die stap weg: de laag sluit en je blijft op de
// pagina. Sluit je de laag zelf, dan gaat dezelfde stap met history.back()
// weer weg, zodat er niets blijft hangen.
//
// Wat deze module regelt, zonder React (de haak staat in useBackToClose.ts):
// - Lagen op lagen sluiten in de goede volgorde: de bovenste eerst.
// - Alles gaat achter elkaar (een rij): een back() die nog onderweg is wordt
//   eerst afgewacht voor er een nieuwe stap bijkomt, anders haalt die back()
//   de verkeerde stap weg.
// - Een laag die op dit moment niet dicht mag (een import die bezig is) komt
//   terug: de stap wordt opnieuw neergezet en de laag blijft open.
// - Een stap van een laag die allang weg is (de pagina eronder is al
//   weggenavigeerd, de laag is dus ongemerkt verdwenen) wordt bij het terug
//   gaan overgeslagen, zonder dat de router het ziet.
// - Een terugknop die wij zelf veroorzaken (of die alleen een laag sluit)
//   gaat niet door naar de router: de pagina verandert immers niet.

export const LAYER_MARK = 'ascendLayer';

export interface BackLayer {
  // Sluit de laag (met zijn eigen animatie). Mag geen history.back() doen.
  close: () => void;
  // Nee = de laag blijft open als de terugknop wordt ingedrukt.
  canClose?: () => boolean;
}

export interface PopEvent {
  stopImmediatePropagation: () => void;
}

// Wat deze module van de browser nodig heeft. In de app is dat window; in de
// tests een nagemaakte geschiedenis.
export interface HistoryHost {
  getState: () => unknown;
  // Voegt een stap toe met dezelfde URL en deze state.
  pushState: (state: unknown) => void;
  back: () => void;
  onPop: (handler: (e: PopEvent) => void) => () => void;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  now: () => number;
}

interface Entry {
  id: number;
  layer: BackLayer;
  // Staat er nu een stap met dit id in de geschiedenis?
  pushed: boolean;
}

// Hoe lang we op de popstate van een eigen back() wachten voor we toch door
// gaan (een back() zonder gevolg mag de rij niet blokkeren).
const BACK_TIMEOUT_MS = 400;

export function layerIdOf(state: unknown): number {
  if (typeof state !== 'object' || state === null) return 0;
  const mark = (state as Record<string, unknown>)[LAYER_MARK];
  return typeof mark === 'number' && Number.isFinite(mark) ? mark : 0;
}

export function createBackLayers(host: HistoryHost) {
  // Ids lopen op binnen de sessie en liggen boven die van eerdere sessies
  // (tijd als begin), zodat een stap van voor een herlaad nooit voor een
  // laag van nu wordt aangezien.
  let counter = 0;
  const idBase = Math.floor(host.now()) * 1000;
  const live: Entry[] = [];
  const queue: Array<() => void> = [];
  let waiting = false;
  // Is the pop we wait for ours alone (the page does not change, so the router
  // must not see it)? A skip over a stale step ends on a different page: the
  // router has to hear that one.
  let waitingIsOurs = false;
  let waitTimer: unknown;

  function run() {
    while (!waiting) {
      const op = queue.shift();
      if (!op) return;
      op();
    }
  }

  function startBack(ours: boolean) {
    waiting = true;
    waitingIsOurs = ours;
    waitTimer = host.setTimer(() => {
      waiting = false;
      run();
    }, BACK_TIMEOUT_MS);
    host.back();
  }

  function stateWithMark(id: number): unknown {
    const current = host.getState();
    const base = typeof current === 'object' && current !== null ? (current as Record<string, unknown>) : {};
    return { ...base, [LAYER_MARK]: id };
  }

  function pushEntry(entry: Entry) {
    if (!live.includes(entry)) return;
    host.pushState(stateWithMark(entry.id));
    entry.pushed = true;
  }

  function dropEntry(entry: Entry) {
    // Alleen als onze stap bovenaan ligt. Is er intussen genavigeerd, dan
    // blijft hij liggen en wordt hij bij het terug gaan overgeslagen.
    if (layerIdOf(host.getState()) === entry.id) startBack(true);
    entry.pushed = false;
  }

  function onPop(e: PopEvent) {
    const expected = waiting && waitingIsOurs;
    if (waiting) {
      waiting = false;
      host.clearTimer(waitTimer);
    }
    let handled = expected;
    const landedOn = layerIdOf(host.getState());

    // Lagen die na de stap zijn geopend waar we nu op staan, gaan dicht.
    const above = live.filter((l) => l.pushed && l.id > landedOn);
    if (above.length > 0) {
      handled = true;
      const remaining = [...above];
      while (remaining.length > 0) {
        const top = remaining[remaining.length - 1];
        if (top.layer.canClose && !top.layer.canClose()) break;
        remaining.pop();
        top.pushed = false;
        live.splice(live.indexOf(top), 1);
        top.layer.close();
      }
      // Wat niet dicht mocht, krijgt zijn stap terug (en alles eronder).
      for (const entry of remaining) {
        host.pushState(stateWithMark(entry.id));
        entry.pushed = true;
      }
    }

    // Een stap zonder laag erbij: overslaan, nog een stap terug.
    const stale = landedOn !== 0 && !live.some((l) => l.pushed && l.id === landedOn);
    if (stale) {
      handled = true;
      startBack(false);
    }

    if (handled) e.stopImmediatePropagation();
    run();
  }

  const stopListening = host.onPop(onPop);

  // Een herlaad op een geopend blad laat zijn stap achter: weg ermee, anders
  // kost de eerste terugknop niets.
  if (layerIdOf(host.getState()) !== 0) startBack(true);

  return {
    // Meldt een laag aan en geeft de functie terug die hem afmeldt (bij het
    // sluiten of verdwijnen van de laag).
    open(layer: BackLayer): () => void {
      const entry: Entry = { id: idBase + ++counter, layer, pushed: false };
      live.push(entry);
      queue.push(() => pushEntry(entry));
      run();
      return () => {
        const i = live.indexOf(entry);
        if (i >= 0) live.splice(i, 1);
        if (entry.pushed) {
          queue.push(() => dropEntry(entry));
          run();
        }
      };
    },
    // Voor de tests en het opruimen.
    openCount: () => live.length,
    dispose: () => {
      stopListening();
      if (waitTimer !== undefined) host.clearTimer(waitTimer);
    },
  };
}

export type BackLayers = ReturnType<typeof createBackLayers>;

// De echte browser.
function windowHost(win: Window): HistoryHost {
  return {
    getState: () => win.history.state,
    pushState: (state) => win.history.pushState(state, ''),
    back: () => win.history.back(),
    // Capture-fase, en vóór de router: wat wij afhandelen ziet de router niet.
    onPop: (handler) => {
      const listener = (e: Event) => handler(e);
      win.addEventListener('popstate', listener, true);
      return () => win.removeEventListener('popstate', listener, true);
    },
    setTimer: (fn, ms) => win.setTimeout(fn, ms),
    clearTimer: (handle) => win.clearTimeout(handle as number),
    now: () => Date.now(),
  };
}

let shared: BackLayers | null = null;

// Eén keer aanroepen bij het starten (main.tsx), vóór de router zijn eigen
// luisteraar zet.
export function installBackLayers(): BackLayers | null {
  if (shared) return shared;
  if (typeof window === 'undefined' || !window.history) return null;
  shared = createBackLayers(windowHost(window));
  return shared;
}

export function openBackLayer(layer: BackLayer): () => void {
  const layers = installBackLayers();
  return layers ? layers.open(layer) : () => undefined;
}
