// ASCEND: de korte test (I-79 stap 3, docs/onderzoek/Drempel en submaximale test.md hoofdstuk 3 en stap 3;
// docs/beslissingen/2026-11-18-korte-test.md).
//
// Eens per week, aan het begin van je eerste rustige loop: 10 minuten inlopen, 4 minuten op je vaste
// testtempo, 1 minuut rechtop stilstaan, daarna je gewone loop. ASCEND leest uit de reeks van die loop je
// hartslag in de laatste minuut van het teststuk, het tempo dat je liep en hoeveel je hartslag zakte in de
// minuut stilstaan. Vanaf je vijfde geldige test (na vier) één woord met een zin: Normaal, Beter of Let op.
//
// Wat het nooit doet: je zones of je drempel veranderen, of iets plannen. Het woord is alleen tekst. De
// reeks begint pas na Akkoord (het voorstel legt het testtempo vast); zonder Akkoord geen test in je loop.
// Niets nieuws op het log: elke keer opnieuw uit de bewaarde reeksen, zoals de drempel (thresholdEstimate.ts).
//
// Puur: geen React, geen opslag. De grenzen staan in shortTestRules.ts.

import type { PlannedSession, SessionLog } from '../models/training';
import type { StreamSet } from '../models/activityDetail';
import type { ShortTestSeries } from '../models/shortTest';
import type { RacePaces } from './racePaces';
import { SHORT_TEST_RULES as R } from './shortTestRules';
import { distancePoints } from './bestEffort';
import { strapDuring, type NoStrapChoice } from './thresholdEstimate';
import { mondayOfWeek } from '../utils/dates';
import { modalitySport } from '../data/modalities';
import { isNum } from '../utils/guards';

// De rustige loop waar de korte test aan hangt.
export const SHORT_TEST_RUN_ID = 'tpl_easy_run';

// "Korte test" (AppSettings.shortTest): standaard aan.
export const shortTestOn = (v: unknown): boolean => v !== false;

// --- het voorstel en de dag ---------------------------------------------------------------------

// Het testtempo voor een nieuwe reeks: het midden van je drempeltempo uit je testloop, op 5 seconden.
export function seriesPaceOf(paces: RacePaces | undefined): number | undefined {
  if (!paces) return undefined;
  const mid = (paces.threshold.fast + paces.threshold.slow) / 2;
  if (!Number.isFinite(mid) || mid <= 0) return undefined;
  return Math.round(mid / 5) * 5;
}

// Het vaste testtempo van de reeks, alleen na Akkoord.
export function seriesPace(series: ShortTestSeries | undefined): number | undefined {
  return series?.answer === 'accepted' && isNum(series.paceSecKm) && series.paceSecKm > 0 ? series.paceSecKm : undefined;
}

