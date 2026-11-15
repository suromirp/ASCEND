// Warden, proeftests bij I-61 (Waar je nu bent): de schil om de plugin Geolocation in de Android-app.
// Nagemaakte plugin, nagemaakte punten. De plugin gedraagt zich zoals de Android-bron van
// @capacitor/geolocation 8.2.4 (GeolocationPlugin.kt): watchPosition geeft zijn id meteen, het volgen zelf
// begint pas na het venster van Android; clearWatch op een id dat nog niet volgt geeft "WatchId not found."
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Cb = (pos: { coords: { latitude: number; longitude: number; accuracy: number }; timestamp: number } | null, err?: unknown) => void;

const plugin = vi.hoisted(() => ({
  watches: new Map<string, { cb: Cb; options: Record<string, unknown>; native: boolean }>(),
  cleared: [] as string[],
  seq: 0,
  // Het volgen begint meteen (toegang is er al) of pas na het venster van Android.
  startsAtOnce: true,
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android' } }));
vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    async watchPosition(options: Record<string, unknown>, cb: Cb) {
      const id = `w${++plugin.seq}`;
      plugin.watches.set(id, { cb, options, native: plugin.startsAtOnce });
      return id;
    },
    async clearWatch({ id }: { id: string }) {
      plugin.cleared.push(id);
      const w = plugin.watches.get(id);
      if (!w || !w.native) throw new Error('WatchId not found.');
      w.native = false;
    },
  },
}));

import { appGeolocationOrUndefined } from './geolocation';
import { watchFine } from '../utils/geolocation';
import { locateStartHere } from '../storage/routeStart';
import { getRouteStartPoint } from '../storage/routeStart';
import { wipeAllData } from '../storage/database';

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 25));
};
// Nagemaakt punt.
const fixAt = (accuracy: number) => ({ coords: { latitude: 52.123456, longitude: 5.654321, accuracy }, timestamp: 1 });
const running = () => [...plugin.watches.values()].filter((w) => w.native).length;
const only = () => [...plugin.watches.values()][plugin.watches.size - 1]!;

beforeEach(async () => {
  plugin.watches.clear();
  plugin.cleared.length = 0;
  plugin.seq = 0;
  plugin.startsAtOnce = true;
  await wipeAllData();
});

describe('de schil om de plugin: volgen en stoppen', () => {
  it('vraagt fijn, elke seconde, en geeft elke plek door', async () => {
    const geo = appGeolocationOrUndefined()!;
    const seen: number[] = [];
    geo.watchPosition((p) => seen.push(p.coords.accuracy), undefined, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 });
    await flush();
    expect(only().options).toMatchObject({ enableHighAccuracy: true, interval: 1000, minimumUpdateInterval: 1000, timeout: 15_000 });
    only().cb(fixAt(900) as never);
    only().cb(fixAt(20) as never);
    expect(seen).toEqual([900, 20]);
  });

  it('stoppen voordat de plugin zijn id gaf: het volgen stopt toch, precies één keer', async () => {
    const geo = appGeolocationOrUndefined()!;
    const seen: number[] = [];
    const handle = geo.watchPosition((p) => seen.push(p.coords.accuracy));
    geo.clearWatch(handle);
    geo.clearWatch(handle);
    await flush();
    expect(plugin.cleared).toHaveLength(1);
    expect(running()).toBe(0);
    only().cb(fixAt(10) as never);
    expect(seen).toEqual([]);
  });

  it('twee keer stoppen na het id: één clearWatch bij de plugin, en een late plek of fout telt niet', async () => {
    const geo = appGeolocationOrUndefined()!;
    const seen: string[] = [];
    const handle = geo.watchPosition(() => seen.push('fix'), () => seen.push('fail'));
    await flush();
    geo.clearWatch(handle);
    geo.clearWatch(handle);
    await flush();
    expect(plugin.cleared).toHaveLength(1);
    only().cb(fixAt(10) as never);
    only().cb(null, new Error('Location permission request was denied.'));
    expect(seen).toEqual([]);
  });

  it('twee keer volgen tegelijk (tweede poging): elk zijn eigen id, stoppen raakt de ander niet', async () => {
    const geo = appGeolocationOrUndefined()!;
    const a = geo.watchPosition(() => undefined);
    // Na elkaar: de nagemaakte module van vitest geeft bij twee imports in dezelfde tik de tweede leeg terug.
    await flush();
    const b = geo.watchPosition(() => undefined);
    await flush();
    geo.clearWatch(a);
    await flush();
    expect(plugin.cleared).toEqual(['w1']);
    expect(running()).toBe(1);
    geo.clearWatch(b);
    await flush();
    expect(running()).toBe(0);
  });

  // ROOD op 79397b0. Het venster van Android staat nog open (de vraag om toegang gaf 'unknown' of 'prompt',
  // dus watchPosition vraagt zelf): de grens of Sluiten stopt, de plugin kent het id nog niet ("WatchId not
  // found."), en daarna zegt de gebruiker ja. Dan begint het volgen pas, en niemand stopt het nog: de gps
  // blijft elke seconde draaien tot de app sluit.
  it('stoppen terwijl het venster van Android nog openstaat: begint het volgen daarna toch, dan stopt de eerste late plek het', async () => {
    plugin.startsAtOnce = false;
    const geo = appGeolocationOrUndefined()!;
    const seen: number[] = [];
    const handle = geo.watchPosition((p) => seen.push(p.coords.accuracy), undefined, { enableHighAccuracy: true });
    await flush();
    geo.clearWatch(handle);
    await flush();
    expect(plugin.cleared).toEqual(['w1']);
    // De gebruiker zegt ja: Android begint te volgen en geeft plekken.
    only().native = true;
    only().cb(fixAt(12) as never);
    only().cb(fixAt(11) as never);
    await flush();
    expect(seen).toEqual([]);
    expect(running()).toBe(0);
  });
});

