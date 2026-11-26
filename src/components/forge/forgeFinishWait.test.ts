import { describe, it, expect, vi } from 'vitest';
import { waitThenShow } from './forgeFinishLog';
import finishSrc from './FinishSheet.tsx?raw';

// Afronden in Forge na "loopt nog": wachten op de eerdere poging en daarna altijd weer vrij voor een nieuwe tik (I-139).
describe('waitThenShow', () => {
  it('in beeld: de uitkomst van de eerdere poging en busy weer uit', async () => {
    const busy = { current: true };
    const show = vi.fn();
    expect(await waitThenShow({ busy, away: { current: false }, wait: async () => 'stored', show })).toBe(true);
    expect(show).toHaveBeenCalledWith('already');
    expect(busy.current).toBe(false);
  });

  it('weg of aan het sluiten: geen zin, maar busy toch weer uit', async () => {
    const busy = { current: true };
    const show = vi.fn();
    expect(await waitThenShow({ busy, away: { current: true }, wait: async () => 'free', show })).toBe(false);
    expect(show).not.toHaveBeenCalled();
    expect(busy.current).toBe(false);
  });

  it('gooit het wachten toch, dan is busy ook weer uit', async () => {
    const busy = { current: true };
    await expect(waitThenShow({ busy, away: { current: false }, wait: async () => { throw new Error('kapot'); }, show: () => undefined })).rejects.toThrow();
    expect(busy.current).toBe(false);
  });

  it('het blad gebruikt hem, zonder eigen return na away', () => {
    expect(finishSrc).toContain('waitThenShow({ busy, away, wait: () => waitForEarlierSave({ plannedSessionId }), show })');
    expect(finishSrc).not.toContain('if (away.current) return;');
  });
});
