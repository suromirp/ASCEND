import { describe, expect, it } from 'vitest';
import { LAYER_MARK, createBackLayers, layerIdOf, type HistoryHost, type PopEvent } from './backLayers';

// Een nagemaakte browsergeschiedenis: pushState knipt wat vooruit lag weg,
// back() is asynchroon (settle() voert hem uit) en popstate gaat langs de
// luisteraars in volgorde, waarbij stopImmediatePropagation telt.
class FakeBrowser {
  entries: Array<Record<string, unknown>> = [{ idx: 0, key: 'k0', url: '/a' }];
  index = 0;
  private traversals: number[] = [];
  private listeners: Array<(e: PopEvent) => void> = [];
  private timers: Array<{ fn: () => void; handle: number }> = [];
  private timerSeq = 0;
  routerEvents: Array<Record<string, unknown>> = [];
  backCalls = 0;

  get state() {
    return this.entries[this.index];
  }

  host: HistoryHost = {
    getState: () => this.state,
    pushState: (state) => this.push(state as Record<string, unknown>),
    back: () => {
      this.backCalls++;
      this.traversals.push(-1);
    },
    onPop: (handler) => {
      this.listeners.push(handler);
      return () => {
        this.listeners = this.listeners.filter((l) => l !== handler);
      };
    },
    setTimer: (fn) => {
      const handle = ++this.timerSeq;
      this.timers.push({ fn, handle });
      return handle;
    },
    clearTimer: (handle) => {
      this.timers = this.timers.filter((t) => t.handle !== handle);
    },
    now: () => 1_000_000,
  };

  push(state: Record<string, unknown>) {
    this.entries.splice(this.index + 1);
    this.entries.push(state);
    this.index++;
  }

  // De router: een echte navigatie naar een andere pagina (zonder markering).
  routerPush(url: string) {
    this.push({ idx: (this.state.idx as number) + 1, key: `k${this.entries.length}`, url });
  }

  // De router luistert ná ons en ziet alleen wat wij doorlaten.
  attachRouter() {
    this.listeners.push(() => this.routerEvents.push(this.state));
  }

  // De terugknop van het toestel.
  pressBack() {
    this.traversals.push(-1);
    this.settle();
  }

  traverse(delta: number) {
    this.traversals.push(delta);
    this.settle();
  }

  settle() {
    while (this.traversals.length > 0) {
      const delta = this.traversals.shift()!;
      const next = Math.min(Math.max(this.index + delta, 0), this.entries.length - 1);
      if (next === this.index) continue;
      this.index = next;
      let stopped = false;
      const event: PopEvent = { stopImmediatePropagation: () => { stopped = true; } };
      for (const listener of [...this.listeners]) {
        if (stopped) break;
        listener(event);
      }
    }
  }

  fireTimers() {
    const due = this.timers;
    this.timers = [];
    for (const t of due) t.fn();
  }
}

function setup() {
  const browser = new FakeBrowser();
  const layers = createBackLayers(browser.host);
  browser.attachRouter();
  return { browser, layers };
}

function layer() {
  const log = { closed: 0, allow: true };
  return {
    log,
    layer: { close: () => { log.closed++; }, canClose: () => log.allow },
  };
}

describe('een laag openen', () => {
  it('zet één stap bij met dezelfde pagina en een markering', () => {
    const { browser, layers } = setup();
    layers.open(layer().layer);
    expect(browser.entries).toHaveLength(2);
    expect(layerIdOf(browser.state)).toBeGreaterThan(0);
    // Dezelfde routerstate (idx, key, url) mee, alleen de markering erbij.
    expect(browser.state).toMatchObject({ idx: 0, key: 'k0', url: '/a', [LAYER_MARK]: layerIdOf(browser.state) });
    expect(layerIdOf(browser.entries[0])).toBe(0);
  });

  it('de terugknop sluit de laag en de router merkt er niets van', () => {
    const { browser, layers } = setup();
    const a = layer();
    layers.open(a.layer);
    browser.pressBack();
    expect(a.log.closed).toBe(1);
    expect(browser.index).toBe(0);
    expect(browser.routerEvents).toHaveLength(0);
    expect(layers.openCount()).toBe(0);
  });

  it('een tweede keer terug is gewoon terug voor de router', () => {
    const { browser, layers } = setup();
    browser.routerPush('/b');
    layers.open(layer().layer);
    browser.pressBack();
    expect(browser.routerEvents).toHaveLength(0);
    browser.pressBack();
    expect(browser.routerEvents).toHaveLength(1);
    expect(browser.state).toMatchObject({ url: '/a' });
  });
});

