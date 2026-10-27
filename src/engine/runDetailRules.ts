// ASCEND: what the kilometres of a run say, in few words.
//
// The rules RD-4 (the spread of the pace), RD-5 (the advice for the next test), RD-6 (what
// played a part), RD-7 (blocks and repeats) and the facts about heart rate and form of
// docs/onderzoek/Run in detail.md. They read `RunDetail` (models/runDetail.ts) and nothing
// else. A kilometre swings about 3 percent on the GPS alone, so a difference counts only
// from 4 to 5 percent; below that this file says nothing. Every threshold marked "eigen
// aanname" in the research is to be tuned on the owner's own data after a few tests.
//
// Never a promise: no text says "dan loop je sneller" or gives a time. Never a diagnosis.
//
// Pure: no React, no IndexedDB.

import type { DetailConditions } from '../models/activityDetail';
import type { RunDetail, RunKm, RunLap } from '../models/runDetail';
import { formatPace } from './aerobicTrend';
import { LONG_RUN_SEC, NOISE, type NotAvailable } from './runMetrics';

// --- thresholds (the research, hoofdstuk 4 and 10) ------------------------------------------

export const PACING = {
  // The first kilometre this much faster than the mean: a fast start (percent).
  fastStartPct: 4,
  // The second half this much slower (or faster) than the first (percent).
  halfPct: 2,
  // No kilometre further than this from the mean for "gelijkmatig" (percent).
  evenKmPct: 4,
  // From the third kilometre on, this much slower than the mean: sagging (percent).
  sagPct: 5,
  // The last kilometre this much faster than the mean: something left (percent).
  strongFinishPct: 4,
  // Wind against you at chest height that can explain a slow kilometre (km/h).
  windKmh: 15,
  // Climb in a kilometre that can explain a slow one (metres).
  climbM: 10,
  // A piece shorter than this is not a kilometre for the spread (metres).
  fullKmM: 900,
} as const;

// The advice only comes with at least this much difference with the first kilometre (seconds).
export const ADVICE_MIN_SEC = 10;
export const ADVICE_STEP_SEC = 5;
// A block that is this much slower than the first one is a fact (percent).
export const BLOCK_FADE_PCT = 4;
// Under this many metres a repeat is too short for a pace (the GPS is too coarse).
export const MIN_REPEAT_M = 400;
// Warm-up that is seen in the series (minutes of running before the test stretch).
export const WARMUP_MIN = 8;
// Feels-like temperature from which warmth is a fact (degrees).
export const WARM_FEELS_C = 20;
// Climb per kilometre that makes a route hilly (metres).
export const HILLY_M_PER_KM = 10;
// Wind that can colour a whole test, from runComparison.ts (km/h).
export const WIND_MEAN_KMH = 25;
export const WIND_GUST_KMH = 40;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const pct = (a: number, b: number) => ((a - b) / b) * 100;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const secs = (n: number) => `${Math.round(n)} ${Math.round(n) === 1 ? 'seconde' : 'seconden'}`;

// --- RD-4: the spread of the pace ---------------------------------------------------------------

export type PacingWord = 'gelijkmatig' | 'te snel begonnen' | 'ingezakt' | 'sterker geëindigd';

export interface Pacing {
  // The one word; absent when the run is in none of the four (then only the numbers speak).
  word?: PacingWord;
  // Number of kilometres it was read on.
  n: number;
  // The first kilometre against the mean, percent faster (positive) or slower.
  firstFastPct: number;
  // The second half against the first, percent slower (positive) or faster.
  halfSlowPct: number;
  // The last kilometre against the mean, percent faster.
  lastFastPct: number;
  // The first kilometre that sagged (from the third on), with how much, percent slower.
  sag?: { km: number; pct: number };
  // Slow kilometres that the wind or the slope explains: said as such, not called sagging.
  explained?: { kms: number[]; by: 'wind' | 'helling' };
  // Seconds per kilometre: the mean, the first kilometre, the last.
  meanPace: number;
  firstPace: number;
  lastPace: number;
}

const fullKms = (kms: RunKm[]) => kms.filter((k) => k.distanceM >= PACING.fullKmM);

