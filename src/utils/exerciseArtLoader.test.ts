import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefetchDrawings } from './exerciseArtLoader';

// Een geldig bestand: drie paden die door parseDrawing komen.
const path = `M10 10c5 5 10 10 20 20s${'1 2 3 4 '.repeat(8)}z`;
const good = { v: [10, 10, 300, 400], d: [path, path, path] };

afterEach(() => vi.unstubAllGlobals());

describe('prefetchDrawings', () => {
  it('haalt de tekeningen een voor een op', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(good)));
    vi.stubGlobal('fetch', fetchMock);
    await prefetchDrawings(['pre-a', 'pre-b'], () => false, 0, () => true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stopt na de eerste mislukking, zonder reeks fouten', async () => {
    const fetchMock = vi.fn(async () => { throw new TypeError('offline'); });
    vi.stubGlobal('fetch', fetchMock);
    await prefetchDrawings(['pre-c', 'pre-d', 'pre-e'], () => false, 0, () => true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('kijkt elke ronde naar de verbinding', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(good)));
    vi.stubGlobal('fetch', fetchMock);
    let calls = 0;
    // Eerste ronde online, daarna valt de verbinding weg.
    await prefetchDrawings(['pre-f', 'pre-g', 'pre-h'], () => false, 0, () => ++calls <= 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('doet niets als de aanroeper wil stoppen', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await prefetchDrawings(['pre-i'], () => true, 0, () => true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
