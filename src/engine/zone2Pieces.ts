// ASCEND: de stabiele, vlakke stukken van een loop, voor "tempo bij zone 2".
//
// docs/onderzoek/Tempo bij zone 2, stabiele stukken.md, hoofdstuk 1, 2, 4 en 5; drempels in
// engine/zone2Rules.ts; besluit docs/beslissingen/2026-11-09-tempo-stabiele-stukken.md.
//
// Niet één gemiddelde per loop, maar elk stuk waarin hart en benen in een vaste toestand
// zaten: minstens 5 minuten zonder pauze, vanaf minuut 10, 3 minuten na een tempowissel of
// pauze, hartslag en vlak tempo na 30 seconden gladstrijken binnen een smalle band, zonder
// steil stukje en met een kleine gemiddelde helling. Na minuut 60 telt een stuk alleen als de
// drift tot dan klein bleef. Zones komen er hier niet aan te pas: welk stuk in zone 2 ligt,
// en wat er na een zware herhaling wegvalt, bepaalt engine/aerobicTrend.ts bij het lezen.
//
// `stablePieces` leest de volledige reeks, `kmPieces` grof de bewaarde kilometers als er geen
// reeks is. Zelfde uitkomsttype, met `from`.
//
// Puur: geen React, geen IndexedDB.

import type { StreamSet } from '../models/activityDetail';
import type { RunDetail, RunKm } from '../models/runDetail';
import type { Zone2Piece, Zone2Pieces } from '../models/zone2Pieces';
import { deadBand, fillGaps, ALTITUDE_DEAD_BAND_M } from './activityDetail';
import { alignedPoints, minettiCost, pausePerSegment, type Pt } from './runDetail';
import { ZONE2_RULES as R } from './zone2Rules';
import { median } from '../utils/stats';
import { isNum } from '../utils/guards';

// Onder deze snelheid staat een loper stil (zoals engine/runDetail.ts).
const STILL_MS = 0.5;
// Het vlakke tempo wordt over stapjes van minstens zoveel meter gelezen (zoals Run in detail).
const MINETTI_STEP_M = 25;
// Voor de helling per 30-secondenwaarde kijk je zoveel seconden voor en na mee.
const GRADE_PAD_SEC = 60;

interface Bin {
  pause: boolean;
  steep: boolean;
  hr?: number;
  speed: number;
  flatSpeed: number;
}

interface Track {
  p: Pt[];
  // De hoogte na de dode band (zoals Run in detail), voor stijging, daling en het vlakke tempo van een stuk.
  alt?: number[];
  // De hoogte zonder dode band, alleen gaten gevuld: voor de helling per 30 seconden, want de
  // dode band laat een glooiing van een paar meter pas laat zien.
  slope?: number[];
  t0: number;
}

function interp(p: Pt[], values: number[], t: number): number {
  if (t <= p[0].t) return values[0];
  const last = p.length - 1;
  if (t >= p[last].t) return values[last];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const f = (t - p[lo].t) / (p[hi].t - p[lo].t);
  return values[lo] + f * (values[hi] - values[lo]);
}

