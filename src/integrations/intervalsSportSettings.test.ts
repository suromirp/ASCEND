import { describe, it, expect, vi } from 'vitest';
import { fetchRunHeartRateBasis, IntervalsError, mapRunHrBasis, sportSettingsUrl } from './intervalsIcu';

// A made-up answer in the shape of the OpenAPI description (types, lthr, max_hr).
const SETTINGS = [
  { id: 1, types: ['Ride', 'VirtualRide'], lthr: 160, max_hr: 185 },
  { id: 2, types: ['Run', 'TrailRun'], lthr: 165, max_hr: 190 },
  { id: 3, types: ['Run'], lthr: 170, max_hr: 195 },
];
const CONNECTION = { athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' };

describe('the heart rate for running at intervals.icu', () => {
  it('asks the sport settings with the same Basic auth', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(SETTINGS), { status: 200 }));
    const basis = await fetchRunHeartRateBasis(CONNECTION, { fetchImpl: fetchImpl as unknown as typeof fetch });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(sportSettingsUrl('i12345'));
    expect(url).toBe('https://intervals.icu/api/v1/athlete/i12345/sport-settings');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('API_KEY:geheime-sleutel-0123')}`);
    expect(init.signal).toBeDefined();
    expect(basis).toEqual({ lthr: 170, maxHr: 195 });
  });

  it('prefers the setting for running alone, else one that lists it', () => {
    expect(mapRunHrBasis(SETTINGS)).toEqual({ lthr: 170, maxHr: 195 });
    expect(mapRunHrBasis(SETTINGS.slice(0, 2))).toEqual({ lthr: 165, maxHr: 190 });
  });

  it('reads rubbish as nothing', () => {
    expect(mapRunHrBasis(null)).toEqual({});
    expect(mapRunHrBasis([{ types: ['Ride'], lthr: 160 }])).toEqual({});
    expect(mapRunHrBasis([{ types: ['Run'], lthr: 'x', max_hr: 5 }])).toEqual({ lthr: undefined, maxHr: undefined });
  });

  it('throws a clear error when the answer fails or never comes', async () => {
    const bad = vi.fn(async () => new Response('', { status: 401 }));
    await expect(fetchRunHeartRateBasis(CONNECTION, { fetchImpl: bad as unknown as typeof fetch })).rejects.toBeInstanceOf(IntervalsError);
    const down = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(fetchRunHeartRateBasis(CONNECTION, { fetchImpl: down as unknown as typeof fetch })).rejects.toMatchObject({ kind: 'network' });
  });
});
