// ASCEND — what a test run says about your training paces and your race.
//
// The 5 km test (tpl_test_run) is the measuring point of the race block. Until
// now nothing but the Ascend screen read it. This turns the latest result into
// four things (docs/visie/Trainingswetenschap.md, idea 1):
// - a fitness score (VDOT, Daniels and Gilbert): the pace-and-time formulas
//   behind Daniels' running tables. A time over a distance gives one number,
//   and that number gives a pace for every kind of training;
// - training paces: easy, threshold (the tempo run), and interval (5 km pace);
// - the predicted 10 km as a range, the same Riegel range the Ascend screen
//   shows (engine/racePrediction.ts), so the two never disagree;
// - the band a goal time can realistically move into by race day.
//
// Honest about what it is: a test on a bad day (warm, tired, windy) gives slow
// paces, and Daniels' paces are a starting point, not a verdict. Hence ranges
// everywhere, and a test that came out clearly slower than the one before it
// is flagged instead of trusted (the same 3.5% spread as everywhere else).
//
// Pure: no React, no IndexedDB.

import { daysBetween, formatDateNL } from '../utils/dates';
import { MANY_STOPS_SENTENCE, manyStops, stopsPhrase } from './bestEffort';
import { formatRaceTime, isSlowerTest, predictionRange, riegel, RIEGEL_MAX_KM, type TestResult } from './racePrediction';

// --- VDOT (Daniels and Gilbert, 1979) --------------------------------------

// Oxygen cost of running at v metres per minute.
function oxygenCost(v: number): number {
  return -4.6 + 0.182258 * v + 0.000104 * v * v;
}

// The share of your maximum a runner can hold for t minutes.
function sustainableShare(minutes: number): number {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);
}

// The speed (metres per minute) that costs this much oxygen: the inverse of
// oxygenCost.
function speedAtCost(cost: number): number {
  const a = 0.000104;
  const b = 0.182258;
  return (-b + Math.sqrt(b * b + 4 * a * (4.6 + cost))) / (2 * a);
}

export function vdotOf(km: number, minutes: number): number {
  return oxygenCost((km * 1000) / minutes) / sustainableShare(minutes);
}

// Seconds per km at a share of the maximum oxygen use that VDOT stands for.
function paceAtShare(vdot: number, share: number): number {
  return 60000 / speedAtCost(vdot * share);
}