function binsOf(set: StreamSet, tr: Track): Bin[] {
  const { p, alt, slope, t0 } = tr;
  const n = Math.floor((p[p.length - 1].t - t0) / R.smoothSec);
  const dist = p.map((q) => q.d);
  const pauseSeg = pausePerSegment(p);
  const bins: Bin[] = [];
  const pauseBin: boolean[] = new Array(n).fill(false);
  for (let k = 0; k < pauseSeg.length; k++) {
    if (pauseSeg[k] <= 0) continue;
    const a = Math.max(0, Math.floor((p[k].t - t0) / R.smoothSec));
    const b = Math.min(n - 1, Math.floor((p[k + 1].t - t0 - 1e-9) / R.smoothSec));
    for (let m = a; m <= b; m++) pauseBin[m] = true;
  }
  // Steile stukjes: over elk venster van 200 m de helling.
  const steepMark: number[] = new Array(n + 1).fill(0);
  if (alt) {
    let j = 0;
    for (let k = 0; k < p.length; k++) {
      while (j < p.length && p[j].d - p[k].d < R.steepWindowM) j++;
      if (j >= p.length) break;
      const g = Math.abs(alt[j] - alt[k]) / (p[j].d - p[k].d);
      if (g > R.steepGrade) {
        const a = Math.max(0, Math.floor((p[k].t - t0) / R.smoothSec));
        const b = Math.min(n - 1, Math.floor((p[j].t - t0) / R.smoothSec));
        if (a <= b) {
          steepMark[a]++;
          steepMark[b + 1]--;
        }
      }
    }
  }
  const hrSum: number[] = new Array(n).fill(0);
  const hrCount: number[] = new Array(n).fill(0);
  if (set.heartRate) {
    for (const q of p) {
      const k = Math.floor((q.t - t0) / R.smoothSec);
      const v = set.heartRate[q.i];
      if (k < n && isNum(v) && v > 0) {
        hrSum[k] += v;
        hrCount[k]++;
      }
    }
  }
  const flat = minettiCost(0);
  let steepRun = 0;
  for (let k = 0; k < n; k++) {
    steepRun += steepMark[k];
    const ta = t0 + k * R.smoothSec;
    const tb = ta + R.smoothSec;
    const dd = interp(p, dist, tb) - interp(p, dist, ta);
    const speed = dd / R.smoothSec;
    // De helling over een ruimer venster: de hoogte na de dode band gaat in trapjes.
    const wa = ta - GRADE_PAD_SEC;
    const wb = tb + GRADE_PAD_SEC;
    const wd = interp(p, dist, wb) - interp(p, dist, wa);
    const grade = slope && wd > 0 ? (interp(p, slope, wb) - interp(p, slope, wa)) / wd : 0;
    bins.push({
      pause: pauseBin[k],
      steep: steepRun > 0,
      ...(hrCount[k] > 0 ? { hr: hrSum[k] / hrCount[k] } : {}),
      speed,
      flatSpeed: speed * (minettiCost(grade) / flat),
    });
  }
  return bins;
}

const usable = (b: Bin) => !b.pause && !b.steep && b.hr !== undefined && b.speed >= STILL_MS;

interface Centre {
  hr: number;
  speed: number;
}

function centreOf(bins: Bin[], a: number, b: number): Centre {
  const xs = bins.slice(a, b);
  return { hr: median(xs.map((x) => x.hr!)), speed: median(xs.map((x) => x.flatSpeed)) };
}

const inBand = (x: Bin, c: Centre) => Math.abs(x.hr! - c.hr) <= R.hrBandBpm && Math.abs(x.flatSpeed / c.speed - 1) <= R.paceBand;

function stable(bins: Bin[], a: number, b: number): boolean {
  const c = centreOf(bins, a, b);
  let out = 0;
  for (let k = a; k < b; k++) if (!inBand(bins[k], c)) out++;
  return out <= Math.floor((1 - R.withinShare) * (b - a) + 1e-9);
}

// Of de hartslag aan het begin van een stuk al bij was: de 3 minuten ervoor zonder pauze, en
// gemiddeld in dezelfde band voor tempo en hartslag.
function settled(bins: Bin[], a: number, c: Centre): boolean {
  const n = Math.round(R.settleSec / R.smoothSec);
  if (a - n < 0) return false;
  const before = bins.slice(a - n, a);
  if (before.some((x) => x.pause || x.hr === undefined)) return false;
  const hr = before.reduce((s, x) => s + x.hr!, 0) / n;
  const speed = before.reduce((s, x) => s + x.flatSpeed, 0) / n;
  return Math.abs(hr - c.hr) <= R.hrBandBpm && Math.abs(speed / c.speed - 1) <= R.paceBand;
}

