// "Wat speelde er": the logic behind your own notes about a day or a training
// (models/influence.ts, docs/beslissingen/2026-10-25-wat-speelde-er.md).
//
// A note never changes a log or the numbers of the watch. It only does three things:
// it can put a training out of the heart rate comparisons (`excludedLogIds`), it can
// put a night out of your own averages of resting heart rate and HRV
// (`excludedMornings`), and it is shown back to you. Load, leg index, the week and
// the GR5 meters never look at it.
//
// Pure: no React, no IndexedDB.

import type { AlcoholAmount, InfluenceEntry, InfluenceReason, InfluenceReasonNote } from '../models/influence';
import type { IllnessEpisode } from '../models/illness';
import type { RecoveryMetric } from '../models/metrics';
import type { NightJudgment } from '../models/checkIn';
import type { SessionLog, SessionTemplate } from '../models/training';
import { AMOUNT_LABEL, MAX_LABEL_LENGTH, REASON_LABEL } from '../data/influenceReasons';
import { addDays } from '../utils/dates';
import { efficiencyOf, isUnavailable, NOISE, STRENGTH_FOR_A_LINE } from './runMetrics';
import {
  baselineOf,
  comparableLogs,
  isEasyPlanned,
  median,
  windowOf,
  MAX_BASELINE,
  MIN_BASELINE,
  TEMP_SAME_C,
  WINDOW_DAYS,
  type ComparisonContext,
  type ConditionVerdict,
} from './runComparison';
import { formatPace } from './aerobicTrend';
import { zoneBpm } from './heartRateZones';
import { isIndoorLog, logSport } from './sports';
import { isLegHeavyTemplate } from './scheduler';
import { dayRecord, sleepLabel, SHORT_NIGHT_MINUTES } from './wellnessCheck';
import { ignoredNightDates } from './shortNight';
import { formatNumberNL } from '../utils/number';

export type InfluenceCause = 'uit' | 'weet' | 'patroon';

// --- where a note counts ----------------------------------------------------------------

// The morning the note may show in: a training's own day (alcohol the evening before,
// wiet the hours before), the day after for a day in the calendar (the evening of that day).
export function affectedMorning(entry: Pick<InfluenceEntry, 'date' | 'logId'>): string {
  return entry.logId ? entry.date : addDays(entry.date, 1);
}

// Trainings that stay out of "Tempo bij zone 2" and out of the comparison material of
// later runs. Load, leg index, the week and the GR5 meters still count them.
export function excludedLogIds(entries: readonly InfluenceEntry[] | undefined): ReadonlySet<string> {
  return new Set((entries ?? []).filter((e) => e.excludeHeartRate && e.logId).map((e) => e.logId as string));
}

// Mornings (after a day note with "Deze nacht niet meetellen") that stay out of your own
// average of resting heart rate and HRV, through the skip set of wellnessCheck.ts#baselineValues.
export function excludedMornings(entries: readonly InfluenceEntry[] | undefined): ReadonlySet<string> {
  return new Set((entries ?? []).filter((e) => e.excludeHeartRate && !e.logId).map(affectedMorning));
}

// --- finding and changing a note ----------------------------------------------------------

export const entryForLog = (entries: readonly InfluenceEntry[] | undefined, logId: string): InfluenceEntry | undefined => (entries ?? []).find((e) => e.logId === logId);
export const entryForDay = (entries: readonly InfluenceEntry[] | undefined, date: string): InfluenceEntry | undefined => (entries ?? []).find((e) => !e.logId && e.date === date);

// Noted = you filled something in; a note that only remembers "seen" is not.
export const isNoted = (entry: InfluenceEntry): boolean => entry.reasons.length > 0 || entry.excludeHeartRate === true;

export function cleanLabel(text: string): string {
  return text.slice(0, MAX_LABEL_LENGTH);
}

// What the note says in a few words, for the list "Vastgelegd": "Alcohol (3 tot 5), Wiet".
export function reasonsText(entry: Pick<InfluenceEntry, 'reasons'>): string {
  return entry.reasons
    .map((r) => {
      if (r.reason === 'anders') return r.label?.trim() ? r.label.trim() : REASON_LABEL.anders;
      return r.reason === 'alcohol' && r.amount ? `${REASON_LABEL.alcohol} (${AMOUNT_LABEL[r.amount]})` : REASON_LABEL[r.reason];
    })
    .join(', ');
}

