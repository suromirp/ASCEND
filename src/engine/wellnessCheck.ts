// ASCEND: what the watch says about last night, for the morning check-in
// (docs/visie/Visuele upgrade en nieuwe ideeën.md, idee 3).
//
// Sleep, resting heart rate and HRV arrive as RecoveryMetric (any source), and
// are shown above the check-in as lines with a few words each. Two rules:
//
// - Resting heart rate and HRV are compared with YOUR OWN average of the last
//   four weeks, never with a norm: a resting heart rate of 58 is high for one
//   person and low for another. Without about a week of your own days there
//   is nothing to compare with, and the line says so instead of guessing.
// - It is a hint. A watch estimates sleep and cannot feel your legs. Nothing
//   here decides anything; the check-in still asks how the legs feel.
//
// Pure: no React, no IndexedDB.

import type { RecoveryMetric } from '../models/metrics';
import type { EnergyFeeling, SleepFeeling } from '../models/checkIn';
import { addDays } from '../utils/dates';
import { ignoredNightDates, judgmentFor, nightInfo, type NightInfo, type NightOptions } from './shortNight';

// Your own average: the 28 days before today, and at least 7 of them with a value.
export const BASELINE_DAYS = 28;
export const MIN_BASELINE_DAYS = 7;

export type WellnessKey = 'sleep' | 'restingHeartRate' | 'hrv';

export interface WellnessLine {
  key: WellnessKey;
  label: string;
  value: string;
  // A few words on what the number says, in plain language.
  note: string;
  // The same in one short piece for the compact line on the morning card
  // ("rusthartslag 52, 3 onder je gemiddelde").
  short: string;
  // 'attention': different from normal in the direction that deserves a look.
  tone: 'normal' | 'attention';
}

export interface WellnessReading {
  date: string;
  lines: WellnessLine[];
  // The sleep answer the numbers point to; the check-in offers it filled in.
  suggestedSleep?: SleepFeeling;
  // 'zelf' when the answer comes from your own estimate of a night the watch did not
  // measure well (engine/shortNight.ts); otherwise it comes from the watch.
  suggestedSleepFrom?: 'horloge' | 'zelf';
  // A doubtfully short night: still to ask, confirmed or left out. Absent for a
  // normal night, and when "Vragen bij een korte nacht" is off.
  night?: NightInfo;
  // A soft suggestion for energy, only when resting heart rate AND HRV both
  // point the same clear way against your own average; otherwise left out.
  suggestedEnergy?: EnergyFeeling;
}

export const WELLNESS_FOOTNOTE = 'Je horloge schat dit, het is een hint en geen oordeel. Hoe je benen voelen weet alleen jij.';

// --- small helpers ---------------------------------------------------------------

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
}

