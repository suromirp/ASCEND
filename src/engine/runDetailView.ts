// ASCEND: what the screen "Run in detail" shows, worked out from `SessionLog.runDetail`.
//
// The design is docs/visie/Run in detail.md (hoofdstuk 4 to 6), the numbers and thresholds
// come from docs/onderzoek/Run in detail.md and engine/runDetailRules.ts. This file only reads
// the kilometres, laps and the line that were stored; it never changes them (they are derived
// and append-only) and it never touches a pace of the planning. Every sentence is a fact,
// with "kan" where it says what something may mean, never a cause and never a promise.
//
// Pure: no React, no IndexedDB.

import type { RunDetail, RunKm, RunLap } from '../models/runDetail';
import type { SessionLog, SessionTemplate } from '../models/training';
import { formatPace } from './aerobicTrend';
import { idHasRole, idIsTestOrRace } from './templateRoles';
import { NOISE, isUnavailable } from './runMetrics';
import { zoneBpm, type HeartRateSettings } from './heartRateZones';
import {
  ADVICE_MIN_SEC,
  HILLY_M_PER_KM,
  PACING,
  WARMUP_MIN,
  blockFade,
  blockFadeSentence,
  cadenceRange,
  driftFromKms,
  explainedSentence,
  formFacts,
  nextTimeAdvice,
  pacingOf,
  testConditions,
  type Pacing,
  type PlayedContext,
} from './runDetailRules';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pct = (a: number, b: number) => ((a - b) / b) * 100;
const nl = (n: number, decimals = 1) => {
  const f = 10 ** decimals;
  return String(Math.round(n * f) / f).replace('.', ',');
};
const secs = (n: number) => `${Math.round(n)} ${Math.round(n) === 1 ? 'seconde' : 'seconden'}`;
const beats = (n: number) => `${Math.round(n)} ${Math.round(n) === 1 ? 'slag' : 'slagen'}`;
const kmList = (list: number[]) => (list.length === 1 ? `km ${list[0]}` : `km ${list.slice(0, -1).join(', ')} en ${list[list.length - 1]}`);

