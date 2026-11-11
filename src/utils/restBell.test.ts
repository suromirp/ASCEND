import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DUCK_MAX_MS, REST_SOUNDS, restCueDuckMs, type RestSound } from '../engine/restSounds';
import { setDeviceShell } from '../integrations/deviceShell';
import { LIMITER, LOAD_LIMIT_MS, playRestBell, setRestBellDeps, VOICES } from './restBell';

// Een nagemaakte AudioContext: telt wat er gemaakt wordt en onthoudt elke stap van elke gain.
type Call = [string, ...number[]];
class FakeParam {
  value = 0;
  calls: Call[] = [];
  setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); this.value = v; }
  linearRampToValueAtTime(v: number, t: number) { this.calls.push(['lin', v, t]); }
  exponentialRampToValueAtTime(v: number, t: number) { this.calls.push(['exp', v, t]); }
  cancelScheduledValues(t: number) { this.calls.push(['cancel', t]); }
}
class FakeNode {
  kind: string;
  constructor(kind: string) {
    this.kind = kind;
  }
  connected: unknown[] = [];
  connect(n: unknown) { this.connected.push(n); return n; }
}
function fakeContext(state: AudioContextState = 'running', resumes = true) {
  const made: FakeNode[] = [];
  const node = <T extends object>(kind: string, extra: T) => {
    const n = Object.assign(new FakeNode(kind), extra);
    made.push(n);
    return n;
  };
  const ctx = {
    state,
    currentTime: 1,
    sampleRate: 8000,
    destination: new FakeNode('destination'),
    resume: vi.fn(() => {
      if (resumes) ctx.state = 'running';
      return resumes ? Promise.resolve() : new Promise<void>(() => undefined);
    }),
    createGain: () => node('gain', { gain: new FakeParam() }),
    createOscillator: () => node('osc', { type: 'sine', frequency: new FakeParam(), detune: new FakeParam(), start: vi.fn(), stop: vi.fn() }),
    createBiquadFilter: () => node('filter', { type: 'lowpass', frequency: new FakeParam(), Q: new FakeParam() }),
    createBufferSource: () => node('source', { buffer: null as unknown, playbackRate: new FakeParam(), start: vi.fn() }),
    createConvolver: () => node('convolver', { buffer: null as unknown }),
    createDynamicsCompressor: () => node('compressor', { threshold: new FakeParam(), knee: new FakeParam(), ratio: new FakeParam(), attack: new FakeParam(), release: new FakeParam() }),
    createBuffer: (_c: number, length: number) => ({ length, duration: length / 8000, getChannelData: () => new Float32Array(length) }),
    decodeAudioData: vi.fn(async () => ({ duration: 1.5, length: 12000 })),
  };
  return { ctx, made, of: (kind: string) => made.filter((n) => n.kind === kind) as (FakeNode & Record<string, never>)[] };
}

type Fake = ReturnType<typeof fakeContext>;
const use = (f: Fake, extra: Parameters<typeof setRestBellDeps>[0] = {}) =>
  setRestBellDeps({ context: () => f.ctx as unknown as AudioContext, files: {}, ...extra });
const gains = (f: Fake) => f.of('gain').map((g) => (g as unknown as { gain: FakeParam }).gain);

beforeEach(() => setDeviceShell({ vibrate: () => undefined, holdScreen: () => () => undefined }));
afterEach(() => {
  setRestBellDeps(undefined);
  setDeviceShell(undefined);
  vi.useRealTimers();
});

describe('de rustbel: elke klank', () => {
  it.each([...REST_SOUNDS])('%s klinkt, met een zachte aanslag vanaf nul (geen klik)', async (sound: RestSound) => {
    const f = fakeContext();
    use(f);
    await expect(playRestBell(sound)).resolves.toBe('played');
    const envelopes = gains(f).filter((g) => g.calls.length > 0 && g.calls[0][0] === 'set');
    expect(envelopes.length).toBeGreaterThan(0);
    for (const g of envelopes) {
      // Begint op nul, en de eerste stap omhoog duurt minstens 2 ms.
      expect(g.calls[0][1]).toBe(0);
      const up = g.calls.find((c) => c[0] === 'lin');
      if (up) expect(up[2] - g.calls[0][2]).toBeGreaterThanOrEqual(0.002 - 1e-9);
    }
    expect(f.of('osc').length + f.of('source').length).toBeGreaterThan(0);
  });

  it('een volgende oefening speelt de klank twee keer, de tik vooraf is kort en zonder galm', async () => {
    const a = fakeContext();
    use(a);
    await playRestBell('templebell', { cue: 'set' });
    const once = a.of('osc').length;
    const b = fakeContext();
    use(b);
    await playRestBell('templebell', { cue: 'exercise' });
    expect(b.of('osc').length).toBeGreaterThan(once);
    const c = fakeContext();
    use(c);
    await playRestBell('templebell', { cue: 'pre' });
    expect(c.of('convolver')).toHaveLength(0);
  });
});

