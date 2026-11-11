// ASCEND: de rustbel van Forge (besluit docs/beslissingen/2026-11-11-rusttimer-geluiden.md). Negen klanken,
// alle gemaakt met Web Audio; een klank met een opname in REST_SOUND_FILES laadt die eerst.
//
// De weg van het geluid: elke klank gaat via een eigen gain (het gekozen volume) naar één vaste
// piekgrens per AudioContext (een DynamicsCompressor als limiter), dan naar de luidspreker. Zo klinkt
// Duidelijk voller maar piekt nooit harder dan de grens, ook niet als Luister en de bel tegelijk klinken.
// Elke stem begint met een korte oploop (minstens 2 ms) vanaf nul: geen klik.
//
// Wat er gebeurt als het niet kan: een opname die niet laadt (offline, eerste keer) klinkt als de
// heldere bel ('fallback'); een AudioContext die niet wil starten geeft 'blocked', en de aanroeper laat
// dan trillen of zegt het. Nooit stilte zonder melding.

import { FALLBACK_REST_SOUND, REPEAT_GAP_S, REST_SOUND_FILES, restCueDuckMs, REST_VOLUME_GAIN, type RestBellOutcome, type RestCue, type RestSound, type RestVolume } from '../engine/restSounds';
import { deviceShell } from '../integrations/deviceShell';
import { createImpulseResponse, ensureRunning, getAudioContext } from './sound';

// Hoe lang de bel wacht op een AudioContext die opstart, en op een opname die laadt.
export const RESUME_LIMIT_MS = 400;
export const LOAD_LIMIT_MS = 1500;

// ---- te vervangen in tests --------------------------------------------------------------------

interface RestBellDeps {
  context: () => AudioContext | null;
  load: (path: string) => Promise<ArrayBuffer>;
  files: Partial<Record<RestSound, string>>;
}

const realDeps: RestBellDeps = {
  context: getAudioContext,
  load: async (path) => {
    const res = await fetch(`${import.meta.env.BASE_URL}${path}`);
    if (!res.ok) throw new Error(`opname ${res.status}`);
    return res.arrayBuffer();
  },
  files: REST_SOUND_FILES,
};
let deps: RestBellDeps = realDeps;

// Voor tests: een nagemaakte AudioContext of laadweg; undefined zet alles terug.
export function setRestBellDeps(patch: Partial<RestBellDeps> | undefined): void {
  deps = patch ? { ...realDeps, ...patch } : realDeps;
  buffers.clear();
  limiters = new WeakMap();
  impulses = new WeakMap();
  preview = null;
}

// ---- de piekgrens en de galm, één keer per AudioContext ----------------------------------------

let limiters = new WeakMap<AudioContext, AudioNode>();
let impulses = new WeakMap<AudioContext, AudioBuffer>();

// De vaste piekgrens: snel genoeg om een slag te vangen, met een korte loslaat zodat de uitklank niet pompt.
export const LIMITER = { threshold: -14, knee: 0, ratio: 20, attack: 0.003, release: 0.2 } as const;

function limiterOf(ctx: AudioContext): AudioNode {
  let node = limiters.get(ctx);
  if (!node) {
    const c = ctx.createDynamicsCompressor();
    c.threshold.value = LIMITER.threshold;
    c.knee.value = LIMITER.knee;
    c.ratio.value = LIMITER.ratio;
    c.attack.value = LIMITER.attack;
    c.release.value = LIMITER.release;
    c.connect(ctx.destination);
    limiters.set(ctx, c);
    node = c;
  }
  return node;
}

// De ingang van één klank: droog en een beetje galm, allebei door de piekgrens.
function busOf(ctx: AudioContext, volume: number, wet: number): GainNode {
  const out = limiterOf(ctx);
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(out);
  if (wet > 0) {
    let impulse = impulses.get(ctx);
    if (!impulse) {
      impulse = createImpulseResponse(ctx, 1.4, 2.6);
      impulses.set(ctx, impulse);
    }
    const conv = ctx.createConvolver();
    conv.buffer = impulse;
    const w = ctx.createGain();
    w.gain.value = wet;
    master.connect(conv);
    conv.connect(w);
    w.connect(out);
  }
  return master;
}

// ---- bouwstenen ------------------------------------------------------------------------------

// Een omhullende: vanaf nul in `attack` naar de top (nooit sneller dan 2 ms: geen klik), dan uitsterven.
function envelope(g: GainNode, t: number, peak: number, attack: number, end: number) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + Math.max(0.002, attack));
  g.gain.exponentialRampToValueAtTime(0.0008, end);
}

