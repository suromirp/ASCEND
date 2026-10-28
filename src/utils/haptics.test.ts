import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { haptics, setHapticsEnabled, TAP_MS } from './haptics';

describe('haptics', () => {
  const vibrate = vi.fn();
  beforeEach(() => {
    vibrate.mockClear();
    vi.stubGlobal('navigator', { vibrate });
    setHapticsEnabled(true);
  });
  afterEach(() => {
    setHapticsEnabled(true);
    vi.unstubAllGlobals();
  });

  it('de tik duurt 15 ms', () => {
    expect(TAP_MS).toBe(15);
    haptics.tap();
    expect(vibrate).toHaveBeenCalledWith(15);
  });

  it('tap en success zijn stil met de poort dicht', () => {
    setHapticsEnabled(false);
    haptics.tap();
    haptics.success();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('alarm en pattern (rustsignaal van Forge) gaan door met de poort dicht', () => {
    setHapticsEnabled(false);
    haptics.alarm();
    haptics.pattern([100, 50, 100]);
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('doet stil niets zonder navigator.vibrate', () => {
    vi.stubGlobal('navigator', {});
    expect(() => haptics.tap()).not.toThrow();
  });
});