// The time (minutes) a runner with this VDOT needs for a distance. Monotone
// between a few minutes and a few hours, so a bisection finds it.
export function minutesAtVdot(vdot: number, km: number): number {
  let lo = 3;
  let hi = 600;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vdotOf(km, mid) > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- training paces ---------------------------------------------------------

// Seconds per km, the fast and the slow end.
export interface PaceRange {
  fast: number;
  slow: number;
}

// Daniels' easy runs sit at 59 to 74% of your maximum oxygen use. The fast
// end is held at 70%: an easy run that creeps up is the usual mistake, and
// ASCEND's own "je rustige loopjes waren te hard" signal says the same.
const EASY_SHARE: [number, number] = [0.59, 0.7];
// Threshold: about the pace you could hold for an hour (88%); "comfortably
// hard, short sentences still work".
const THRESHOLD_SHARE: [number, number] = [0.84, 0.88];
// Interval blocks of 3 to 5 minutes are run at about 5 km pace; two percent
// either way is what a heart rate that lags the first minute allows.
const INTERVAL_SPREAD = 0.02;

export interface RacePaces {
  test: TestResult;
  vdot: number; // one decimal
  easy: PaceRange;
  threshold: PaceRange;
  interval: PaceRange;
  // The 10 km (or the race distance asked for) from the test, as a range.
  // Undefined past RIEGEL_MAX_KM, where Riegel is not to be trusted.
  race?: { km: number; minutes: number; low: number; high: number };
  // The test came out clearly slower than the one before it (more than the
  // normal test-to-test spread): a bad day is more likely than lost fitness.
  doubtful: boolean;
}

export function racePaces(tests: TestResult[], raceKm = 10): RacePaces | undefined {
  const latest = tests.at(-1);
  if (!latest || latest.km <= 0 || latest.minutes <= 0) return undefined;
  const prev = tests.at(-2);
  const vdot = vdotOf(latest.km, latest.minutes);
  const fiveK = (minutesAtVdot(vdot, 5) * 60) / 5;
  const [easyFast, easySlow] = [paceAtShare(vdot, EASY_SHARE[1]), paceAtShare(vdot, EASY_SHARE[0])];
  const [thrFast, thrSlow] = [paceAtShare(vdot, THRESHOLD_SHARE[1]), paceAtShare(vdot, THRESHOLD_SHARE[0])];
  const minutes = raceKm <= RIEGEL_MAX_KM ? riegel(latest.minutes, latest.km, raceKm) : undefined;
  return {
    test: latest,
    vdot: Math.round(vdot * 10) / 10,
    easy: { fast: easyFast, slow: easySlow },
    threshold: { fast: thrFast, slow: thrSlow },
    interval: { fast: fiveK * (1 - INTERVAL_SPREAD), slow: fiveK * (1 + INTERVAL_SPREAD) },
    race: minutes === undefined ? undefined : { km: raceKm, minutes, low: predictionRange(minutes)[0], high: predictionRange(minutes)[1] },
    // Op dezelfde basis als de twijfelvraag (comparablePaces): beste 5 km tegen hele run telt niet.
    doubtful: isSlowerTest(latest, prev),
  };
}

// Which pace belongs to which training, with the plain words for it.
export interface TrainingPace {
  label: string;
  range: PaceRange;
}

export function paceForTemplate(templateId: string, paces: RacePaces): TrainingPace | undefined {
  switch (templateId) {
    case 'tpl_tempo_run':
    case 'tpl_hills_descent':
      return { label: 'Drempeltempo', range: paces.threshold };
    case 'tpl_intervals':
      return { label: '5 km-tempo', range: paces.interval };
    default:
      return undefined;
  }
}

// Paces are an estimate: to the 5 seconds, nothing finer pretends.
export function formatPace(secondsPerKm: number): string {
  const total = Math.round(secondsPerKm / 5) * 5;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatPaceRange(range: PaceRange): string {
  return `${formatPace(range.fast)} tot ${formatPace(range.slow)} per km`;
}

// One plain sentence for the guide of a training: "Je tempo: 6:05 tot 6:20 per
// km, uit je test van 29 oktober." Without a test: a short line saying the test
// fills it in. Nothing for a training that has no pace of its own.
export function paceLine(templateId: string, paces: RacePaces | undefined): string | undefined {
  if (!['tpl_tempo_run', 'tpl_hills_descent', 'tpl_intervals'].includes(templateId)) return undefined;
  if (!paces) return 'Je tempo komt hier te staan zodra je een testloop hebt gedaan.';
  const pace = paceForTemplate(templateId, paces);
  return pace ? `Je tempo: ${formatPaceRange(pace.range)}, uit je test van ${formatDateNL(paces.test.date)}.` : undefined;
}

// --- what the test means, right after it ------------------------------------

export interface TestMeaning {
  headline: string;
  rows: { label: string; value: string; hint: string }[];
  note: string;
}

// The debrief after a test run ("Dit betekent je test"): the result, the
// predicted race, and the three paces, each with one plain sentence.
export function testMeaning(paces: RacePaces): TestMeaning {
  const { test, race } = paces;
  const km = String(test.km).replace('.', ',');
  const from = test.basis === 'effort' && test.wholeKm ? ` (uit een run van ${String(Math.round(test.wholeKm * 100) / 100).replace('.', ',')} km)` : '';
  const stops = test.basis === 'effort' ? stopsPhrase(test) : undefined;
  const stopsText = stops ? ` ${stops.charAt(0).toUpperCase()}${stops.slice(1)}.${manyStops(test) ? ` ${MANY_STOPS_SENTENCE}` : ''}` : '';
  const prediction = race ? ` Dat past bij een ${race.km} km in ongeveer ${Math.round(race.minutes)} minuten, ergens tussen ${Math.round(race.low)} en ${Math.round(race.high)} minuten.` : '';
  const headline = test.basis === 'effort'
    ? `Je snelste ${km} km duurde ${formatRaceTime(test.minutes)}${from}.${stopsText}${prediction}`
    : race
    ? `Je liep ${km} km in ${formatRaceTime(test.minutes)}. Dat past bij een ${race.km} km in ongeveer ${Math.round(race.minutes)} minuten, ergens tussen ${Math.round(race.low)} en ${Math.round(race.high)} minuten.`
    : `Je liep ${km} km in ${formatRaceTime(test.minutes)}.`;
  const rows = [
    { label: 'Rustige loop', value: formatPaceRange(paces.easy), hint: 'Zo rustig dat je gewoon kunt praten.' },
    { label: 'Tempoloop', value: formatPaceRange(paces.threshold), hint: 'Comfortabel zwaar: korte zinnen lukken nog.' },
    { label: 'Intervallen', value: formatPaceRange(paces.interval), hint: 'Hard, ongeveer je 5 km-tempo: alleen losse woorden.' },
  ];
  const note = paces.doubtful
    ? 'Deze test viel een stuk langzamer uit dan je vorige. Dat kan een slechte dag zijn: warm, moe of wind. Doe hem over een paar weken nog eens voordat je op deze tempo\'s vertrouwt.'
    : `Deze tempo's volgen uit je test (de rekenmethode heet VDOT en geeft je een score van ${String(paces.vdot).replace('.', ',')}). Een test is een momentopname: warm weer, wind of een vermoeide dag maakt hem trager.`;
  return { headline, rows, note };
}

// --- the band for race day --------------------------------------------------

// What a recreational runner in a plan gains per week on a 10 km: 0.3% is the
// 3 to 6% in 10 to 15 weeks the studies found (Munoz 2014, Nuuttila 2022);
// 0.8% is for someone early in a running career (docs/visie/
// Trainingswetenschap.md, knelpunt 1). Derived, not measured.
export const WEEKLY_GAIN_SLOW = 0.003;
export const WEEKLY_GAIN_FAST = 0.008;
// Nobody gains more than this by race day, however many weeks there are.
export const MAX_GAIN = 0.15;

export interface TimeBand {
  // Whole minutes: the band as it is said and as a goal time is judged.
  low: number;
  high: number;
  // The middle, in whole minutes: what a proposal suggests.
  suggested: number;
  weeks: number;
}

// The band a finish time can realistically end up in on race day, from the
// predicted time now and the weeks left. It carries the prediction's own
// spread at both ends, so a goal within a couple of percent of your current
// level is never called unrealistic.
export function raceDayBand(predictedMinutes: number, weeks: number): TimeBand {
  const w = Math.max(0, weeks);
  const gainFast = Math.min(MAX_GAIN, 1 - Math.pow(1 - WEEKLY_GAIN_FAST, w));
  const gainSlow = Math.min(MAX_GAIN, 1 - Math.pow(1 - WEEKLY_GAIN_SLOW, w));
  const fast = predictedMinutes * (1 - gainFast);
  const slow = predictedMinutes * (1 - gainSlow);
  const [lowEdge] = predictionRange(fast);
  const [, highEdge] = predictionRange(slow);
  return { low: Math.ceil(lowEdge), high: Math.ceil(highEdge), suggested: Math.round((fast + slow) / 2), weeks: Math.round(w) };
}

export interface TargetTimeCheck {
  verdict: 'ambitious' | 'easy';
  band: TimeBand;
  predictedMinutes: number;
  // The goal time a proposal would set.
  suggested: number;
}

// Is a goal time outside what the test says is realistic? Undefined when it
// is inside (or the test cannot say: past Riegel's reach, a doubtful test,
// no weeks left).
export function checkTargetTime(paces: RacePaces, targetMinutes: number, raceDate: string): TargetTimeCheck | undefined {
  if (!paces.race || paces.doubtful) return undefined;
  const weeks = daysBetween(paces.test.date, raceDate) / 7;
  if (weeks <= 0) return undefined;
  const band = raceDayBand(paces.race.minutes, weeks);
  if (targetMinutes < band.low) return { verdict: 'ambitious', band, predictedMinutes: paces.race.minutes, suggested: band.suggested };
  if (targetMinutes > band.high) return { verdict: 'easy', band, predictedMinutes: paces.race.minutes, suggested: band.suggested };
  return undefined;
}
