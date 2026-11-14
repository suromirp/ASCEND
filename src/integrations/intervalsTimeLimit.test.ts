// De grens in tijd van een aanroep naar intervals.icu geldt tot en met het lezen
// van het antwoord: een antwoord waarvan de kop binnen is en de inhoud blijft
// steken hangt niet eeuwig. Alles hier is nagemaakt.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { IntervalsError, createWorkoutEvents, fetchIntervalsActivities, fetchIntervalsWellness, intervalsErrorMessage } from './intervalsIcu';
import type { WatchWorkout } from '../engine/watchWorkout';

const CONNECTION = { athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' };
const RANGE = { from: '2026-10-14', to: '2026-10-22' };
const NETWORK = intervalsErrorMessage(undefined);

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

// De kop komt meteen, de inhoud nooit. Luistert bewust niet naar het signaal:
// de grens moet ook gelden als het afbreken de leesactie niet stopt.
function stalledBody() {
  const signals: AbortSignal[] = [];
  const never = () => new Promise<never>(() => undefined);
  const calls = vi.fn(async (_url: string, init: RequestInit) => {
    if (init.signal) signals.push(init.signal);
    return { ok: true, status: 200, json: never, text: never } as unknown as Response;
  });
  return { fn: calls as unknown as typeof fetch, calls, signals };
}

async function outcomeOf(work: Promise<unknown>): Promise<unknown> {
  return work.then(
    () => 'klaar',
    (err: unknown) => err,
  );
}

describe('intervals.icu: de grens geldt ook voor het lezen van het antwoord', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lezen: een inhoud die nooit eindigt geeft na 15 seconden de melding van een time-out', async () => {
    vi.useFakeTimers();
    const { fn, calls, signals } = stalledBody();
    let settled = false;
    const outcome = outcomeOf(fetchIntervalsActivities(CONNECTION, RANGE, { fetchImpl: fn })).finally(() => (settled = true));
    await vi.advanceTimersByTimeAsync(14_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const err = await outcome;
    expect(err).toBeInstanceOf(IntervalsError);
    expect((err as IntervalsError).kind).toBe('network');
    expect((err as IntervalsError).message).toBe(NETWORK);
    // Het verzoek is afgebroken, en een time-out is geen onbegrepen antwoord:
    // er volgt geen tweede aanroep zonder de lijst van velden.
    expect(signals[0]?.aborted).toBe(true);
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('lezen van de ochtendgetallen: dezelfde grens', async () => {
    vi.useFakeTimers();
    const { fn } = stalledBody();
    const outcome = outcomeOf(fetchIntervalsWellness(CONNECTION, RANGE, { fetchImpl: fn }));
    await vi.advanceTimersByTimeAsync(15_000);
    expect(((await outcome) as IntervalsError).kind).toBe('network');
  });

  it('schrijven: een inhoud die nooit eindigt geeft dezelfde melding', async () => {
    vi.useFakeTimers();
    const { fn, signals } = stalledBody();
    const outcome = outcomeOf(createWorkoutEvents(CONNECTION, [WORKOUT], { fetchImpl: fn }));
    await vi.advanceTimersByTimeAsync(15_000);
    const err = await outcome;
    expect(err).toBeInstanceOf(IntervalsError);
    expect((err as IntervalsError).message).toBe(NETWORK);
    expect(signals[0]?.aborted).toBe(true);
  });

  it('een antwoord dat op tijd komt laat geen klok lopen', async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async () => new Response('[]', { status: 200 })) as unknown as typeof fetch;
    await expect(fetchIntervalsActivities(CONNECTION, RANGE, { fetchImpl: fn })).resolves.toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('een inhoud die geen JSON is blijft een onbegrepen antwoord, geen time-out', async () => {
    const fn = vi.fn(async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch;
    const err = (await outcomeOf(fetchIntervalsWellness(CONNECTION, RANGE, { fetchImpl: fn }))) as IntervalsError;
    expect(err.kind).toBe('response');
  });
});
