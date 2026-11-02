import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadParts, type Part } from './loadParts';
import { fakeCapacitorPlugin } from '../test/capacitorProxy';

interface T { a?: number; b?: number; c?: number }
const never = () => new Promise<never>(() => undefined);

afterEach(() => vi.useRealTimers());

describe('loadParts', () => {
  it('geeft een snel deel meteen door, ook als een ander deel hangt', async () => {
    vi.useFakeTimers();
    const got: string[] = [];
    const parts: Part<'a' | 'b' | 'c', T>[] = [
      { key: 'a', ms: 60_000, load: async () => ({ a: 1 }), fallback: {} },
      { key: 'b', ms: 3000, load: never, fallback: { b: -1 } },
      { key: 'c', ms: 3000, load: async () => ({ c: 3 }), fallback: {} },
    ];
    const done = loadParts(parts, (key) => got.push(key));
    await vi.advanceTimersByTimeAsync(0);
    expect(got).toEqual(['a', 'c']);
    await vi.advanceTimersByTimeAsync(3000);
    await done;
    expect(got).toEqual(['a', 'c', 'b']);
  });

  it('gebruikt de terugval na de eigen grens en bij een fout', async () => {
    vi.useFakeTimers();
    const patches: Record<string, Partial<T>> = {};
    const done = loadParts<'a' | 'b', T>(
      [
        { key: 'a', ms: 2000, load: never, fallback: { a: 9 } },
        { key: 'b', ms: 2000, load: async () => { throw new Error('stuk'); }, fallback: { b: 8 } },
      ],
      (k, p) => (patches[k] = p),
    );
    await vi.advanceTimersByTimeAsync(2000);
    await done;
    expect(patches).toEqual({ a: { a: 9 }, b: { b: 8 } });
  });

  it('een plugin die nooit antwoordt houdt de andere bronnen niet tegen', async () => {
    vi.useFakeTimers();
    const slow = fakeCapacitorPlugin({ checkPermissions: () => new Promise(() => undefined) });
    const seen: number[] = [];
    const done = loadParts<'plugin' | 'quick', T>(
      [
        { key: 'plugin', ms: 4000, load: async () => ({ a: (await slow.checkPermissions()) as unknown as number }), fallback: { a: 0 } },
        { key: 'quick', ms: 4000, load: async () => ({ b: 1 }), fallback: {} },
      ],
      (_k, p) => seen.push(Object.values(p)[0] as number),
    );
    await vi.advanceTimersByTimeAsync(10);
    expect(seen).toEqual([1]);
    await vi.advanceTimersByTimeAsync(4000);
    await done;
    expect(seen).toEqual([1, 0]);
  });
});