export interface NoteTarget {
  date: string;
  logId?: string;
}

// A new empty note for this place. The id and the time come from outside.
export function blankEntry(target: NoteTarget, id: string, now: string): InfluenceEntry {
  return { id, date: target.date, ...(target.logId ? { logId: target.logId } : {}), reasons: [], updatedAt: now };
}

// A note with nothing in it and not seen has no reason to be kept.
function tidy(entry: InfluenceEntry): InfluenceEntry | undefined {
  if (entry.reasons.length === 0 && !entry.excludeHeartRate && !entry.seen) return undefined;
  return entry;
}

// Every change returns the new list. A change that leaves nothing in the note removes it.
export function applyChange(list: readonly InfluenceEntry[] | undefined, entry: InfluenceEntry, change: (e: InfluenceEntry) => InfluenceEntry, now: string): InfluenceEntry[] {
  const next = tidy({ ...change(entry), updatedAt: now });
  const rest = (list ?? []).filter((e) => e.id !== entry.id);
  return next ? [...rest, next] : rest;
}

export function toggleReason(entry: InfluenceEntry, reason: InfluenceReason): InfluenceEntry {
  const has = entry.reasons.some((r) => r.reason === reason);
  const reasons: InfluenceReasonNote[] = has ? entry.reasons.filter((r) => r.reason !== reason) : [...entry.reasons, { reason }];
  return { ...entry, reasons };
}

export function setAmount(entry: InfluenceEntry, amount: AlcoholAmount | undefined): InfluenceEntry {
  return {
    ...entry,
    reasons: entry.reasons.map((r) => {
      if (r.reason !== 'alcohol') return r;
      return amount ? { reason: r.reason, amount } : { reason: r.reason };
    }),
  };
}

export function setLabel(entry: InfluenceEntry, label: string): InfluenceEntry {
  const text = cleanLabel(label);
  return {
    ...entry,
    reasons: entry.reasons.map((r) => {
      if (r.reason !== 'anders') return r;
      return text.trim() ? { reason: r.reason, label: text } : { reason: r.reason };
    }),
  };
}

export function setExclude(entry: InfluenceEntry, on: boolean): InfluenceEntry {
  const { excludeHeartRate, ...rest } = entry;
  void excludeHeartRate;
  return on ? { ...rest, excludeHeartRate: true } : rest;
}

export const markSeen = (entry: InfluenceEntry): InfluenceEntry => (entry.seen ? entry : { ...entry, seen: true });

// --- the heart rate that stands out ---------------------------------------------------------

export interface DeviationPoint {
  label: string;
  // Heart rate at the pace of this run, in beats per minute.
  value: number;
  current?: boolean;
}

export interface HeartRateDeviation {
  // This run minus normal at this pace, in whole beats; positive = higher.
  deltaBpm: number;
  // The pace of the steady block, seconds per kilometre.
  paceSec: number;
  // The difference divided by the noise of the measure; the sign counts from 1.5.
  strength: number;
  // The earlier runs (oldest first) and this one last.
  points: DeviationPoint[];
  // The normal band at this pace: the middle of the earlier runs plus and minus 1,5 times the noise.
  band: { low: number; high: number; middle: number };
  // What the weather says; the sheet still shows the deviation when it explains it.
  verdict: ConditionVerdict;
  basisLogIds: string[];
  // "Vergeleken met je vijf rustige loopjes op ongeveer dit tempo."
  basisText: string;
}

const NUMBER_WORD: Record<number, string> = { 3: 'drie', 4: 'vier', 5: 'vijf' };
const dateLabel = (iso: string) => `${Number(iso.slice(8, 10))}-${Number(iso.slice(5, 7))}`;