// The word for the spread of the pace over these kilometres (for a test: the five kilometres
// of its best stretch). Undefined with fewer than three full kilometres.
export function pacingOf(kmsIn: RunKm[]): Pacing | undefined {
  const kms = fullKms(kmsIn);
  if (kms.length < 3) return undefined;
  const meanPace = kms.reduce((n, k) => n + k.sec, 0) / kms.reduce((n, k) => n + k.distanceM / 1000, 0);
  const half = Math.floor(kms.length / 2);
  const firstHalf = mean(kms.slice(0, half).map((k) => k.paceSecKm));
  const secondHalf = mean(kms.slice(kms.length - half).map((k) => k.paceSecKm));
  const firstPace = kms[0].paceSecKm;
  const lastPace = kms[kms.length - 1].paceSecKm;
  const firstFastPct = pct(meanPace, firstPace);
  const halfSlowPct = pct(secondHalf, firstHalf);
  const lastFastPct = pct(meanPace, lastPace);

  // Slow kilometres from the third on, and whether wind or slope accounts for them.
  const slow = kms.map((k, i) => ({ k, i, pct: pct(k.paceSecKm, meanPace) })).filter((x) => x.i >= 2 && x.pct >= PACING.sagPct);
  const windy = (k: RunKm) => (k.headwindKmh ?? 0) >= PACING.windKmh;
  const steep = (k: RunKm) => (k.gainM ?? 0) >= PACING.climbM;
  const unexplained = slow.filter((x) => !windy(x.k) && !steep(x.k));
  const explainedList = slow.filter((x) => windy(x.k) || steep(x.k));

  const out: Pacing = { n: kms.length, firstFastPct, halfSlowPct, lastFastPct, meanPace, firstPace, lastPace };
  if (unexplained.length > 0) out.sag = { km: unexplained[0].k.index, pct: unexplained[0].pct };
  if (explainedList.length > 0 && unexplained.length === 0) {
    out.explained = { kms: explainedList.map((x) => x.k.index), by: explainedList.every((x) => windy(x.k)) ? 'wind' : 'helling' };
  }

  const worstKm = Math.max(...kms.map((k) => Math.abs(pct(k.paceSecKm, meanPace))));
  if (firstFastPct >= PACING.fastStartPct && halfSlowPct >= PACING.halfPct) out.word = 'te snel begonnen';
  else if (out.sag) out.word = 'ingezakt';
  else if (halfSlowPct <= -PACING.halfPct) out.word = 'sterker geëindigd';
  else if (Math.abs(halfSlowPct) < PACING.halfPct && worstKm <= PACING.evenKmPct && !out.explained) out.word = 'gelijkmatig';
  return out;
}

// --- RD-5: the advice for the next time -----------------------------------------------------------

export interface Advice {
  kind: 'fast-start' | 'sagged' | 'had-more' | 'even';
  text: string;
}

const roundUpTo = (n: number, step: number) => Math.ceil(n / step - 1e-9) * step;
const SLOGAN = 'Gelijkmatig lopen is meestal het snelst.';

// One piece of advice, never a time and never a promise. "Gelijkmatig gelopen." when there is
// nothing to say. Undefined when the spread says nothing clear.
export function nextTimeAdvice(p: Pacing | undefined): Advice | undefined {
  if (!p || !p.word) return undefined;
  if (p.word === 'gelijkmatig') return { kind: 'even', text: 'Gelijkmatig gelopen.' };
  if (p.word === 'te snel begonnen') {
    const target = roundUpTo(p.meanPace, ADVICE_STEP_SEC);
    const diff = target - p.firstPace;
    // Under the noise of the GPS this stays quiet.
    if (diff < ADVICE_MIN_SEC) return undefined;
    return {
      kind: 'fast-start',
      text: `Begin de volgende test op ${formatPace(target)} per km, dat is ${secs(diff)} per km rustiger dan je eerste kilometer vandaag. ${SLOGAN}`,
    };
  }
  if (p.word === 'ingezakt' && p.sag) {
    return { kind: 'sagged', text: `Je zakte vanaf km ${p.sag.km} in. Begin de volgende keer ${secs(ADVICE_STEP_SEC)} per km rustiger.` };
  }
  if (p.word === 'sterker geëindigd' && p.lastFastPct >= PACING.strongFinishPct) {
    return { kind: 'had-more', text: `Je had nog over. Je mag de volgende keer ${secs(ADVICE_STEP_SEC)} per km sneller beginnen.` };
  }
  return undefined;
}

