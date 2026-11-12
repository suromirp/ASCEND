// Nagemaakte hoogtereeksen voor de tests van engine/elevation.ts: één meting per seconde, vaste
// ruis, niets van een echte persoon of een echte plek. De vorm doet een vlakke loop en een
// heuvellus na zoals een horloge met barometer ze opschrijft: een trage golf met kleine rimpels.

export interface SeriesSpec {
  minutes: number;
  // Trage golven: elk een uitslag in meters (van midden tot top) en een periode in minuten.
  waves: { amplitudeM: number; periodMin: number; phase?: number }[];
  // Rimpel van de barometer in meters (van midden tot top), traag over ongeveer 20 seconden.
  rippleM?: number;
  seed?: number;
}

function noise(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}

export function makeAltitude(spec: SeriesSpec): { timeSec: number[]; altitudeM: number[] } {
  const rand = noise(spec.seed ?? 11);
  const n = spec.minutes * 60;
  const timeSec: number[] = [];
  const altitudeM: number[] = [];
  // De rimpel: om de 20 seconden een nieuw doel, daartussen een rechte lijn.
  let from = 0;
  let to = (spec.rippleM ?? 0) * rand();
  for (let i = 0; i <= n; i++) {
    if (i > 0 && i % 20 === 0) {
      from = to;
      to = (spec.rippleM ?? 0) * rand();
    }
    const ripple = from + ((to - from) * (i % 20)) / 20;
    let alt = 20;
    for (const w of spec.waves) alt += w.amplitudeM * Math.sin((2 * Math.PI * i) / (w.periodMin * 60) + (w.phase ?? 0));
    timeSec.push(i);
    // Een horloge schrijft de hoogte op in stappen van 0,2 m.
    altitudeM.push(Math.round((alt + ripple) * 5) / 5);
  }
  return { timeSec, altitudeM };
}

// Zes lopen: vijf vlakke van ruim een half uur tot een uur en één heuvellus.
export const SIX_RUNS: { name: string; spec: SeriesSpec }[] = [
  { name: 'vlak 1', spec: { minutes: 32, waves: [{ amplitudeM: 3, periodMin: 16 }, { amplitudeM: 1.2, periodMin: 5, phase: 1 }], rippleM: 0.5, seed: 3 } },
  { name: 'vlak 2', spec: { minutes: 40, waves: [{ amplitudeM: 4, periodMin: 20 }, { amplitudeM: 1.5, periodMin: 6, phase: 2 }], rippleM: 0.5, seed: 5 } },
  { name: 'vlak 3', spec: { minutes: 45, waves: [{ amplitudeM: 5, periodMin: 22 }, { amplitudeM: 1.6, periodMin: 7 }], rippleM: 0.6, seed: 8 } },
  { name: 'vlak 4', spec: { minutes: 52, waves: [{ amplitudeM: 6, periodMin: 26 }, { amplitudeM: 1.4, periodMin: 4, phase: 0.5 }], rippleM: 0.5, seed: 13 } },
  { name: 'vlak 5', spec: { minutes: 58, waves: [{ amplitudeM: 4.5, periodMin: 29 }, { amplitudeM: 1.8, periodMin: 8, phase: 3 }], rippleM: 0.6, seed: 21 } },
  { name: 'heuvellus', spec: { minutes: 50, waves: [{ amplitudeM: 13, periodMin: 10 }, { amplitudeM: 2, periodMin: 3, phase: 1 }], rippleM: 0.6, seed: 34 } },
];