// Only an easy run that can be compared the way the loopinzicht compares it (the same
// earlier runs, the same limit of 1,5 times the noise, runComparison.ts and runInsight.ts).
// Strength training never gets one. Nothing is returned when it cannot be compared.
// `detailsOn` is the switch "Details van loopjes en tochten": off means no deviation, as for the loopinzicht.
export function heartRateDeviation(log: SessionLog, ctx: ComparisonContext, detailsOn: boolean): HeartRateDeviation | undefined {
  if (!detailsOn || logSport(log) !== 'running' || isIndoorLog(log) || !log.detail || !isEasyPlanned(log, ctx)) return undefined;
  const cmp = comparableLogs(log, 'efficiency', ctx);
  if (!cmp.enough || cmp.referenceHr === undefined) return undefined;
  const ref = cmp.referenceHr;
  const zone = zoneBpm(2, ctx.hr);
  const eff = (l: SessionLog) => {
    const r = efficiencyOf(l.detail, ref, zone, windowOf('efficiency', l.detail?.movingSec ?? 0));
    return isUnavailable(r) ? undefined : r;
  };
  const mine = eff(log);
  const earlier = cmp.logs.map((l) => ({ l, v: eff(l) })).filter((x): x is { l: SessionLog; v: NonNullable<ReturnType<typeof eff>> } => !!x.v);
  const base = baselineOf(earlier.map((x) => x.v.paceAtRefSec));
  if (!mine || !base) return undefined;
  // Same proportion as the loopinzicht: pace at the reference heart rate is pace times heart rate.
  const pct = ((mine.paceAtRefSec - base.median) / base.median) * 100;
  const strength = -pct / NOISE.efficiencyPct;
  if (Math.abs(strength) < STRENGTH_FOR_A_LINE) return undefined;
  // Each earlier run converted to the pace of this one: its heart rate there.
  const atMyPace = (paceAtRef: number) => (paceAtRef * ref) / mine.blockPaceSec;
  const middle = atMyPace(base.median);
  const delta = Math.round(mine.blockHeartRate - middle);
  if (delta === 0) return undefined;
  const margin = middle * ((STRENGTH_FOR_A_LINE * NOISE.efficiencyPct) / 100);
  const points: DeviationPoint[] = [...earlier].reverse().map((x) => ({ label: dateLabel(x.l.completedDate), value: atMyPace(x.v.paceAtRefSec) }));
  points.push({ label: dateLabel(log.completedDate), value: mine.blockHeartRate, current: true });
  return {
    deltaBpm: delta,
    paceSec: mine.blockPaceSec,
    strength,
    points,
    band: { low: middle - margin, high: middle + margin, middle },
    verdict: cmp.verdict,
    basisLogIds: earlier.map((x) => x.l.id),
    basisText: `Vergeleken met je ${NUMBER_WORD[base.n] ?? base.n} rustige loopjes op ongeveer dit tempo.`,
  };
}

// "Hartslag 11 slagen hoger dan normaal bij dit tempo"
export function deviationSentence(d: Pick<HeartRateDeviation, 'deltaBpm'>): string {
  const n = Math.abs(d.deltaBpm);
  return `Hartslag ${n} ${n === 1 ? 'slag' : 'slagen'} ${d.deltaBpm > 0 ? 'hoger' : 'lager'} dan normaal bij dit tempo`;
}

export const deviationPaceText = (d: Pick<HeartRateDeviation, 'paceSec'>): string => `Gem. hartslag bij ${formatPace(d.paceSec)} per km`;

// --- the sign in the lists --------------------------------------------------------------------

export type SignState = 'open' | 'muted';

// The sign shows only with a deviation and with "Training wijkt af" not off. It is amber while
// nothing is filled in and dim once the sheet was opened or you chose something.
export function signState(deviation: unknown, entry: InfluenceEntry | undefined, signOn: boolean | undefined): SignState | undefined {
  if (!deviation || signOn === false) return undefined;
  return entry && (entry.seen || entry.reasons.length > 0 || entry.excludeHeartRate) ? 'muted' : 'open';
}

// --- what ASCEND already knows ------------------------------------------------------------------

export interface KnownFact {
  reason: InfluenceReason;
  title: string;
  // The source in words: "22 graden bij de start, uit het weer".
  source: string;
}

