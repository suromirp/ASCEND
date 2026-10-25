// ASCEND: wat een reden die je zelf vastlegde doet met je ochtendgetallen en je
// trainingen ("Wat speelde er", docs/beslissingen/2026-10-25-wat-speelde-er.md).
//
// Per reden (bij alcohol per hoeveelheid) en per meting: rusthartslag en HRV van de
// ochtend erna, de slaap van de nacht naar die ochtend, de hartslag bij een rustig
// tempo op die dag en hoe zwaar trainingen voelden. Elke keer wordt vergeleken met je
// eigen normale schommeling in de 28 dagen ervoor.
//
// Waarom zo gerekend (docs/onderzoek/Alcohol en herstel.md, hoofdstuk 4, en
// docs/onderzoek/Cannabis en training.md, optie D):
// - De middelste waarde (mediaan) en een band uit de mediane absolute afwijking. Eén
//   nacht met veel drinken of koorts blaast een gemiddelde en een standaardafwijking op
//   (de HRV-spreiding steeg in het rekenvoorbeeld van 6 naar 7 ms), een mediaan en een
//   MAD merken één uitschieter nauwelijks. Zo werkt het voor elke oorzaak, zonder dat
//   ASCEND hoeft te raden wat het was.
// - Andere vastgelegde ochtenden doen niet mee aan de band, zodat een reden zijn eigen
//   band niet vervuilt. Nachten en loopjes die je liet "niet meetellen voor hartslag"
//   tellen hier wel mee: daar gaat het juist om.
// - Een gemiddelde over een paar keer is een richting, geen bewijs. Daarom komt er
//   pas een getal vanaf 3 keer, en staat de uitleg ernaast.
//
// De hartslag bij tempo gebruikt de bestaande vergelijking (engine/runComparison.ts en
// engine/runMetrics.ts), geen tweede rekenwijze. Puur: geen React, geen IndexedDB.

