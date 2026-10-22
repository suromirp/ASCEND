import { describe, it, expect, vi, afterEach } from 'vitest';
import { LocateError, locateErrorMessage, locateMe } from './geolocation';
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