// Stabiele stukken als reeksen 30-secondenwaarden [a, b).
function segmentsOf(bins: Bin[]): [number, number][] {
  const first = Math.ceil(R.startAfterSec / R.smoothSec);
  const minBins = Math.round(R.minPieceSec / R.smoothSec);
  const settleBins = Math.round(R.settleSec / R.smoothSec);
  const out: [number, number][] = [];
  let i = first;
  while (i < bins.length) {
    if (!usable(bins[i])) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < bins.length && usable(bins[j]) && stable(bins, i, j + 1)) j++;
    // Waarden aan het eind buiten de band horen al bij wat erna komt.
    let end = j;
    while (end - i > 1 && !inBand(bins[end - 1], centreOf(bins, i, end))) end--;
    const start = settled(bins, i, centreOf(bins, i, end)) ? i : i + settleBins;
    if (end - start >= minBins) out.push([start, end]);
    i = Math.max(end, i + 1);
  }
  return out;
}

function pieceOf(tr: Track, bins: Bin[], a: number, b: number): Zone2Piece | undefined {
  const { p, alt, t0 } = tr;
  const ta = t0 + a * R.smoothSec;
  const tb = t0 + b * R.smoothSec;
  const dist = p.map((q) => q.d);
  const distanceM = interp(p, dist, tb) - interp(p, dist, ta);
  if (distanceM <= 0) return undefined;
  const sec = (b - a) * R.smoothSec;
  let paceSecKm = (sec / distanceM) * 1000;
  let flat = true;
  let gradePct = 0;
  if (alt) {
    // De punten binnen het stuk, met de randen erbij.
    const ds: number[] = [interp(p, dist, ta)];
    const hs: number[] = [interp(p, alt, ta)];
    for (let k = 0; k < p.length; k++) {
      if (p[k].t > ta && p[k].t < tb) {
        ds.push(p[k].d);
        hs.push(alt[k]);
      }
    }
    ds.push(interp(p, dist, tb));
    hs.push(interp(p, alt, tb));
    let gain = 0;
    let loss = 0;
    for (let k = 1; k < hs.length; k++) {
      const dh = hs[k] - hs[k - 1];
      if (dh > 0) gain += dh;
      else loss -= dh;
    }
    gradePct = ((hs[hs.length - 1] - hs[0]) / distanceM) * 100;
    const perKm = 1000 / distanceM;
    if (gain * perKm >= R.flatMetresPerKm || loss * perKm >= R.flatMetresPerKm) {
      const cost0 = minettiCost(0);
      let equivalent = 0;
      let k = 0;
      while (k < ds.length - 1) {
        let j = k + 1;
        while (j < ds.length - 1 && ds[j] - ds[k] < MINETTI_STEP_M) j++;
        const dd = ds[j] - ds[k];
        if (dd > 0) equivalent += dd * (minettiCost((hs[j] - hs[k]) / dd) / cost0);
        k = j;
      }
      if (equivalent > 0) {
        paceSecKm = (sec / equivalent) * 1000;
        flat = false;
      }
    }
  }
  const hr = median(bins.slice(a, b).map((x) => x.hr!));
  return rounded({ from: 'stream', startSec: a * R.smoothSec, endSec: b * R.smoothSec, sec, distanceM, hr, paceSecKm, flat, gradePct });
}

// Wat bewaard wordt, afgerond: genoeg voor een trend, klein in de back-up.
const r1 = (n: number) => Math.round(n * 10) / 10 + 0;
function rounded(x: Zone2Piece): Zone2Piece {
  return { ...x, distanceM: Math.round(x.distanceM), sec: Math.round(x.sec), hr: r1(x.hr), paceSecKm: r1(x.paceSecKm), gradePct: Math.round(x.gradePct * 100) / 100 + 0 };
}

// Tempo per slag: hoe meer meters per slag, hoe zuiniger.
const economy = (x: Pick<Zone2Piece, 'paceSecKm' | 'hr'>) => 1000 / x.paceSecKm / x.hr;