describe('zelf sluiten', () => {
  it('haalt de stap weer weg zonder dat de laag nog eens sluit', () => {
    const { browser, layers } = setup();
    const a = layer();
    const release = layers.open(a.layer);
    release();
    browser.settle();
    expect(browser.index).toBe(0);
    expect(browser.entries).toHaveLength(2); // de stap erboven ligt nog als "vooruit"
    expect(a.log.closed).toBe(0);
    expect(browser.routerEvents).toHaveLength(0);
    expect(browser.backCalls).toBe(1);
  });

  it('een tweede keer sluiten of afmelden doet niets extra', () => {
    const { browser, layers } = setup();
    const release = layers.open(layer().layer);
    release();
    release();
    browser.settle();
    expect(browser.backCalls).toBe(1);
  });

  it('na de terugknop doet afmelden niets meer (geen dubbele back)', () => {
    const { browser, layers } = setup();
    const release = layers.open(layer().layer);
    browser.pressBack();
    release();
    browser.settle();
    expect(browser.backCalls).toBe(0);
    expect(browser.index).toBe(0);
  });
});

describe('lagen op lagen', () => {
  it('de terugknop sluit de bovenste eerst', () => {
    const { browser, layers } = setup();
    const a = layer();
    const b = layer();
    layers.open(a.layer);
    layers.open(b.layer);
    expect(browser.entries).toHaveLength(3);
    browser.pressBack();
    expect([a.log.closed, b.log.closed]).toEqual([0, 1]);
    browser.pressBack();
    expect([a.log.closed, b.log.closed]).toEqual([1, 1]);
    expect(browser.index).toBe(0);
    expect(browser.routerEvents).toHaveLength(0);
  });

  it('de bovenste zelf sluiten en dan terug sluit de onderste', () => {
    const { browser, layers } = setup();
    const a = layer();
    const b = layer();
    layers.open(a.layer);
    const releaseB = layers.open(b.layer);
    releaseB();
    browser.settle();
    expect(browser.index).toBe(1);
    browser.pressBack();
    expect(a.log.closed).toBe(1);
    expect(b.log.closed).toBe(0);
    expect(browser.index).toBe(0);
  });

  it('de onderste zelf sluiten laat de bovenste staan; terug ruimt daarna alles op', () => {
    const { browser, layers } = setup();
    const a = layer();
    const b = layer();
    const releaseA = layers.open(a.layer);
    layers.open(b.layer);
    releaseA();
    browser.settle();
    // De stap van A ligt onder die van B en blijft liggen.
    expect(browser.index).toBe(2);
    browser.pressBack();
    expect(b.log.closed).toBe(1);
    // De overgebleven stap van A wordt overgeslagen: we komen op de pagina uit.
    expect(browser.index).toBe(0);
    expect(browser.routerEvents).toHaveLength(1);
    expect(browser.state).toMatchObject({ key: 'k0' });
  });

  it('twee stappen tegelijk terug sluit beide, de bovenste eerst', () => {
    const { browser, layers } = setup();
    const order: string[] = [];
    layers.open({ close: () => order.push('a') });
    layers.open({ close: () => order.push('b') });
    browser.traverse(-2);
    expect(order).toEqual(['b', 'a']);
    expect(browser.index).toBe(0);
  });
});

describe('een laag die niet dicht mag', () => {
  it('blijft open en krijgt zijn stap terug', () => {
    const { browser, layers } = setup();
    const a = layer();
    a.log.allow = false;
    layers.open(a.layer);
    browser.pressBack();
    expect(a.log.closed).toBe(0);
    expect(browser.index).toBe(1);
    expect(layerIdOf(browser.state)).toBeGreaterThan(0);
    expect(browser.routerEvents).toHaveLength(0);
    a.log.allow = true;
    browser.pressBack();
    expect(a.log.closed).toBe(1);
    expect(browser.index).toBe(0);
  });

  it('een bovenste laag die weigert houdt ook de laag eronder open', () => {
    const { browser, layers } = setup();
    const a = layer();
    const b = layer();
    b.log.allow = false;
    layers.open(a.layer);
    layers.open(b.layer);
    browser.traverse(-2);
    expect([a.log.closed, b.log.closed]).toEqual([0, 0]);
    expect(browser.index).toBe(2);
  });
});