// The sentence that says what the spread was, with the numbers; for the sheet. Plain facts.
export function pacingSentence(p: Pacing | undefined): string | undefined {
  if (!p?.word) return undefined;
  const firstSec = Math.round(p.meanPace - p.firstPace);
  switch (p.word) {
    case 'gelijkmatig':
      return 'Je tempo bleef gelijk: de tweede helft wijkt minder dan 2 procent af van de eerste.';
    case 'te snel begonnen':
      return `Je eerste kilometer was ${secs(Math.abs(firstSec))} per km sneller dan je gemiddelde en de tweede helft ging ${Math.round(p.halfSlowPct)} procent trager dan de eerste.`;
    case 'ingezakt':
      return `Vanaf km ${p.sag?.km} werd je ${Math.round(p.sag?.pct ?? 0)} procent trager dan je gemiddelde.`;
    case 'sterker geëindigd':
      return `De tweede helft ging ${Math.round(Math.abs(p.halfSlowPct))} procent sneller dan de eerste.`;
  }
}

// What the wind or the slope explains, in one plain sentence; undefined when nothing does.
export function explainedSentence(p: Pacing | undefined): string | undefined {
  if (!p?.explained) return undefined;
  const list = p.explained.kms;
  const where = list.length === 1 ? `km ${list[0]}` : `km ${list.slice(0, -1).join(', ')} en ${list[list.length - 1]}`;
  return p.explained.by === 'wind' ? `De tegenwind op ${where} kan het tragere tempo daar verklaren.` : `De klim op ${where} kan het tragere tempo daar verklaren.`;
}

// --- RD-7: blocks and repeats ---------------------------------------------------------------------------

export interface BlockFade {
  // Seconds per kilometre the last block was slower than the first, and in percent.
  slowerSec: number;
  slowerPct: number;
  blocks: number;
}

// The work blocks of a tempo run or an interval training: the last against the first. A
// block under MIN_REPEAT_M has no pace worth comparing, so such a training says nothing.
export function blockFade(laps: RunLap[] | undefined): BlockFade | undefined {
  const work = (laps ?? []).filter((l) => l.kind === 'work' && isNum(l.paceSecKm));
  if (work.length < 2 || work.some((l) => l.distanceM < MIN_REPEAT_M)) return undefined;
  const first = work[0].paceSecKm as number;
  const last = work[work.length - 1].paceSecKm as number;
  const slowerPct = pct(last, first);
  if (slowerPct < BLOCK_FADE_PCT) return undefined;
  return { slowerSec: last - first, slowerPct, blocks: work.length };
}

export function blockFadeSentence(f: BlockFade | undefined): string | undefined {
  return f ? `Het laatste blok was ${secs(f.slowerSec)} per km trager dan het eerste.` : undefined;
}

// The recovery between repeats as a fact: the fall of the heart rate in the first minute.
export function recoveryFacts(laps: RunLap[] | undefined): { lap: number; dropBpm: number }[] {
  return (laps ?? []).filter((l) => l.kind === 'recovery' && isNum(l.hrDropFirstMinute)).map((l) => ({ lap: l.index, dropBpm: l.hrDropFirstMinute as number }));
}

// --- the one line after a hard training --------------------------------------------------------------------

export type PacingLineKind = 'test' | 'blocks';

// The one line a test, race, tempo run or interval training gets after it (the research,
// hoofdstuk 9): the advice for a test, the fade of the last block for blocks. Undefined when
// it would be under the noise.
export function pacingLine(rd: RunDetail | undefined, kind: PacingLineKind): string | undefined {
  if (!rd) return undefined;
  if (kind === 'blocks') return blockFadeSentence(blockFade(rd.laps));
  const kms = rd.bestFive?.kms ?? rd.kms;
  const p = pacingOf(kms);
  return nextTimeAdvice(p)?.text ?? explainedSentence(p);
}