function tone(ctx: AudioContext, dest: AudioNode, t: number, type: OscillatorType, freq: number, peak: number, attack: number, decay: number) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  const g = ctx.createGain();
  envelope(g, t, peak, attack, t + decay);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + decay + 0.05);
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// Ruis door een filter: de tik van hout, de klap van metaal, de vel van een trommel.
function noise(ctx: AudioContext, dest: AudioNode, t: number, filter: BiquadFilterType, freq: number, q: number, peak: number, decay: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, decay + 0.02);
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  envelope(g, t, peak, 0.002, t + decay);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(t);
}

// Een bel of klok: een paar boventonen (verhouding, sterkte), de hogere sterven sneller.
function bell(ctx: AudioContext, dest: AudioNode, t: number, freq: number, peak: number, decay: number, partials: readonly (readonly [number, number])[], attack = 0.004) {
  for (const [ratio, part] of partials) tone(ctx, dest, t, 'sine', freq * ratio, peak * part, attack, decay / Math.sqrt(ratio));
}

// Een blaasinstrument: een zaagtand en een blok door een laagdoorlaat die opengaat, met een kleine
// toonopslag aan het begin en een rustig vibrato.
function horn(ctx: AudioContext, dest: AudioNode, t: number, freq: number, peak: number, dur: number, o: { bright: number; attack: number; scoop: number; detune: number }) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + o.attack);
  g.gain.setValueAtTime(peak, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(freq * 2, t);
  f.frequency.linearRampToValueAtTime(o.bright, t + o.attack + 0.08);
  f.frequency.exponentialRampToValueAtTime(freq * 3, t + dur);
  f.connect(g);
  g.connect(dest);
  const vib = ctx.createOscillator();
  vib.frequency.setValueAtTime(4.6, t);
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(freq * 0.006, t + dur * 0.5);
  vib.connect(depth);
  vib.start(t);
  vib.stop(t + dur + 0.05);
  for (const [type, cents, part] of [['sawtooth', 0, 1], ['sawtooth', o.detune, 0.7], ['square', -1200, 0.35]] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.setValueAtTime(cents, t);
    osc.frequency.setValueAtTime(freq * (1 - o.scoop), t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + o.attack + 0.06);
    osc.frequency.setValueAtTime(freq, t + dur * 0.75);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.97, t + dur);
    depth.connect(osc.frequency);
    const og = ctx.createGain();
    og.gain.value = part * 0.4;
    osc.connect(og);
    og.connect(f);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

// Een snaar (Karplus-Strong): een stoot ruis die in een korte lus steeds zachter en ronder wordt.
function pluck(ctx: AudioContext, dest: AudioNode, t: number, freq: number, peak: number, seconds: number) {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * seconds), rate);
  const d = buf.getChannelData(0);
  const period = Math.max(2, Math.round(rate / freq));
  const loop = new Float32Array(period);
  for (let i = 0; i < period; i++) loop[i] = Math.random() * 2 - 1;
  let prev = 0;
  for (let i = 0; i < d.length; i++) {
    const j = i % period;
    const v = 0.996 * 0.5 * (loop[j] + prev);
    prev = loop[j];
    loop[j] = v;
    d[i] = v;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  envelope(g, t, peak, 0.003, t + seconds);
  src.connect(g);
  g.connect(dest);
  src.start(t);
}

function thud(ctx: AudioContext, dest: AudioNode, t: number, freq: number, peak: number, decay: number) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq * 1.7, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.55, 20), t + 0.2);
  const g = ctx.createGain();
  envelope(g, t, peak, 0.003, t + decay);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + decay + 0.05);
}

// ---- de negen klanken -------------------------------------------------------------------------

interface Voice {
  // Speelt de klank op tijd t; k verschuift de toonhoogte (1 is gewoon).
  play: (ctx: AudioContext, dest: AudioNode, t: number, k: number) => void;
  // Hoe lang hij duurt, tot de herhaling bij een volgende oefening.
  length: number;
  // Hoe lang één keer klinkt, met de uitklank: zo lang gaat andere audio zachter.
  ring: number;
  // Hoeveel galm.
  wet: number;
}

const BELL_PARTIALS = [[1, 1], [2.76, 0.22], [5.4, 0.06]] as const;
// Bronzen klokken (bianzhong): een kleine terts boven de grondtoon is het tweede slaggebied.
const BIANZHONG_PARTIALS = [[0.5, 0.25], [1, 1], [1.19, 0.45], [2.0, 0.3], [2.92, 0.12]] as const;
// Een grote tempelbel: brom, grondtoon, en twee boventonen die een halve hertz zweven.
const TEMPLE_PARTIALS = [[0.5, 0.6], [1, 1], [1.004, 0.6], [2.03, 0.35], [2.71, 0.18], [4.1, 0.06]] as const;