// Na minuut 60 alleen wat binnen de drift blijft; een stuk over minuut 60 heen wordt daar geknipt.
function withinDrift<T extends Zone2Piece>(pieces: T[], split: (piece: T, atSec: number) => [T | undefined, T | undefined]): T[] {
  if (pieces.length === 0) return pieces;
  const out: T[] = [];
  let ref: number | undefined;
  for (const piece of pieces) {
    const [head, tail] = piece.startSec >= R.driftFromSec ? [undefined, piece] : piece.endSec > R.driftFromSec ? split(piece, R.driftFromSec) : [piece, undefined];
    if (head) {
      ref ??= economy(head);
      out.push(head);
    }
    if (tail) {
      ref ??= economy(tail);
      if (economy(tail) >= ref * (1 - R.maxDrift)) out.push(tail);
    }
  }
  return out;
}

export function stablePieces(set: StreamSet): Zone2Piece[] {
  const p = alignedPoints(set);
  if (p.length < 3 || !set.heartRate || !set.heartRate.some(isNum)) return [];
  let alt: number[] | undefined;
  let slope: number[] | undefined;
  if (set.altitudeM && set.altitudeM.some(isNum)) {
    const times = p.map((q) => q.t);
    const filled = fillGaps(p.map((q) => set.altitudeM![q.i]), times, 30);
    if (filled && filled.some(isNum)) {
      alt = deadBand(filled, ALTITUDE_DEAD_BAND_M);
      let last = filled.find(isNum)!;
      slope = filled.map((v) => (last = isNum(v) ? v : last));
    }
  }
  const tr: Track = { p, alt, slope, t0: p[0].t };
  const bins = binsOf(set, tr);
  const minBins = Math.round(R.minPieceSec / R.smoothSec);
  const pieces = segmentsOf(bins)
    .map(([a, b]) => pieceOf(tr, bins, a, b))
    .filter((x): x is Zone2Piece => !!x && Math.abs(x.gradePct) <= R.maxNetGrade * 100);
  const cutBin = Math.round(R.driftFromSec / R.smoothSec);
  return withinDrift(pieces, (piece) => {
    const a = piece.startSec / R.smoothSec;
    const b = piece.endSec / R.smoothSec;
    const head = cutBin - a >= minBins ? pieceOf(tr, bins, a, cutBin) : undefined;
    const tail = b - cutBin >= minBins ? pieceOf(tr, bins, cutBin, b) : undefined;
    return [head, tail];
  });
}

// --- grof, uit de bewaarde kilometers ---------------------------------------------------------

interface KmAt {
  km: RunKm;
  startSec: number;
  endSec: number;
  pace: number;
  flat: boolean;
}

export function kmPieces(rd: Pick<RunDetail, 'kms'>): Zone2Piece[] {
  // Begin en eind van elke km in seconden sinds de start, pauzes meegeteld.
  let t = 0;
  const kms: (KmAt | undefined)[] = rd.kms.map((km) => {
    const startSec = t;
    t += km.sec + (km.pauseSec ?? 0);
    const climb = Math.max(km.gainM ?? 0, km.lossM ?? 0);
    const flat = (km.gainM ?? 0) < R.flatMetresPerKm && (km.lossM ?? 0) < R.flatMetresPerKm;
    const net = Math.abs((km.gainM ?? 0) - (km.lossM ?? 0)) / km.distanceM;
    // Een km met een pauze, zonder hartslag, deels of met te veel helling doet niet mee.
    if (km.partial || km.hrAvg === undefined || (km.pauseSec ?? 0) > 0 || climb / km.distanceM > R.maxNetGrade || net > R.maxNetGrade) return undefined;
    return { km, startSec, endSec: t, pace: flat ? km.paceSecKm : km.gapSecKm ?? km.paceSecKm, flat };
  });
  const fits = (group: KmAt[]) => {
    const pace = median(group.map((g) => g.pace));
    const hr = median(group.map((g) => g.km.hrAvg!));
    return group.every((g) => Math.abs(pace / g.pace - 1) <= R.paceBand && Math.abs(g.km.hrAvg! - hr) <= R.hrBandBpm);
  };
  const groups: KmAt[][] = [];
  let i = 0;
  while (i < kms.length) {
    const first = kms[i];
    if (!first || first.startSec < R.startAfterSec) {
      i++;
      continue;
    }
    const group = [first];
    let j = i + 1;
    while (j < kms.length && kms[j] && fits([...group, kms[j]!])) group.push(kms[j++]!);
    // Na een tempowissel of een pauze is de eerste km nog oplopen.
    const prev = kms[i - 1];
    const pace = median(group.map((g) => g.pace));
    const shifted = !prev || Math.abs(pace / prev.pace - 1) > R.paceBand;
    const usableGroup = shifted ? group.slice(1) : group;
    if (usableGroup.length >= R.minKms) groups.push(usableGroup);
    i = j;
  }
  const pieces = groups.map((g) => pieceOfKms(g));
  return withinDrift(pieces, (piece, at) => {
    const g = groups[pieces.indexOf(piece)];
    const head = g.filter((k) => k.startSec < at);
    const tail = g.filter((k) => k.startSec >= at);
    return [head.length >= R.minKms ? pieceOfKms(head) : undefined, tail.length >= R.minKms ? pieceOfKms(tail) : undefined];
  });
}