describe('locateStartHere door de echte schil heen', () => {
  it('na de grens is het volgen bij de plugin gestopt, en een late scherpe plek bewaart niets', async () => {
    const pending = locateStartHere({ askPermission: async () => 'granted', limitMs: 40 });
    await flush();
    only().cb(fixAt(600) as never);
    const out = await pending;
    expect(out).toMatchObject({ ok: false, reason: 'coarse' });
    await flush();
    expect(running()).toBe(0);
    expect(plugin.cleared).toHaveLength(1);
    only().cb(fixAt(5) as never);
    await flush();
    expect(await getRouteStartPoint()).toBeUndefined();
  });

  it('Sluiten voordat de plugin geladen is: gestopt, en een late scherpe plek bewaart niets', async () => {
    const stop = new AbortController();
    const pending = locateStartHere({ askPermission: async () => 'granted', signal: stop.signal, limitMs: 5_000 });
    await Promise.resolve();
    await Promise.resolve();
    stop.abort();
    expect((await pending).ok).toBe(false);
    await flush();
    expect(running()).toBe(0);
    if (plugin.watches.size > 0) only().cb(fixAt(5) as never);
    await flush();
    expect(await getRouteStartPoint()).toBeUndefined();
  });

  it('Sluiten tijdens het venster om toegang: er begint geen volgen meer', async () => {
    const stop = new AbortController();
    let answer: (v: string) => void = () => undefined;
    const pending = locateStartHere({ askPermission: () => new Promise<string>((r) => (answer = r)), signal: stop.signal });
    await flush();
    stop.abort();
    answer('granted');
    expect((await pending).ok).toBe(false);
    await flush();
    expect(plugin.watches.size).toBe(0);
  });

  it('een scherpe plek stopt het volgen en wordt Thuis; daarna telt geen plek meer', async () => {
    const pending = locateStartHere({ askPermission: async () => 'granted', limitMs: 5_000 });
    await flush();
    only().cb(fixAt(400) as never);
    only().cb(fixAt(15) as never);
    only().cb(fixAt(3) as never);
    expect(await pending).toEqual({ ok: true, point: { lat: 52.12346, lon: 5.65432 } });
    await flush();
    expect(running()).toBe(0);
    expect(plugin.cleared).toHaveLength(1);
  });

  it('de plugin weigert tijdens het volgen: denied en gestopt', async () => {
    const pending = locateStartHere({ persist: false, askPermission: async () => 'unknown', limitMs: 5_000 });
    await flush();
    only().cb(null, new Error('Location permission request was denied.'));
    expect(await pending).toEqual({ ok: false, reason: 'denied' });
    await flush();
    expect(running()).toBe(0);
  });

  // De time-out van de plugin ("Could not obtain location in time. Try with a higher timeout.") is geen
  // einde: de eigen grens beslist.
  it('de time-out van de plugin zelf stopt het volgen niet voor de grens', async () => {
    const pending = locateStartHere({ persist: false, askPermission: async () => 'granted', limitMs: 5_000 });
    await flush();
    only().cb(null, new Error('Could not obtain location in time. Try with a higher timeout.'));
    only().cb(fixAt(20) as never);
    expect((await pending).ok).toBe(true);
  });
});

describe('watchFine met een nagemaakte browser', () => {
  it('een fout die al tijdens watchPosition komt: toch gestopt, één keer', async () => {
    const cleared: number[] = [];
    const geo = {
      watchPosition: (_ok: PositionCallback, fail?: PositionErrorCallback | null) => {
        fail?.({ code: 2, message: '' } as GeolocationPositionError);
        return 7;
      },
      clearWatch: (id: number) => void cleared.push(id),
    };
    const out = await locateStartHere({ persist: false, askPermission: async () => undefined, watch: watchFine({ geolocation: geo }), limitMs: 5_000 });
    expect(out).toEqual({ ok: false, reason: 'unavailable' });
    expect(cleared).toEqual([7]);
  });

  it('een scherpe plek die al tijdens watchPosition komt: telt, en het volgen stopt', async () => {
    const cleared: number[] = [];
    const geo = {
      watchPosition: (ok: PositionCallback) => {
        ok({ coords: { latitude: 52.123456, longitude: 5.654321, accuracy: 9 }, timestamp: 1 } as GeolocationPosition);
        return 3;
      },
      clearWatch: (id: number) => void cleared.push(id),
    };
    const out = await locateStartHere({ persist: false, askPermission: async () => undefined, watch: watchFine({ geolocation: geo }), limitMs: 5_000 });
    expect(out.ok).toBe(true);
    expect(cleared).toEqual([3]);
  });

  it('clearWatch die gooit breekt niets, en de stop werkt maar één keer', () => {
    let calls = 0;
    const geo = { watchPosition: () => 4, clearWatch: () => { calls++; throw new Error('stuk'); } };
    const stop = watchFine({ geolocation: geo })(() => undefined, () => undefined);
    stop();
    stop();
    expect(calls).toBe(1);
  });
});