describe('volume en piekgrens', () => {
  it('één limiter per AudioContext, ook als Luister klinkt terwijl een rust loopt', async () => {
    const f = fakeContext();
    use(f);
    await playRestBell('clearbell', { cue: 'set' });
    await playRestBell('vikinghorn', { preview: true, volume: 'clear' });
    await playRestBell('lyre', { preview: true });
    const limiters = f.of('compressor');
    expect(limiters).toHaveLength(1);
    const l = limiters[0] as unknown as { threshold: FakeParam; ratio: FakeParam; attack: FakeParam; connected: unknown[] };
    expect(l.threshold.value).toBe(LIMITER.threshold);
    expect(l.ratio.value).toBe(LIMITER.ratio);
    expect(l.connected).toEqual([f.ctx.destination]);
  });

  it('een nieuwe Luister zet de vorige zacht uit, de bel van de rust nooit', async () => {
    const f = fakeContext();
    use(f);
    await playRestBell('clearbell', { cue: 'set' });
    const restBus = gains(f).find((g) => g.value === 0.6)!;
    await playRestBell('vikinghorn', { preview: true });
    const firstPreview = gains(f).filter((g) => g.value === 0.6)[1];
    await playRestBell('lyre', { preview: true });
    expect(firstPreview.calls.some((c) => c[0] === 'cancel')).toBe(true);
    expect(firstPreview.calls.at(-1)).toEqual(['lin', 0, expect.any(Number)]);
    expect(restBus.calls.some((c) => c[0] === 'cancel')).toBe(false);
  });

  it('Zacht, Normaal en Duidelijk zijn drie stappen omhoog', async () => {
    const levels: number[] = [];
    for (const volume of ['soft', 'normal', 'clear'] as const) {
      const f = fakeContext();
      use(f);
      await playRestBell('clearbell', { volume });
      // De bus is de eerste gain die rechtstreeks op de limiter zit.
      const limiter = f.of('compressor')[0];
      const bus = f.of('gain').find((g) => g.connected.includes(limiter)) as unknown as { gain: FakeParam };
      levels.push(bus.gain.value);
    }
    expect(levels[0]).toBeLessThan(levels[1]);
    expect(levels[1]).toBeLessThan(levels[2]);
  });
});

describe('als het niet kan: nooit stilte zonder melding', () => {
  it('geen AudioContext: blocked', async () => {
    setRestBellDeps({ context: () => null, files: {} });
    await expect(playRestBell('clearbell')).resolves.toBe('blocked');
  });

  it('een AudioContext die niet wil starten: blocked binnen de grens, niets gemaakt', async () => {
    vi.useFakeTimers();
    const f = fakeContext('suspended', false);
    use(f);
    const p = playRestBell('clearbell');
    await vi.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBe('blocked');
    expect(f.of('osc')).toHaveLength(0);
  });

  it('een AudioContext die na een tik start: gewoon spelen', async () => {
    const f = fakeContext('suspended', true);
    use(f);
    await expect(playRestBell('clearbell')).resolves.toBe('played');
    expect(f.ctx.resume).toHaveBeenCalled();
  });

  it('een opname die niet laadt (offline, eerste keer): de heldere bel, en dat wordt gemeld', async () => {
    const f = fakeContext();
    use(f, { files: { vikinghorn: 'sounds/vikinghoorn.mp3' }, load: () => Promise.reject(new Error('offline')) });
    await expect(playRestBell('vikinghorn')).resolves.toBe('fallback');
    expect(f.of('osc').length).toBeGreaterThan(0);
    expect(f.of('source').filter((s) => (s as unknown as { buffer: { duration?: number } }).buffer?.duration === 1.5)).toHaveLength(0);
  });

  it('een opname die te traag laadt: na de grens de heldere bel', async () => {
    vi.useFakeTimers();
    const f = fakeContext();
    use(f, { files: { cornu: 'sounds/cornu.mp3' }, load: () => new Promise<ArrayBuffer>(() => undefined) });
    const p = playRestBell('cornu');
    await vi.advanceTimersByTimeAsync(LOAD_LIMIT_MS + 10);
    await expect(p).resolves.toBe('fallback');
  });

  it('een opname die laadt: die klinkt, één keer geladen', async () => {
    const f = fakeContext();
    const load = vi.fn(async () => new ArrayBuffer(8));
    use(f, { files: { vikinghorn: 'sounds/vikinghoorn.mp3' }, load });
    await expect(playRestBell('vikinghorn')).resolves.toBe('played');
    await playRestBell('vikinghorn', { cue: 'exercise' });
    expect(load).toHaveBeenCalledTimes(1);
    const played = f.of('source').filter((s) => (s as unknown as { buffer: { duration?: number } }).buffer?.duration === 1.5);
    expect(played).toHaveLength(3);
  });
});

describe('andere audio even zachter (Android)', () => {
  it('vraagt de laag om ducking zo lang als de klank, als die het kan', async () => {
    const duck = vi.fn();
    setDeviceShell({ vibrate: () => undefined, holdScreen: () => () => undefined, duckAudio: duck });
    const f = fakeContext();
    use(f);
    await playRestBell('clearbell', { cue: 'exercise' });
    expect(duck).toHaveBeenCalledWith(restCueDuckMs(VOICES.clearbell, 'exercise'));
  });

  it.each([...REST_SOUNDS])('%s: de muziek komt pas terug als de klank is uitgeklonken, ook twee keer', async (sound: RestSound) => {
    // Gemeten: het laatste moment waarop een stem nog uitsterft, vanaf de start (t = 1,01).
    const f = fakeContext();
    use(f);
    await playRestBell(sound);
    const ends = gains(f).flatMap((g) => g.calls.filter((c) => c[0] === 'exp').map((c) => c[2] - 1.01));
    const measured = Math.max(...ends);
    expect(VOICES[sound].ring).toBeGreaterThanOrEqual(measured - 1e-6);
    expect(restCueDuckMs(VOICES[sound], 'set')).toBeGreaterThanOrEqual(measured * 1000);
    expect(restCueDuckMs(VOICES[sound], 'exercise')).toBeGreaterThanOrEqual((VOICES[sound].length + 0.12 + measured) * 1000);
    expect(restCueDuckMs(VOICES[sound], 'exercise')).toBeLessThanOrEqual(DUCK_MAX_MS);
  });

  it('in de browser bestaat het niet en gaat er niets mis', async () => {
    const f = fakeContext();
    use(f);
    await expect(playRestBell('clearbell')).resolves.toBe('played');
  });
});
