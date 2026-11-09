import { describe, it, expect } from 'vitest';
import type { StreamSet } from '../models/activityDetail';
import { stablePieces, kmPieces, readZone2Pieces, buildZone2Pieces, isStaleZone2Pieces } from './zone2Pieces';
import { buildRunDetail } from './runDetail';

// Nagemaakte reeksen, één punt per seconde. De hartslag volgt het doel met een vertraging
// (tijdconstante 40 s) en een kleine vaste schommeling, zodat een tempowissel echt tijd kost.
interface Part {
  min: number;
  speed: number; // m/s, 0 is stilstaan
  hr: number;
  grade?: number; // deel, positief bergop
}

function stream(parts: Part[], opts: { noHr?: boolean; noAlt?: boolean } = {}): StreamSet {
  const timeSec: number[] = [];
  const distanceM: number[] = [];
  const heartRate: number[] = [];
  const altitudeM: number[] = [];
  let d = 0;
  let alt = 50;
  let hr = 100;
  let t = 0;
  for (const part of parts) {
    for (let s = 0; s < part.min * 60; s++) {
      hr += (part.hr - hr) / 40;
      d += part.speed;
      alt += part.speed * (part.grade ?? 0);
      timeSec.push(t);
      distanceM.push(d);
      heartRate.push(Math.round(hr + 1.5 * Math.sin(t / 7)));
      altitudeM.push(alt);
      t++;
    }
  }
  return { timeSec, distanceM, ...(opts.noHr ? {} : { heartRate }), ...(opts.noAlt ? {} : { altitudeM }) };
}

const flatRun = (min: number, speed = 3, hr = 140): Part[] => [{ min, speed, hr }];

describe('stablePieces', () => {
  it('geeft één stuk voor een vlakke, rustige loop, vanaf minuut 10', () => {
    const pieces = stablePieces(stream(flatRun(40)));
    expect(pieces).toHaveLength(1);
    expect(pieces[0].startSec).toBe(600);
    expect(pieces[0].endSec).toBeGreaterThan(2300);
    expect(pieces[0].hr).toBeCloseTo(140, 0);
    expect(pieces[0].paceSecKm).toBeCloseTo(1000 / 3, 0);
    expect(pieces[0].flat).toBe(true);
    expect(pieces[0].from).toBe('stream');
  });

  it('telt de eerste 10 minuten nooit: een loop van 14 minuten geeft niets', () => {
    expect(stablePieces(stream(flatRun(14)))).toEqual([]);
  });

  it('knipt bij een versnelling en wacht daarna 3 minuten', () => {
    const pieces = stablePieces(stream([{ min: 20, speed: 3, hr: 140 }, { min: 5, speed: 3.6, hr: 160 }, { min: 20, speed: 3, hr: 140 }]));
    // Voor, tijdens (5 minuten, maar zonder 3 minuten om bij te komen te kort) en na.
    expect(pieces).toHaveLength(2);
    expect(pieces[0].endSec).toBeLessThanOrEqual(20 * 60 + 30);
    expect(pieces[1].startSec).toBeGreaterThanOrEqual(25 * 60 + 180);
  });

  it('laat te korte stukken weg: elke 4 minuten een ander tempo', () => {
    const parts: Part[] = [];
    for (let k = 0; k < 10; k++) parts.push(k % 2 ? { min: 4, speed: 3.5, hr: 152 } : { min: 4, speed: 2.8, hr: 136 });
    expect(stablePieces(stream(parts))).toEqual([]);
  });

  it('knipt bij een pauze van 30 seconden midden in', () => {
    const pieces = stablePieces(stream([{ min: 20, speed: 3, hr: 140 }, { min: 0.5, speed: 0, hr: 110 }, { min: 20, speed: 3, hr: 140 }]));
    expect(pieces).toHaveLength(2);
    expect(pieces[0].endSec).toBeLessThanOrEqual(20 * 60);
    expect(pieces[1].startSec).toBeGreaterThanOrEqual(20 * 60 + 30 + 180);
  });

  it('laat een heuvel van 5 procent weg en houdt de vlakke delen', () => {
    const pieces = stablePieces(stream([{ min: 20, speed: 3, hr: 140 }, { min: 6, speed: 2.5, hr: 150, grade: 0.05 }, { min: 20, speed: 3, hr: 140 }]));
    for (const p of pieces) expect(p.endSec <= 20 * 60 + 30 || p.startSec >= 26 * 60).toBe(true);
    expect(pieces.length).toBeGreaterThanOrEqual(1);
  });

  it('geeft niets bij een loop die alleen heuvelachtig is', () => {
    const parts: Part[] = [];
    for (let k = 0; k < 12; k++) parts.push({ min: 4, speed: 3, hr: 145, grade: k % 2 ? -0.05 : 0.05 });
    expect(stablePieces(stream(parts))).toEqual([]);
  });

  it('rekent een licht glooiend stuk om naar vlak tempo', () => {
    const parts: Part[] = [{ min: 12, speed: 3, hr: 140 }];
    // Bij gelijke inspanning bergop iets trager en bergaf iets sneller (zoals Minetti het rekent).
    for (let k = 0; k < 6; k++) parts.push(k % 2 ? { min: 6, speed: 3.33, hr: 140, grade: -0.02 } : { min: 6, speed: 2.7, hr: 140, grade: 0.02 });
    const pieces = stablePieces(stream(parts));
    expect(pieces.length).toBeGreaterThanOrEqual(1);
    const hilly = pieces.filter((p) => !p.flat);
    expect(hilly.length).toBeGreaterThanOrEqual(1);
    // Omgerekend ligt het vlakke tempo dicht bij 5:33 per km, het echte tempo schommelt.
    for (const p of hilly) expect(Math.abs(p.paceSecKm / (1000 / 3) - 1)).toBeLessThan(0.03);
  });

  it('telt na minuut 60 niet als de hartslag bij hetzelfde tempo opliep (drift)', () => {
    const drift = stablePieces(stream([{ min: 60, speed: 3, hr: 140 }, { min: 30, speed: 3, hr: 150 }]));
    expect(drift.every((p) => p.endSec <= 60 * 60 + 30)).toBe(true);
    const steady = stablePieces(stream(flatRun(90)));
    expect(steady.some((p) => p.endSec > 80 * 60)).toBe(true);
  });

  it('geeft niets zonder hartslag', () => {
    expect(stablePieces(stream(flatRun(40), { noHr: true }))).toEqual([]);
  });

  it('werkt zonder hoogte: alles telt als vlak', () => {
    const pieces = stablePieces(stream(flatRun(40), { noAlt: true }));
    expect(pieces).toHaveLength(1);
    expect(pieces[0].flat).toBe(true);
  });
});

