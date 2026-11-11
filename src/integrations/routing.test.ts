import { describe, expect, it, vi } from 'vitest';
import type { RouteAnswer, RouteFn, RoutePoint } from '../models/route';
import { BROUTER_PROFILE, brouterRoute, brouterUrl, mapBrouter, unmappedWaypoint } from './brouter';
import { decodePolyline6, mapValhalla, spreadElevation, valhallaRoute, valhallaUrl } from './valhalla';
import { createGate, requestText, routeWithFallback } from './routing';

// Nagemaakte punten en antwoorden: geen netwerk, geen echte plek.
const A: RoutePoint = { lat: 52.12, lon: 5.65 };
const B: RoutePoint = { lat: 52.1312345, lon: 5.6612345 };

const geojson = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { 'track-length': '1500' }, geometry: { type: 'LineString', coordinates: [[5.65, 52.12, 20], [5.655, 52.125, 31.5], [5.66123, 52.13123, 40]] } }] };
const text = (body: string, status = 200) => new Response(body, { status });

describe('BRouter', () => {
  it('vraagt met lengte eerst, vijf decimalen en het wandelprofiel; geen naam', () => {
    const url = brouterUrl([A, B, A]);
    expect(url).toBe(`https://brouter.de/brouter?lonlats=5.65,52.12|5.66123,52.13123|5.65,52.12&profile=${BROUTER_PROFILE}&alternativeidx=0&format=geojson`);
  });

  it('leest de punten met hoogte', () => {
    expect(mapBrouter(geojson)).toEqual([{ lat: 52.12, lon: 5.65, ele: 20 }, { lat: 52.125, lon: 5.655, ele: 31.5 }, { lat: 52.13123, lon: 5.66123, ele: 40 }]);
    expect(mapBrouter({ features: [] })).toBeUndefined();
    expect(mapBrouter({ features: [{ geometry: { coordinates: [[5.65, 'x']] } }] })).toBeUndefined();
    expect(mapBrouter(null)).toBeUndefined();
  });

  it('herkent het punt zonder pad in de buurt', () => {
    expect(unmappedWaypoint('from-position not mapped in existing datafile', 4)).toBe(0);
    expect(unmappedWaypoint('via2-position not mapped in existing datafile', 4)).toBe(2);
    expect(unmappedWaypoint('to-position not mapped in existing datafile', 4)).toBe(3);
    expect(unmappedWaypoint('iets anders', 4)).toBeUndefined();
  });

  it('geeft een lijn, of een reden, en gooit nooit', async () => {
    const ok = await brouterRoute({ fetchImpl: vi.fn(async () => text(JSON.stringify(geojson))) })([A, B]);
    expect(ok.ok && ok.line.source).toBe('brouter');
    expect(await brouterRoute({ fetchImpl: vi.fn(async () => text('via1-position not mapped in existing datafile', 400)) })([A, B, A])).toEqual({ ok: false, reason: 'unmapped', waypoint: 1 });
    expect(await brouterRoute({ fetchImpl: vi.fn(async () => text('stuk', 500)) })([A, B])).toEqual({ ok: false, reason: 'error' });
    expect(await brouterRoute({ fetchImpl: vi.fn(async () => text('<html>')) })([A, B])).toEqual({ ok: false, reason: 'error' });
    expect(await brouterRoute({ fetchImpl: vi.fn(async () => { throw new TypeError('net'); }) })([A, B])).toEqual({ ok: false, reason: 'error' });
    expect(await brouterRoute()([A])).toEqual({ ok: false, reason: 'error' });
  });

  it('houdt zich aan de tijdgrens', async () => {
    const hang = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')))));
    expect(await brouterRoute({ fetchImpl: hang, timeoutMs: 20 })([A, B])).toEqual({ ok: false, reason: 'timeout' });
  });
});