export type FactTarget = { kind: 'log'; log: SessionLog } | { kind: 'day'; date: string };

export interface KnownFactsInput {
  target: FactTarget;
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  recovery: readonly RecoveryMetric[];
  illness: readonly IllnessEpisode[] | undefined;
  judgments?: NightJudgment[];
  // "Mogelijke oorzaak": with 'uit' there are no suggestions.
  cause: InfluenceCause | undefined;
}

const feels = (log: SessionLog): number | undefined => {
  const c = log.detail?.conditions;
  return c ? (c.feelsC ?? c.tempC) : undefined;
};

// Warmer than your earlier trainings of the same kind by at least the limit of the weather
// in the comparison (TEMP_SAME_C), from the weather stored with the log. Not for a night.
function warmFact(log: SessionLog, logs: readonly SessionLog[]): KnownFact | undefined {
  const own = feels(log);
  if (own === undefined || isIndoorLog(log)) return undefined;
  const from = addDays(log.completedDate, -WINDOW_DAYS);
  const sport = logSport(log);
  const others = logs
    .filter((l) => l.id !== log.id && logSport(l) === sport && !isIndoorLog(l) && l.completedDate >= from && l.completedAt < log.completedAt && feels(l) !== undefined)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, MAX_BASELINE)
    .map((l) => feels(l) as number);
  if (others.length < MIN_BASELINE || own - median(others) < TEMP_SAME_C) return undefined;
  const shown = Math.round(log.detail?.conditions?.tempC ?? own);
  return { reason: 'warm', title: 'Warm', source: `${formatNumberNL(shown, 0)} graden bij de start, uit het weer` };
}

export function knownFacts(input: KnownFactsInput): KnownFact[] {
  if (input.cause === 'uit') return [];
  const facts: KnownFact[] = [];
  const isLog = input.target.kind === 'log';
  const date = input.target.kind === 'log' ? input.target.log.completedDate : input.target.date;

  if (input.target.kind === 'log') {
    const warm = warmFact(input.target.log, input.logs);
    if (warm) facts.push(warm);
  }

  // A heavy leg day the day before a training; on a day note, that day itself.
  const legDay = isLog ? addDays(date, -1) : date;
  const heavy = input.logs.find((l) => {
    if (l.completedDate !== legDay || (input.target.kind === 'log' && l.id === input.target.log.id)) return false;
    const t = input.templates.find((x) => x.id === l.templateId);
    return !!t && isLegHeavyTemplate(t);
  });
  if (heavy) {
    const name = input.templates.find((x) => x.id === heavy.templateId)?.name ?? 'Training';
    facts.push({ reason: 'zware_beendag', title: isLog ? 'Zware beendag gisteren' : 'Zware beendag', source: `${name}, uit je logboek` });
  }

  // A short night from the watch: the morning of the training, the morning after a day.
  const morning = isLog ? date : addDays(date, 1);
  const record = dayRecord(morning, [...input.recovery]);
  if (record?.sleepMinutes !== undefined && record.sleepMinutes < SHORT_NIGHT_MINUTES && !ignoredNightDates(input.judgments, input.recovery).has(morning)) {
    facts.push({ reason: 'kort_geslapen', title: 'Kort geslapen', source: `${sleepLabel(record.sleepMinutes)} slaap, van je horloge` });
  }

  const ill = (input.illness ?? []).some((e) => e.startDate <= date && (e.endDate === undefined || e.endDate >= date));
  if (ill) facts.push({ reason: 'ziek', title: 'Ziek', source: 'uit je ziekmelding' });
  return facts;
}

// The chips that are left: what already stands as a suggestion is not offered twice.
export function chipsWithout(chips: readonly InfluenceReason[], facts: readonly KnownFact[]): InfluenceReason[] {
  const taken = new Set(facts.map((f) => f.reason));
  return chips.filter((c) => !taken.has(c));
}

// "Niet meetellen voor hartslag" on a training: what that does, one sentence, said only when on.
export const EXCLUDE_LOG_EXPLAIN = 'Deze training telt niet mee in Tempo bij zone 2 en niet als vergelijking voor je volgende loopjes.';