function pieceOfKms(g: KmAt[]): Zone2Piece {
  const distanceM = g.reduce((s, k) => s + k.km.distanceM, 0);
  const sec = g.reduce((s, k) => s + k.km.sec, 0);
  const paceSecKm = g.reduce((s, k) => s + k.pace * k.km.distanceM, 0) / distanceM;
  const hr = g.reduce((s, k) => s + k.km.hrAvg! * k.km.distanceM, 0) / distanceM;
  const net = g.reduce((s, k) => s + (k.km.gainM ?? 0) - (k.km.lossM ?? 0), 0);
  return rounded({ from: 'km', startSec: g[0].startSec, endSec: g[g.length - 1].endSec, sec, distanceM, hr, paceSecKm, flat: g.every((k) => k.flat), gradePct: (net / distanceM) * 100 });
}

// --- bewaren ---------------------------------------------------------------------------------

export function buildZone2Pieces(set: StreamSet, wholeKm: number, wholeMinutes: number, now: Date = new Date()): Zone2Pieces {
  return { version: 1, wholeKm, wholeMinutes, builtAt: now.toISOString(), pieces: stablePieces(set) };
}

export function isStaleZone2Pieces(z: Pick<Zone2Pieces, 'wholeKm' | 'wholeMinutes'>, km: number, minutes: number): boolean {
  return Math.abs(z.wholeKm - km) > 0.005 || Math.abs(z.wholeMinutes - minutes) > 0.05;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function readPiece(raw: unknown): Zone2Piece | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (r.from !== 'stream' && r.from !== 'km') return undefined;
  if (!finite(r.startSec) || !finite(r.endSec) || !finite(r.sec) || !finite(r.distanceM) || !finite(r.hr) || !finite(r.paceSecKm) || !finite(r.gradePct) || typeof r.flat !== 'boolean') return undefined;
  if (r.startSec < 0 || r.endSec <= r.startSec || r.sec <= 0 || r.distanceM <= 0 || r.hr <= 0 || r.paceSecKm <= 0) return undefined;
  return { from: r.from, startSec: r.startSec, endSec: r.endSec, sec: r.sec, distanceM: r.distanceM, hr: r.hr, paceSecKm: r.paceSecKm, flat: r.flat, gradePct: r.gradePct };
}

// Een bewaard veld zoals het te geloven is: heel, of niet. Velden die de lezer niet kent vallen weg.
export function readZone2Pieces(raw: unknown): Zone2Pieces | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1 || !finite(r.wholeKm) || !finite(r.wholeMinutes) || typeof r.builtAt !== 'string' || !Array.isArray(r.pieces) || r.pieces.length > 500) return undefined;
  const pieces = r.pieces.map(readPiece);
  if (pieces.some((x) => !x)) return undefined;
  return { version: 1, wholeKm: r.wholeKm, wholeMinutes: r.wholeMinutes, builtAt: r.builtAt, pieces: pieces as Zone2Piece[] };
}
