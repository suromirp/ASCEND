import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadedDrawing, onDrawingReady, readCachedDrawing } from './exerciseArtLoader';

const path = `M10 10c5 5 10 10 20 20s${'1 2 3 4 '.repeat(8)}z`;
const good = { v: [10, 10, 300, 400], d: [path, path, path] };

afterEach(() => vi.unstubAllGlobals());

describe('readCachedDrawing', () => {
  it('leest een bewaarde tekening zonder netwerk en meldt dat hij er is', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('caches', { open: async () => ({ match: async () => new Response(JSON.stringify(good)) }) });
    const heard: string[] = [];
    const off = onDrawingReady((s) => heard.push(s));
    const d = await readCachedDrawing('cached-a');
    off();
    expect(d?.frames).toHaveLength(3);
    expect(loadedDrawing('cached-a')).toBe(d);
    expect(heard).toEqual(['cached-a']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('valt terug op null zonder treffer, zonder cache of bij een kapot bestand', async () => {
    vi.stubGlobal('caches', { open: async () => ({ match: async () => undefined }) });
    expect(await readCachedDrawing('cached-b')).toBeNull();
    vi.stubGlobal('caches', { open: async () => ({ match: async () => new Response('{kapot') }) });
    expect(await readCachedDrawing('cached-c')).toBeNull();
    vi.stubGlobal('caches', undefined);
    expect(await readCachedDrawing('cached-d')).toBeNull();
    expect(loadedDrawing('cached-d')).toBeUndefined();
  });
});
