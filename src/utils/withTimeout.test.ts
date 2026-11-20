import { describe, expect, it, vi } from 'vitest';
import { TimeoutError, timeLimit, withTimeout } from './withTimeout';

describe('withTimeout', () => {
  it('gives the value when the promise is fast enough', async () => {
    expect(await withTimeout(Promise.resolve(5), 1000)).toBe(5);
  });

  it('rejects with a TimeoutError when the promise hangs', async () => {
    vi.useFakeTimers();
    try {
      const pending = withTimeout(new Promise<number>(() => {}), 30_000);
      const outcome = pending.then(() => 'ok', (err) => err);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(await outcome).toBeInstanceOf(TimeoutError);
    } finally {
      vi.useRealTimers();
    }
  });

  it('passes on a rejection', async () => {
    await expect(withTimeout(Promise.reject(new Error('stuk')), 1000)).rejects.toThrow('stuk');
  });
});

describe('timeLimit', () => {
  it("geeft 'slow' als de belofte blijft hangen", async () => {
    vi.useFakeTimers();
    try {
      const { result } = timeLimit(new Promise<number>(() => {}), 15_000);
      await vi.advanceTimersByTimeAsync(15_000);
      expect(await result).toBe('slow');
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('wist de klok zodra de belofte eerder klaar is', async () => {
    vi.useFakeTimers();
    try {
      const { result } = timeLimit(Promise.resolve(5), 15_000);
      expect(vi.getTimerCount()).toBe(1);
      expect(await result).toBe(5);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('wist de klok ook als de belofte mislukt', async () => {
    vi.useFakeTimers();
    try {
      const { result } = timeLimit(Promise.reject(new Error('stuk')), 15_000);
      await expect(result).rejects.toThrow('stuk');
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancel wist de klok: er komt geen 'slow' meer", async () => {
    vi.useFakeTimers();
    try {
      const { result, cancel } = timeLimit(new Promise<number>(() => {}), 15_000);
      let settled = false;
      void result.then(() => {
        settled = true;
      });
      cancel();
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(settled).toBe(false);
      cancel();
    } finally {
      vi.useRealTimers();
    }
  });
});
