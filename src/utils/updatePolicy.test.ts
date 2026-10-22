import { describe, it, expect } from 'vitest';
import { createUpdateController, COLD_START_WINDOW_MS, AWAY_THRESHOLD_MS, RESUME_WINDOW_MS } from './updatePolicy';
import { isAppBusy, noteUserInput, RECENT_INPUT_MS } from './appBusy';

describe('automatisch bijwerken: nooit op de achtergrond', () => {
  it('een tik terwijl de app verborgen is herlaadt niet; terug in beeld wel', () => {
    let now = 1_000_000;
    let applied = 0;
    const controller = createUpdateController({ now: () => now, isBusy: () => false, applyUpdate: () => void applied++ });
    controller.hidden();
    now += 2_000;
    controller.updateWaiting();
    controller.tick();
    expect(applied).toBe(0);
    now += 1_000;
    controller.visible();
    expect(applied).toBe(1);
  });

  it('een pagina die verborgen begint, herlaadt pas als hij in beeld is', () => {
    let now = 1_000_000;
    let visible = false;
    let applied = 0;
    const controller = createUpdateController({ now: () => now, isBusy: () => false, isVisible: () => visible, applyUpdate: () => void applied++ });
    now += 2_000;
    controller.updateWaiting();
    controller.tick();
    expect(applied).toBe(0);
    visible = true;
    controller.tick();
    expect(applied).toBe(1);
  });
});

function setup(startBusy = false) {
  let now = 1_000_000;
  let busy = startBusy;
  let applied = 0;
  const controller = createUpdateController({ now: () => now, isBusy: () => busy, applyUpdate: () => void applied++ });
  return {
    controller,
    advance: (ms: number) => void (now += ms),
    setBusy: (b: boolean) => void (busy = b),
    applied: () => applied,
  };
}

describe('automatisch bijwerken: koude start', () => {
  it('past een update die meteen klaarstaat meteen toe', () => {
    const t = setup();
    t.advance(2_000);
    t.controller.updateWaiting();
    expect(t.applied()).toBe(1);
  });

  it('wacht als er iets open staat en probeert het daarna opnieuw', () => {
    const t = setup(true);
    t.advance(2_000);
    t.controller.updateWaiting();
    expect(t.applied()).toBe(0);
    t.advance(10_000);
    t.controller.tick();
    expect(t.applied()).toBe(0);
    t.setBusy(false);
    t.advance(5_000);
    t.controller.tick();
    expect(t.applied()).toBe(1);
  });

  it('laat een update die pas na het eerste minuutje komt aan de knop', () => {
    const t = setup();
    t.advance(COLD_START_WINDOW_MS + 1);
    t.controller.updateWaiting();
    t.controller.tick();
    expect(t.applied()).toBe(0);
  });

  it('past maar één keer toe', () => {
    const t = setup();
    t.controller.updateWaiting();
    t.controller.updateWaiting();
    t.controller.tick();
    expect(t.applied()).toBe(1);
  });
});

describe('automatisch bijwerken: terug na een tijd weg', () => {
  it('past toe na meer dan 30 minuten op de achtergrond', () => {
    const t = setup();
    t.advance(COLD_START_WINDOW_MS + 10_000);
    t.controller.updateWaiting(); // te laat voor de koude start: wacht
    expect(t.applied()).toBe(0);
    t.controller.hidden();
    t.advance(AWAY_THRESHOLD_MS + 1_000);
    t.controller.visible();
    expect(t.applied()).toBe(1);
  });

  it('past een update toe die pas net na het terugkomen wordt gevonden', () => {
    const t = setup();
    t.advance(COLD_START_WINDOW_MS + 10_000);
    t.controller.hidden();
    t.advance(AWAY_THRESHOLD_MS + 1_000);
    t.controller.visible();
    t.advance(RESUME_WINDOW_MS - 5_000);
    t.controller.updateWaiting();
    expect(t.applied()).toBe(1);
  });

  it('doet niets na een korte pauze', () => {
    const t = setup();
    t.advance(COLD_START_WINDOW_MS + 10_000);
    t.controller.updateWaiting();
    t.controller.hidden();
    t.advance(5 * 60 * 1000);
    t.controller.visible();
    expect(t.applied()).toBe(0);
  });

  it('doet niets terwijl er een formulier of sheet open staat', () => {
    const t = setup();
    t.advance(COLD_START_WINDOW_MS + 10_000);
    t.controller.updateWaiting();
    t.controller.hidden();
    t.advance(AWAY_THRESHOLD_MS + 1_000);
    t.setBusy(true);
    t.controller.visible();
    expect(t.applied()).toBe(0);
    t.setBusy(false);
    t.controller.tick();
    expect(t.applied()).toBe(1);
  });
});

// Een minimaal nepdocument: genoeg voor de drie tekens die isAppBusy leest.
function fakeDoc(opts: { overlay?: boolean; active?: { matchesEditable: boolean } }): Document {
  const body = {};
  return {
    body,
    querySelector: (selector: string) => (opts.overlay && selector === '.fixed.inset-0' ? {} : null),
    activeElement: opts.active ? { matches: () => opts.active!.matchesEditable } : body,
  } as unknown as Document;
}

describe('isAppBusy', () => {
  const NOW = 10_000_000;

  it('is rustig zonder sheet, zonder invoerveld en zonder recente invoer', () => {
    noteUserInput(NOW - RECENT_INPUT_MS - 1);
    expect(isAppBusy(NOW, fakeDoc({}))).toBe(false);
  });

  it('is bezet met een sheet of scherm open', () => {
    expect(isAppBusy(NOW, fakeDoc({ overlay: true }))).toBe(true);
  });

  it('is bezet met een invoerveld in focus', () => {
    expect(isAppBusy(NOW, fakeDoc({ active: { matchesEditable: true } }))).toBe(true);
  });

  it('is niet bezet als de focus op een knop staat', () => {
    noteUserInput(NOW - RECENT_INPUT_MS - 1);
    expect(isAppBusy(NOW, fakeDoc({ active: { matchesEditable: false } }))).toBe(false);
  });

  it('is nog twee minuten bezet na het laatste typen', () => {
    noteUserInput(NOW - 30_000);
    expect(isAppBusy(NOW, fakeDoc({}))).toBe(true);
    expect(isAppBusy(NOW + RECENT_INPUT_MS, fakeDoc({}))).toBe(false);
  });
});
