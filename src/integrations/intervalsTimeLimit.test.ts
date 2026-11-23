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

// I-35: een groot antwoord over een trage lijn. De kop heeft 15 s; daarna mag elk stuk inhoud tot 15 s op zich
// laten wachten, zolang de hele aanroep onder de 120 s blijft. Alles nagemaakt, geen echte aanroep.
describe('intervals.icu: een groot antwoord dat langzaam binnenkomt', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  // Een lijn die de kop na `headMs` stuurt en daarna elke `everyMs` een stuk, `pieces` keer (of eindeloos).
  // Het antwoord is "[", spaties en "]": geldige JSON (een lege lijst) die in stukken komt.
  function slowLine(headMs: number, every: number | ((piece: number) => number), pieces: number) {
    const fn = vi.fn(async () => {
      await wait(headMs);
      let sent = 0;
      const enc = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          await wait(typeof every === 'number' ? every : every(sent));
          if (sent >= pieces) {
            controller.close();
            return;
          }
          controller.enqueue(enc.encode(sent === 0 ? '[' : sent === pieces - 1 ? ']' : ' '.repeat(1000)));
          sent++;
        },
      });
      return new Response(stream, { status: 200 });
    });
    return fn as unknown as typeof fetch;
  }

  it('kop na 14 s en daarna 8 stukken met telkens 10 s ertussen (ruim 90 s): komt binnen', async () => {
    vi.useFakeTimers();
    let outcome: unknown = 'bezig';
    const work = outcomeOf(fetchIntervalsActivities(CONNECTION, RANGE, { fetchImpl: slowLine(14_000, 10_000, 8) })).then((o) => (outcome = o));
    await vi.advanceTimersByTimeAsync(110_000);
    await work;
    expect(outcome).toBe('klaar');
  });

  it('de kop blijft langer dan 15 s weg: time-out na 15 s', async () => {
    vi.useFakeTimers();
    const work = outcomeOf(fetchIntervalsWellness(CONNECTION, RANGE, { fetchImpl: slowLine(16_000, 1, 2) }));
    await vi.advanceTimersByTimeAsync(15_000);
    expect(((await work) as IntervalsError).kind).toBe('network');
  });

  it('na een stuk blijft de inhoud langer dan 15 s steken: time-out 15 s na het laatste stuk', async () => {
    vi.useFakeTimers();
    let settled = false;
    // Kop meteen, eerste stuk na 10 s, het volgende pas 20 s later: om 25 s is het op.
    const work = outcomeOf(fetchIntervalsWellness(CONNECTION, RANGE, { fetchImpl: slowLine(0, (i) => (i === 0 ? 10_000 : 20_000), 3) })).finally(() => (settled = true));
    await vi.advanceTimersByTimeAsync(24_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(((await work) as IntervalsError).kind).toBe('network');
  });

  it('een lijn die eindeloos druppelt: na 120 s is het een time-out, ook al komt er steeds iets', async () => {
    vi.useFakeTimers();
    let settled = false;
    const work = outcomeOf(fetchIntervalsWellness(CONNECTION, RANGE, { fetchImpl: slowLine(0, 5_000, Infinity) })).finally(() => (settled = true));
    await vi.advanceTimersByTimeAsync(119_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const err = (await work) as IntervalsError;
    expect(err.kind).toBe('network');
    expect(err.message).toBe(NETWORK);
  });

  it('schrijven volgt dezelfde regel: een trage maar levende inhoud is geen time-out', async () => {
    vi.useFakeTimers();
    let outcome: unknown = 'bezig';
    const work = outcomeOf(createWorkoutEvents(CONNECTION, [WORKOUT], { fetchImpl: slowLine(10_000, 10_000, 4) })).then((o) => (outcome = o));
    await vi.advanceTimersByTimeAsync(60_000);
    await work;
    expect(outcome).not.toBe('bezig');
    expect(outcome instanceof IntervalsError ? outcome.kind : 'klaar').not.toBe('network');
  });
});