describe('kmPieces', () => {
  const run = stream([{ min: 20, speed: 3, hr: 140 }, { min: 5, speed: 3.6, hr: 160 }, { min: 25, speed: 3, hr: 140 }]);
  const rd = buildRunDetail(run, { logKm: 9.1, logMinutes: 50, builtAt: '', bestKm: null })!;

  it('geeft grof dezelfde stukken uit de kilometers, met from km', () => {
    const pieces = kmPieces(rd);
    expect(pieces.length).toBeGreaterThanOrEqual(1);
    expect(pieces.every((p) => p.from === 'km' && p.startSec >= 600)).toBe(true);
  });

  it('zelfde loop via reeks en via kilometers: tempo binnen 3 procent', () => {
    const fine = stablePieces(run);
    const rough = kmPieces(rd);
    const avg = (xs: { paceSecKm: number; distanceM: number }[]) => xs.reduce((s, x) => s + x.paceSecKm * x.distanceM, 0) / xs.reduce((s, x) => s + x.distanceM, 0);
    expect(Math.abs(avg(rough) / avg(fine) - 1)).toBeLessThan(0.03);
  });

  it('laat een km met pauze, zonder hartslag of met helling weg', () => {
    const km = (i: number, over: object = {}) => ({ index: i + 1, startM: i * 1000, endM: (i + 1) * 1000, distanceM: 1000, sec: 330, paceSecKm: 330, hrAvg: 140, gainM: 0, lossM: 0, ...over });
    const kms = [0, 1, 2, 3, 4, 5].map((i) => km(i));
    expect(kmPieces({ kms })).toHaveLength(1);
    expect(kmPieces({ kms: kms.map((k, i) => (i === 3 ? { ...k, pauseSec: 40 } : k)) })).toHaveLength(0);
    expect(kmPieces({ kms: kms.map((k, i) => (i === 3 ? { ...k, hrAvg: undefined } : k)) })).toHaveLength(0);
    expect(kmPieces({ kms: kms.map((k, i) => (i === 3 ? { ...k, gainM: 40 } : k)) })).toHaveLength(0);
  });
});

describe('bewaren en lezen', () => {
  it('leest een heel veld en laat een beschadigd veld vallen', () => {
    const z = buildZone2Pieces(stream(flatRun(40)), 7.2, 40, new Date('2026-11-09T08:00:00Z'));
    expect(readZone2Pieces(JSON.parse(JSON.stringify(z)))).toEqual(z);
    expect(readZone2Pieces({ ...z, version: 2 })).toBeUndefined();
    expect(readZone2Pieces({ ...z, pieces: [{ ...z.pieces[0], hr: 'x' }] })).toBeUndefined();
    expect(isStaleZone2Pieces(z, 7.2, 40)).toBe(false);
    expect(isStaleZone2Pieces(z, 7.5, 40)).toBe(true);
  });
});
