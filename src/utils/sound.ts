// Every sound effect in the app is synthesised at runtime with the Web
// Audio API — no audio files, so nothing to license or ship as an asset.
// Two families live here: a short percussion pattern for app open
// (playIntroDrums), and a brighter bell/chime for completions
// (playSessionCompleteChime / playMilestoneChime). Both share one
// AudioContext and reverb helper below.

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

// A suspended context only actually unlocks once resume() is called from
// inside a real user-gesture call stack — every exported play*() function
// here is only ever invoked from a click/tap handler, so this is safe to
// call unconditionally rather than awaited: the schedule() calls right
// after still land correctly once the context finishes resuming.
function ensureRunning(ctx: AudioContext) {
  if (ctx.state === 'suspended') void ctx.resume();
}

// A synthetic reverb impulse: exponentially-decaying white noise. Cheaper
// and license-free compared to shipping a recorded impulse-response file,
// and plenty convincing for a short decay tail.
function createImpulseResponse(ctx: AudioContext, durationSec = 1.6, decay = 3.2): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * durationSec);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

// Wires a gain node up to the destination both dry and through a reverb
// tail, and returns the dry gain node as the thing to actually play notes
// into.
function createMasterBus(ctx: AudioContext, volume: number, wetAmount: number, reverbDurationSec: number, reverbDecay: number): GainNode {
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, reverbDurationSec, reverbDecay);
  const wet = ctx.createGain();
  wet.gain.value = wetAmount;
  master.connect(convolver);
  convolver.connect(wet);
  wet.connect(ctx.destination);

  return master;
}

// --- Intro drums (app open) -------------------------------------------

function playDrumHit(ctx: AudioContext, destination: AudioNode, time: number, pitchHz: number, gain: number) {
  // Body: a triangle oscillator with a fast downward pitch sweep — the
  // classic synthesised-tom "thud" shape.
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(pitchHz * 1.8, time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(pitchHz * 0.5, 20), time + 0.18);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(gain, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.42);

  osc.connect(oscGain);
  oscGain.connect(destination);
  osc.start(time);
  osc.stop(time + 0.45);

  // Attack transient: a short burst of low-passed noise, like a mallet
  // strike, layered on top of the tonal body.
  const noiseDuration = 0.09;
  const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDuration), ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 1400;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gain * 0.5, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + noiseDuration);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(destination);
  noise.start(time);
}

// Builds toward a final accented hit — four lead-in strikes then one
// louder, lower "downbeat".
const DRUM_PATTERN: { offset: number; pitch: number; gain: number }[] = [
  { offset: 0, pitch: 72, gain: 0.55 },
  { offset: 0.26, pitch: 68, gain: 0.5 },
  { offset: 0.5, pitch: 68, gain: 0.5 },
  { offset: 0.74, pitch: 62, gain: 0.75 },
  { offset: 1.12, pitch: 54, gain: 1 },
];

export function playIntroDrums(volume = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;
  ensureRunning(ctx);

  const master = createMasterBus(ctx, volume, 0.22, 1.6, 3.2);
  const now = ctx.currentTime;
  for (const hit of DRUM_PATTERN) {
    playDrumHit(ctx, master, now + hit.offset, hit.pitch, hit.gain);
  }
}

// Browsers refuse to autoplay audio before the user has interacted with
// the page — there's no way around that from app code. This wires up a
// one-time listener on the very first pointer/touch/key interaction after
// launch (whichever the user actually does first, typically while the
// splash screen or the first real screen is still on-screen) and plays
// the intro then, instead of failing silently on load. Both pointerdown
// and touchstart are listened for — some mobile browsers deliver one but
// not the other depending on how the tap lands (e.g. on an element with
// touch-action handling) — so either satisfies it, whichever fires first.
export function playIntroDrumsOnFirstInteraction(enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return () => {};

  let played = false;
  function handler() {
    if (played) return;
    played = true;
    playIntroDrums();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('touchstart', handler);
    window.removeEventListener('keydown', handler);
  }

  window.addEventListener('pointerdown', handler, { once: true });
  window.addEventListener('touchstart', handler, { once: true });
  window.addEventListener('keydown', handler, { once: true });

  return () => {
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('touchstart', handler);
    window.removeEventListener('keydown', handler);
  };
}

// --- Completion chimes ---------------------------------------------------

function playChimeNote(ctx: AudioContext, destination: AudioNode, time: number, freqHz: number, gain: number, durationSec = 0.9) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqHz, time);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0, time);
  oscGain.gain.linearRampToValueAtTime(gain, time + 0.02);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + durationSec);

  osc.connect(oscGain);
  oscGain.connect(destination);
  osc.start(time);
  osc.stop(time + durationSec + 0.05);

  // A quiet octave-up overtone layered in for a bell-like shimmer, rather
  // than a single flat sine — reads as a soft chime instead of a beep.
  const overtone = ctx.createOscillator();
  overtone.type = 'sine';
  overtone.frequency.setValueAtTime(freqHz * 2, time);

  const overtoneGain = ctx.createGain();
  overtoneGain.gain.setValueAtTime(0, time);
  overtoneGain.gain.linearRampToValueAtTime(gain * 0.25, time + 0.02);
  overtoneGain.gain.exponentialRampToValueAtTime(0.001, time + durationSec * 0.6);

  overtone.connect(overtoneGain);
  overtoneGain.connect(destination);
  overtone.start(time);
  overtone.stop(time + durationSec * 0.6 + 0.05);
}

function playChime(pattern: { offset: number; freqHz: number; gain: number }[], volume: number) {
  const ctx = getAudioContext();
  if (!ctx) return;
  ensureRunning(ctx);

  const master = createMasterBus(ctx, volume, 0.18, 1.2, 4);
  const now = ctx.currentTime;
  for (const note of pattern) {
    playChimeNote(ctx, master, now + note.offset, note.freqHz, note.gain);
  }
}

// A short two-note rise — the routine "you finished a session" acknowledgement.
const SESSION_CHIME = [
  { offset: 0, freqHz: 587.33, gain: 0.32 }, // D5
  { offset: 0.1, freqHz: 880, gain: 0.4 }, // A5
];

// A fuller four-note ascending triad+octave — reserved for an actual
// Ascent Ladder milestone, the rarer/bigger moment.
const MILESTONE_CHIME = [
  { offset: 0, freqHz: 523.25, gain: 0.3 }, // C5
  { offset: 0.11, freqHz: 659.25, gain: 0.34 }, // E5
  { offset: 0.22, freqHz: 783.99, gain: 0.38 }, // G5
  { offset: 0.36, freqHz: 1046.5, gain: 0.45 }, // C6
];

export function playSessionCompleteChime(volume = 0.45) {
  playChime(SESSION_CHIME, volume);
}

export function playMilestoneChime(volume = 0.55) {
  playChime(MILESTONE_CHIME, volume);
}
