// ASCEND: de drempelhartslag uit een testloop, eerlijk en rustig (I-79 stap 1 en 2,
// docs/onderzoek/Drempel en submaximale test.md hoofdstuk 4, 5, 7 en 8;
// docs/beslissingen/2026-11-17-drempel-uit-je-tests.md).
//
// Stap 1, per test (`lthrFromEffort`): het gemiddelde van je hartslag over de laatste 20 minuten van het
// teststuk uit de reeks van het horloge, keer de factor (Voorzichtig 98 procent, advies; Zoals Friel 100).
// Zonder reeks kilometer 2 tot en met 5 van je snelste 5 km, zoals het was, en dat wordt erbij gezegd.
// Alleen bij een inspanning van 24 tot en met 40 minuten, zonder gat in de hartslag, en alleen als je
// borstband er tijdens het teststuk was (de balans van grondcontact dekt het teststuk), je zei dat je
// hem om had, of je koos "Telt met ruime marge".
//
// Stap 2, samen (`combinedLthr`): het midden van je laatste drie geldige schattingen binnen 12 maanden
// (bij twee het gemiddelde, bij één die ene). Niets nieuws bewaard: elke keer opnieuw uit de logs.
//
// De grenzen staan bij elkaar in THRESHOLD_RULES, zoals zone2Rules.ts. Puur: geen React, geen opslag.

import type { SessionLog } from '../models/training';
import type { StreamSet } from '../models/activityDetail';
import type { TestResult } from './racePrediction';
import { isStaleRunDetail, isUsableRunDetail } from './runDetail';
import { testTotals } from './bestEffort';
import { isNum } from '../utils/guards';

export const THRESHOLD_RULES = {
  // De inspanning waarvoor de factor geldt, in seconden (24:00 tot en met 40:00).
  minEffortSec: 24 * 60,
  maxEffortSec: 40 * 60,
  // Het venster aan het eind van het teststuk.
  windowSec: 20 * 60,
  // Zoveel kilometers met hartslag (van 2 tot en met 5) zijn nodig zonder reeks.
  minKms: 3,
  // Een gat in de hartslag langer dan dit, of minder dan dit deel gedekt, en de test telt niet.
  maxHrGapSec: 30,
  minHrCover: 0.9,
  // De balans van grondcontact dekt minstens dit deel van het teststuk: de band was er.
  strapCover: 0.9,
  // De marge in het voorstel, met band en aan de pols.
  margin: 5,
  wideMargin: 10,
  // Aan de pols: een voorstel pas als twee tests binnen zoveel slagen van elkaar liggen.
  wristAgree: 5,
  // Samen: de laatste zoveel tests van de laatste zoveel maanden.
  take: 3,
  monthsBack: 12,
  // De vraag "Had je hem om?" alleen als de band er bij minstens zoveel van je laatste lopen was.
  strapExpectedOf: 10,
  strapExpectedMin: 6,
} as const;

export type LthrFactorChoice = 'careful' | 'friel';
export type NoStrapChoice = 'skip' | 'margin';

export const LTHR_FACTOR: Record<LthrFactorChoice, number> = { careful: 0.98, friel: 1 };

export const resolveLthrFactor = (v: unknown): LthrFactorChoice => (v === 'friel' ? 'friel' : 'careful');
export const resolveNoStrapTest = (v: unknown): NoStrapChoice => (v === 'margin' ? 'margin' : 'skip');

// Waar het getal uit komt: de reeks (laatste 20 minuten) of de kilometers (2 tot en met 5).
export type EffortWindow = 'stream' | 'km';
// Hoe de band er was: gezien in de reeks, door jou gezegd, of niet (aan de pols, met ruime marge).
export type StrapBasis = 'seen' | 'said' | 'wrist';
// Waarom een test niet telt voor je drempel. De eerste drie zijn stil: er is niets te meten.
export type NotForThreshold = 'noData' | 'stale' | 'noHr' | 'short' | 'long' | 'hrGap' | 'noStrap' | 'strapLost';

