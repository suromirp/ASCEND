import { describe, expect, it, vi } from 'vitest';
import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  it('gives the value when the promise is fast enough', async () => {
    expect(await withTimeout(Promise.resolve(5), 1000)).toBe(5);
  });

  it('gives "timeout" when the promise hangs', async () => {
    vi.useFakeTimers();
    try {
      const pending = withTimeout(new Promise<number>(() => {}), 30_000);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(await pending).toBe('timeout');
    } finally {
      vi.useRealTimers();
    }
  });

  it('passes on a rejection', async () => {
    await expect(withTimeout(Promise.reject(new Error('stuk')), 1000)).rejects.toThrow('stuk');
  });
});