describe('weggenavigeerde lagen', () => {
  it('een stap zonder laag wordt bij terug overgeslagen', () => {
    const { browser, layers } = setup();
    const release = layers.open(layer().layer);
    // Een knop in het blad navigeert weg; het blad verdwijnt met de pagina.
    browser.routerPush('/b');
    release();
    browser.settle();
    expect(browser.backCalls).toBe(0);
    expect(browser.entries).toHaveLength(3);
    browser.pressBack();
    // Over de verouderde stap heen, naar de pagina van voor het blad.
    expect(browser.index).toBe(0);
    expect(browser.state).toMatchObject({ url: '/a' });
    // De router hoort alleen de uiteindelijke stap, niet de tussenstop.
    expect(browser.routerEvents).toHaveLength(1);
    expect(layerIdOf(browser.routerEvents[0])).toBe(0);
  });
});

describe('de rij', () => {
  it('sluiten en meteen een nieuw blad openen (React StrictMode) laat één stap over', () => {
    const { browser, layers } = setup();
    const first = layer();
    const release = layers.open(first.layer);
    release();
    const second = layer();
    layers.open(second.layer);
    // De back() van het eerste blad is nog onderweg: het tweede wacht erop.
    expect(browser.entries).toHaveLength(2);
    browser.settle();
    expect(browser.index).toBe(1);
    expect(browser.entries).toHaveLength(2);
    expect(layerIdOf(browser.state)).toBeGreaterThan(0);
    browser.pressBack();
    expect(second.log.closed).toBe(1);
    expect(first.log.closed).toBe(0);
    expect(browser.index).toBe(0);
  });

  it('een back() die nooit antwoordt houdt de rij niet vast', () => {
    const { browser, layers } = setup();
    const release = layers.open(layer().layer);
    release();
    layers.open(layer().layer);
    expect(browser.entries).toHaveLength(2);
    // Geen settle(): de popstate komt niet. Na de wachttijd gaat de rij door.
    browser.fireTimers();
    expect(browser.index).toBe(browser.entries.length - 1);
    expect(browser.entries.length).toBeGreaterThanOrEqual(2);
  });

  it('een laag die al weg is voor zijn stap bijkwam, zet geen stap meer neer', () => {
    const { browser, layers } = setup();
    const first = layer();
    const releaseFirst = layers.open(first.layer);
    releaseFirst();
    const second = layer();
    const releaseSecond = layers.open(second.layer); // wacht op de back()
    releaseSecond();
    browser.settle();
    expect(browser.index).toBe(0);
    expect(browser.entries).toHaveLength(2);
  });
});

describe('een herlaad op een geopend blad', () => {
  it('ruimt de achtergebleven stap op', () => {
    const browser = new FakeBrowser();
    browser.push({ idx: 0, key: 'k0', url: '/a', [LAYER_MARK]: 5 });
    createBackLayers(browser.host);
    browser.attachRouter();
    expect(browser.backCalls).toBe(1);
    browser.settle();
    expect(browser.index).toBe(0);
    expect(browser.routerEvents).toHaveLength(0);
  });
});

describe('terug voorbij de pagina van de laag', () => {
  it('twee stappen terug vanaf een blad op een andere pagina: het blad sluit en de router hoort de nieuwe pagina', () => {
    const { browser, layers } = setup();
    browser.routerPush('/b');
    const a = layer();
    layers.open(a.layer);
    // Lang drukken op terug of de geschiedenis: in één keer naar /a.
    browser.traverse(-2);
    expect(a.log.closed).toBe(1);
    expect(browser.state).toMatchObject({ url: '/a' });
    expect(browser.routerEvents).toHaveLength(1);
    expect(browser.routerEvents[0]).toMatchObject({ url: '/a' });
  });

  it('zonder routerstate (key of idx) blijft het zoals het was: de laag sluit, de router hoort niets', () => {
    const browser = new FakeBrowser();
    browser.entries = [{ url: '/a' }];
    const layers = createBackLayers(browser.host);
    browser.attachRouter();
    const a = layer();
    layers.open(a.layer);
    browser.pressBack();
    expect(a.log.closed).toBe(1);
    expect(browser.routerEvents).toHaveLength(0);
  });
});