export interface EffortEstimate {
  ok: true;
  logId: string;
  date: string;
  lthr: number;
  low: number;
  high: number;
  minutes: number;
  window: EffortWindow;
  strap: StrapBasis;
}

export interface EffortRejected {
  ok: false;
  logId: string;
  date: string;
  reason: NotForThreshold;
  minutes: number;
}

export interface EffortContext {
  // De reeks van deze test, alleen als hij bij de totalen van het log past.
  streams?: StreamSet;
  factor?: LthrFactorChoice;
  noStrap?: NoStrapChoice;
  // Je zei bij deze test "Ik had hem wel om".
  strapSaid?: boolean;
}

const round = (n: number) => Math.round(n);

// De duur van de inspanning in hele seconden, zoals de test hem telt.
const effortSec = (t: Pick<TestResult, 'minutes'>) => Math.round(t.minutes * 60);

interface StretchHr {
  avg?: number;
  gap: boolean;
}

// Het tijdgewogen gemiddelde van de hartslag in [from, to), met de toets op gaten.
function windowHr(set: StreamSet, from: number, to: number): StretchHr {
  const t = set.timeSec;
  const hr = set.heartRate;
  if (!hr) return { gap: true };
  let sum = 0;
  let weight = 0;
  let lastValid = from;
  let maxGap = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] < from || t[i] >= to) continue;
    const v = hr[i];
    if (!isNum(v) || v <= 0) continue;
    maxGap = Math.max(maxGap, t[i] - lastValid);
    lastValid = t[i];
    const next = i + 1 < t.length ? Math.min(t[i + 1], to) : to;
    const dt = Math.min(Math.max(0, next - t[i]), THRESHOLD_RULES.maxHrGapSec);
    sum += v * dt;
    weight += dt;
  }
  maxGap = Math.max(maxGap, to - lastValid);
  const gap = maxGap > THRESHOLD_RULES.maxHrGapSec || weight < (to - from) * THRESHOLD_RULES.minHrCover;
  return { avg: weight > 0 ? sum / weight : undefined, gap };
}

// Of de balans van grondcontact (alleen van een band op de romp) het stuk [from, to) dekt.
export function strapDuring(set: StreamSet, from: number, to: number): boolean {
  const bal = set.stanceBalanceLeftPct;
  if (!bal) return false;
  let n = 0;
  let seen = 0;
  for (let i = 0; i < set.timeSec.length; i++) {
    if (set.timeSec[i] < from || set.timeSec[i] >= to) continue;
    n++;
    if (isNum(bal[i])) seen++;
  }
  return n > 0 && seen / n >= THRESHOLD_RULES.strapCover;
}

// Het teststuk in de klok van de reeks: de snelste 5 km als die er is, anders de hele reeks.
function stretchOf(log: SessionLog, set: StreamSet): [number, number] | undefined {
  const t = set.timeSec;
  if (t.length < 2) return undefined;
  const t0 = t[0];
  const rd = log.runDetail;
  if (isUsableRunDetail(rd) && rd.bestFive) {
    const from = t0 + rd.bestFive.startSec;
    return [from, from + rd.bestFive.sec];
  }
  return [t0, t[t.length - 1]];
}

// Kilometer 2 tot en met 5 van de snelste 5 km, gewogen naar tijd (de oude schatting, zonder reeks).
function kmHr(log: SessionLog): number | undefined {
  const rd = log.runDetail;
  if (!isUsableRunDetail(rd) || !rd.bestFive) return undefined;
  const kms = [...rd.bestFive.kms].sort((a, b) => a.startM - b.startM).slice(1).filter((k) => typeof k.hrAvg === 'number' && k.hrAvg > 0 && k.sec > 0);
  if (kms.length < THRESHOLD_RULES.minKms) return undefined;
  const sec = kms.reduce((n, k) => n + k.sec, 0);
  return kms.reduce((n, k) => n + k.hrAvg! * k.sec, 0) / sec;
}