// --- RD-6: what played a part -----------------------------------------------------------------------------------

export type FactKind = 'wind' | 'legs' | 'soreness' | 'illness' | 'warmth' | 'warmup' | 'route' | 'pause';

export interface PlayedFact {
  kind: FactKind;
  text: string;
}

// What ASCEND knows from elsewhere: the notes and the leg index of the day. The caller reads
// them (engine/influence.ts, engine/legFatigue.ts); here they are only said.
export interface PlayedContext {
  conditions?: DetailConditions;
  legs?: 'fris' | 'normaal' | 'zwaar';
  soreness?: boolean;
  ill?: boolean;
}

// Plain facts, only what ASCEND really knows, never a cause for the whole result.
export function testConditions(rd: RunDetail | undefined, ctx: PlayedContext = {}): PlayedFact[] {
  const out: PlayedFact[] = [];
  if (!rd) return out;
  const kms = rd.bestFive?.kms ?? rd.kms;
  const windy = kms.filter((k) => (k.headwindKmh ?? 0) >= PACING.windKmh).map((k) => k.index);
  if (windy.length > 0) {
    out.push({ kind: 'wind', text: `Tegenwind op ${windy.length === 1 ? `km ${windy[0]}` : `km ${windy.slice(0, -1).join(', ')} en ${windy[windy.length - 1]}`}.` });
  } else if ((ctx.conditions?.windKmh ?? 0) >= WIND_MEAN_KMH || (ctx.conditions?.gustKmh ?? 0) >= WIND_GUST_KMH) {
    out.push({ kind: 'wind', text: `Het waaide hard: ${Math.round(ctx.conditions?.windKmh ?? 0)} km/u gemiddeld.` });
  }
  if (ctx.legs === 'zwaar') out.push({ kind: 'legs', text: 'Je benen waren die ochtend niet fris.' });
  if (ctx.soreness) out.push({ kind: 'soreness', text: 'Je meldde spierpijn.' });
  if (ctx.ill) out.push({ kind: 'illness', text: 'Je was ziek of net hersteld.' });
  if ((ctx.conditions?.feelsC ?? -99) >= WARM_FEELS_C) out.push({ kind: 'warmth', text: `Het voelde als ${Math.round(ctx.conditions?.feelsC ?? 0)} graden.` });
  if (rd.bestFive) {
    const warm = rd.bestFive.startSec / 60;
    if (warm < WARMUP_MIN) out.push({ kind: 'warmup', text: 'In de reeks zie je minder dan 8 minuten inlopen voor het teststuk.' });
    if (rd.bestFive.kms.some((k) => (k.pauseSec ?? 0) > 0)) out.push({ kind: 'pause', text: 'Er zat een pauze in het teststuk.' });
  }
  const climb = kms.reduce((n, k) => n + (k.gainM ?? 0), 0);
  const km = kms.reduce((n, k) => n + k.distanceM / 1000, 0);
  if (km > 0 && climb / km > HILLY_M_PER_KM) out.push({ kind: 'route', text: `De route was heuvelachtig: ${Math.round(climb / km)} meter stijging per km.` });
  return out;
}

// --- heart rate: drift and decoupling -------------------------------------------------------------------------------

export interface KmDrift {
  // Percent the speed per heartbeat fell from the first to the second half (Pa:HR).
  percent: number;
  firstHeartRate: number;
  secondHeartRate: number;
  blockMinutes: number;
  // Whether the fall is past the noise of the measure (NOISE.driftPoints).
  beyondNoise: boolean;
}

