import { describe, it, expect, vi } from 'vitest';
import {
  IntervalsError,
  basicAuthHeader,
  createWorkoutEvents,
  deleteWorkoutEvents,
  eventUrl,
  eventsBulkDeleteUrl,
  eventsBulkUrl,
  updateWorkoutEvent,
  workoutEventBody,
} from './intervalsIcu';
import type { WatchWorkout } from '../engine/watchWorkout';

// Writing planned workouts to intervals.icu, with a mocked fetch. Everything
// here is made up; the paths and fields are those of the OpenAPI description
// (https://intervals.icu/api/v1/docs).

const CONNECTION = { athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' };

const WORKOUT: WatchWorkout = {
  plannedId: 'ps1',
  externalId: 'ascend:ps1',
  date: '2026-10-27',
  name: 'Tempoloop',
  type: 'Run',
  description: 'Warming-up\n- Inlopen 10m Z2 HR',
  movingTimeSec: 2700,
  target: 'HR',
  fingerprint: 'abc',
};

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };
function recordingFetch(respond: (call: Call) => Response) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    const call: Call = { url, method: init.method ?? 'GET', headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(init.body as string) : undefined };
    calls.push(call);
    return respond(call);
  });
  return { fn: fn as unknown as typeof fetch, calls };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('workout events: the request', () => {
  it('builds the three urls from the athlete id', () => {
    expect(eventsBulkUrl('i12345')).toBe('https://intervals.icu/api/v1/athlete/i12345/events/bulk?upsert=true');
    expect(eventUrl('i12345', 99)).toBe('https://intervals.icu/api/v1/athlete/i12345/events/99');
    expect(eventsBulkDeleteUrl('i12345')).toBe('https://intervals.icu/api/v1/athlete/i12345/events/bulk-delete');
  });

  it("writes a WORKOUT event with the text as description and ASCEND's own external id", () => {
    expect(workoutEventBody(WORKOUT)).toEqual({
      category: 'WORKOUT',
      start_date_local: '2026-10-27T00:00:00',
      type: 'Run',
      name: 'Tempoloop',
      description: 'Warming-up\n- Inlopen 10m Z2 HR',
      moving_time: 2700,
      external_id: 'ascend:ps1',
      target: 'HR',
      indoor: false,
    });
  });

  it('creates by upsert on external id, with Basic auth and a JSON body, and returns the event ids', async () => {
    const { fn, calls } = recordingFetch(() => json([{ id: 4242, external_id: 'ascend:ps1' }]));
    const ids = await createWorkoutEvents(CONNECTION, [WORKOUT], { fetchImpl: fn });
    expect(ids.get('ascend:ps1')).toBe(4242);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe(eventsBulkUrl('i12345'));
    expect(calls[0].headers.Authorization).toBe(basicAuthHeader(CONNECTION.apiKey));
    expect(calls[0].headers['Content-Type']).toBe('application/json');
    expect(calls[0].body).toEqual([workoutEventBody(WORKOUT)]);
  });

  it('sends nothing when there is nothing to create', async () => {
    const { fn, calls } = recordingFetch(() => json([]));
    expect((await createWorkoutEvents(CONNECTION, [], { fetchImpl: fn })).size).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("refuses to send an event that does not carry ASCEND's id", async () => {
    const { fn, calls } = recordingFetch(() => json([]));
    await expect(createWorkoutEvents(CONNECTION, [{ ...WORKOUT, externalId: 'mijn-eigen-training' }], { fetchImpl: fn })).rejects.toBeInstanceOf(IntervalsError);
    expect(calls).toHaveLength(0);
  });

  it('updates a known event with PUT on its id', async () => {
    const { fn, calls } = recordingFetch(() => json({ id: 4242 }));
    expect(await updateWorkoutEvent(CONNECTION, WORKOUT, 4242, { fetchImpl: fn })).toBe(4242);
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['PUT https://intervals.icu/api/v1/athlete/i12345/events/4242']);
  });

  it('creates it again when the event was deleted in intervals.icu (404), instead of failing or doubling', async () => {
    const { fn, calls } = recordingFetch((c) => (c.method === 'PUT' ? new Response('', { status: 404 }) : json([{ id: 7, external_id: 'ascend:ps1' }])));
    expect(await updateWorkoutEvent(CONNECTION, WORKOUT, 4242, { fetchImpl: fn })).toBe(7);
    expect(calls.map((c) => c.method)).toEqual(['PUT', 'POST']);
  });

  it("deletes by id when known and by external id when not, and only ASCEND's own", async () => {
    const { fn, calls } = recordingFetch(() => json({ deleted: 2 }));
    await deleteWorkoutEvents(
      CONNECTION,
      [
        { externalId: 'ascend:a', date: '2026-10-27', fingerprint: 'x', eventId: 11 },
        { externalId: 'ascend:b', date: '2026-10-28', fingerprint: 'y' },
        { externalId: 'iets-van-de-eigenaar', date: '2026-10-28', fingerprint: 'z', eventId: 12 },
      ],
      { fetchImpl: fn },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url).toBe(eventsBulkDeleteUrl('i12345'));
    expect(calls[0].body).toEqual([{ id: 11 }, { external_id: 'ascend:b' }]);
  });

  it('sends nothing at all when none of the events to delete is ASCEND\'s', async () => {
    const { fn, calls } = recordingFetch(() => json({}));
    await deleteWorkoutEvents(CONNECTION, [{ externalId: 'van-de-eigenaar', date: '2026-10-27', fingerprint: 'x', eventId: 5 }], { fetchImpl: fn });
    expect(calls).toHaveLength(0);
  });

  it('treats an event that is already gone as deleted', async () => {
    const { fn } = recordingFetch(() => new Response('', { status: 404 }));
    await expect(deleteWorkoutEvents(CONNECTION, [{ externalId: 'ascend:a', date: '2026-10-27', fingerprint: 'x' }], { fetchImpl: fn })).resolves.toBeUndefined();
  });
});

describe('workout events: errors in plain Dutch', () => {
  const kindOfError = async (status: number) => {
    try {
      await createWorkoutEvents(CONNECTION, [WORKOUT], { fetchImpl: recordingFetch(() => new Response('', { status })).fn });
    } catch (err) {
      return err as IntervalsError;
    }
    throw new Error('should have failed');
  };

  it('401: the key is not recognised', async () => {
    const err = await kindOfError(401);
    expect(err.kind).toBe('auth');
    expect(err.message).toMatch(/API-sleutel/);
  });
  it('403: the key may not write', async () => {
    const err = await kindOfError(403);
    expect(err.kind).toBe('write');
    expect(err.message).toMatch(/geen trainingen in je agenda/);
  });
  it('422: intervals.icu does not accept the training', async () => {
    const err = await kindOfError(422);
    expect(err.kind).toBe('rejected');
    expect(err.message).toMatch(/nam de training niet aan/);
  });
  it('429 and 500', async () => {
    expect((await kindOfError(429)).kind).toBe('rate');
    expect((await kindOfError(503)).kind).toBe('server');
  });
  it('a request that cannot be made (offline, blocked)', async () => {
    const fn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(createWorkoutEvents(CONNECTION, [WORKOUT], { fetchImpl: fn })).rejects.toMatchObject({ kind: 'network' });
  });
  it('an answer that is not a list', async () => {
    const fn = recordingFetch(() => json({ nope: true })).fn;
    await expect(createWorkoutEvents(CONNECTION, [WORKOUT], { fetchImpl: fn })).rejects.toMatchObject({ kind: 'response' });
  });
  it('no message contains a dash used as punctuation', async () => {
    for (const status of [401, 403, 422, 429, 503]) expect((await kindOfError(status)).message).not.toMatch(/[–—]/);
  });
});