export function sleepLabel(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} uur` : `${h} uur ${m}`;
}

// The record of a day, with fields filled in from every source that has one.
function dayRecord(date: string, metrics: RecoveryMetric[]): RecoveryMetric | undefined {
  const of = metrics.filter((m) => m.date === date);
  if (of.length === 0) return undefined;
  const merged: RecoveryMetric = { ...of[0] };
  for (const m of of.slice(1)) {
    merged.restingHeartRate ??= m.restingHeartRate;
    merged.hrv ??= m.hrv;
    merged.sleepScore ??= m.sleepScore;
    merged.sleepMinutes ??= m.sleepMinutes;
  }
  return merged;
}

// The values of one field in the four weeks before `today`.
// `skip`: days you called badly measured (engine/shortNight.ts) do not count.
export function baselineValues(today: string, metrics: RecoveryMetric[], pick: (m: RecoveryMetric) => number | undefined, skip?: ReadonlySet<string>): number[] {
  const from = addDays(today, -BASELINE_DAYS);
  const byDate = new Map<string, number>();
  for (const m of metrics) {
    if (m.date < from || m.date >= today || skip?.has(m.date)) continue;
    const v = pick(m);
    if (v !== undefined && !byDate.has(m.date)) byDate.set(m.date, v);
  }
  return [...byDate.values()];
}

const NOT_ENOUGH = 'Nog te weinig dagen van jezelf om mee te vergelijken. Na ongeveer een week verschijnt hier jouw gemiddelde.';

// --- the lines -------------------------------------------------------------------------

function restingLine(value: number, base: number[]): WellnessLine {
  const line = { key: 'restingHeartRate' as const, label: 'Rusthartslag', value: `${value} slagen per minuut`, short: `rusthartslag ${value}` };
  if (base.length < MIN_BASELINE_DAYS) return { ...line, note: NOT_ENOUGH, tone: 'normal' };
  const avg = Math.round(mean(base));
  const diff = value - avg;
  line.short = diff >= 3 ? `rusthartslag ${value}, ${diff} boven je gemiddelde` : diff <= -3 ? `rusthartslag ${value}, ${-diff} onder je gemiddelde` : `rusthartslag ${value}, zoals je gemiddelde`;
  if (diff >= 5) {
    return { ...line, tone: 'attention', note: `${diff} hoger dan jouw gemiddelde van ${avg} (laatste 4 weken). Dat kan wijzen op vermoeidheid, een slechte nacht of een beginnende ziekte.` };
  }
  if (diff >= 3) return { ...line, tone: 'normal', note: `${diff} hoger dan jouw gemiddelde van ${avg} (laatste 4 weken), nog binnen een gewone schommeling.` };
  if (diff <= -3) return { ...line, tone: 'normal', note: `${-diff} lager dan jouw gemiddelde van ${avg} (laatste 4 weken). Dat is meestal een teken van goed herstel.` };
  return { ...line, tone: 'normal', note: `Zoals jouw gemiddelde van ${avg} (laatste 4 weken).` };
}

function hrvLine(value: number, base: number[]): WellnessLine {
  const line = { key: 'hrv' as const, label: 'HRV', value: `${Math.round(value)} ms`, short: `HRV ${Math.round(value)} ms` };
  if (base.length < MIN_BASELINE_DAYS) {
    return { ...line, note: `De variatie tussen je hartslagen in rust: hoger is meestal beter hersteld. ${NOT_ENOUGH}`, tone: 'normal' };
  }
  const avg = mean(base);
  const margin = Math.max(stdev(base), avg * 0.07);
  const rounded = Math.round(avg);
  if (value < avg - margin) line.short = `${line.short}, lager dan gewoonlijk`;
  else if (value > avg + margin) line.short = `${line.short}, hoger dan gewoonlijk`;
  if (value < avg - margin) {
    return { ...line, tone: 'attention', note: `Lager dan jouw gewone bereik (gemiddeld ${rounded}). Je lichaam is mogelijk nog niet hersteld. Eén ochtend zegt weinig, een paar achter elkaar wel.` };
  }
  if (value > avg + margin) return { ...line, tone: 'normal', note: `Hoger dan jouw gewone bereik (gemiddeld ${rounded}). Meestal een teken dat je goed hersteld bent.` };
  return { ...line, tone: 'normal', note: `Binnen jouw gewone bereik (gemiddeld ${rounded}, laatste 4 weken).` };
}

function sleepLine(record: RecoveryMetric, base: number[], night?: NightInfo): WellnessLine | undefined {
  const { sleepMinutes: minutes, sleepScore: score } = record;
  if (minutes === undefined && score === undefined) return undefined;
  const parts: string[] = [];
  let tone: WellnessLine['tone'] = 'normal';
  if (minutes !== undefined) {
    // A night that is still a question, or that you left out, is no reason to look.
    if (minutes < 360 && (!night || night.state === 'klopt')) {
      tone = 'attention';
      parts.push('Kort: minder dan 6 uur.');
    }
    if (night?.state === 'ignored') {
      parts.push(night.hours ? `Deze nacht telt niet mee. Jij schat ongeveer ${night.hours} uur.` : 'Deze nacht telt niet mee.');
    }
    if (base.length >= MIN_BASELINE_DAYS) parts.push(`Jouw gemiddelde is ${sleepLabel(mean(base))}.`);
  }
  if (score !== undefined) parts.push(`Slaapscore ${score} van 100.`);
  return {
    key: 'sleep',
    label: 'Slaap',
    value: minutes !== undefined ? sleepLabel(minutes) : `score ${score} van 100`,
    short: minutes !== undefined ? `slaap ${sleepLabel(minutes)}` : `slaapscore ${score}`,
    note: parts.join(' '),
    tone,
  };
}

// Duration first (that is what the check-in answer "slecht of kort" is
// about); a poor score (under 60, which a watch calls "slecht") pulls it one down.
export function suggestSleepFeeling(record: Pick<RecoveryMetric, 'sleepMinutes' | 'sleepScore'>): SleepFeeling | undefined {
  const { sleepMinutes: minutes, sleepScore: score } = record;
  const order: SleepFeeling[] = ['goed', 'gewoon', 'matig', 'slecht'];
  let level: number | undefined;
  if (minutes !== undefined) level = minutes >= 420 ? 0 : minutes >= 360 ? 1 : minutes >= 300 ? 2 : 3;
  else if (score !== undefined) level = score >= 80 ? 0 : score >= 60 ? 1 : score >= 50 ? 2 : 3;
  if (level === undefined) return undefined;
  if (minutes !== undefined && score !== undefined && score < 60) level = Math.min(3, level + 1);
  return order[level];
}

// What the watch says this morning, or undefined when it has said nothing yet
// (the Garmin has not synchronised, or wellness is not switched on in
// intervals.icu): the check-in then works as it always did.
// `options` (engine/shortNight.ts): with `ask` on, a doubtfully short night becomes a
// question instead of a warning, and nights you called badly measured stay out of
// your own averages. Without it everything works as it always did.
export function todayWellness(today: string, metrics: RecoveryMetric[], options: NightOptions = {}): WellnessReading | undefined {
  const record = dayRecord(today, metrics);
  if (!record) return undefined;
  const judgments = options.ask === true ? options.judgments ?? [] : [];
  const skip = ignoredNightDates(judgments, metrics);
  const sleepBase = baselineValues(today, metrics, (m) => m.sleepMinutes, skip);
  const night = options.ask === true ? nightInfo(record.sleepMinutes, sleepBase, judgmentFor(today, judgments)) : undefined;
  const ignored = night?.state === 'ignored';
  const lines: WellnessLine[] = [];
  const sleep = sleepLine(record, sleepBase, night);
  if (sleep) lines.push(sleep);
  if (record.restingHeartRate !== undefined) lines.push(restingLine(record.restingHeartRate, baselineValues(today, metrics, (m) => m.restingHeartRate)));
  if (record.hrv !== undefined) {
    const hrv = hrvLine(record.hrv, baselineValues(today, metrics, (m) => m.hrv, skip));
    // The HRV of a night that was not measured well says nothing either.
    lines.push(ignored ? { ...hrv, tone: 'normal', note: 'Deze nacht telt niet mee.', short: `HRV ${Math.round(record.hrv)} ms` } : hrv);
  }
  if (lines.length === 0) return undefined;
  let suggestedSleep: SleepFeeling | undefined;
  let suggestedSleepFrom: WellnessReading['suggestedSleepFrom'];
  if (night?.state === 'ask') suggestedSleep = undefined;
  else if (ignored) {
    if (night.hours) {
      suggestedSleep = suggestSleepFeeling({ sleepMinutes: night.hours * 60 });
      suggestedSleepFrom = 'zelf';
    }
  } else suggestedSleep = suggestSleepFeeling(record);
  return {
    date: today,
    lines,
    suggestedSleep,
    ...(suggestedSleepFrom ? { suggestedSleepFrom } : {}),
    ...(night ? { night } : {}),
    suggestedEnergy: ignored ? undefined : suggestEnergyFeeling(record, today, metrics, skip),
  };
}

// Energy from the body, only when it is clear: resting heart rate clearly up
// and HRV clearly under your own range, or both clearly the good way. One
// signal alone, or a week of days too few to compare with, says nothing: the
// answer stays empty (and may stay empty).
export function suggestEnergyFeeling(record: Pick<RecoveryMetric, 'restingHeartRate' | 'hrv'>, today: string, metrics: RecoveryMetric[], skip?: ReadonlySet<string>): EnergyFeeling | undefined {
  if (record.restingHeartRate === undefined || record.hrv === undefined) return undefined;
  const rhrBase = baselineValues(today, metrics, (m) => m.restingHeartRate);
  const hrvBase = baselineValues(today, metrics, (m) => m.hrv, skip);
  if (rhrBase.length < MIN_BASELINE_DAYS || hrvBase.length < MIN_BASELINE_DAYS) return undefined;
  const rhrDiff = record.restingHeartRate - Math.round(mean(rhrBase));
  const hrvAvg = mean(hrvBase);
  const margin = Math.max(stdev(hrvBase), hrvAvg * 0.07);
  if (rhrDiff >= 5 && record.hrv < hrvAvg - margin) return 'moe';
  if (rhrDiff <= -3 && record.hrv > hrvAvg + margin) return 'fit';
  return undefined;
}

export const NO_SLEEP_TEXT = 'Geen slaap van je horloge vannacht';

// The one compact line of the morning card: what the watch gave, in a few
// pieces. Without sleep it says so honestly, in a few words, and still shows
// what else the watch gave. Without any reading at all it is only that.
export function watchSummaryLine(reading: WellnessReading | undefined, options: { sleepExpected?: boolean } = {}): string {
  const sleepExpected = options.sleepExpected ?? true;
  if (!reading) return sleepExpected ? NO_SLEEP_TEXT : '';
  // Een nacht die je niet goed gemeten noemde, toont de gemeten slaap nergens.
  const ignored = reading.night?.state === 'ignored';
  const text = reading.lines.filter((l) => !(ignored && l.key === 'sleep')).map((l) => l.short).join(' · ');
  const capital = text.charAt(0).toUpperCase() + text.slice(1);
  const hasSleep = ignored || reading.lines.some((l) => l.key === 'sleep');
  return hasSleep || !sleepExpected ? capital : `${NO_SLEEP_TEXT} · ${text}`;
}
