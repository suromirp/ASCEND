import { describe, it, expect, vi, afterEach } from 'vitest';
import { LocateError, locateErrorMessage, locateMe, watchFine } from './geolocation';
import { fineAccessOf } from '../integrations/geolocation';
import { TimeoutError, withTimeout } from './withTimeout';

afterEach(() => vi.useRealTimers());

type Ok = (pos: { coords: { latitude: number; longitude: number } }) => void;
type Fail = (err: { code: number }) => void;
const geo = (fn: (ok: Ok, fail: Fail, opts?: PositionOptions) => void) => ({ getCurrentPosition: fn as unknown as Geolocation['getCurrentPosition'] });

describe('locateMe', () => {
  it('rounds to about a kilometre and asks with a time-out and a maximum age', async () => {
    const seen = vi.fn();
    const found = await locateMe({ geolocation: geo((ok, _f, opts) => { seen(opts); ok({ coords: { latitude: 52.1234, longitude: 5.3478 } }); }) });
    expect(found).toEqual({ lat: 52.12, lon: 5.35 });
    expect(seen).toHaveBeenCalledWith({ timeout: 10_000, maximumAge: 600_000 });
  });

  it('keeps the exact spot only when asked, for a position that is never stored', async () => {
    const found = await locateMe({ precise: true, geolocation: geo((ok) => ok({ coords: { latitude: 52.1234, longitude: 5.3478 } })) });
    expect(found).toEqual({ lat: 52.1234, lon: 5.3478 });
  });

  it('asks for a fine position only when told to', async () => {
    const seen = vi.fn();
    await locateMe({ fine: true, precise: true, geolocation: geo((ok, _f, opts) => { seen(opts); ok({ coords: { latitude: 52.1234, longitude: 5.3478 } }); }) });
    expect(seen).toHaveBeenCalledWith({ timeout: 10_000, maximumAge: 600_000, enableHighAccuracy: true });
  });

  it('says why it failed', async () => {
    await expect(locateMe({ geolocation: geo((_o, fail) => fail({ code: 1 })) })).rejects.toMatchObject({ reason: 'denied' });
    await expect(locateMe({ geolocation: geo((_o, fail) => fail({ code: 2 })) })).rejects.toMatchObject({ reason: 'unavailable' });
    await expect(locateMe({ geolocation: geo((_o, fail) => fail({ code: 3 })) })).rejects.toMatchObject({ reason: 'timeout' });
    await expect(locateMe({ geolocation: undefined })).rejects.toMatchObject({ reason: 'unsupported' });
    await expect(locateMe({ geolocation: geo(() => { throw new Error('boom'); }) })).rejects.toBeInstanceOf(LocateError);
  });

  it('gives up by itself when the device never answers', async () => {
    vi.useFakeTimers();
    const pending = locateMe({ geolocation: geo(() => undefined), timeoutMs: 1000 });
    const caught = expect(pending).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(4000);
    await caught;
  });

  it('has a plain sentence for every reason', () => {
    for (const reason of ['unsupported', 'denied', 'timeout', 'unavailable'] as const) {
      expect(locateErrorMessage(new LocateError(reason)).length).toBeGreaterThan(20);
    }
    expect(locateErrorMessage(new Error('x'))).toContain('niet beschikbaar');
  });
});

describe('withTimeout', () => {
  it('passes the value through and the error too', async () => {
    await expect(withTimeout(Promise.resolve(3), 1000)).resolves.toBe(3);
    await expect(withTimeout(Promise.reject(new Error('nee')), 1000)).rejects.toThrow('nee');
  });

  it('rejects when the promise stalls', async () => {
    vi.useFakeTimers();
    const stalled = expect(withTimeout(new Promise(() => undefined), 500)).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(600);
    await stalled;
  });
});

describe('watchFine: je plek volgen (I-61)', () => {
  it('geeft elke plek met nauwkeurigheid door, vraagt fijn en stopt met clearWatch', () => {
    let success: PositionCallback | undefined;
    let error: PositionErrorCallback | null | undefined;
    let options: PositionOptions | undefined;
    const clearWatch = vi.fn();
    const geo = {
      watchPosition: (s: PositionCallback, e?: PositionErrorCallback | null, o?: PositionOptions) => {
        success = s;
        error = e;
        options = o;
        return 7;
      },
      clearWatch,
    };
    const fixes: unknown[] = [];
    const fails: unknown[] = [];
    const stop = watchFine({ geolocation: geo })((p) => fixes.push(p), (r) => fails.push(r));
    expect(options?.enableHighAccuracy).toBe(true);
    success?.({ coords: { latitude: 52.1, longitude: 5.1, accuracy: 900 } } as GeolocationPosition);
    success?.({ coords: { latitude: 52.1, longitude: 5.1, accuracy: 12 } } as GeolocationPosition);
    error?.({ code: 1 } as GeolocationPositionError);
    expect(fixes).toEqual([{ lat: 52.1, lon: 5.1, accuracyM: 900 }, { lat: 52.1, lon: 5.1, accuracyM: 12 }]);
    expect(fails).toEqual(['denied']);
    stop();
    stop();
    expect(clearWatch).toHaveBeenCalledTimes(1);
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('zonder locatie: unsupported; een watchPosition die gooit: unavailable', () => {
    const fails: unknown[] = [];
    watchFine({ geolocation: undefined })(() => undefined, (r) => fails.push(r))();
    watchFine({ geolocation: { watchPosition: () => { throw new Error('stuk'); }, clearWatch: () => undefined } })(() => undefined, (r) => fails.push(r))();
    expect(fails).toEqual(['unsupported', 'unavailable']);
  });
});

describe('toegang van Android voor je fijne plek (I-61)', () => {
  it('precies, bij benadering, geweigerd of nog onbekend', () => {
    expect(fineAccessOf({ location: 'granted', coarseLocation: 'granted' })).toBe('granted');
    expect(fineAccessOf({ location: 'denied', coarseLocation: 'granted' })).toBe('approximate');
    expect(fineAccessOf({ location: 'denied', coarseLocation: 'denied' })).toBe('denied');
    expect(fineAccessOf({ location: 'prompt', coarseLocation: 'prompt' })).toBe('prompt');
    expect(fineAccessOf({ location: 'prompt-with-rationale', coarseLocation: 'prompt-with-rationale' })).toBe('unknown');
  });
});