describe('Valhalla', () => {
  it('vraagt te voet, zonder aanwijzingen, met hoogte om de dertig meter', () => {
    const url = valhallaUrl([A, B]);
    const body = JSON.parse(decodeURIComponent(url.split('?json=')[1]));
    expect(url.startsWith('https://valhalla1.openstreetmap.de/route?json=')).toBe(true);
    expect(body).toEqual({ locations: [{ lat: 52.12, lon: 5.65 }, { lat: 52.13123, lon: 5.66123 }], costing: 'pedestrian', directions_type: 'none', elevation_interval: 30 });
  });

  it('leest een gecodeerde lijn met zes decimalen', () => {
    // Het bekende voorbeeld van het polyline-formaat, hier met zes decimalen gelezen.
    const pts = decodePolyline6('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ lat: 3.85, lon: -12.02 });
    expect(pts[2].lat).toBeCloseTo(4.3252, 4);
  });

  it('zet de hoogtes op hun afstand langs de lijn', () => {
    const line = [0, 30, 45, 60].map((m) => ({ lat: 52.12 + m / 111_195, lon: 5.65 }));
    const out = spreadElevation(line, [10, 20, 40]);
    expect(out.map((p) => Math.round(p.ele as number))).toEqual([10, 20, 30, 40]);
    expect(spreadElevation(line, [])).toBe(line);
  });

  it('plakt de stukken achter elkaar en houdt de lijn ook zonder hoogte', () => {
    const shape = '_p~iF~ps|U_ulLnnqC';
    const two = mapValhalla({ trip: { legs: [{ shape, elevation: [5, 6] }, { shape }] } });
    expect(two).toHaveLength(3);
    expect(two?.[0].ele).toBe(5);
    expect(mapValhalla({ trip: { legs: [] } })).toBeUndefined();
    expect(mapValhalla({ trip: { legs: [{ shape: 5 }] } })).toBeUndefined();
  });

  it('geeft een lijn, of een reden', async () => {
    const good = JSON.stringify({ trip: { legs: [{ shape: '_p~iF~ps|U_ulLnnqC', elevation: [1, 2, 3] }] } });
    const ok = await valhallaRoute({ fetchImpl: vi.fn(async () => text(good)) })([A, B]);
    expect(ok.ok && ok.line.source).toBe('valhalla');
    expect(await valhallaRoute({ fetchImpl: vi.fn(async () => text(JSON.stringify({ error_code: 171 }), 400)) })([A, B])).toEqual({ ok: false, reason: 'unmapped' });
    expect(await valhallaRoute({ fetchImpl: vi.fn(async () => text('{}', 429)) })([A, B])).toEqual({ ok: false, reason: 'error' });
  });
});

describe('requestText', () => {
  it('vraagt niets zonder netwerk', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const doFetch = vi.fn();
    expect(await requestText('https://voorbeeld.invalid/', 100, doFetch as unknown as typeof fetch)).toBe('offline');
    expect(doFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('routeWithFallback', () => {
  const line: RouteAnswer = { ok: true, line: { source: 'valhalla', points: [A, B] } };
  const source = (...answers: RouteAnswer[]) => {
    let i = 0;
    return vi.fn<RouteFn>(async () => answers[Math.min(i++, answers.length - 1)]);
  };

  it('vraagt de tweede bron als de eerste niet antwoordt, en slaat de stille bron daarna over', async () => {
    const first = source({ ok: false, reason: 'timeout' });
    const second = source(line);
    const route = routeWithFallback([first, second], createGate(0));
    expect(await route([A, B])).toBe(line);
    expect(await route([A, B])).toBe(line);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('vraagt niet verder zonder netwerk of bij een punt zonder pad', async () => {
    for (const reason of ['offline', 'unmapped'] as const) {
      const second = source(line);
      expect(await routeWithFallback([source({ ok: false, reason }), second], createGate(0))([A, B])).toEqual({ ok: false, reason });
      expect(second).not.toHaveBeenCalled();
    }
  });

  it('na stoppen gaat er geen aanroep meer de deur uit, ook niet wat al in de rij stond', async () => {
    let stopped = false;
    const first = source({ ok: false, reason: 'error' });
    const second = source(line);
    const route = routeWithFallback([first, second], createGate(0), () => stopped);
    const waiting = route([A, B]);
    stopped = true;
    expect(await waiting).toEqual({ ok: false, reason: 'timeout' });
    expect(await route([A, B])).toEqual({ ok: false, reason: 'timeout' });
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  it('stuurt de vragen een voor een, met een pauze ertussen', async () => {
    const starts: number[] = [];
    let running = 0;
    let most = 0;
    const slow: RouteFn = async () => {
      starts.push(Date.now());
      most = Math.max(most, ++running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return line;
    };
    // Twee zoektochten delen één poort: ook samen vragen ze een voor een.
    const gate = createGate(40);
    const route = routeWithFallback([slow], gate);
    const other = routeWithFallback([slow], gate);
    await Promise.all([route([A, B]), other([A, B]), route([A, B])]);
    expect(most).toBe(1);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(38);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(38);
  });

  it('stopt het zoeken tijdens de seconde ertussen, dan gaat de wachtende vraag niet meer de deur uit', async () => {
    const calls: number[] = [];
    const source: RouteFn = async () => { calls.push(Date.now()); return { ok: true, line: { source: 'brouter', points: [A, B] } }; };
    let stopped = false;
    const route = routeWithFallback([source], createGate(60), () => stopped);
    await route([A, B]);
    const waiting = route([A, B]);
    setTimeout(() => { stopped = true; }, 10);
    expect(await waiting).toEqual({ ok: false, reason: 'timeout' });
    expect(calls).toHaveLength(1);
  });
});