// "27:40" for minutes and seconds, "1:04:10" from an hour on.
export function clock(sec: number): string {
  const s = Math.round(Math.max(0, sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

// "6,03 km", or "800 m" under a kilometre.
export function distanceLabel(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(2).replace('.', ',')} km`;
}

// --- which run this is ------------------------------------------------------------------------

export type RunKind = 'test' | 'race' | 'blocks' | 'long' | 'easy' | 'other';

// From the role of the template, never from a list of template ids (docs/architectuur/planning.md).
export function runKindOf(log: Pick<SessionLog, 'templateId'>, templates: SessionTemplate[]): RunKind {
  if (idHasRole(log.templateId, 'test', templates)) return 'test';
  if (idIsTestOrRace(log.templateId, templates)) return 'race';
  if (idHasRole(log.templateId, 'blocks', templates)) return 'blocks';
  if (idHasRole(log.templateId, 'long', templates)) return 'long';
  if (idHasRole(log.templateId, 'easy_pace', templates)) return 'easy';
  return 'other';
}

const easyOrLong = (kind: RunKind) => kind === 'easy' || kind === 'long';

// The kilometres the verdict is read on: for a test the five of its best stretch.
export function verdictKms(rd: RunDetail, kind: RunKind): RunKm[] {
  return kind === 'test' && rd.bestFive ? rd.bestFive.kms : rd.kms;
}

// Moving seconds between two distances, from the kilometres (a straight line within each).
export function movingSecBetween(kms: RunKm[], a: number, b: number): number {
  let out = 0;
  for (const k of kms) {
    const lo = Math.max(a, k.startM);
    const hi = Math.min(b, k.endM);
    if (hi > lo && k.distanceM > 0) out += k.sec * ((hi - lo) / k.distanceM);
  }
  return out;
}

// --- halves: the spread of the pace and of the heart rate -----------------------------------

export interface Halves {
  firstPace: number;
  secondPace: number;
  // Seconds per kilometre the second half was slower (positive) or faster.
  diffSec: number;
}

// The first half of the distance against the second. Undefined under 2 km.
export function halvesOf(kms: RunKm[]): Halves | undefined {
  if (kms.length === 0) return undefined;
  const start = kms[0].startM;
  const end = kms[kms.length - 1].endM;
  const total = end - start;
  if (total < 2000) return undefined;
  const mid = start + total / 2;
  const firstPace = (movingSecBetween(kms, start, mid) / (total / 2)) * 1000;
  const secondPace = (movingSecBetween(kms, mid, end) / (total / 2)) * 1000;
  return { firstPace, secondPace, diffSec: secondPace - firstPace };
}

export interface HeartHalves {
  mean: number;
  first: number;
  second: number;
  // Beats the second half was higher.
  diff: number;
}

// The heart rate over the run and per half, weighted by time. Undefined when under 80
// percent of the kilometres has a heart rate (then it says nothing).
export function heartOf(kms: RunKm[]): HeartHalves | undefined {
  const withHr = kms.filter((k) => isNum(k.hrAvg));
  if (kms.length === 0 || withHr.length / kms.length < 0.8) return undefined;
  const avg = (xs: RunKm[]) => {
    const w = sum(xs.map((k) => k.sec));
    return w > 0 ? sum(xs.map((k) => (k.hrAvg as number) * k.sec)) / w : undefined;
  };
  const mean = avg(withHr);
  if (mean === undefined) return undefined;
  const half = Math.floor(withHr.length / 2);
  const first = half > 0 ? avg(withHr.slice(0, half)) : undefined;
  const second = half > 0 ? avg(withHr.slice(withHr.length - half)) : undefined;
  if (first === undefined || second === undefined) return { mean, first: mean, second: mean, diff: 0 };
  return { mean, first, second, diff: second - first };
}

// --- the verdict in one word and one sentence (4.2, 5.2) ------------------------------------

export type VerdictTone = 'measure' | 'short' | 'fast-start' | 'sag' | 'strong' | 'explained' | 'blocks-fade' | 'blocks-even' | 'heart' | 'even' | 'mixed';

export interface RunVerdict {
  word: string;
  sentence: string;
  tone: VerdictTone;
}

// A full kilometre this much faster than the middle one does not fit the run: the GPS.
export const MEASURE_FAST_FACTOR = 0.6;

function medianOf(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// The first rule that fits, in this order: something the measurement cannot be, a clear
// pattern in the pace, a clear pattern in the heart rate, otherwise even (or mixed).
export function runVerdict(rd: RunDetail, kind: RunKind): RunVerdict {
  const full = rd.kms.filter((k) => k.distanceM >= PACING.fullKmM);
  if (full.length >= 3) {
    const mid = medianOf(full.map((k) => k.paceSecKm));
    const odd = full.find((k) => k.paceSecKm < mid * MEASURE_FAST_FACTOR);
    if (odd) {
      return {
        word: 'Niet goed gemeten',
        tone: 'measure',
        sentence: `Km ${odd.index} in ${formatPace(odd.paceSecKm)} per km past niet bij de rest van je run; de gps zat er waarschijnlijk naast.`,
      };
    }
  }

  if (kind === 'blocks') {
    const work = (rd.laps ?? []).filter((l) => l.kind === 'work' && isNum(l.paceSecKm));
    const fade = blockFade(rd.laps);
    if (fade) return { word: 'Laatste blok trager', tone: 'blocks-fade', sentence: blockFadeSentence(fade) as string };
    if (work.length >= 2 && work.every((l) => l.distanceM >= 400)) {
      return { word: 'Blokken gelijk', tone: 'blocks-even', sentence: `Je ${work.length} blokken liepen binnen 4 procent van elkaar.` };
    }
  }

  const p = pacingOf(verdictKms(rd, kind));
  if (!p) return { word: 'Te kort voor een verdeling', tone: 'short', sentence: 'Met minder dan drie hele kilometers zegt de verdeling van je tempo nog niets.' };
  const firstSec = Math.round(p.meanPace - p.firstPace);
  if (p.word === 'te snel begonnen') {
    return {
      word: 'Te snel begonnen',
      tone: 'fast-start',
      sentence: `Je begon ${secs(firstSec)} per kilometer sneller dan je gemiddelde en de tweede helft ging ${Math.round(p.halfSlowPct)} procent trager dan de eerste.`,
    };
  }
  if (p.word === 'ingezakt' && p.sag) {
    const ofTest = kind === 'test' && rd.bestFive ? ' van je test' : '';
    return { word: 'Ingezakt', tone: 'sag', sentence: `Vanaf km ${p.sag.km}${ofTest} werd je ${Math.round(p.sag.pct)} procent trager dan je gemiddelde.` };
  }
  if (p.word === 'sterker geëindigd') {
    return { word: 'Sterk afgesloten', tone: 'strong', sentence: `Je tweede helft ging ${Math.round(Math.abs(p.halfSlowPct))} procent sneller dan je eerste.` };
  }
  if (p.explained) {
    return { word: p.explained.by === 'wind' ? 'Tegenwind' : 'Heuvelachtig', tone: 'explained', sentence: explainedSentence(p) as string };
  }
  if (easyOrLong(kind)) {
    const drift = driftFromKms(rd, { easyOrLong: true });
    if (!isUnavailable(drift) && drift.beyondNoise && drift.percent > 0) {
      return {
        word: 'Hartslag liep op',
        tone: 'heart',
        sentence: `Je hartslag ging van ${Math.round(drift.firstHeartRate)} naar ${Math.round(drift.secondHeartRate)} terwijl je tempo ongeveer gelijk bleef.`,
      };
    }
  }
  if (p.word === 'gelijkmatig') {
    return { word: 'Gelijkmatig', tone: 'even', sentence: 'Je tempo bleef gelijk: de tweede helft wijkt minder dan 2 procent af van de eerste.' };
  }
  return {
    word: 'Wisselend',
    tone: 'mixed',
    sentence: easyOrLong(kind)
      ? 'Je tempo ging op en neer zonder duidelijke lijn. Bij een rustige loop op gevoel of hartslag is dat gewoon.'
      : 'Je tempo ging op en neer zonder duidelijke lijn.',
  };
}

// --- the three numbers (4.2) ---------------------------------------------------------------------

export interface HeadStat {
  key: 'pace' | 'best' | 'split' | 'heart' | 'climb' | 'distance';
  label: string;
  value: string;
  unit?: string;
  note: string;
}

function splitNote(h: Halves, inBest: boolean): string {
  const d = Math.round(h.diffSec);
  const where = inBest ? ' van je 5 km' : '';
  if (d === 0) return `helften${where} even snel`;
  return `tweede helft${where} per km ${d > 0 ? 'trager' : 'sneller'}`;
}

// Always three, never more: the pace (or the best 5 km of a test), the spread and the heart
// rate; what is not there makes room for the next fact.
export function headlineStats(rd: RunDetail, kind: RunKind): HeadStat[] {
  const out: HeadStat[] = [];
  const pace = rd.totalM > 0 ? (rd.movingSec / rd.totalM) * 1000 : undefined;
  const test = kind === 'test' && rd.bestFive;
  if (test && rd.bestFive) {
    out.push({ key: 'best', label: 'Beste 5 km', value: clock(rd.bestFive.sec), note: `${formatPace(rd.bestFive.sec / 5)} per km, aaneengesloten` });
  } else if (pace !== undefined) {
    out.push({ key: 'pace', label: 'Tempo', value: formatPace(pace), unit: '/km', note: 'gemiddeld, zonder stilstaan' });
  }
  const h = halvesOf(verdictKms(rd, kind));
  if (h) {
    const d = Math.round(h.diffSec);
    out.push({ key: 'split', label: 'Verdeling', value: `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)}`, unit: 's', note: splitNote(h, !!test) });
  }
  const heart = heartOf(rd.kms);
  if (heart) {
    const d = Math.round(heart.diff);
    out.push({
      key: 'heart',
      label: 'Hartslag',
      value: String(Math.round(heart.mean)),
      unit: 'bpm',
      note: d === 0 ? 'gemiddeld, helften gelijk' : `gemiddeld, ${d > 0 ? '+' : '−'}${Math.abs(d)} in de tweede helft`,
    });
  }
  const gain = sum(rd.kms.map((k) => k.gainM ?? 0));
  const hasAltitude = rd.kms.some((k) => k.gainM !== undefined);
  if (out.length < 3 && hasAltitude) out.push({ key: 'climb', label: 'Stijging', value: String(Math.round(gain)), unit: 'm', note: 'omhoog over de hele run' });
  if (out.length < 3) out.push({ key: 'distance', label: 'Afstand', value: nl(rd.totalM / 1000, 2), unit: 'km', note: rd.pauseSec > 0 ? `met ${clock(rd.pauseSec)} stilstaan` : 'volgens je horloge' });
  if (out.length < 3 && pace !== undefined && !out.some((s) => s.key === 'pace')) out.push({ key: 'pace', label: 'Tempo', value: formatPace(pace), unit: '/km', note: 'gemiddeld over de hele run' });
  return out.slice(0, 3);
}

// --- tempo per kilometre: the bars (4.4) --------------------------------------------------------------

export interface PaceBar {
  index: number;
  paceSecKm: number;
  distanceM: number;
  // 0 to 1: the height, a faster piece is higher.
  height: number;
  // 0 to 1: the width against a whole kilometre (the last, shorter piece is narrower).
  width: number;
  // A full piece this much off the mean (the spread rules): the amber dot.
  off?: 'fast' | 'slow';
  // Part of the best 5 km of a test (mint); the rest is dimmed.
  counts: boolean;
  partial: boolean;
  // A lap: work or recovery.
  kind?: 'work' | 'recovery';
}

export interface PaceBars {
  bars: PaceBar[];
  // The pace the bars start at (said in words), and the mean as a dotted line.
  basePace: number;
  meanPace: number;
  // The mean as a height, 0 to 1.
  meanHeight: number;
  by: 'km' | 'lap';
}

const speed = (pace: number) => 1000 / pace;

function barsOf(items: { index: number; paceSecKm: number; distanceM: number; partial: boolean; counts: boolean; kind?: 'work' | 'recovery' }[], by: 'km' | 'lap', meanPace: number): PaceBars | undefined {
  if (items.length === 0) return undefined;
  const paces = items.map((i) => i.paceSecKm);
  const slowest = Math.max(...paces);
  const fastest = Math.min(...paces);
  // Some room under the slowest bar, rounded to 15 seconds, so the differences show.
  const basePace = Math.ceil((slowest + Math.max(15, (slowest - fastest) * 0.35)) / 15) * 15;
  const lo = speed(basePace);
  const hi = speed(fastest);
  const h = (pace: number) => Math.max(0.06, Math.min(1, (speed(pace) - lo) / Math.max(1e-6, hi - lo)));
  const bars: PaceBar[] = items.map((it) => {
    const off = it.counts && !it.partial && it.distanceM >= PACING.fullKmM && Math.abs(pct(it.paceSecKm, meanPace)) >= PACING.sagPct ? (it.paceSecKm < meanPace ? 'fast' : 'slow') : undefined;
    return {
      index: it.index,
      paceSecKm: it.paceSecKm,
      distanceM: it.distanceM,
      height: h(it.paceSecKm),
      width: by === 'km' ? Math.max(0.3, Math.min(1, it.distanceM / 1000)) : 1,
      ...(off && by === 'km' ? { off } : {}),
      counts: it.counts,
      partial: it.partial,
      ...(it.kind ? { kind: it.kind } : {}),
    };
  });
  return { bars, basePace, meanPace, meanHeight: h(meanPace), by };
}

// Per kilometre; for repeats (a training with blocks and laps of the watch) per lap.
export function paceBars(rd: RunDetail, kind: RunKind): PaceBars | undefined {
  const meanPace = rd.totalM > 0 ? (rd.movingSec / rd.totalM) * 1000 : 0;
  const laps = (rd.laps ?? []).filter((l) => isNum(l.paceSecKm));
  if (kind === 'blocks' && laps.some((l) => l.kind === 'work') && laps.length >= 2) {
    return barsOf(
      laps.map((l) => ({ index: l.index, paceSecKm: l.paceSecKm as number, distanceM: l.distanceM, partial: false, counts: l.kind !== 'recovery', kind: l.kind })),
      'lap',
      meanPace,
    );
  }
  const best = kind === 'test' ? rd.bestFive : undefined;
  return barsOf(
    rd.kms.map((k) => {
      const mid = (k.startM + k.endM) / 2;
      return { index: k.index, paceSecKm: k.paceSecKm, distanceM: k.distanceM, partial: !!k.partial, counts: best ? mid >= best.startM && mid <= best.endM : true };
    }),
    'km',
    best ? best.sec / 5 : meanPace,
  );
}

// --- one kilometre in words (4.6, 5.3) -----------------------------------------------------------------

// Short pieces for the second line of a row: "klim 14 m", "cadans 172", "stilgestaan 12 s".
export function kmChips(km: Pick<RunKm, 'gainM' | 'lossM' | 'cadence' | 'pauseSec' | 'headwindKmh'>): string[] {
  const out: string[] = [];
  if ((km.gainM ?? 0) >= 3) out.push(`klim ${Math.round(km.gainM as number)} m`);
  if ((km.lossM ?? 0) >= 3) out.push(`daling ${Math.round(km.lossM as number)} m`);
  if (isNum(km.cadence)) out.push(`cadans ${Math.round(km.cadence)}`);
  if ((km.pauseSec ?? 0) >= 1) out.push(`stilgestaan ${clock(km.pauseSec as number)}`);
  if (isNum(km.headwindKmh) && Math.abs(km.headwindKmh) >= 5) out.push(`wind ${km.headwindKmh > 0 ? 'tegen' : 'mee'} ${Math.round(Math.abs(km.headwindKmh))} km/u`);
  return out;
}

// What a mean hides inside one kilometre, at most three plain sentences.
export function kmBetween(rd: RunDetail, km: RunKm): string[] {
  const out: string[] = [];
  if ((km.gainM ?? 0) >= PACING.climbM) {
    out.push(
      isNum(km.gapSecKm)
        ? `Je klom ${Math.round(km.gainM as number)} m. Gecorrigeerd voor de helling was je tempo ${formatPace(km.gapSecKm)} per km.`
        : `Je klom ${Math.round(km.gainM as number)} m.`,
    );
  } else if ((km.lossM ?? 0) >= PACING.climbM) {
    out.push(`Je daalde ${Math.round(km.lossM as number)} m.`);
  }
  // The two halves of the kilometre, from the reduced line.
  const l = rd.line;
  const mid = (km.startM + km.endM) / 2;
  const half = (a: number, b: number) => {
    const ps: number[] = [];
    for (let i = 0; i < l.n; i++) {
      const p = l.paceSecKm[i];
      if (l.distM[i] >= a && l.distM[i] < b && isNum(p)) ps.push(p);
    }
    return ps.length > 0 ? sum(ps) / ps.length : undefined;
  };
  const a = half(km.startM, mid);
  const b = half(mid, km.endM + (km.partial ? 1 : 0));
  if (a !== undefined && b !== undefined && Math.abs(pct(b, a)) >= PACING.sagPct && km.distanceM >= PACING.fullKmM) {
    out.push(`De eerste helft ging in ${formatPace(a)} per km, de tweede in ${formatPace(b)}.`);
  }
  if ((km.pauseSec ?? 0) >= 1) out.push(`Je stond ${clock(km.pauseSec as number)} stil; die tijd telt niet mee in je tempo.`);
  if (isNum(km.hrMax) && isNum(km.hrAvg) && km.hrMax - km.hrAvg >= 10) out.push(`Je hartslag piekte op ${km.hrMax}, ${beats(km.hrMax - km.hrAvg)} boven het gemiddelde van deze kilometer.`);
  return out.slice(0, 3);
}

// The word for a kilometre in its own sheet, when the rules have one.
export function kmWord(km: RunKm, meanPace: number): string | undefined {
  if (km.partial || km.distanceM < PACING.fullKmM) return undefined;
  const d = pct(km.paceSecKm, meanPace);
  if (d <= -PACING.sagPct) return 'Sneller dan je gemiddelde';
  if (d >= PACING.sagPct) return 'Trager dan je gemiddelde';
  return undefined;
}

// --- form (4.7) -------------------------------------------------------------------------------------------

export type FormKey = 'cadence' | 'stanceTimeMs' | 'stepLengthM' | 'oscillationMm' | 'stanceBalanceLeftPct';

export const FORM_KEYS: FormKey[] = ['cadence', 'stanceTimeMs', 'stepLengthM', 'oscillationMm', 'stanceBalanceLeftPct'];

export const FORM_INFO: Record<FormKey, { label: string; noun: string; unit: string; decimals: number; scale: number; meaning: string }> = {
  cadence: { label: 'Cadans', noun: 'cadans', unit: 'stappen/min', decimals: 0, scale: 1, meaning: 'Hoeveel stappen je per minuut zet. Hij verandert weinig met je tempo; wat bij jou past hangt af van je eigen gemiddelde, niet van een vaste norm als 180.' },
  stanceTimeMs: { label: 'Grondcontact', noun: 'grondcontact', unit: 'ms', decimals: 0, scale: 1, meaning: 'Hoe lang je voet bij elke stap op de grond is. Binnen één run kan een langer grondcontact bij hetzelfde tempo op vermoeidheid wijzen, maar dat verschilt per persoon.' },
  stepLengthM: { label: 'Staplengte', noun: 'pas', unit: 'cm', decimals: 0, scale: 100, meaning: 'De afstand van één stap. Als je trager gaat, zit het verlies meestal in je pas en niet in je cadans.' },
  oscillationMm: { label: 'Op en neer', noun: 'verticale oscillatie', unit: 'mm', decimals: 0, scale: 1, meaning: 'Hoeveel je bij elke stap op en neer gaat (verticale oscillatie). Na één run zegt het weinig; het is vooral een getal om je eigen lijn te volgen.' },
  stanceBalanceLeftPct: { label: 'Balans', noun: 'balans', unit: '% links', decimals: 1, scale: 1, meaning: 'Hoe je grondcontact over links en rechts verdeeld is. Alleen een verdeling die over meerdere runs buiten ongeveer 52 tegen 48 blijft is het bekijken waard.' },
};

// The figures this run measured, of those that are switched on, in a fixed order.
export function formKeysOf(rd: RunDetail, enabled: Record<FormKey, boolean>): FormKey[] {
  const full = rd.kms.filter((k) => k.distanceM >= PACING.fullKmM);
  if (full.length === 0) return [];
  return FORM_KEYS.filter((key) => enabled[key] && full.filter((k) => isNum(k[key])).length >= Math.max(1, full.length / 2));
}

export interface FormPoint {
  km: number;
  value: number;
}

// One point per kilometre, in the unit of the screen.
export function formSeries(rd: RunDetail, key: FormKey): FormPoint[] {
  const scale = FORM_INFO[key].scale;
  return rd.kms.filter((k) => k.distanceM >= PACING.fullKmM && isNum(k[key])).map((k) => ({ km: k.index, value: (k[key] as number) * scale }));
}

// The change that counts as a change in one run: cadence 2 steps, contact 4 percent
// (NOISE.stancePct), step 3 cm. Oscillation and balance have no spread figure: only a range.
const FORM_MIN_CHANGE: Partial<Record<FormKey, (first: number) => number>> = {
  cadence: () => 2,
  stanceTimeMs: (first) => (first * NOISE.stancePct) / 100,
  stepLengthM: () => 0.03,
};

// One fact from the run, never a verdict.
export function formFactLine(rd: RunDetail, key: FormKey): string | undefined {
  const info = FORM_INFO[key];
  const fmt = (v: number) => `${nl(v * info.scale, info.decimals)} ${info.unit}`;
  const fact = formFacts(rd).find((f) => f.metric === key);
  const min = FORM_MIN_CHANGE[key];
  if (fact && min && Math.abs(fact.change) >= min(fact.first)) {
    const more = fact.change > 0;
    const word =
      key === 'cadence' ? (more ? 'hoger' : 'lager') : key === 'stanceTimeMs' ? (more ? 'langer' : 'korter') : more ? 'langer' : 'korter';
    const amount = key === 'stepLengthM' ? `${Math.round(Math.abs(fact.change) * 100)} cm` : `${nl(Math.abs(fact.change), info.decimals)} ${key === 'cadence' ? 'stappen per minuut' : info.unit}`;
    const subject = key === 'stepLengthM' ? 'Je pas' : `Je ${info.noun}`;
    return `${subject} werd in het laatste derde ${amount} ${word} dan in het eerste.`;
  }
  if (key === 'cadence') {
    const r = cadenceRange(rd);
    if (r !== undefined) return r <= 4 ? `Je cadans bleef binnen ${Math.max(1, Math.round(r))} stappen per minuut.` : `Je cadans liep ${Math.round(r)} stappen per minuut uiteen over de kilometers.`;
  }
  const pts = formSeries(rd, key);
  if (pts.length < 2) return undefined;
  const vals = pts.map((p) => p.value);
  return `Je ${key === 'stepLengthM' ? 'pas' : info.noun} lag tussen ${fmt(Math.min(...vals) / info.scale)} en ${fmt(Math.max(...vals) / info.scale)}.`;
}

// --- patterns (4.8, 5.4, 5.5) ---------------------------------------------------------------------------

export interface RunPattern {
  topic: 'Tempo' | 'Hartslag' | 'Loopvorm' | 'Terrein' | 'Wind' | 'Gewoonte' | 'Omstandigheden';
  text: string;
  // How far past its threshold: 1 is just past it. The card shows the three strongest.
  strength: number;
  // The sheet "Waarom": what was compared, how strong, what it can mean.
  why: { compared: string; strength: string; meaning: string };
}

export interface PatternContext {
  kind: RunKind;
  indoor?: boolean;
  played?: PlayedContext;
  // RD-10: a fast start in several of the latest hard runs.
  recurring?: RecurringStart;
}

const GPS_NOTE = 'Eén kilometer schommelt door de gps zo\'n 3 procent.';

function pacePattern(p: Pacing | undefined, inBest: boolean): RunPattern | undefined {
  if (!p) return undefined;
  const where = inBest ? ' van je test' : '';
  if (p.word === 'te snel begonnen') {
    const s = Math.round(p.meanPace - p.firstPace);
    return {
      topic: 'Tempo',
      text: `Je begon ${secs(s)} per kilometer te snel. De eerste kilometer${where} was ${Math.round(p.firstFastPct)} procent sneller dan je gemiddelde en de tweede helft trager dan de eerste.`,
      strength: p.firstFastPct / PACING.fastStartPct,
      why: {
        compared: 'Je eerste kilometer tegen het gemiddelde van de hele run, en de twee helften tegen elkaar.',
        strength: `${GPS_NOTE} Dit verschil is ${Math.round(p.firstFastPct)} procent; vanaf ${PACING.fastStartPct} procent noemt ASCEND het een snelle start.`,
        meaning: 'Een start die te snel is kost meestal meer dan hij oplevert. Gelijkmatig lopen is meestal het snelst. De grens is te ijken op jouw gegevens.',
      },
    };
  }
  if (p.word === 'ingezakt' && p.sag) {
    return {
      topic: 'Tempo',
      text: `Vanaf km ${p.sag.km}${where} werd je ${Math.round(p.sag.pct)} procent trager dan je gemiddelde, zonder dat wind of een helling dat verklaart.`,
      strength: p.sag.pct / PACING.sagPct,
      why: {
        compared: 'Elke kilometer vanaf de derde tegen het gemiddelde van de run.',
        strength: `${GPS_NOTE} Dit verschil is ${Math.round(p.sag.pct)} procent; vanaf ${PACING.sagPct} procent noemt ASCEND het inzakken.`,
        meaning: 'Inzakken kan van een te snelle start komen, maar ook van vermoeidheid van die dag.',
      },
    };
  }
  if (p.word === 'sterker geëindigd') {
    return {
      topic: 'Tempo',
      text: `Je tweede helft ging ${Math.round(Math.abs(p.halfSlowPct))} procent sneller dan je eerste.`,
      strength: Math.abs(p.halfSlowPct) / PACING.halfPct,
      why: {
        compared: 'De eerste helft van de afstand tegen de tweede.',
        strength: `Vanaf ${PACING.halfPct} procent noemt ASCEND het een sterkere tweede helft. Dit verschil is ${Math.round(Math.abs(p.halfSlowPct))} procent.`,
        meaning: 'Je had aan het eind nog over. Bij een test kan dat betekenen dat je iets sneller kunt beginnen.',
      },
    };
  }
  return undefined;
}

// What stands out in this run, the strongest first, at most three. Empty: nothing stands out.
export function runPatterns(rd: RunDetail, ctx: PatternContext): RunPattern[] {
  const out: RunPattern[] = [];
  const kms = verdictKms(rd, ctx.kind);
  const p = pacingOf(kms);
  const pace = ctx.kind === 'blocks' ? undefined : pacePattern(p, ctx.kind === 'test' && !!rd.bestFive);
  if (pace) out.push(pace);

  if (ctx.kind === 'blocks') {
    const fade = blockFade(rd.laps);
    if (fade) {
      out.push({
        topic: 'Tempo',
        text: blockFadeSentence(fade) as string,
        strength: fade.slowerPct / 4,
        why: {
          compared: `Je laatste werkblok tegen je eerste, van ${fade.blocks} blokken.`,
          strength: `${GPS_NOTE} Dit verschil is ${Math.round(fade.slowerPct)} procent; vanaf 4 procent noemt ASCEND het.`,
          meaning: 'Het laatste blok even snel als het eerste is het doel van een tempoloop.',
        },
      });
    }
  }

  if (easyOrLong(ctx.kind)) {
    const drift = driftFromKms(rd, { easyOrLong: true });
    if (!isUnavailable(drift) && drift.beyondNoise && drift.percent > 0) {
      out.push({
        topic: 'Hartslag',
        text: `Je hartslag liep ${beats(drift.secondHeartRate - drift.firstHeartRate)} op terwijl je tempo ongeveer gelijk bleef. Dat kan passen bij vermoeidheid of warmte.`,
        strength: drift.percent / NOISE.driftPoints,
        why: {
          compared: `Je tempo per hartslag in de tweede helft tegen de eerste, over ${drift.blockMinutes} minuten zonder de eerste tien.`,
          strength: `De drift is ${nl(drift.percent)} procent; vanaf ${NOISE.driftPoints} procent zegt ASCEND er iets over.`,
          meaning: 'Een hartslag die oploopt bij gelijk tempo kan van warmte, te weinig drinken of vermoeidheid komen. De grens is een richtlijn van coaches, geen meting.',
        },
      });
    }
  }

  // Form: a shorter step or a longer ground contact in the last third, at the same pace.
  for (const f of formFacts(rd)) {
    if (f.metric === 'stanceTimeMs' && f.change > 0 && (f.change / f.first) * 100 >= NOISE.stancePct) {
      const pc = (f.change / f.first) * 100;
      out.push({
        topic: 'Loopvorm',
        text: `In het laatste derde werd je grondcontact ${Math.round(f.change)} ms langer bij ongeveer hetzelfde tempo.`,
        strength: pc / NOISE.stancePct,
        why: {
          compared: 'Je grondcontact in het eerste derde van de kilometers tegen het laatste derde, alleen als het tempo binnen 6 procent bleef.',
          strength: `Het verschil is ${Math.round(pc)} procent; vanaf ${NOISE.stancePct} procent zegt ASCEND er iets over.`,
          meaning: 'Een langer grondcontact bij hetzelfde tempo kan op vermoeidheid wijzen, maar dat verschilt sterk per persoon.',
        },
      });
    }
    if (f.metric === 'stepLengthM' && f.change <= -0.03) {
      out.push({
        topic: 'Loopvorm',
        text: `In het laatste derde werd je pas ${Math.round(-f.change * 100)} cm korter.`,
        strength: -f.change / 0.03,
        why: {
          compared: 'Je staplengte in het eerste derde van de kilometers tegen het laatste derde, alleen als het tempo binnen 6 procent bleef.',
          strength: `Het verschil is ${Math.round(-f.change * 100)} cm; vanaf 3 cm zegt ASCEND er iets over.`,
          meaning: 'Een kortere pas bij hetzelfde tempo kan op vermoeide benen wijzen.',
        },
      });
    }
  }

  if (!ctx.indoor) {
    const meanPace = rd.totalM > 0 ? (rd.movingSec / rd.totalM) * 1000 : 0;
    const climbs = rd.kms
      .filter((k) => k.distanceM >= PACING.fullKmM && (k.gainM ?? 0) >= PACING.climbM && pct(k.paceSecKm, meanPace) >= PACING.sagPct)
      .sort((a, b) => b.paceSecKm - a.paceSecKm);
    if (climbs.length > 0) {
      const k = climbs[0];
      const cost = k.paceSecKm - meanPace;
      out.push({
        topic: 'Terrein',
        text: `De klim op km ${k.index} (${Math.round(k.gainM as number)} m) kostte je ${secs(cost)} per kilometer.`,
        strength: pct(k.paceSecKm, meanPace) / PACING.sagPct,
        why: {
          compared: 'De kilometer met de klim tegen je gemiddelde tempo.',
          strength: `${GPS_NOTE} Deze kilometer was ${Math.round(pct(k.paceSecKm, meanPace))} procent trager.`,
          meaning: isNum(k.gapSecKm) ? `Gecorrigeerd voor de helling was het ${formatPace(k.gapSecKm)} per km.` : 'Bergop trager lopen bij dezelfde inspanning is gewoon.',
        },
      });
    }
    const windy = kms.filter((k) => (k.headwindKmh ?? 0) >= PACING.windKmh);
    if (windy.length > 0) {
      const top = Math.max(...windy.map((k) => k.headwindKmh as number));
      out.push({
        topic: 'Wind',
        text: `Op ${kmList(windy.map((k) => k.index))} had je tegenwind tot ongeveer ${Math.round(top)} km/u op borsthoogte.`,
        strength: top / PACING.windKmh,
        why: {
          compared: 'Je looprichting per kilometer tegen de wind van dat uur, omgerekend naar borsthoogte.',
          strength: `Vanaf ${PACING.windKmh} km/u kan tegenwind een kilometer merkbaar trager maken.`,
          meaning: 'Harde tegenwind kost grofweg 5 tot 10 procent tempo; wind mee geeft maar ongeveer de helft terug. Een ruwe rekensom.',
        },
      });
    }
  }

  if (ctx.recurring) {
    out.push({
      topic: 'Gewoonte',
      text: `Je begint vaak te snel: ${ctx.recurring.count} van je laatste ${ctx.recurring.of} harde loopjes.`,
      strength: 1 + ctx.recurring.count / 10,
      why: {
        compared: 'De verdeling van je laatste tests, wedstrijden en loopjes met blokken.',
        strength: `Vanaf 3 van de laatste 5 noemt ASCEND het een gewoonte.`,
        meaning: 'Een gewoonte is makkelijker te veranderen als je hem kent. De grens is een eigen aanname.',
      },
    });
  }

  // A test: what played a part (6.4), as facts, after the patterns of the run itself.
  if (ctx.kind === 'test') {
    for (const f of testConditions(rd, ctx.played)) {
      if (f.kind === 'wind' && out.some((o) => o.topic === 'Wind')) continue;
      if (ctx.indoor && (f.kind === 'wind' || f.kind === 'route')) continue;
      out.push({
        topic: 'Omstandigheden',
        text: f.text,
        strength: 1,
        why: {
          compared: 'Wat ASCEND van die dag weet: het weer, je benen, wat je meldde en de reeks zelf.',
          strength: 'Een feit, geen oordeel.',
          meaning: 'Een test onder zwaardere omstandigheden geeft meestal tragere tempo\'s; dat is de veilige kant op.',
        },
      });
    }
  }

  return out.sort((a, b) => b.strength - a.strength).slice(0, 3);
}

// --- RD-10: a fast start that comes back ---------------------------------------------------------------

export interface RecurringStart {
  count: number;
  of: number;
}

export const RECURRING_OF = 5;
export const RECURRING_MIN = 3;

// Three of the latest five tests, races and trainings with blocks (with kilometres) began too
// fast. Only runs up to and including `subject` count.
export function recurringFastStart(logs: SessionLog[], templates: SessionTemplate[], subject: Pick<SessionLog, 'completedAt'>): RecurringStart | undefined {
  const hard = logs
    .filter((l) => l.runDetail && l.completedAt <= subject.completedAt && !l.trim)
    .map((l) => ({ l, kind: runKindOf(l, templates) }))
    .filter((x) => x.kind === 'test' || x.kind === 'race' || x.kind === 'blocks')
    .sort((a, b) => b.l.completedAt.localeCompare(a.l.completedAt))
    .slice(0, RECURRING_OF);
  if (hard.length < RECURRING_MIN) return undefined;
  const count = hard.filter((x) => pacingOf(verdictKms(x.l.runDetail as RunDetail, x.kind))?.word === 'te snel begonnen').length;
  return count >= RECURRING_MIN ? { count, of: hard.length } : undefined;
}

// --- advice for the next time (4.10, 6.5) -----------------------------------------------------------------

export interface RunAdvice {
  title: 'Voor de volgende test' | 'Voor de volgende keer';
  lines: string[];
  why: string;
}

// One or two suggestions from a fixed list. Never a time to reach, never a promise, never a
// change of the planning. Gone after pain or "Slechter" (the research, hoofdstuk 9).
export function runAdvice(rd: RunDetail, kind: RunKind, opts: { pain?: boolean; feltWorse?: boolean; indoor?: boolean } = {}): RunAdvice | undefined {
  if (opts.pain || opts.feltWorse) return undefined;
  const lines: string[] = [];
  if (kind === 'test' || kind === 'race') {
    const p = pacingOf(verdictKms(rd, kind));
    const a = nextTimeAdvice(p);
    if (a && a.kind !== 'even') lines.push(a.text);
    if (rd.bestFive && rd.bestFive.startSec < WARMUP_MIN * 60) lines.push('Loop voor je test eerst 10 minuten rustig in, met een paar versnellingen van 15 tot 20 seconden op testtempo.');
    if (rd.bestFive && rd.bestFive.kms.some((k) => (k.pauseSec ?? 0) > 0)) lines.push('Loop de 5 km aaneen, zonder te stoppen.');
    const kms = verdictKms(rd, kind);
    const km = sum(kms.map((k) => k.distanceM)) / 1000;
    const climb = sum(kms.map((k) => k.gainM ?? 0));
    if (!opts.indoor && km > 0 && climb / km > HILLY_M_PER_KM) lines.push(`Kies voor je volgende test een vlakkere route; deze had ${Math.round(climb / km)} meter stijging per kilometer.`);
    if (lines.length === 0 && a?.kind === 'even') lines.push('Gelijkmatig gelopen. Houd dezelfde aanpak bij je volgende test.');
    return lines.length > 0
      ? { title: 'Voor de volgende test', lines: lines.slice(0, 2), why: 'Uit de verdeling van je test en wat ASCEND van die dag weet. Gelijkmatig lopen is meestal het snelst; hoeveel sneller jij dan bent, zegt niemand vooraf.' }
      : undefined;
  }
  if (kind === 'blocks') {
    const fade = blockFade(rd.laps);
    if (fade) lines.push('Begin het eerste blok iets rustiger, zodat het laatste even snel kan.');
  } else {
    const p = pacingOf(rd.kms);
    if (p?.word === 'te snel begonnen') {
      const diff = Math.round(p.meanPace - p.firstPace);
      if (diff >= ADVICE_MIN_SEC) lines.push(`Begin de eerste kilometer ${secs(Math.round(diff / 5) * 5)} per kilometer rustiger; dan blijft er meer over voor het eind.`);
    }
    if (easyOrLong(kind)) {
      const drift = driftFromKms(rd, { easyOrLong: true });
      if (!isUnavailable(drift) && drift.beyondNoise && drift.percent > 0) lines.push('Neem bij warm weer water mee en begin het eerste half uur rustig; dat kan helpen je hartslag laag te houden.');
    }
  }
  return lines.length > 0 ? { title: 'Voor de volgende keer', lines: lines.slice(0, 2), why: 'Uit de verdeling van je tempo en je hartslag in deze run. Een suggestie: je planning verandert er niet door.' } : undefined;
}

// --- the test as a special case (6.2) --------------------------------------------------------------------

export interface TestPiece {
  m: number;
  sec: number;
}

export interface TestLayout {
  warm: TestPiece;
  best: TestPiece;
  cool: TestPiece;
  // 0 to 1 of the distance, for the bar of three parts.
  warmFrac: number;
  bestFrac: number;
  coolFrac: number;
  // The spread inside the best 5 km.
  halves?: Halves;
}

// Warm-up, the best 5 km and cooling down. Undefined without a best 5 km, or when the best
// stretch is the whole run (nothing to split).
export function testLayout(rd: RunDetail): TestLayout | undefined {
  const b = rd.bestFive;
  if (!b) return undefined;
  const warmM = b.startM;
  const coolM = Math.max(0, rd.totalM - b.endM);
  if (warmM < 100 && coolM < 100) return undefined;
  const total = rd.totalM;
  return {
    warm: { m: warmM, sec: movingSecBetween(rd.kms, 0, b.startM) },
    best: { m: b.endM - b.startM, sec: b.sec },
    cool: { m: coolM, sec: movingSecBetween(rd.kms, b.endM, total) },
    warmFrac: warmM / total,
    bestFrac: (b.endM - b.startM) / total,
    coolFrac: coolM / total,
    halves: halvesOf(b.kms),
  };
}

// "Eerste 2,5 km: 5:28, tweede helft: 5:36, verschil +8 s".
export function testHalvesLine(h: Halves | undefined): string | undefined {
  if (!h) return undefined;
  const d = Math.round(h.diffSec);
  return `Eerste 2,5 km in ${formatPace(h.firstPace)} per km, tweede helft in ${formatPace(h.secondPace)}, verschil ${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} s.`;
}

// --- against similar runs (4.9) ----------------------------------------------------------------------

export type CompareWord = 'Beter' | 'Normaal' | 'Slechter';

export interface CompareRow {
  label: string;
  value: string;
  word: CompareWord;
  note: string;
}

export interface SimilarComparison {
  n: number;
  rows: CompareRow[];
  // The middle pace per kilometre of the earlier runs, by kilometre index (null where too few).
  medianPerKm: (number | null)[];
}

// From this many percent in pace (the spread of a 5 km time trial is 3,4 percent) a
// difference gets a word; the same for the pace per heartbeat.
export const COMPARE_PACE_PCT = 3.5;
export const COMPARE_SPLIT_SEC = 5;

// The numbers of this run against the middle of the earlier ones the gate chose
// (engine/runComparison.ts#similarRuns). Undefined with fewer than three.
export function compareWithSimilar(rd: RunDetail, others: RunDetail[]): SimilarComparison | undefined {
  if (others.length < 3) return undefined;
  const paceOf = (r: RunDetail) => (r.totalM > 0 ? (r.movingSec / r.totalM) * 1000 : NaN);
  const rows: CompareRow[] = [];
  const own = paceOf(rd);
  const theirs = medianOf(others.map(paceOf).filter(Number.isFinite));
  const dp = pct(own, theirs);
  rows.push({
    label: 'Tempo',
    value: `${formatPace(own)} tegen ${formatPace(theirs)}`,
    word: dp <= -COMPARE_PACE_PCT ? 'Beter' : dp >= COMPARE_PACE_PCT ? 'Slechter' : 'Normaal',
    note: 'je gemiddelde tempo tegen het midden van de eerdere runs',
  });
  const ownHeart = heartOf(rd.kms);
  const theirHearts = others.map((o) => ({ h: heartOf(o.kms), p: paceOf(o) })).filter((x) => x.h && Number.isFinite(x.p));
  if (ownHeart && theirHearts.length >= 3) {
    // Metres per heartbeat: a higher number is more pace for the same heart.
    const eff = (pace: number, hr: number) => 1000 / pace / hr;
    const ownEff = eff(own, ownHeart.mean);
    const theirEff = medianOf(theirHearts.map((x) => eff(x.p, (x.h as HeartHalves).mean)));
    const de = pct(ownEff, theirEff);
    rows.push({
      label: 'Hartslag bij je tempo',
      value: `${Math.round(ownHeart.mean)} bpm`,
      word: de >= COMPARE_PACE_PCT ? 'Beter' : de <= -COMPARE_PACE_PCT ? 'Slechter' : 'Normaal',
      note: 'hoeveel tempo je per hartslag haalde, tegen de eerdere runs',
    });
  }
  const ownH = halvesOf(rd.kms);
  const theirH = others.map((o) => halvesOf(o.kms)).filter((h): h is Halves => !!h);
  if (ownH && theirH.length >= 3) {
    const theirSplit = medianOf(theirH.map((h) => Math.abs(h.diffSec)));
    const d = Math.abs(ownH.diffSec) - theirSplit;
    rows.push({
      label: 'Verdeling',
      value: `${Math.round(Math.abs(ownH.diffSec))} s tegen ${Math.round(theirSplit)} s`,
      word: d <= -COMPARE_SPLIT_SEC ? 'Beter' : d >= COMPARE_SPLIT_SEC ? 'Slechter' : 'Normaal',
      note: 'het verschil tussen je twee helften; kleiner is gelijkmatiger',
    });
  }
  const len = rd.kms.length;
  const medianPerKm: (number | null)[] = [];
  for (let i = 0; i < len; i++) {
    const v = others.map((o) => o.kms[i]).filter((k): k is RunKm => !!k && k.distanceM >= PACING.fullKmM).map((k) => k.paceSecKm);
    medianPerKm.push(v.length >= 3 ? medianOf(v) : null);
  }
  return { n: others.length, rows, medianPerKm };
}

// --- the screen as a whole ----------------------------------------------------------------------------

// Laps for the list "Per ronde": only with at least two.
export function lapsForList(rd: RunDetail): RunLap[] {
  return (rd.laps ?? []).length >= 2 ? (rd.laps as RunLap[]) : [];
}

// The note under the charts when the heart rate is missing or thin (7).
export function heartNote(rd: RunDetail, coveragePct: number | undefined): string | undefined {
  if (!rd.kms.some((k) => isNum(k.hrAvg))) return 'Geen hartslag gemeten bij deze run.';
  if (isNum(coveragePct) && coveragePct < 80) return `Hartslag over ${Math.round(coveragePct)} procent van de tijd gemeten; te weinig om iets over te zeggen.`;
  return undefined;
}

// The footer line: where the numbers come from and how complete they are (4.11).
export function sourceLine(coveragePct: number | undefined): string {
  const base = 'Gegevens van je horloge via intervals.icu.';
  return isNum(coveragePct) ? `${base} Hartslag over ${Math.round(coveragePct)} procent van de tijd gemeten.` : base;
}

// The line on the log sheet that opens the screen: "12,00 km in 5:48 per km".
export function runDetailRowLine(rd: RunDetail): string {
  const pace = rd.totalM > 0 ? (rd.movingSec / rd.totalM) * 1000 : 0;
  return `${distanceLabel(rd.totalM)} in ${formatPace(pace)} per km`;
}

// --- heart rate zones for the strip under the heart rate line (4.5) ---------------------------------

// The zone of a heart rate on ASCEND's own split (engine/heartRateZones.ts): 1 to 4 are its
// bands, above the top of 4 is 5. Undefined without a threshold or maximum to work from.
export function hrZoneOf(bpm: number | null | undefined, hr: HeartRateSettings | undefined): 1 | 2 | 3 | 4 | 5 | undefined {
  if (!isNum(bpm)) return undefined;
  const bands = ([1, 2, 3, 4] as const).map((i) => zoneBpm(i, hr));
  if (bands.some((b) => !b)) return undefined;
  const b = bands as [number, number][];
  if (bpm >= b[3][1]) return 5;
  if (bpm >= b[3][0]) return 4;
  if (bpm >= b[2][0]) return 3;
  if (bpm >= b[1][0]) return 2;
  return 1;
}