export const VOICES: Record<RestSound, Voice> = {
  // Eén droge metalen klik: een korte stoot hoge ruis en drie hoge, onharmonische boventonen.
  pickaxe: {
    length: 0.35,
    ring: 0.22,
    wet: 0.2,
    play: (ctx, dest, t, k) => {
      noise(ctx, dest, t, 'highpass', 2200 * k, 0.7, 0.5, 0.05);
      for (const [f, p, dec] of [[3150, 0.35, 0.22], [4730, 0.25, 0.16], [6890, 0.15, 0.1]] as const) tone(ctx, dest, t, 'sine', f * k, p, 0.002, dec);
    },
  },
  // Een korte roep op de bronzen hoorn: een kwint omhoog, Bes3 kort, F4 aangehouden.
  cornu: {
    length: 1.3,
    ring: 1.23,
    wet: 0.3,
    play: (ctx, dest, t, k) => {
      const o = { bright: 2600 * k, attack: 0.05, scoop: 0.05, detune: 6 };
      horn(ctx, dest, t, 233.08 * k, 0.6, 0.3, o);
      horn(ctx, dest, t + 0.28, 349.23 * k, 0.65, 0.95, o);
    },
  },
  // Eén lage, ruwe roep van ongeveer anderhalve seconde die rustig uitklinkt (A2), geen strijdstoot.
  vikinghorn: {
    length: 1.8,
    ring: 1.6,
    wet: 0.34,
    play: (ctx, dest, t, k) => {
      horn(ctx, dest, t, 110 * k, 0.75, 1.6, { bright: 1500 * k, attack: 0.14, scoop: 0.1, detune: 14 });
    },
  },
  // Drie trage, zware slagen.
  drum: {
    length: 1.45,
    ring: 1.5,
    wet: 0.22,
    play: (ctx, dest, t, k) => {
      [0, 0.5, 1.0].forEach((at, i) => {
        thud(ctx, dest, t + at, 62 * k, i === 2 ? 1 : 0.85, 0.5);
        noise(ctx, dest, t + at, 'lowpass', 1300 * k, 0.7, 0.45, 0.08);
      });
    },
  },
  // Drie bronzen klokken in de vijftoonsladder: D5, E5, A5.
  bianzhong: {
    length: 1.2,
    ring: 3.15,
    wet: 0.3,
    play: (ctx, dest, t, k) => {
      [587.33, 659.25, 880].forEach((f, i) => bell(ctx, dest, t + i * 0.3, f * k, i === 2 ? 0.5 : 0.42, 1.8, BIANZHONG_PARTIALS));
    },
  },
  // Twee houten klappers (hyōshigi): een harde, korte klap rond 2 kHz, twee keer.
  hyoshigi: {
    length: 0.6,
    ring: 0.38,
    wet: 0.25,
    play: (ctx, dest, t, k) => {
      for (const at of [0, 0.3]) {
        noise(ctx, dest, t + at, 'bandpass', 2100 * k, 6, 0.9, 0.07);
        tone(ctx, dest, t + at, 'sine', 1870 * k, 0.4, 0.002, 0.08);
        tone(ctx, dest, t + at, 'sine', 3050 * k, 0.2, 0.002, 0.05);
      }
    },
  },
  // Eén diepe slag op een grote tempelbel (G3), met een zachte stoot van de houten balk.
  templebell: {
    length: 2.2,
    ring: 5.1,
    wet: 0.35,
    play: (ctx, dest, t, k) => {
      noise(ctx, dest, t, 'lowpass', 500 * k, 0.7, 0.3, 0.06);
      bell(ctx, dest, t, 196 * k, 0.65, 3.6, TEMPLE_PARTIALS, 0.008);
    },
  },
  // Twee korte, hoge slagen (E6).
  clearbell: {
    length: 0.6,
    ring: 1.18,
    wet: 0.18,
    play: (ctx, dest, t, k) => {
      bell(ctx, dest, t, 1318.5 * k, 0.5, 0.9, BELL_PARTIALS);
      bell(ctx, dest, t + 0.18, 1318.5 * k, 0.45, 1.0, BELL_PARTIALS);
    },
  },
  // Eén aangeslagen snaar (G4).
  lyre: {
    length: 1.0,
    ring: 1.8,
    wet: 0.25,
    play: (ctx, dest, t, k) => {
      pluck(ctx, dest, t, 392 * k, 0.8, 1.8);
    },
  },
};

