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

// --- Completion fanfares ---------------------------------------------

// A low percussive anchor under the fanfare — the same tom-style body as
// the intro drums, one hit instead of a pattern, giving the rise something
// to launch off instead of starting from silence.
function playImpactHit(ctx: AudioContext, destination: AudioNode, time: number, gain: number) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(110, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.24);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(gain, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.55);

  osc.connect(oscGain);
  oscGain.connect(destination);
  osc.start(time);
  osc.stop(time + 0.6);
}

// Sine core + a triangle layer for brightness ("brassier" than a flat
// sine, reads as a fanfare rather than a notification ding) + an octave
// overtone for shimmer.
function playFanfareNote(ctx: AudioContext, destination: AudioNode, time: number, freqHz: number, gain: number, durationSec = 1.1) {
  const core = ctx.createOscillator();
  core.type = 'sine';
  core.frequency.setValueAtTime(freqHz, time);
  const coreGain = ctx.createGain();
  coreGain.gain.setValueAtTime(0, time);
  coreGain.gain.linearRampToValueAtTime(gain, time + 0.015);
  coreGain.gain.exponentialRampToValueAtTime(0.001, time + durationSec);
  core.connect(coreGain);
  coreGain.connect(destination);
  core.start(time);
  core.stop(time + durationSec + 0.05);

  const bright = ctx.createOscillator();
  bright.type = 'triangle';
  bright.frequency.setValueAtTime(freqHz, time);
  const brightGain = ctx.createGain();
  brightGain.gain.setValueAtTime(0, time);
  brightGain.gain.linearRampToValueAtTime(gain * 0.55, time + 0.015);
  brightGain.gain.exponentialRampToValueAtTime(0.001, time + durationSec * 0.75);
  bright.connect(brightGain);
  brightGain.connect(destination);
  bright.start(time);
  bright.stop(time + durationSec * 0.75 + 0.05);

  const overtone = ctx.createOscillator();
  overtone.type = 'sine';
  overtone.frequency.setValueAtTime(freqHz * 2, time);
  const overtoneGain = ctx.createGain();
  overtoneGain.gain.setValueAtTime(0, time);
  overtoneGain.gain.linearRampToValueAtTime(gain * 0.3, time + 0.02);
  overtoneGain.gain.exponentialRampToValueAtTime(0.001, time + durationSec * 0.6);
  overtone.connect(overtoneGain);
  overtoneGain.connect(destination);
  overtone.start(time);
  overtone.stop(time + durationSec * 0.6 + 0.05);
}

function playFanfare(pattern: { offset: number; freqHz: number; gain: number; duration?: number }[], volume: number, impactGain: number) {
  const ctx = getAudioContext();
  if (!ctx) return;
  ensureRunning(ctx);

  const master = createMasterBus(ctx, volume, 0.32, 2.2, 2.6);
  const now = ctx.currentTime;
  playImpactHit(ctx, master, now, impactGain);
  for (const note of pattern) {
    playFanfareNote(ctx, master, now + note.offset, note.freqHz, note.gain, note.duration ?? 1.1);
  }
}

// A punchy rising fourth-then-fifth, not a stepwise scale — reads as a
// quick "victory", not a doorbell. Still shorter/smaller than the
// milestone fanfare below.
const SESSION_FANFARE = [
  { offset: 0.05, freqHz: 392, gain: 0.4 }, // G4
  { offset: 0.16, freqHz: 587.33, gain: 0.46 }, // D5
  { offset: 0.28, freqHz: 783.99, gain: 0.55, duration: 1.3 }, // G5, held
];

// A bigger rising run that lands on a sustained octave — the rare, actually
// epic moment (an Ascent Ladder milestone), noticeably bigger than a
// routine session completion.
const MILESTONE_FANFARE = [
  { offset: 0.06, freqHz: 392, gain: 0.42 }, // G4
  { offset: 0.16, freqHz: 523.25, gain: 0.46 }, // C5
  { offset: 0.26, freqHz: 659.25, gain: 0.5 }, // E5
  { offset: 0.36, freqHz: 783.99, gain: 0.56, duration: 1.6 }, // G5, held
  { offset: 0.36, freqHz: 1046.5, gain: 0.42, duration: 1.6 }, // C6, landed together with the G5 as a sustained chord
];

export function playSessionCompleteChime(volume = 0.55) {
  playFanfare(SESSION_FANFARE, volume, 0.5);
}

export function playMilestoneChime(volume = 0.65) {
  playFanfare(MILESTONE_FANFARE, volume, 0.65);
}
