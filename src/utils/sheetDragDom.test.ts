import { describe, expect, it, vi } from 'vitest';
import { attachSheetDrag, ownsGesture } from './sheetDragDom';

// Een nagemaakt paneel: genoeg DOM voor het gebaar, zonder browser.
type Handler = (e: unknown) => void;
function fakePanel(height = 400) {
  const handlers = new Map<string, Handler>();
  const classes = new Set<string>();
  const style: Record<string, unknown> = {
    translate: '',
    animationDuration: '',
    removeProperty(k: string) {
      style[k] = '';
    },
  };
  const panel = {
    parentElement: null as unknown,
    scrollTop: 0,
    style,
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
    getBoundingClientRect: () => ({ height }),
    addEventListener: (type: string, h: Handler) => handlers.set(type, h),
    removeEventListener: (type: string) => handlers.delete(type),
  };
  return { panel, handlers, classes };
}
const touch = (y: number, x = 0) => ({ clientX: x, clientY: y });
const ev = (target: unknown, y: number, t: number, x = 0, touches = 1) => ({
  target,
  timeStamp: t,
  cancelable: true,
  preventDefault: vi.fn(),
  touches: Array.from({ length: touches }, () => touch(y, x)),
  changedTouches: [touch(y, x)],
});

function setup(opts: { canClose?: boolean; height?: number } = {}) {
  const f = fakePanel(opts.height);
  const requestClose = vi.fn();
  let canClose = opts.canClose ?? true;
  const detach = attachSheetDrag(f.panel as unknown as HTMLElement, { requestClose, canClose: () => canClose, isClosing: () => false });
  const fire = (type: string, e: unknown) => f.handlers.get(type)!(e);
  return { ...f, requestClose, fire, detach, setCanClose: (v: boolean) => { canClose = v; } };
}

describe('attachSheetDrag', () => {
  it('volgt je vinger omlaag, 1 op 1 vanaf de overname, en sluit voorbij 30 procent', () => {
    const s = setup({ height: 400 });
    s.fire('touchstart', ev(s.panel, 100, 0));
    const move = ev(s.panel, 112, 20);
    s.fire('touchmove', move);
    expect(move.preventDefault).toHaveBeenCalled();
    s.fire('touchmove', ev(s.panel, 262, 200));
    expect(s.panel.style.translate).toBe('0 150px');
    s.fire('touchend', ev(s.panel, 262, 210));
    expect(s.requestClose).toHaveBeenCalledTimes(1);
    expect(s.panel.style.translate).toBe('0 150px');
  });

  it('veert terug onder de drempel en sluit niet', () => {
    const s = setup({ height: 400 });
    s.fire('touchstart', ev(s.panel, 100, 0));
    s.fire('touchmove', ev(s.panel, 110, 100));
    s.fire('touchmove', ev(s.panel, 150, 600));
    s.fire('touchend', ev(s.panel, 150, 700));
    expect(s.requestClose).not.toHaveBeenCalled();
    expect(s.classes.has('sheet-snap')).toBe(true);
    expect(s.panel.style.translate).toBe('0 0');
  });

  it('een inhoud die gescrold is, scrolt gewoon', () => {
    const s = setup();
    const inner = { parentElement: s.panel, scrollTop: 1 };
    s.fire('touchstart', ev(inner, 100, 0));
    const move = ev(inner, 200, 50);
    s.fire('touchmove', move);
    expect(move.preventDefault).not.toHaveBeenCalled();
    s.fire('touchend', ev(inner, 200, 60));
    expect(s.requestClose).not.toHaveBeenCalled();
  });

  it('begint de vinger omhoog, dan neemt het blad het niet meer over', () => {
    const s = setup();
    s.fire('touchstart', ev(s.panel, 300, 0));
    s.fire('touchmove', ev(s.panel, 280, 20));
    const down = ev(s.panel, 380, 60);
    s.fire('touchmove', down);
    expect(down.preventDefault).not.toHaveBeenCalled();
  });

  it('een horizontaal gebaar blijft van de inhoud', () => {
    const s = setup();
    s.fire('touchstart', ev(s.panel, 100, 0));
    const move = ev(s.panel, 112, 20, 60);
    s.fire('touchmove', move);
    expect(move.preventDefault).not.toHaveBeenCalled();
  });

  it('tekstvelden, sliders en data-no-sheet-drag beginnen nooit een gebaar', () => {
    const s = setup();
    for (const el of [
      { parentElement: s.panel, tagName: 'INPUT' },
      { parentElement: s.panel, tagName: 'DIV', getAttribute: (n: string) => (n === 'role' ? 'slider' : null) },
      { parentElement: s.panel, tagName: 'DIV', getAttribute: (n: string) => (n === 'data-no-sheet-drag' ? '' : null) },
    ]) {
      s.fire('touchstart', ev(el, 100, 0));
      const move = ev(el, 220, 50);
      s.fire('touchmove', move);
      expect(move.preventDefault).not.toHaveBeenCalled();
    }
    expect(ownsGesture({ parentElement: null, tagName: 'DIV' })).toBe(false);
  });

  it('pakt niets op als het blad niet dicht mag', () => {
    const s = setup({ canClose: false });
    s.fire('touchstart', ev(s.panel, 100, 0));
    const move = ev(s.panel, 300, 50);
    s.fire('touchmove', move);
    expect(move.preventDefault).not.toHaveBeenCalled();
    expect(s.panel.style.translate).toBe('');
  });

  it('een gebaar dat halverwege niet meer mag sluiten veert terug', () => {
    const s = setup({ height: 400 });
    s.fire('touchstart', ev(s.panel, 100, 0));
    s.fire('touchmove', ev(s.panel, 110, 20));
    s.fire('touchmove', ev(s.panel, 400, 100));
    s.setCanClose(false);
    s.fire('touchend', ev(s.panel, 400, 110));
    expect(s.requestClose).not.toHaveBeenCalled();
    expect(s.panel.style.translate).toBe('0 0');
  });

  it('touchcancel veert terug zoals een te korte veeg', () => {
    const s = setup();
    s.fire('touchstart', ev(s.panel, 100, 0));
    s.fire('touchmove', ev(s.panel, 110, 20));
    s.fire('touchmove', ev(s.panel, 160, 50));
    s.fire('touchcancel', ev(s.panel, 160, 60));
    expect(s.requestClose).not.toHaveBeenCalled();
    expect(s.panel.style.translate).toBe('0 0');
  });

  it('een tweede vinger breekt het gebaar af', () => {
    const s = setup();
    s.fire('touchstart', ev(s.panel, 100, 0));
    s.fire('touchmove', ev(s.panel, 110, 20));
    s.fire('touchmove', ev(s.panel, 150, 40));
    s.fire('touchmove', ev(s.panel, 160, 60, 0, 2));
    s.fire('touchend', ev(s.panel, 160, 70));
    expect(s.requestClose).not.toHaveBeenCalled();
  });

  it('een snelle korte veeg sluit', () => {
    const s = setup({ height: 1000 });
    s.fire('touchstart', ev(s.panel, 100, 0));
    s.fire('touchmove', ev(s.panel, 112, 10));
    s.fire('touchmove', ev(s.panel, 150, 40));
    s.fire('touchend', ev(s.panel, 150, 45));
    expect(s.requestClose).toHaveBeenCalledTimes(1);
  });

  it('haalt de luisteraars weer weg', () => {
    const s = setup();
    s.detach();
    expect(s.handlers.size).toBe(0);
  });
});
