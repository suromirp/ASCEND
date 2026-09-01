// A short, synthesised percussion hit for app open — pitched toms + a
// filtered-noise mallet transient, run through a procedurally generated
// "hall" impulse response for a bit of size. No audio file: everything
// here is generated at runtime with the Web Audio API, so there's nothing
// to license or ship as an asset.
//
// This is a sound *effect*, not a music track — Web Audio synthesis alone
// can't produce a layered, melodic soundtrack. Expect a few percussive
// thuds, not a cinematic score.

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

// A synthetic reverb impulse: exponentially-decaying white noise. Cheaper
// and license-free compared to shipping a recorded impulse-response file,
// and plenty convincing for a one-second decay tail.
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
const PATTERN: { offset: number; pitch: number; gain: number }[] = [
  { offset: 0, pitch: 72, gain: 0.55 },
  { offset: 0.26, pitch: 68, gain: 0.5 },
  { offset: 0.5, pitch: 68, gain: 0.5 },
  { offset: 0.74, pitch: 62, gain: 0.75 },
  { offset: 1.12, pitch: 54, gain: 1 },
];

export function playIntroDrums(volume = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  master.connect(convolver);
  convolver.connect(wet);
  wet.connect(ctx.destination);

  const now = ctx.currentTime;
  for (const hit of PATTERN) {
    playDrumHit(ctx, master, now + hit.offset, hit.pitch, hit.gain);
  }
}

// Browsers refuse to autoplay audio before the user has interacted with
// the page — there's no way around that from app code. This wires up a
// one-time listener on the very first pointer/key interaction after
// launch (whichever the user actually does first, typically while the
// splash screen or the first real screen is still on-screen) and plays
// the intro then, instead of failing silently on load.
export function playIntroDrumsOnFirstInteraction(enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return () => {};

  let played = false;
  function handler() {
    if (played) return;
    played = true;
    playIntroDrums();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
  }

  window.addEventListener('pointerdown', handler, { once: true });
  window.addEventListener('keydown', handler, { once: true });

  return () => {
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
  };
}