import type { AlcoholAmount, InfluenceEntry, InfluenceReason, InfluenceReasonNote } from '../models/influence';
import type { RecoveryMetric } from '../models/metrics';
import type { SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { AMOUNT_LABEL, REASON_LABEL } from '../data/influenceReasons';
import { addDays } from '../utils/dates';
import { affectedMorning } from './influence';
import { plannedRpeTop } from './coach';
import type { HeartRateSettings } from './heartRateZones';
import { zoneBpm } from './heartRateZones';
import type { LegFatigueInputs } from './legFatigue';
import { baselineOf, comparableLogs, isEasyPlanned, median, windowOf, type ComparisonContext } from './runComparison';
import { NOISE, efficiencyOf, isUnavailable } from './runMetrics';
import { BASELINE_DAYS, MIN_BASELINE_DAYS } from './wellnessCheck';

// --- de vaste getallen (eigen aannames, af te stemmen op eigen data) ------------------------

// Vanaf zoveel keer staat er een getal; daaronder alleen de naam met het aantal.
export const MIN_TIMES = 3;
// Hoeveel trainingen er in de vier weken ervoor minstens moeten zijn om "zwaarte" te vergelijken.
export const MIN_BASELINE_TRAININGS = 4;
// De band is de mediaan plus en min zoveel keer de geschaalde MAD (zo breed als twee
// standaardafwijkingen bij normaal verdeelde waarden).
export const BAND_SIGMAS = 2;
const MAD_TO_SIGMA = 1.4826;
// Een band wordt nooit smaller dan dit, anders zou een heel vlakke reeks elk verschil "buiten" maken.
const BAND_FLOOR = {
  restingHr: 2, // slagen
  hrvShare: 0.07, // van de mediaan, zoals het ochtendoordeel in wellnessCheck.ts
  sleep: 20, // minuten
  effort: 1, // punt
} as const;
// Een reden telt in het koprijtje alleen als dit deel van de keren buiten de band viel.
export const CLEAR_SHARE = 0.5;

export type InfluenceMeasure = 'restingHr' | 'hrv' | 'paceHr' | 'sleep' | 'effort';

// In de volgorde van de chips.
export const MEASURES: InfluenceMeasure[] = ['restingHr', 'hrv', 'paceHr', 'sleep', 'effort'];

export const MEASURE_LABEL: Record<InfluenceMeasure, string> = {
  restingHr: 'Rusthartslag',
  hrv: 'HRV',
  paceHr: 'Hartslag bij tempo',
  sleep: 'Slaap',
  effort: 'Zwaarte',
};

// De zin onder de grafiek op de kaart.
export const MEASURE_SUBTITLE: Record<InfluenceMeasure, string> = {
  restingHr: 'Rusthartslag de ochtend erna, in slagen boven of onder je gemiddelde.',
  hrv: 'HRV de ochtend erna, in milliseconden boven of onder je gemiddelde.',
  paceHr: 'Hartslag bij een rustig tempo op die dag, in slagen boven of onder je gewone loopjes.',
  sleep: 'Slaap in de nacht naar die ochtend, in minuten meer of minder dan je gemiddelde.',
  effort: 'Hoe zwaar trainingen voelden op die dag, in punten boven of onder wat gepland stond.',
};

// De kop boven een meting in het blad.
export const MEASURE_TITLE: Record<InfluenceMeasure, string> = {
  restingHr: 'Rusthartslag de ochtend erna',
  hrv: 'HRV de ochtend erna',
  paceHr: 'Hartslag bij een rustig tempo, die dag',
  sleep: 'Slaap in de nacht ervoor',
  effort: 'Hoe zwaar een training voelde, die dag',
};

export const MEASURE_UNIT: Record<InfluenceMeasure, { one: string; many: string }> = {
  restingHr: { one: 'slag', many: 'slagen' },
  hrv: { one: 'ms', many: 'ms' },
  paceHr: { one: 'slag', many: 'slagen' },
  sleep: { one: 'min', many: 'min' },
  effort: { one: 'punt', many: 'punten' },
};

// --- welke ochtend raakt een notitie ------------------------------------------------------------

// De ene regel staat in engine/influence.ts#affectedMorning: met een training (`logId`) de dag
// van de training, zonder training (een dag in de kalender) de dag erna.
export const morningOf = affectedMorning;

// --- reden en hoeveelheid als groep -------------------------------------------------------------

export interface ReasonGroup {
  key: string;
  reason: InfluenceReason;
  amount?: AlcoholAmount;
  label?: string;
  // "Alcohol, 3 tot 5 glazen"
  name: string;
}

export function groupOf(note: InfluenceReasonNote): ReasonGroup {
  if (note.reason === 'alcohol') {
    return {
      key: `alcohol:${note.amount ?? ''}`,
      reason: 'alcohol',
      amount: note.amount,
      name: note.amount ? `Alcohol, ${AMOUNT_LABEL[note.amount]} glazen` : 'Alcohol, hoeveelheid onbekend',
    };
  }
  if (note.reason === 'anders') {
    const label = (note.label ?? '').trim();
    return { key: `anders:${label.toLowerCase()}`, reason: 'anders', label: label || undefined, name: label || REASON_LABEL.anders };
  }
  return { key: note.reason, reason: note.reason, name: REASON_LABEL[note.reason] };
}

export function groupsOf(entry: InfluenceEntry): ReasonGroup[] {
  const seen = new Map<string, ReasonGroup>();
  for (const note of entry.reasons) {
    const g = groupOf(note);
    if (!seen.has(g.key)) seen.set(g.key, g);
  }
  return [...seen.values()];
}

export interface Occurrence {
  group: ReasonGroup;
  morning: string;
  entryId: string;
}

// Elke reden per ochtend één keer, ook als je hem op de dag én bij de training noteerde.
export function occurrencesOf(entries: InfluenceEntry[]): Occurrence[] {
  const seen = new Set<string>();
  const out: Occurrence[] = [];
  for (const entry of entries) {
    const morning = morningOf(entry);
    for (const group of groupsOf(entry)) {
      const id = `${group.key}|${morning}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ group, morning, entryId: entry.id });
    }
  }
  return out;
}

// Wat er is vastgelegd, per groep: voor de lege toestand en de regel "nog te weinig".
export function recordedCounts(entries: InfluenceEntry[]): { group: ReasonGroup; count: number }[] {
  const counts = new Map<string, { group: ReasonGroup; count: number }>();
  for (const o of occurrencesOf(entries)) {
    const cur = counts.get(o.group.key) ?? { group: o.group, count: 0 };
    cur.count += 1;
    counts.set(o.group.key, cur);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.group.name.localeCompare(b.group.name, 'nl'));
}

// --- de invoer ----------------------------------------------------------------------------------------

export interface EffectsInput {
  entries: InfluenceEntry[];
  metrics: RecoveryMetric[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  program: Program | null | undefined;
  // Voor de hartslag bij tempo. Zonder dit is die meting er niet.
  run?: { hr: HeartRateSettings | undefined; legs: LegFatigueInputs; chestStrap: boolean };
}

export interface EffectPoint {
  // De ochtend of de dag.
  date: string;
  value: number;
  // De middelste waarde van je eigen schommeling en de band eromheen.
  center: number;
  low: number;
  high: number;
  diff: number;
  outside: boolean;
}

export interface ReasonEffect {
  group: ReasonGroup;
  measure: InfluenceMeasure;
  // Oudste eerst.
  points: EffectPoint[];
  count: number;
  enough: boolean;
  meanDiff: number;
  meanValue: number;
  meanCenter: number;
  outsideCount: number;
  // De helft van de band, gemiddeld: hoe groot je gewone schommeling was.
  halfBand: number;
  // Duidelijk buiten de band: genoeg keren, meestal erbuiten en het gemiddelde erbuiten.
  clear: boolean;
}

// --- de band -------------------------------------------------------------------------------------------

export function robustBand(values: number[], floor: (center: number) => number): { center: number; half: number } | undefined {
  if (values.length === 0) return undefined;
  const center = median(values);
  const mad = median(values.map((v) => Math.abs(v - center)));
  return { center, half: Math.max(BAND_SIGMAS * MAD_TO_SIGMA * mad, floor(center)) };
}

function pointOf(date: string, value: number, band: { center: number; half: number }): EffectPoint {
  const diff = value - band.center;
  return { date, value, center: band.center, low: band.center - band.half, high: band.center + band.half, diff, outside: Math.abs(diff) > band.half };
}

// --- de metingen ---------------------------------------------------------------------------------------

type Picker = (m: RecoveryMetric) => number | undefined;
const PICK: Record<'restingHr' | 'hrv' | 'sleep', Picker> = {
  restingHr: (m) => m.restingHeartRate,
  hrv: (m) => m.hrv,
  sleep: (m) => m.sleepMinutes,
};

function valueOnDay(metrics: RecoveryMetric[], date: string, pick: Picker): number | undefined {
  for (const m of metrics) {
    if (m.date !== date) continue;
    const v = pick(m);
    if (v !== undefined && Number.isFinite(v)) return v;
  }
  return undefined;
}

// De waarden van één meting in de 28 dagen voor `date`, zonder de vastgelegde ochtenden.
function baselineDays(metrics: RecoveryMetric[], date: string, pick: Picker, skip: ReadonlySet<string>): number[] {
  const from = addDays(date, -BASELINE_DAYS);
  const byDate = new Map<string, number>();
  for (const m of metrics) {
    if (m.date < from || m.date >= date || skip.has(m.date) || byDate.has(m.date)) continue;
    const v = pick(m);
    if (v !== undefined && Number.isFinite(v)) byDate.set(m.date, v);
  }
  return [...byDate.values()];
}

const FEEL_SCORE = { better: -1, normal: 0, worse: 2 } as const;

// De zwaarte van een training: wat je aangaf tegenover wat er gepland stond (RPE min de
// bovenkant van de geplande inspanning). Zonder RPE of zonder plan: hoe het voelde,
// beter -1, normaal 0, slechter +2 (de coach telt twee punten boven plan ook als
// "zwaar", engine/coach.ts#feltHeavy). Zo staan de keren en je normale trainingen op dezelfde schaal.
function effortScore(log: SessionLog, templateById: Map<string, SessionTemplate>, program: Program | null | undefined, cache: Map<string, number | null>): number | undefined {
  const cached = cache.get(log.id);
  if (cached !== undefined) return cached ?? undefined;
  let score: number | undefined;
  const template = templateById.get(log.templateId);
  if (log.rpe !== undefined && template) {
    const top = plannedRpeTop(template, log.completedDate, program);
    if (top !== undefined) score = log.rpe - top;
  }
  if (score === undefined && log.subjectiveFeel) score = FEEL_SCORE[log.subjectiveFeel];
  cache.set(log.id, score ?? null);
  return score;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

// Eén rekenstand: wat per ochtend en meting is uitgerekend wordt bewaard.
export class InfluenceCalculator {
  private readonly recorded: Set<string>;
  private readonly templateById: Map<string, SessionTemplate>;
  private readonly effortCache = new Map<string, number | null>();
  private readonly memo = new Map<string, EffectPoint | null>();

  private readonly input: EffectsInput;

  constructor(input: EffectsInput) {
    this.input = input;
    this.recorded = new Set(input.entries.filter((e) => e.reasons.length > 0).map(morningOf));
    this.templateById = new Map(input.templates.map((t) => [t.id, t]));
  }

  // De ochtenden met een vastgelegde reden: die tellen niet mee in een band.
  get recordedMornings(): ReadonlySet<string> {
    return this.recorded;
  }

  pointAt(measure: InfluenceMeasure, date: string): EffectPoint | undefined {
    const key = `${measure}|${date}`;
    const cached = this.memo.get(key);
    if (cached !== undefined) return cached ?? undefined;
    const point = this.compute(measure, date);
    this.memo.set(key, point ?? null);
    return point;
  }

  private compute(measure: InfluenceMeasure, date: string): EffectPoint | undefined {
    if (measure === 'effort') return this.effort(date);
    if (measure === 'paceHr') return this.paceHr(date);
    const pick = PICK[measure];
    const value = valueOnDay(this.input.metrics, date, pick);
    if (value === undefined) return undefined;
    const base = baselineDays(this.input.metrics, date, pick, this.recorded);
    if (base.length < MIN_BASELINE_DAYS) return undefined;
    const floor = measure === 'restingHr' ? () => BAND_FLOOR.restingHr : measure === 'sleep' ? () => BAND_FLOOR.sleep : (c: number) => c * BAND_FLOOR.hrvShare;
    const band = robustBand(base, floor);
    return band ? pointOf(date, value, band) : undefined;
  }

  private effort(date: string): EffectPoint | undefined {
    const { logs, program } = this.input;
    const mine = logs.filter((l) => l.completedDate === date).map((l) => effortScore(l, this.templateById, program, this.effortCache)).filter((v): v is number => v !== undefined);
    if (mine.length === 0) return undefined;
    const from = addDays(date, -BASELINE_DAYS);
    const base = logs
      .filter((l) => l.completedDate >= from && l.completedDate < date && !this.recorded.has(l.completedDate))
      .map((l) => effortScore(l, this.templateById, program, this.effortCache))
      .filter((v): v is number => v !== undefined);
    if (base.length < MIN_BASELINE_TRAININGS) return undefined;
    const band = robustBand(base, () => BAND_FLOOR.effort);
    return band ? pointOf(date, mean(mine), band) : undefined;
  }

  // Hartslag bij een rustig tempo: de bestaande vergelijking met je eerdere rustige loopjes
  // (comparableLogs), zonder loopjes op andere vastgelegde ochtenden. Het verschil in
  // tempo bij dezelfde hartslag gaat om naar slagen bij hetzelfde tempo, en de band is de
  // ruis van één loopje (NOISE.efficiencyPct).
  private paceHr(date: string): EffectPoint | undefined {
    const { run, logs, templates, program } = this.input;
    if (!run) return undefined;
    const diffs: { diff: number; center: number }[] = [];
    for (const subject of logs.filter((l) => l.completedDate === date && l.detail)) {
      const ctx: ComparisonContext = {
        logs: logs.filter((l) => l.id === subject.id || !this.recorded.has(l.completedDate)),
        templates,
        program,
        hr: run.hr,
        legs: run.legs,
        chestStrap: run.chestStrap,
      };
      if (!isEasyPlanned(subject, ctx)) continue;
      const cmp = comparableLogs(subject, 'efficiency', ctx);
      if (!cmp.enough || cmp.referenceHr === undefined) continue;
      const zone = zoneBpm(2, run.hr);
      const value = (l: SessionLog) => {
        const r = efficiencyOf(l.detail, cmp.referenceHr as number, zone, windowOf('efficiency', l.detail?.movingSec ?? 0));
        return isUnavailable(r) ? undefined : r;
      };
      const mine = value(subject);
      const earlier = cmp.logs.map(value).filter((v): v is NonNullable<typeof v> => !!v);
      const base = baselineOf(earlier.map((v) => v.paceAtRefSec));
      if (!mine || !base) continue;
      const centerHr = median(earlier.map((v) => v.blockHeartRate));
      diffs.push({ diff: centerHr * (mine.paceAtRefSec / base.median - 1), center: centerHr });
    }
    if (diffs.length === 0) return undefined;
    const center = mean(diffs.map((d) => d.center));
    const diff = mean(diffs.map((d) => d.diff));
    return pointOf(date, center + diff, { center, half: (center * NOISE.efficiencyPct) / 100 });
  }
}

// --- per reden en meting -----------------------------------------------------------------------

function summarize(group: ReasonGroup, measure: InfluenceMeasure, points: EffectPoint[]): ReasonEffect {
  const count = points.length;
  const meanDiff = mean(points.map((p) => p.diff));
  const outsideCount = points.filter((p) => p.outside).length;
  const halfBand = mean(points.map((p) => p.high - p.center));
  const enough = count >= MIN_TIMES;
  return {
    group,
    measure,
    points,
    count,
    enough,
    meanDiff,
    meanValue: mean(points.map((p) => p.value)),
    meanCenter: mean(points.map((p) => p.center)),
    outsideCount,
    halfBand,
    clear: enough && outsideCount / count >= CLEAR_SHARE && Math.abs(meanDiff) > halfBand,
  };
}

// Alles wat uit te rekenen valt: per groep en meting, ook onder de 3 keer (met het aantal).
export function influenceEffects(input: EffectsInput, calc: InfluenceCalculator = new InfluenceCalculator(input)): ReasonEffect[] {
  const out: ReasonEffect[] = [];
  const occurrences = occurrencesOf(input.entries);
  const groups = new Map<string, ReasonGroup>();
  for (const o of occurrences) groups.set(o.group.key, o.group);
  for (const group of groups.values()) {
    const mornings = occurrences.filter((o) => o.group.key === group.key).map((o) => o.morning).sort();
    for (const measure of MEASURES) {
      const points = mornings.map((m) => calc.pointAt(measure, m)).filter((p): p is EffectPoint => !!p);
      if (points.length > 0) out.push(summarize(group, measure, points));
    }
  }
  return out;
}

// De redenen van één meting met 3 keer of meer, het grootste verschil eerst.
export function shownFor(effects: ReasonEffect[], measure: InfluenceMeasure): ReasonEffect[] {
  return effects
    .filter((e) => e.measure === measure && e.enough)
    .sort((a, b) => Math.abs(b.meanDiff) - Math.abs(a.meanDiff) || a.group.name.localeCompare(b.group.name, 'nl'));
}

// Geen enkele reden heeft bij een meting 3 keer: de kaart toont de lege toestand.
export function hasAnythingToShow(effects: ReasonEffect[]): boolean {
  return effects.some((e) => e.enough);
}

// "wiet (2 keer), laat gegeten (1 keer)": wat nog te weinig is om iets over te zeggen.
export function tooFewLine(entries: InfluenceEntry[]): string | undefined {
  const few = recordedCounts(entries).filter((c) => c.count < MIN_TIMES);
  if (few.length === 0) return undefined;
  const text = few.map((c) => `${c.group.name.charAt(0).toLowerCase()}${c.group.name.slice(1)} (${c.count} keer)`).join(', ');
  return `Nog te weinig om iets te zeggen: ${text}. Vanaf ${MIN_TIMES} keer staan ze hier.`;
}

// De redenen van een groep, per meting, voor het blad.
export function effectsOfGroup(effects: ReasonEffect[], key: string): Map<InfluenceMeasure, ReasonEffect> {
  return new Map(effects.filter((e) => e.group.key === key).map((e) => [e.measure, e]));
}

// De hoeveelheden alcohol met hoe vaak elk is vastgelegd, voor de strook bovenaan het blad.
export function alcoholAmounts(entries: InfluenceEntry[]): { amount: AlcoholAmount; count: number }[] {
  const counts = new Map<AlcoholAmount, number>();
  for (const o of occurrencesOf(entries)) {
    if (o.group.reason === 'alcohol' && o.group.amount) counts.set(o.group.amount, (counts.get(o.group.amount) ?? 0) + 1);
  }
  return (['weinig', 'matig', 'veel'] as AlcoholAmount[]).map((amount) => ({ amount, count: counts.get(amount) ?? 0 }));
}

// --- woorden -----------------------------------------------------------------------------------------

const MINUS = '−';

export function signed(value: number, decimals = 0): string {
  const f = 10 ** decimals;
  const r = Math.round(value * f) / f;
  const text = Math.abs(r).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  return r === 0 ? text : `${r > 0 ? '+' : MINUS}${text}`;
}

export function decimalsFor(measure: InfluenceMeasure): number {
  return measure === 'effort' ? 1 : 0;
}

// "Alle 4 keer buiten je schommeling", "3 van de 4 keer buiten je schommeling".
export function outsideSentence(e: ReasonEffect): string {
  if (e.outsideCount === 0) return `Alle ${e.count} keer binnen je schommeling.`;
  if (e.outsideCount === e.count) return `Alle ${e.count} keer buiten je schommeling.`;
  return `${e.outsideCount} van de ${e.count} keer buiten je schommeling.`;
}

// "6 u 40"
export function hoursMinutes(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} u` : `${h} u ${m}`;
}

// De helft van de schaal voor een lijst redenen: genoeg voor de grootste afwijking en de band.
export function scaleFor(effects: ReasonEffect[]): number {
  const largest = Math.max(0, ...effects.flatMap((e) => [e.halfBand, ...e.points.map((p) => Math.abs(p.diff)), Math.abs(e.meanDiff)]));
  return largest > 0 ? largest * 1.15 : 1;
}

export function describeEffect(e: ReasonEffect): string {
  const unit = MEASURE_UNIT[e.measure].many;
  return `${e.group.name}, ${MEASURE_LABEL[e.measure]}: ${e.count} keer, ${e.outsideCount} buiten je schommeling, gemiddeld ${signed(e.meanDiff, decimalsFor(e.measure))} ${unit}.`;
}

// "4 keer · elke keer erbuiten", "6 keer · 3 keer erbuiten", "3 keer · binnen je schommeling".
export function countLine(e: ReasonEffect): string {
  const tail = e.outsideCount === 0 ? 'binnen je schommeling' : e.outsideCount === e.count ? 'elke keer erbuiten' : `${e.outsideCount} keer erbuiten`;
  return `${e.count} keer \u00b7 ${tail}`;
}

const SLEEP_NOTE = 'Je horloge schat slaap ruw; de duur is betrouwbaarder dan de fasen.';

// Eén feitelijke zin (of twee) onder de strook van een meting in het blad. Geen oordeel.
export function factSentence(e: ReasonEffect): string {
  const outside = outsideSentence(e);
  switch (e.measure) {
    case 'hrv': {
      const pct = e.meanCenter > 0 ? Math.round((Math.abs(e.meanDiff) / e.meanCenter) * 100) : 0;
      const share = pct >= 1 ? ` Dat is ${pct}% ${e.meanDiff < 0 ? 'onder' : 'boven'} je gemiddelde van ${Math.round(e.meanCenter)} ms.` : '';
      return `${outside}${share}`;
    }
    case 'sleep':
      return `Gemiddeld ${hoursMinutes(e.meanValue)} tegen ${hoursMinutes(e.meanCenter)}. ${outside} ${SLEEP_NOTE}`;
    case 'paceHr':
      return `Op ${e.count} rustige loopjes, vergeleken met je eerdere rustige loopjes bij hetzelfde tempo. ${outside}`;
    case 'effort':
      return `${outside} Gemeten tegen wat er gepland stond.`;
    default:
      return outside;
  }
}

const FEW_NOUN: Record<InfluenceMeasure, [string, string]> = {
  restingHr: ['ochtend met een rusthartslag', 'ochtenden met een rusthartslag'],
  hrv: ['ochtend met een HRV', 'ochtenden met een HRV'],
  sleep: ['nacht met slaap', 'nachten met slaap'],
  paceHr: ['rustig loopje om mee te vergelijken', 'rustige loopjes om mee te vergelijken'],
  effort: ['training met een zwaarte', 'trainingen met een zwaarte'],
};

// Onder de 3 keer: geen strook, alleen hoeveel er is.
export function fewLine(measure: InfluenceMeasure, count: number): string {
  if (count === 0) return `Nog niets om te vergelijken. Vanaf ${MIN_TIMES} staat het hier.`;
  return `Nog te weinig: ${count} ${FEW_NOUN[measure][count === 1 ? 0 : 1]}. Vanaf ${MIN_TIMES} staat het hier.`;
}

export type HeadlinePart = { text: string } | { num: string };

const DIRECTION: Record<InfluenceMeasure, [string, string]> = {
  restingHr: ['hoger', 'lager'],
  hrv: ['hoger', 'lager'],
  paceHr: ['hoger', 'lager'],
  sleep: ['langer', 'korter'],
  effort: ['zwaarder', 'lichter'],
};

function lead(group: ReasonGroup): { before: string; num?: string; after: string } {
  switch (group.reason) {
    case 'alcohol':
      return group.amount ? { before: 'Na ', num: AMOUNT_LABEL[group.amount], after: ' glazen' } : { before: 'Na alcohol', after: '' };
    case 'wiet':
      return { before: 'Na wiet', after: '' };
    case 'ziek':
      return { before: 'Als je ziek was', after: '' };
    case 'kort_geslapen':
      return { before: 'Na een korte nacht', after: '' };
    case 'laat_gegeten':
      return { before: 'Na laat eten', after: '' };
    case 'cafeine':
      return { before: 'Met cafeïne', after: '' };
    case 'stress':
      return { before: 'Bij stress', after: '' };
    case 'warm':
      return { before: 'Bij warmte', after: '' };
    case 'zware_beendag':
      return { before: 'Na een zware beendag', after: '' };
    default:
      return { before: `Bij ${group.label ? `"${group.label}"` : 'iets anders'}`, after: '' };
  }
}

// De kopzin van het blad, alleen met wat duidelijk buiten je band valt. Getallen apart,
// zodat ze in Inter kunnen staan. Zonder zo'n meting: undefined.
export function headline(group: ReasonGroup, byMeasure: Map<InfluenceMeasure, ReasonEffect>): HeadlinePart[] | undefined {
  const clear = MEASURES.map((m) => byMeasure.get(m)).filter((e): e is ReasonEffect => !!e && e.clear);
  if (clear.length === 0) return undefined;
  const parts: HeadlinePart[] = [];
  const l = lead(group);
  parts.push({ text: l.before });
  if (l.num) parts.push({ num: l.num });
  if (l.after) parts.push({ text: l.after });
  clear.forEach((e, i) => {
    const up = e.meanDiff > 0;
    const dir = DIRECTION[e.measure][up ? 0 : 1];
    const first = i === 0;
    const n = (v: number, d: number) => Math.abs(Math.round(v * 10 ** d) / 10 ** d).toLocaleString('nl-NL', { maximumFractionDigits: d });
    const sep = first ? ' ' : i === clear.length - 1 ? ' en ' : ', ';
    switch (e.measure) {
      case 'restingHr':
        parts.push({ text: `${sep}${first ? 'ligt je rusthartslag de ochtend erna gemiddeld ' : 'je rusthartslag '}` }, { num: n(e.meanDiff, 0) }, { text: ` ${dir}` });
        break;
      case 'hrv':
        parts.push({ text: `${sep}${first ? 'ligt je HRV gemiddeld ' : 'je HRV '}` }, { num: n(e.meanDiff, 0) }, { text: ` ms ${dir}` });
        break;
      case 'paceHr':
        parts.push({ text: `${sep}${first ? 'ligt je hartslag bij een rustig tempo gemiddeld ' : 'je hartslag bij een rustig tempo '}` }, { num: n(e.meanDiff, 0) }, { text: ` ${dir}` });
        break;
      case 'sleep':
        parts.push({ text: `${sep}${first ? 'slaap je gemiddeld ' : 'je slaapt '}` }, { num: n(e.meanDiff, 0) }, { text: ` minuten ${dir}` });
        break;
      case 'effort':
        parts.push({ text: `${sep}${first ? 'voelt een training gemiddeld ' : 'een training '}` }, { num: n(e.meanDiff, 1) }, { text: ` punt ${dir}` });
        break;
    }
  });
  parts.push({ text: '.' });
  return parts;
}

// --- wat het onderzoek vindt -----------------------------------------------------------------------
// Alleen voor alcohol en wiet en alleen getallen die in de onderzoeksdocumenten staan:
// Alcohol en herstel.md (hoofdstuk 2, "Samen per hoeveelheid") en Cannabis en training.md.

const ALCOHOL_RESEARCH: Partial<Record<AlcoholAmount, Partial<Record<InfluenceMeasure, string>>>> = {
  weinig: {
    restingHr: 'Onderzoek vindt bij 1 à 2 glazen 1 tot 3 slagen hoger.',
    hrv: 'Onderzoek vindt bij 1 à 2 glazen 2 tot 7 ms lager (ongeveer 3 tot 10%).',
  },
  matig: {
    restingHr: 'Onderzoek vindt bij 3 tot 5 glazen 4 tot 8 slagen hoger.',
    hrv: 'Onderzoek vindt bij 3 tot 5 glazen 6 tot 15 ms lager (10 tot 25%).',
  },
  veel: {
    restingHr: 'Onderzoek vindt bij 6 of meer glazen 8 tot 15 slagen hoger.',
    hrv: 'Onderzoek vindt bij 6 of meer glazen 13 tot 25 ms lager (20 tot 40%).',
  },
};

const WIET_RESEARCH: Partial<Record<InfluenceMeasure, string>> = {
  paceHr: 'Onderzoek vindt bij wekelijkse gebruikers op de fiets 14 tot 18 slagen hoger bij een rustig tempo.',
  restingHr: 'Voor de ochtend erna geven cijfers van een fabrikant ongeveer 1 slag hoger. Dat is zwak bewijs.',
  hrv: 'Voor de ochtend erna geven cijfers van een fabrikant ongeveer 2,8 ms lager. Dat is zwak bewijs.',
};

export function researchLine(group: ReasonGroup, measure: InfluenceMeasure): string | undefined {
  if (group.reason === 'alcohol' && group.amount) return ALCOHOL_RESEARCH[group.amount]?.[measure];
  if (group.reason === 'wiet') return WIET_RESEARCH[measure];
  return undefined;
}

// --- "lijkt op" --------------------------------------------------------------------------------------

export const LOOKS_LIKE_MIN = 4;

export interface LooksLike {
  group: ReasonGroup;
  measure: InfluenceMeasure;
  // Hoe vaak de reden met getallen is vastgelegd, en de andere keren samen.
  times: number;
  otherTimes: number;
}

export interface LooksLikeInput extends EffectsInput {
  // Alleen bij 'patroon' (of afwezig) komt er een antwoord.
  cause: 'uit' | 'weet' | 'patroon' | undefined;
  measure: InfluenceMeasure;
  // De ochtend van nu (of de dag, bij zwaarte en hartslag bij tempo).
  date: string;
}

const rangeOf = (values: number[]) => ({ low: Math.min(...values), high: Math.max(...values) });

// Zegt alleen dat de waarde van nu lijkt op wat bij een reden hoorde als die reden minstens
// 4 keer met getallen is vastgelegd, de andere ochtenden samen ook, de twee banden elkaar niet
// raken, en de waarde van nu in de band van de reden valt en buiten de andere. Alleen met je
// eigen keren, ook bij wiet: nooit met getallen uit het onderzoek. Anders: niets.
export function looksLike(input: LooksLikeInput): LooksLike | undefined {
  if (input.cause === 'uit' || input.cause === 'weet') return undefined;
  const calc = new InfluenceCalculator(input);
  const now = calc.pointAt(input.measure, input.date);
  if (!now) return undefined;
  const occurrences = occurrencesOf(input.entries).filter((o) => o.morning !== input.date);
  const groups = new Map<string, ReasonGroup>();
  for (const o of occurrences) groups.set(o.group.key, o.group);
  const diffOf = (morning: string) => calc.pointAt(input.measure, morning)?.diff;
  let best: (LooksLike & { gap: number }) | undefined;
  for (const group of groups.values()) {
    const own = new Set(occurrences.filter((o) => o.group.key === group.key).map((o) => o.morning));
    const ownDiffs = [...own].map(diffOf).filter((v): v is number => v !== undefined);
    const otherMornings = new Set(occurrences.filter((o) => !own.has(o.morning)).map((o) => o.morning));
    const otherDiffs = [...otherMornings].map(diffOf).filter((v): v is number => v !== undefined);
    if (ownDiffs.length < LOOKS_LIKE_MIN || otherDiffs.length < LOOKS_LIKE_MIN) continue;
    const a = rangeOf(ownDiffs);
    const b = rangeOf(otherDiffs);
    const apart = a.high < b.low || b.high < a.low;
    if (!apart) continue;
    const inOwn = now.diff >= a.low && now.diff <= a.high;
    const inOther = now.diff >= b.low && now.diff <= b.high;
    if (!inOwn || inOther) continue;
    const gap = a.high < b.low ? b.low - a.high : a.low - b.high;
    if (!best || ownDiffs.length > best.times || (ownDiffs.length === best.times && gap > best.gap)) {
      best = { group, measure: input.measure, times: ownDiffs.length, otherTimes: otherDiffs.length, gap };
    }
  }
  if (!best) return undefined;
  return { group: best.group, measure: best.measure, times: best.times, otherTimes: best.otherTimes };
}

// De twee regels in het blad van een training: wat het lijkt, en waar dat op steunt. Geen
// percentage en geen "waarschijnlijk": het aantal keer en dat ASCEND het niet zeker weet.
export function looksLikeText(l: LooksLike): { title: string; line: string } {
  const name = l.group.label ? l.group.name : l.group.name.charAt(0).toLowerCase() + l.group.name.slice(1);
  return {
    title: `Lijkt op je loopjes bij ${name}`,
    line: `Uit ${l.times} keer met die reden en ${l.otherTimes} keer zonder. Zeker weten doet ASCEND het niet.`,
  };
}
