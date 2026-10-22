// The service worker script that catches "Delen, ASCEND" is plain JavaScript
// in public/, outside the build. This runs it in a bare scope, with a real
// Request and FormData, to check what it does with the shared file.

import { describe, it, expect, vi } from 'vitest';
import { SHARED_CACHE, SHARED_FILE_PATH, SHARED_NAME_HEADER, takeSharedFile } from './macrofactor';
import script from '../../public/share-target-sw.js?raw';

const SCOPE = 'https://example.test/ascend/';

type FetchListener = (event: { request: Request; respondWith: (r: Promise<Response>) => void }) => void;

function load() {
  const store = new Map<string, Map<string, Response>>();
  const listeners: FetchListener[] = [];
  const scope: Record<string, unknown> = {
    URL,
    Response,
    caches: {
      open: async (name: string) => {
        const cache = store.get(name) ?? new Map<string, Response>();
        store.set(name, cache);
        return {
          put: async (url: string, response: Response) => void cache.set(url, response),
          match: async (url: string) => cache.get(url),
          delete: async (url: string) => cache.delete(url),
        };
      },
    },
  };
  scope.self = Object.assign(scope, {
    registration: { scope: SCOPE },
    addEventListener: (type: string, fn: FetchListener) => {
      if (type === 'fetch') listeners.push(fn);
    },
  });
  // The script as the service worker runs it: its globals are these names.
  new Function('self', 'URL', 'Response', 'caches', script)(scope.self, URL, Response, scope.caches);
  // What the browser does with a request: the first listener that answers.
  async function dispatch(request: Request): Promise<Response | undefined> {
    let answer: Promise<Response> | undefined;
    for (const listener of listeners) listener({ request, respondWith: (r) => (answer ??= r) });
    return answer;
  }
  return { store, dispatch, listeners };
}

function sharePost(file?: File, url = `${SCOPE}delen/macrofactor`): Request {
  const form = new FormData();
  if (file) form.append('bestand', file);
  return new Request(url, { method: 'POST', body: form });
}

describe('public/share-target-sw.js', () => {
  it('keeps the shared file in its own cache and sends the page to the import screen', async () => {
    const { store, dispatch } = load();
    const csv = 'Date,Workout\n2026-10-12,Upper A\n';
    const response = await dispatch(sharePost(new File([csv], 'workout log.csv', { type: 'text/csv' })));
    expect(response?.status).toBe(303);
    expect(response?.headers.get('location')).toBe(`${SCOPE}#/koppelen/macrofactor?gedeeld=ok`);
    const stored = store.get(SHARED_CACHE)?.get(`${SCOPE}${SHARED_FILE_PATH}`);
    expect(await stored?.text()).toBe(csv);
    expect(decodeURIComponent(stored?.headers.get(SHARED_NAME_HEADER) ?? '')).toBe('workout log.csv');
  });

  it('passes an xlsx on byte for byte, as binary, never as text', async () => {
    const { store, dispatch } = load();
    // Every byte value, a zip signature first, and bytes that text decoding would damage.
    const bytes = new Uint8Array(1024);
    bytes.set([0x50, 0x4b, 0x03, 0x04, 0x0d, 0x0a, 0xff, 0xfe, 0x00, 0x80]);
    for (let i = 10; i < bytes.length; i++) bytes[i] = i % 256;
    const xlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const response = await dispatch(sharePost(new File([bytes], 'Granular Export.xlsx', { type: xlsxType })));
    expect(response?.status).toBe(303);
    const stored = store.get(SHARED_CACHE)?.get(`${SCOPE}${SHARED_FILE_PATH}`);
    expect(stored?.headers.get('content-type')).toBe(xlsxType);
    expect(new Uint8Array(await stored!.clone().arrayBuffer())).toEqual(bytes);

    // And the app takes it out of the cache as the same bytes, once.
    const cache = { match: vi.fn(async () => stored), delete: vi.fn(async () => true) };
    vi.stubGlobal('caches', { open: async () => cache });
    vi.stubGlobal('location', { origin: 'https://example.test' });
    try {
      const taken = await takeSharedFile();
      expect(taken?.name).toBe('Granular Export.xlsx');
      expect(taken?.data).toEqual(bytes);
      expect(cache.delete).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('still opens the screen, with a note, when no file came along or reading failed', async () => {
    const { dispatch } = load();
    expect((await dispatch(sharePost()))?.headers.get('location')).toMatch(/gedeeld=leeg$/);
    const broken = new Request(`${SCOPE}delen/macrofactor`, { method: 'POST', body: 'geen formulier', headers: { 'content-type': 'text/plain' } });
    expect((await dispatch(broken))?.headers.get('location')).toMatch(/gedeeld=fout$/);
  });

  it('leaves every other request alone, so the precache and offline fallback keep working', async () => {
    const { dispatch } = load();
    expect(await dispatch(new Request(`${SCOPE}`, { method: 'GET' }))).toBeUndefined();
    expect(await dispatch(new Request(`${SCOPE}delen/macrofactor`, { method: 'GET' }))).toBeUndefined();
    expect(await dispatch(sharePost(new File(['x'], 'a.csv'), `${SCOPE}iets-anders`))).toBeUndefined();
    expect(await dispatch(new Request('https://intervals.icu/api', { method: 'POST', body: 'x' }))).toBeUndefined();
  });

  it('registers one fetch listener and nothing else', () => {
    expect(load().listeners).toHaveLength(1);
  });

  it('uses the same cache, file and header names as the app', () => {
    expect(script).toContain(`const SHARED_CACHE = '${SHARED_CACHE}';`);
    expect(script).toContain(`const SHARED_FILE_PATH = '${SHARED_FILE_PATH}';`);
    expect(script).toContain(`const SHARED_NAME_HEADER = '${SHARED_NAME_HEADER}';`);
  });

  it('is what the app reads: nothing to take outside a browser', async () => {
    expect(await takeSharedFile()).toBeNull();
  });
});