// Drift only for a long or easy run, never for a test or repeats (the heart rate trails the
// pace there). Taken from the kilometres after the first ten moving minutes; hilly runs and
// runs with under 80 percent heart rate stay out, like in runMetrics.ts#driftOf.
export function driftFromKms(rd: RunDetail | undefined, opts: { easyOrLong: boolean }): KmDrift | NotAvailable {
  if (!rd) return { unavailable: 'noDetail' };
  if (!opts.easyOrLong) return { unavailable: 'noSteadyBlock' };
  if (rd.movingSec < LONG_RUN_SEC) return { unavailable: 'tooShort' };
  const full = rd.kms.filter((k) => k.distanceM >= PACING.fullKmM);
  const withHr = full.filter((k) => isNum(k.hrAvg));
  if (full.length === 0 || withHr.length / full.length < 0.8) return { unavailable: 'noHeartRate' };
  // Leave the first ten minutes out.
  let t = 0;
  const part = withHr.filter((k) => {
    const start = t;
    t += k.sec;
    return start >= 10 * 60;
  });
  if (part.length < 4) return { unavailable: 'noSteadyBlock' };
  const climbPerKm = part.reduce((n, k) => n + (k.gainM ?? 0), 0) / part.length;
  if (climbPerKm > 15) return { unavailable: 'hilly' };
  const half = Math.floor(part.length / 2);
  const ef = (xs: RunKm[]) => {
    const speed = xs.reduce((n, k) => n + k.distanceM, 0) / xs.reduce((n, k) => n + k.sec, 0);
    const hr = xs.reduce((n, k) => n + (k.hrAvg as number) * k.sec, 0) / xs.reduce((n, k) => n + k.sec, 0);
    return { ef: speed / hr, hr };
  };
  const a = ef(part.slice(0, half));
  const b = ef(part.slice(part.length - half));
  const percent = ((a.ef - b.ef) / a.ef) * 100;
  return {
    percent,
    firstHeartRate: a.hr,
    secondHeartRate: b.hr,
    blockMinutes: Math.round(part.reduce((n, k) => n + k.sec, 0) / 60),
    beyondNoise: Math.abs(percent) >= NOISE.driftPoints,
  };
}

// --- form: facts, never a verdict ---------------------------------------------------------------------------------------

export type FormMetric = 'cadence' | 'stepLengthM' | 'stanceTimeMs' | 'oscillationMm' | 'verticalRatioPct' | 'stanceBalanceLeftPct' | 'powerW';

export interface FormFact {
  metric: FormMetric;
  // The first and last third of the kilometres, and the change.
  first: number;
  last: number;
  change: number;
}

const FORM_METRICS: FormMetric[] = ['cadence', 'stepLengthM', 'stanceTimeMs', 'oscillationMm', 'verticalRatioPct', 'stanceBalanceLeftPct', 'powerW'];

// The change of each measured form figure from the first to the last third of the
// kilometres, as numbers. Only when the pace of both thirds is within 6 percent (form
// depends on the pace) and the run has at least six kilometres. No oordeel, behalve wat de
// lezer er zelf van maakt.
export function formFacts(rd: RunDetail | undefined): FormFact[] {
  if (!rd) return [];
  const kms = rd.kms.filter((k) => k.distanceM >= PACING.fullKmM);
  if (kms.length < 6) return [];
  const third = Math.floor(kms.length / 3);
  const a = kms.slice(0, third);
  const b = kms.slice(kms.length - third);
  const paceA = mean(a.map((k) => k.paceSecKm));
  const paceB = mean(b.map((k) => k.paceSecKm));
  if (Math.abs(pct(paceB, paceA)) > 6) return [];
  const out: FormFact[] = [];
  for (const metric of FORM_METRICS) {
    const va = a.map((k) => k[metric]).filter(isNum);
    const vb = b.map((k) => k[metric]).filter(isNum);
    if (va.length < third || vb.length < third) continue;
    out.push({ metric, first: mean(va), last: mean(vb), change: mean(vb) - mean(va) });
  }
  return out;
}

// How steady the cadence stayed: the range over the kilometres, steps per minute. A fact.
export function cadenceRange(rd: RunDetail | undefined): number | undefined {
  const v = (rd?.kms ?? []).filter((k) => k.distanceM >= PACING.fullKmM).map((k) => k.cadence).filter(isNum);
  return v.length >= 3 ? Math.max(...v) - Math.min(...v) : undefined;
}