// De schatting uit één test, of waarom hij niet telt voor je drempel. Voor je tempo's telt hij gewoon:
// dat zijn twee aparte vragen.
export function lthrFromEffort(log: SessionLog, test: TestResult, ctx: EffortContext = {}): EffortEstimate | EffortRejected {
  const base = { logId: log.id, date: test.date, minutes: test.minutes };
  const reject = (reason: NotForThreshold): EffortRejected => ({ ok: false, ...base, reason });
  if (log.trim) return reject('noData');
  const rd = log.runDetail;
  const { km, minutes } = testTotals(log);
  const rdStale = isUsableRunDetail(rd) && isStaleRunDetail(rd, km, minutes);
  if (rdStale) return reject('stale');

  const sec = effortSec(test);
  if (sec < THRESHOLD_RULES.minEffortSec) return reject('short');
  if (sec > THRESHOLD_RULES.maxEffortSec) return reject('long');

  let avg: number | undefined;
  let window: EffortWindow;
  let seen: boolean;
  let lost = false;
  const set = ctx.streams;
  const stretch = set ? stretchOf(log, set) : undefined;
  if (set && stretch && set.heartRate) {
    const [from, to] = stretch;
    const hr = windowHr(set, Math.max(from, to - THRESHOLD_RULES.windowSec), to);
    if (hr.gap) return reject('hrGap');
    avg = hr.avg;
    window = 'stream';
    seen = strapDuring(set, from, to);
    lost = !seen && log.detail?.quality.chestStrapSeen === true;
  } else {
    avg = kmHr(log);
    window = 'km';
    seen = log.detail?.quality.chestStrapSeen === true;
  }
  if (avg === undefined) return reject('noHr');

  let strap: StrapBasis;
  if (seen) strap = 'seen';
  else if (ctx.strapSaid) strap = 'said';
  else if (ctx.noStrap === 'margin') strap = 'wrist';
  else return reject(lost ? 'strapLost' : 'noStrap');

  const lthr = round(avg * LTHR_FACTOR[ctx.factor ?? 'careful']);
  const m = strap === 'wrist' ? THRESHOLD_RULES.wideMargin : THRESHOLD_RULES.margin;
  return { ok: true, ...base, lthr, low: lthr - m, high: lthr + m, window, strap };
}

// --- samen -----------------------------------------------------------------------------------------

export interface CombinedLthr {
  lthr: number;
  low: number;
  high: number;
  // De schattingen waar het op rust, oudste eerst.
  used: EffortEstimate[];
}