// Bij een volgende oefening klinkt de klank twee keer, de tweede een kwart lager.
const FOURTH_DOWN = 0.749;

// De tik vooraf: zacht en kort, voor elk geluid gelijk.
function preTick(ctx: AudioContext, dest: AudioNode, t: number) {
  noise(ctx, dest, t, 'bandpass', 1800, 4, 0.25, 0.03);
  tone(ctx, dest, t, 'sine', 1600, 0.18, 0.002, 0.05);
}

// ---- opnames ---------------------------------------------------------------------------------

const buffers = new Map<string, Promise<AudioBuffer>>();

function withLimit<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('te traag')), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

// Laadt een opname één keer; een mislukte poging wordt vergeten, zodat de volgende keer opnieuw probeert.
function bufferFor(ctx: AudioContext, path: string): Promise<AudioBuffer> {
  let p = buffers.get(path);
  if (!p) {
    p = deps.load(path).then((data) => ctx.decodeAudioData(data));
    buffers.set(path, p);
    p.catch(() => buffers.delete(path));
  }
  return withLimit(p, LOAD_LIMIT_MS);
}

// Vooraf laden (bij het openen van de training), zodat de bel op tijd klinkt. Stil als het niet lukt.
export function preloadRestSound(kind: RestSound): void {
  const path = deps.files[kind];
  const ctx = path ? deps.context() : null;
  if (ctx && path) bufferFor(ctx, path).catch(() => undefined);
}

function playBuffer(ctx: AudioContext, dest: AudioNode, t: number, buffer: AudioBuffer, k: number) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = k;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + 0.004);
  src.connect(g);
  g.connect(dest);
  src.start(t);
}

// ---- spelen ----------------------------------------------------------------------------------

async function running(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === 'running') return true;
  ensureRunning(ctx);
  await new Promise((r) => setTimeout(r, 0));
  if ((ctx.state as AudioContextState) === 'running') return true;
  try {
    await withLimit(ctx.resume(), RESUME_LIMIT_MS);
  } catch {
    return false;
  }
  return (ctx.state as AudioContextState) === 'running';
}

// De klank van Luister die nog klinkt: een nieuwe Luister zet hem zachtjes uit. De bel van een lopende
// rust raakt hij nooit.
let preview: GainNode | null = null;

export interface RestBellOptions {
  volume?: RestVolume;
  cue?: RestCue;
  // Luister in de instellingen: een vorige Luister stopt.
  preview?: boolean;
}

// Speelt de rustbel. Geeft terug wat er klonk: de klank, de heldere bel in plaats van een opname die
// niet laadde, of niets omdat de telefoon nu geen geluid toelaat.
export async function playRestBell(kind: RestSound, opts: RestBellOptions = {}): Promise<RestBellOutcome> {
  const ctx = deps.context();
  if (!ctx || !(await running(ctx))) return 'blocked';
  const cue = opts.cue ?? 'set';
  const volume = REST_VOLUME_GAIN[opts.volume ?? 'normal'];

  let buffer: AudioBuffer | null = null;
  let sound = kind;
  let outcome: RestBellOutcome = 'played';
  const path = cue === 'pre' ? undefined : deps.files[kind];
  if (path) {
    try {
      buffer = await bufferFor(ctx, path);
    } catch {
      sound = FALLBACK_REST_SOUND;
      outcome = 'fallback';
    }
  }

  // In de Android-app gaat andere audio even zachter; in de browser kan dat niet.
  const voice = VOICES[sound];
  deviceShell().duckAudio?.(restCueDuckMs(buffer ? { length: buffer.duration, ring: buffer.duration } : voice, cue));

  const bus = busOf(ctx, volume, cue === 'pre' ? 0 : voice.wet);
  if (opts.preview) {
    const old = preview;
    if (old) {
      const now = ctx.currentTime;
      old.gain.cancelScheduledValues(now);
      old.gain.setValueAtTime(old.gain.value, now);
      old.gain.linearRampToValueAtTime(0, now + 0.03);
    }
    preview = bus;
  }
  const t = ctx.currentTime + 0.01;
  if (cue === 'pre') {
    preTick(ctx, bus, t);
    return outcome;
  }
  const once = (at: number, k: number) => (buffer ? playBuffer(ctx, bus, at, buffer, k) : voice.play(ctx, bus, at, k));
  once(t, 1);
  if (cue === 'exercise') once(t + (buffer ? buffer.duration : voice.length) + REPEAT_GAP_S, FOURTH_DOWN);
  return outcome;
}