// "5:20" op de seconde (formatPace rondt af op 5 seconden; een gelopen tempo wil je precies zien).
export function clockPace(secKm: number): string {
  const total = Math.round(secKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export interface ShortTestOffer {
  paceSecKm: number;
  title: string;
  lines: string[];
}

// Het voorstel om de korte test aan je eerste rustige loop van de week te hangen. Alleen als de instelling
// aan staat, er nog geen antwoord is en er een testloop is die een tempo geeft.
export function shortTestOffer(input: { on: boolean; series: ShortTestSeries | undefined; paces: RacePaces | undefined }): ShortTestOffer | undefined {
  if (!input.on || input.series) return undefined;
  const pace = seriesPaceOf(input.paces);
  if (pace === undefined) return undefined;
  return {
    paceSecKm: pace,
    title: 'Elke week een korte test',
    lines: [
      'Aan het begin van je eerste rustige loop van de week: 4 minuten op je drempeltempo en 1 minuut stilstaan.',
      `Je testtempo wordt ${clockPace(pace)} per km en blijft gelijk, zodat je tests te vergelijken zijn.`,
      'Na vier tests zegt ASCEND of je hartslag normaal is. Je zones veranderen er nooit door.',
    ],
  };
}

// Of een rustige loop van zoveel minuten ruimte heeft voor de korte test.
export function shortTestFits(minutes: number | undefined): boolean {
  return isNum(minutes) && minutes >= R.minRunMinutes;
}

const startsBefore = (a: PlannedSession, b: PlannedSession) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order || a.id.localeCompare(b.id);

// Wat er al gebeurde: vandaag, en de geplande trainingen met een log. Een rustige loop vóór vandaag zonder
// log is gemist en telt niet als de eerste van zijn week; dan krijgt de volgende de test (Warden, 18 november).
export interface ShortTestDone {
  today: string;
  logged: ReadonlySet<string>;
}

// De geplande rustige lopen met de korte test: per week (maandag tot zondag) de eerste rustige loop die
// niet is overgeslagen en niet gemist, vanaf de dag van Akkoord. Deterministisch: dezelfde planning geeft
// dezelfde dagen.
export function shortTestSessionIds(sessions: readonly PlannedSession[], series: ShortTestSeries | undefined, on: boolean, done?: ShortTestDone): Set<string> {
  const out = new Set<string>();
  if (!on || seriesPace(series) === undefined) return out;
  const first = new Map<string, PlannedSession>();
  for (const s of sessions) {
    if (s.templateId !== SHORT_TEST_RUN_ID || s.status === 'skipped' || s.scheduledDate < series!.date) continue;
    if (done && s.scheduledDate < done.today && !done.logged.has(s.id)) continue;
    const week = mondayOfWeek(s.scheduledDate);
    const had = first.get(week);
    if (!had || startsBefore(s, had) < 0) first.set(week, s);
  }
  for (const s of first.values()) out.add(s.id);
  return out;
}

// De rustige loop die de test als eerste krijgt na Akkoord van vandaag: dezelfde keuze als shortTestSessionIds
// met een reeks die vandaag begint. Undefined zonder rustige loop vanaf vandaag.
export function nextShortTestRun(sessions: readonly PlannedSession[], paceSecKm: number, done: ShortTestDone): PlannedSession | undefined {
  const ids = shortTestSessionIds(sessions, { answer: 'accepted', date: done.today, paceSecKm }, true, done);
  let next: PlannedSession | undefined;
  for (const s of sessions) if (ids.has(s.id) && (!next || startsBefore(s, next) < 0)) next = s;
  return next;
}

// Wat naar het horloge gaat (WatchBuildOptions.shortTest): dezelfde regel voor het versturen
// (storage/watchWorkouts.ts) en voor de stand op het horloge (components/useWatchStatus.ts), anders blijft
// een verstuurde loop op "Wijziging nog niet verstuurd" staan. Undefined zonder Akkoord of met
// "Korte test als workout" uit.
export function watchShortTest(
  settings: { shortTest?: boolean; shortTestWatch?: boolean; shortTestSeries?: ShortTestSeries },
  sessions: readonly PlannedSession[],
  done: ShortTestDone,
): { ids: ReadonlySet<string>; paceSecKm: number } | undefined {
  const pace = seriesPace(settings.shortTestSeries);
  if (pace === undefined || settings.shortTestWatch === false) return undefined;
  return { ids: shortTestSessionIds(sessions, settings.shortTestSeries, shortTestOn(settings.shortTest), done), paceSecKm: pace };
}

// Of de gekozen manier hardlopen is (buiten of op de loopband). Op de StairMaster of de fiets geen test:
// het horloge slaat hem daar ook over (watchWorkout.ts).
export function shortTestWay(place: string | undefined): boolean {
  return (modalitySport(place) ?? 'running') === 'running';
}

export interface ShortTestBrief {
  title: string;
  steps: string[];
  note: string;
}

// Het blok in de Briefing van de rustige loop met de korte test.
export function shortTestBrief(paceSecKm: number): ShortTestBrief {
  return {
    title: 'Korte test aan het begin',
    steps: [
      '10 minuten rustig inlopen.',
      `4 minuten op ${clockPace(paceSecKm)} per km, zo gelijk mogelijk.`,
      '1 minuut rechtop stilstaan.',
      'Daarna je gewone rustige loop.',
    ],
    note: 'Met je borstband om, en op een vlak stuk. Zonder band zie je alleen de feiten.',
  };
}

export type ShortTestBriefing = { kind: 'brief'; brief: ShortTestBrief } | { kind: 'offer'; offer: ShortTestOffer };

// Wat de Briefing van deze geplande training over de korte test zegt: het blok op de dag van de test, het
// voorstel op een rustige loop van vandaag of later zolang er geen antwoord is, en anders niets.
export function shortTestBriefing(input: {
  session: PlannedSession | undefined;
  minutes: number | undefined;
  sessions: readonly PlannedSession[];
  on: boolean;
  series: ShortTestSeries | undefined;
  paces: RacePaces | undefined;
  today: string;
  logged: ReadonlySet<string>;
  // De gekozen manier (Waar train je?); undefined is de standaard, hardlopen.
  place?: string;
}): ShortTestBriefing | undefined {
  const { session } = input;
  if (!input.on || !session || session.templateId !== SHORT_TEST_RUN_ID || !shortTestFits(input.minutes) || !shortTestWay(input.place)) return undefined;
  const pace = seriesPace(input.series);
  if (pace !== undefined) {
    return shortTestSessionIds(input.sessions, input.series, input.on, { today: input.today, logged: input.logged }).has(session.id) ? { kind: 'brief', brief: shortTestBrief(pace) } : undefined;
  }
  if (session.scheduledDate < input.today || session.status === 'skipped') return undefined;
  const offer = shortTestOffer({ on: input.on, series: input.series, paces: input.paces });
  if (!offer) return undefined;
  // Alleen op de loop die na Akkoord van vandaag als eerste de test krijgt, anders geeft Akkoord op een latere
  // loop de test aan een eerdere (Pathfinder, 18 november).
  return nextShortTestRun(input.sessions, offer.paceSecKm, { today: input.today, logged: input.logged })?.id === session.id ? { kind: 'offer', offer } : undefined;
}

// --- het teststuk in de reeks -------------------------------------------------------------------

export interface ShortTestFacts {
  // Het teststuk in de klok van de reeks.
  startSec: number;
  endSec: number;
  // Het gelopen tempo over het teststuk, seconden per km.
  paceSecKm: number;
  // Je gemiddelde hartslag in de laatste 60 seconden; undefined bij een gat of zonder hartslag.
  hrEnd?: number;
  hrGap: boolean;
  noHr: boolean;
  // Hoeveel je hartslag zakte in de minuut erna; alleen als je stilstond en beide punten er zijn.
  dropBpm?: number;
  stood: boolean;
  // De reeks loopt door tot een minuut na de test: alleen dan is stilstaan en de daling te lezen.
  standRead: boolean;
  stopped: boolean;
  strapSeen: boolean;
}

interface Point {
  t: number;
  d: number;
}

// De afstand op tijd `t`, lineair tussen twee punten.
function distAt(p: Point[], t: number): number | undefined {
  if (p.length === 0 || t < p[0].t || t > p[p.length - 1].t) return undefined;
  let lo = 0;
  let hi = p.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = p[lo];
  const b = p[hi];
  if (b.t === a.t) return a.d;
  return a.d + ((b.d - a.d) * (t - a.t)) / (b.t - a.t);
}

// Het gemiddelde van de geldige hartslag in [from, to]; undefined zonder punt.
function hrIn(set: StreamSet, from: number, to: number): number | undefined {
  const hr = set.heartRate;
  if (!hr) return undefined;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < set.timeSec.length; i++) {
    const t = set.timeSec[i];
    if (t < from || t > to) continue;
    const v = hr[i];
    if (!isNum(v) || v <= 0) continue;
    sum += v;
    n++;
  }
  return n > 0 ? sum / n : undefined;
}

// De tijdgewogen hartslag over [from, to), met de toets op gaten (ook aan begin en eind).
function hrOver(set: StreamSet, from: number, to: number): { avg?: number; gap: boolean } {
  const hr = set.heartRate;
  if (!hr) return { gap: true };
  let sum = 0;
  let weight = 0;
  let last = from;
  let maxGap = 0;
  for (let i = 0; i < set.timeSec.length; i++) {
    const t = set.timeSec[i];
    if (t < from || t >= to) continue;
    const v = hr[i];
    if (!isNum(v) || v <= 0) continue;
    maxGap = Math.max(maxGap, t - last);
    last = t;
    const next = i + 1 < set.timeSec.length ? Math.min(set.timeSec[i + 1], to) : to;
    const dt = Math.min(Math.max(0, next - t), R.maxHrGapSec);
    sum += v * dt;
    weight += dt;
  }
  maxGap = Math.max(maxGap, to - last);
  return { avg: weight > 0 ? sum / weight : undefined, gap: maxGap > R.maxHrGapSec || weight === 0 };
}

// Of je in [from, to] stilstond: minder dan een paar meter vooruit in meer dan 10 seconden.
function stopIn(p: Point[], from: number, to: number): boolean {
  const q = p.filter((x) => x.t >= from && x.t <= to);
  let a = 0;
  for (let i = 1; i < q.length; i++) {
    if (q[i].d - q[a].d >= R.stopMetres) a = i;
    else if (q[i].t - q[a].t > R.maxStopSec) return true;
  }
  return false;
}

// Het teststuk: het snelste stuk van 4 minuten dat begint tussen minuut 5 en 20. Een test is het alleen
// als dat stuk binnen 8 procent van je testtempo ligt; anders was het een gewone rustige loop (undefined).
export function findShortTest(set: StreamSet, targetSecKm: number): ShortTestFacts | undefined {
  if (!(targetSecKm > 0)) return undefined;
  const p = distancePoints(set);
  if (p.length < 2) return undefined;
  let best: { i: number; dist: number } | undefined;
  for (let i = 0; i < p.length; i++) {
    if (p[i].t < R.searchFromSec) continue;
    if (p[i].t > R.searchToSec) break;
    const end = p[i].t + R.testSec;
    if (end > p[p.length - 1].t) break;
    const d = distAt(p, end);
    if (d === undefined) break;
    const dist = d - p[i].d;
    if (!best || dist > best.dist) best = { i, dist };
  }
  if (!best || best.dist <= 0) return undefined;
  const pace = R.testSec / (best.dist / 1000);
  if (Math.abs(pace / targetSecKm - 1) > R.foundTolerance) return undefined;

  const startSec = p[best.i].t;
  const endSec = startSec + R.testSec;
  const noHr = !set.heartRate || !set.heartRate.some((v) => isNum(v) && v > 0);
  const last = hrOver(set, endSec - R.lastSec, endSec);
  const hrEnd = !noHr && !last.gap && last.avg !== undefined ? Math.round(last.avg) : undefined;
  const after = distAt(p, endSec + R.standSec);
  const atEnd = distAt(p, endSec);
  const stood = after !== undefined && atEnd !== undefined && after - atEnd < R.stillMetres;
  let dropBpm: number | undefined;
  if (stood && !noHr) {
    const a = hrIn(set, endSec - R.dropHalfSec, endSec);
    const b = hrIn(set, endSec + R.standSec - 2 * R.dropHalfSec, endSec + R.standSec);
    if (a !== undefined && b !== undefined) dropBpm = Math.round(a - b);
  }
  return {
    startSec, endSec, paceSecKm: pace, ...(hrEnd !== undefined ? { hrEnd } : {}), hrGap: !noHr && last.gap, noHr,
    ...(dropBpm !== undefined ? { dropBpm } : {}), stood, standRead: after !== undefined && atEnd !== undefined, stopped: stopIn(p, startSec, endSec), strapSeen: strapDuring(set, startSec, endSec),
  };
}

// --- één test -----------------------------------------------------------------------------------

// Waarom een test geen oordeel krijgt en niet meetelt in je eigen midden.
export type ShortTestReason = 'noHr' | 'hrGap' | 'start' | 'stopped' | 'pace' | 'noStrap';
export type ShortTestStrap = 'seen' | 'said' | 'wrist';
export type DayPart = 'morning' | 'later';

export interface ShortTestResult {
  logId: string;
  date: string;
  // Het moment van het log (completedAt), om "één per dag" op tijd te kiezen.
  at: string;
  dayPart: DayPart;
  facts: ShortTestFacts;
  // De zwaarte van de loop, alleen als je hem zelf koos.
  rpe?: number;
  valid: boolean;
  reason?: ShortTestReason;
  strap?: ShortTestStrap;
}

export interface ShortTestContext {
  paceSecKm: number;
  noStrap?: NoStrapChoice;
  // Je zei bij deze loop "Ik had hem wel om" (settings.strapWorn).
  strapSaid?: boolean;
}

// Ochtend of later: voor of na 12 uur begonnen (zoals legDayEase.ts).
export function dayPartOf(log: SessionLog): DayPart {
  const end = new Date(log.completedAt).getTime();
  if (!Number.isFinite(end)) return 'later';
  return new Date(end - (log.durationMinutes || 0) * 60_000).getHours() < 12 ? 'morning' : 'later';
}

// De korte test in de reeks van deze loop, of undefined als er geen in zit.
export function shortTestOf(log: SessionLog, set: StreamSet | undefined, ctx: ShortTestContext): ShortTestResult | undefined {
  if (!set || log.trim) return undefined;
  const facts = findShortTest(set, ctx.paceSecKm);
  if (!facts) return undefined;
  const base = {
    logId: log.id, date: log.completedDate, at: log.completedAt, dayPart: dayPartOf(log), facts,
    ...(isNum(log.rpe) && !log.rpeAssumed ? { rpe: log.rpe } : {}),
  };
  const reject = (reason: ShortTestReason): ShortTestResult => ({ ...base, valid: false, reason });
  if (facts.noHr) return reject('noHr');
  if (facts.hrGap || facts.hrEnd === undefined) return reject('hrGap');
  if (facts.startSec < R.validFromSec || facts.startSec > R.validToSec) return reject('start');
  if (facts.stopped) return reject('stopped');
  if (Math.abs(facts.paceSecKm / ctx.paceSecKm - 1) > R.paceTolerance) return reject('pace');
  let strap: ShortTestStrap;
  if (facts.strapSeen) strap = 'seen';
  else if (ctx.strapSaid) strap = 'said';
  else if (ctx.noStrap === 'margin') strap = 'wrist';
  else return reject('noStrap');
  return { ...base, valid: true, strap };
}

// --- je eigen midden en het oordeel -------------------------------------------------------------

export interface ShortTestBaseline {
  hr: number;
  // De mediaan van je zwaarte bij die tests; undefined als je er geen invulde.
  rpe?: number;
  count: number;
}

const median = (v: number[]): number => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const order = (a: ShortTestResult, b: ShortTestResult) => a.date.localeCompare(b.date) || (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0) || a.logId.localeCompare(b.logId);

// De geldige tests voor `current`, oudste eerst: één per dag (de eerste), zelfde dagdeel.
function earlierValid(results: readonly ShortTestResult[], current: ShortTestResult): ShortTestResult[] {
  const days = new Set<string>();
  return [...results]
    .sort(order)
    .filter((r) => {
      if (!r.valid || r.dayPart !== current.dayPart || order(r, current) >= 0 || r.date === current.date || days.has(r.date)) return false;
      days.add(r.date);
      return true;
    });
}

// Het midden van je laatste vier tot zes geldige tests vóór deze, in hetzelfde dagdeel. Undefined bij
// minder dan vier: dan nog geen oordeel.
export function shortTestBaseline(results: readonly ShortTestResult[], current: ShortTestResult): ShortTestBaseline | undefined {
  const last = earlierValid(results, current).slice(-R.baselineMax);
  if (last.length < R.baselineMin) return undefined;
  const rpes = last.map((r) => r.rpe).filter(isNum);
  return { hr: median(last.map((r) => r.facts.hrEnd!)), ...(rpes.length ? { rpe: median(rpes) } : {}), count: last.length };
}

export type ShortTestWord = 'Normaal' | 'Beter' | 'Let op';

export interface ShortTestVerdict {
  word?: ShortTestWord;
  line: string;
}

const beats = (n: number) => (n === 1 ? '1 slag' : `${n} slagen`);

// De leesregel uit het onderzoek (hoofdstuk 3): hartslag lager en niet zwaarder is fitter, lager en
// zwaarder is moe, hoger eerst de omstandigheden, binnen je spreiding niets aan de hand. Zonder zwaarte
// (van deze loop of van je eerdere) alleen de feiten.
export function shortTestVerdict(current: ShortTestResult, baseline: ShortTestBaseline | undefined, earlier = 0): ShortTestVerdict {
  if (!baseline) {
    const left = Math.max(1, R.baselineMin - earlier);
    return { line: left === 1 ? 'Nog 1 test tot een eerste oordeel.' : `Nog ${left} tests tot een eerste oordeel.` };
  }
  const diff = Math.round(current.facts.hrEnd! - baseline.hr);
  const notable = current.strap === 'wrist' ? R.wristNotableBpm : R.notableBpm;
  if (Math.abs(diff) < notable) return { word: 'Normaal', line: 'Je hartslag lag binnen je gewone spreiding.' };
  if (current.rpe === undefined || baseline.rpe === undefined) return { line: 'Vul je zwaarte in bij deze loop voor een oordeel.' };
  const harder = current.rpe - baseline.rpe >= R.harderRpe;
  if (diff < 0) {
    return harder
      ? { word: 'Let op', line: `Je hartslag lag ${beats(-diff)} onder je gewone, maar het voelde zwaarder. Dat past bij vermoeidheid, niet bij fitter worden.` }
      : { word: 'Beter', line: `Je hartslag lag ${beats(-diff)} onder je gewone en het voelde niet zwaarder. Dat past bij fitter worden.` };
  }
  return { word: 'Let op', line: `Je hartslag lag ${beats(diff)} boven je gewone. Denk eerst aan warmte, slaap of een beginnende verkoudheid.` };
}

// --- wat het logblad laat zien ------------------------------------------------------------------

// De logs die een korte test kunnen hebben: rustige lopen vanaf de eerste dag van de reeks, niet ingekort.
export function shortTestLogIds(logs: readonly SessionLog[], series: ShortTestSeries | undefined, upTo?: string): string[] {
  if (seriesPace(series) === undefined) return [];
  const runs = logs
    .filter((l) => l.templateId === SHORT_TEST_RUN_ID && !l.trim && l.completedDate >= series!.date)
    .sort((a, b) => a.completedDate.localeCompare(b.completedDate) || a.id.localeCompare(b.id));
  const end = upTo ? runs.findIndex((l) => l.id === upTo) : runs.length - 1;
  if (end < 0) return [];
  // Genoeg voor zes geldige tests ervoor, met ruimte voor lopen zonder test.
  return runs.slice(Math.max(0, end - 3 * R.baselineMax), end + 1).map((l) => l.id);
}

const REASON_LINE: Record<ShortTestReason, string> = {
  noHr: 'Deze loop heeft geen hartslag, dus er is geen oordeel.',
  hrGap: 'In je hartslag zit een gat in de laatste minuut van je test, dus er is geen oordeel.',
  start: 'Je test begon niet tussen minuut 8 en 15. Dan is hij niet te vergelijken, dus er is geen oordeel.',
  stopped: 'Je stond stil tijdens je test, dus er is geen oordeel.',
  pace: 'Je tempo lag meer dan 2 procent naast je testtempo. Dan is hij niet te vergelijken, dus er is geen oordeel.',
  noStrap: 'Bij deze test zag ASCEND geen borstband. Je ziet de feiten, zonder oordeel.',
};

export interface ShortTestView {
  facts: string[];
  word?: ShortTestWord;
  line: string;
  // De tekstknop "Ik had hem wel om".
  askStrap: boolean;
}

export interface ShortTestViewInput {
  logId: string;
  logs: readonly SessionLog[];
  streams: ReadonlyMap<string, StreamSet>;
  series: ShortTestSeries | undefined;
  noStrap?: NoStrapChoice;
  strapWorn?: readonly string[];
}

// Wat het logblad van een rustige loop zegt over de korte test erin, of undefined als er geen in zat.
export function shortTestView(input: ShortTestViewInput): ShortTestView | undefined {
  const pace = seriesPace(input.series);
  if (pace === undefined) return undefined;
  const ids = new Set(shortTestLogIds(input.logs, input.series, input.logId));
  const results: ShortTestResult[] = [];
  for (const log of input.logs) {
    if (!ids.has(log.id)) continue;
    const r = shortTestOf(log, input.streams.get(log.id), { paceSecKm: pace, noStrap: input.noStrap, strapSaid: input.strapWorn?.includes(log.id) });
    if (r) results.push(r);
  }
  const current = results.find((r) => r.logId === input.logId);
  if (!current) return undefined;
  const f = current.facts;
  const facts = [
    `Je liep ${clockPace(f.paceSecKm)} per km; je testtempo is ${clockPace(pace)}.`,
    ...(f.hrEnd !== undefined ? [`Je hartslag in de laatste minuut: ${f.hrEnd}.`] : []),
    f.dropBpm !== undefined ? `Na een minuut stilstaan ${beats(f.dropBpm)} lager.` : f.stood || !f.standRead ? 'De daling na de test is niet te lezen.' : 'Je stond niet stil na de test, dus er is geen daling.',
  ];
  if (!current.valid) {
    return { facts, line: REASON_LINE[current.reason!], askStrap: current.reason === 'noStrap' };
  }
  const baseline = shortTestBaseline(results, current);
  const verdict = shortTestVerdict(current, baseline, earlierValid(results, current).length);
  return { facts, ...(verdict.word ? { word: verdict.word } : {}), line: verdict.line, askStrap: false };
}