// De dag precies `months` maanden voor `today` (31 maart min een maand wordt 28 of 29 februari).
function monthsBefore(today: string, months: number): string {
  const [y, m, d] = today.slice(0, 10).split('-').map(Number);
  const total = y * 12 + (m - 1) - months;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  return `${yy}-${String(mm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

const median = (values: number[]): number => {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : round((s[mid - 1] + s[mid]) / 2);
};

// Het midden van je laatste drie geldige schattingen binnen 12 maanden. Undefined zonder geldige
// schatting, of aan de pols zonder twee tests die het eens zijn. De volgorde van binnenkomen telt niet:
// er wordt op datum (en log) gesorteerd.
export function combinedLthr(estimates: EffortEstimate[], today: string): CombinedLthr | undefined {
  const from = monthsBefore(today, THRESHOLD_RULES.monthsBack);
  const valid = estimates
    .filter((e) => e.date >= from && e.date <= today.slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date) || a.logId.localeCompare(b.logId));
  const used = valid.slice(-THRESHOLD_RULES.take);
  if (used.length === 0) return undefined;
  const wrist = used.some((e) => e.strap === 'wrist');
  if (wrist) {
    const agree = used.some((a, i) => used.some((b, j) => i !== j && Math.abs(a.lthr - b.lthr) <= THRESHOLD_RULES.wristAgree));
    if (!agree) return undefined;
  }
  const lthr = median(used.map((e) => e.lthr));
  const m = wrist ? THRESHOLD_RULES.wideMargin : THRESHOLD_RULES.margin;
  return { lthr, low: lthr - m, high: lthr + m, used };
}

// Of je band bij de meeste van je laatste lopen gezien is (de vraag "Had je hem om?" heeft dan zin).
// Telt alleen lopen met een profiel van de reeks; de test zelf niet.
export function strapExpected(logs: SessionLog[], exceptLogId?: string): boolean {
  const runs = logs
    .filter((l) => l.id !== exceptLogId && !!l.cardioData && !!l.detail)
    .sort((a, b) => (b.completedAt ?? b.completedDate).localeCompare(a.completedAt ?? a.completedDate))
    .slice(0, THRESHOLD_RULES.strapExpectedOf);
  const seen = runs.filter((l) => l.detail?.quality.chestStrapSeen === true).length;
  // Bij minder dan tien lopen: de meerderheid, met minstens drie.
  const need = runs.length >= THRESHOLD_RULES.strapExpectedOf ? THRESHOLD_RULES.strapExpectedMin : Math.max(3, Math.floor(runs.length / 2) + 1);
  return seen >= need;
}

// --- de zinnen -------------------------------------------------------------------------------------

const NUMBER_WORD: Record<number, string> = { 2: 'twee', 3: 'drie' };

const list = (n: number[]) => (n.length === 1 ? `${n[0]}` : `${n.slice(0, -1).join(', ')} en ${n[n.length - 1]}`);

// "Je laatste drie tests: 174, 177 en 176. Het midden is 176." Niets bij één test.
export function testsLine(c: CombinedLthr): string | undefined {
  const n = c.used.length;
  if (n < 2) return undefined;
  const values = c.used.map((e) => e.lthr);
  return `Je laatste ${NUMBER_WORD[n]} tests: ${list(values)}. ${n === 2 ? 'Het gemiddelde' : 'Het midden'} is ${c.lthr}.`;
}

// "Gemeten met je borstband, over de laatste 20 minuten van je test."
export function basisLine(e: EffortEstimate): string {
  const strap = e.strap === 'seen' ? 'Gemeten met je borstband' : e.strap === 'said' ? 'Gemeten met de band die je om had' : 'Gemeten aan je pols, dus met ruime marge';
  const over = e.window === 'stream' ? 'over de laatste 20 minuten van je test' : 'over kilometer 2 tot en met 5 van je test, want de reeks van het horloge ontbrak';
  return `${strap}, ${over}.`;
}

const minutesText = (minutes: number, reason: 'short' | 'long') => {
  const whole = Math.floor(minutes + 1e-9);
  const exact = Math.abs(minutes - whole) < 1 / 120;
  return reason === 'long' && !exact ? `ruim ${whole}` : `${whole}`;
};

// De zin onder een test die niet telt voor je drempel. Undefined als er niets te zeggen is.
export function notForThresholdLine(r: EffortRejected, current: number | undefined): string | undefined {
  const stays = current !== undefined ? `Je drempel blijft ${current}.` : 'Je drempel verandert niet.';
  switch (r.reason) {
    case 'short':
      return `Je test duurde ${minutesText(r.minutes, 'short')} minuten. Goed voor je tempo's, te kort voor je drempel.`;
    case 'long':
      return `Je test duurde ${minutesText(r.minutes, 'long')} minuten. Goed voor je tempo's, te lang voor je drempel.`;
    case 'noStrap':
      return `Bij deze test zag ASCEND geen borstband. Je tempo's tellen. ${stays}`;
    case 'strapLost':
      return `Je borstband viel weg tijdens je test. Je tempo's tellen. ${stays}`;
    case 'hrGap':
      return `In je hartslag zit een gat tijdens je test. Je tempo's tellen. ${stays}`;
    default:
      return undefined;
  }
}
