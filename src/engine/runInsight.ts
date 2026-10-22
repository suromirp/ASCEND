// ASCEND: the two lines after a run or tocht: one thing that went better and at
// most one to watch.
//
// This is the choice, not the arithmetic (engine/runMetrics.ts) and not the
// material (engine/runComparison.ts). The rules, from
// docs/onderzoek/Loopgegevens en vooruitgang.md (hoofdstuk 4):
//
// 1. Which topics apply depends on the kind of training. An easy run under 60
//    minutes: efficiency and form. A long run: drift, efficiency (on the first 40
//    minutes) and form. A tocht with a climb or descent: climbing and descending.
//    A tempo run, interval, test, race, strength or treadmill run: nothing, and
//    an empty result is fine.
// 2. A topic only speaks when the comparison material is there. If something
//    falls out, there is no line for that topic and the reason is kept.
// 3. The difference is divided by the noise of that measure; only 1.5 times it or
//    more counts. (Drift and form have their own thresholds from the research.)
// 4. When the weather can explain the direction, there is no Beter or Let op for
//    that topic, only the sentence that the weather played a part.
// 5. Beter is the topic with the biggest positive strength, Let op the one with
//    the biggest negative one. Ties: drift, efficiency, climbing, descending, form.
// 6. At most two lines, never two about one topic. With no line at all, one sentence:
//    "Gelijk aan je laatste loopjes", or why it could not be compared.
// 7. A brake against repeating: the same topic with the same tone only after 14
//    days and only when it is at least half a noise unit further.
// 8. Beter never says "je wordt fitter": that word is for the trend over weeks.
// 9. Let op points at one small thing and never at a diagnosis. The plan does not
//    change here; every planning change stays a proposal with Akkoord.
// 10. A pain report, or "Slechter" for the feeling of the same training, makes Let
//     op quiet: a line on top of what is already said is superfluous.
//
// Descending gives facts only, no verdict (owner's decision, 22 October 2026).
//
// Pure: no React, no IndexedDB.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { TrendPoint } from './readiness';
import { logSport } from './sports';
import { formatNumberNL } from '../utils/number';
import { addDays } from '../utils/dates';
import { zoneBpm, type HeartRateSettings } from './heartRateZones';
import { formatPace } from './aerobicTrend';
import type { LegFatigueInputs } from './legFatigue';
import { resolveRunInsight, type InsightTopicSwitch, type RunInsightSettings } from './runInsightSettings';
import {
  baselineOf,
  comparableLogs,
  isEasyPlanned,
  median,
  windowOf,
  WINDOW_DAYS,
  type ComparisonContext,
  type InsightTopic,
  type NotComparable,
} from './runComparison';
import {
  NOISE,
  STRENGTH_FOR_A_LINE,
  climbsOf,
  descentsOf,
  driftOf,
  efficiencyOf,
  formOf,
  isUnavailable,
  LONG_RUN_SEC,
  type ClimbFact,
} from './runMetrics';

export type { InsightTopic } from './runComparison';

export type InsightTone = 'better' | 'watch' | 'fact';

export interface InsightLine {
  topic: InsightTopic;
  tone: InsightTone;
  // The word on the sheet and the small heading in the card.
  word: 'Beter' | 'Let op' | 'Bergaf';
  // The name of the topic: "Efficiëntie", "Lange dagen", "Bergop", "Bergaf", "Pas en vorm".
  title: string;
  // One or two Dutch sentences, no dashes.
  text: string;
  // Signed, in `unit`; positive = better.
  change: number;
  unit: 'sPerKm' | 'pctPoints' | 'pct' | 'bpm' | 'ms';
  // The change divided by the noise of this measure; positive = better.
  strength: number;
  // Today, the middle of the earlier ones and the difference, as text for the sheet.
  figures: { today: string; middle: string; difference: string; todayLabel: string; middleLabel: string };
  // The earlier ones as dots (oldest first) and this one last. Higher = better.
  series: (TrendPoint & { current?: boolean })[];
  // How to read a value of the series: pace as m:ss, a percentage or metres per hour.
  seriesFormat: 'pace' | 'percent' | 'metresPerHour' | 'ms';
  // "Hoe sterk is dit?" and "Wat het kan betekenen", in plain words.
  strengthText: string;
  meaning: string;
  basis: { logIds: string[]; criteria: string[]; notes: string[] };
}

// What the sheet "Waarom" needs; an InsightLine fits it, and so does a row of the
// trend on Je stand (engine/runTrends.ts).
export type SheetModel = Pick<InsightLine, 'topic' | 'title' | 'figures' | 'series' | 'seriesFormat' | 'strengthText' | 'meaning' | 'basis'> & { word: string };

export interface RunInsight {
  better?: InsightLine;
  watch?: InsightLine;
  // A fact that fills a free place (descending).
  fact?: InsightLine;
  // "Gelijk aan je laatste loopjes", "Niet te vergelijken ...", or that the weather played a part.
  note?: string;
  // What could not be compared, per topic, for the small line under the sheet.
  notCompared?: { topic: InsightTopic; reason: NotComparable; text: string }[];
}

// What was shown after earlier trainings, for the brake.
export interface ShownInsight {
  logId: string;
  topic: InsightTopic;
  tone: InsightTone;
  date: string;
  strength: number;
}

export interface RunInsightInput {
  log: SessionLog;
  logs: SessionLog[];
  templates: SessionTemplate[];
  program: Program | null | undefined;
  hr: HeartRateSettings | undefined;
  legs: LegFatigueInputs;
  settings: RunInsightSettings | undefined;
  // The switch "Details van loopjes en tochten": off means not shown, not counted.
  detailsOn: boolean;
  shown?: ShownInsight[];
  today: string;
}

export const BRAKE_DAYS = 14;
export const BRAKE_FURTHER = 0.5;

const TITLE: Record<InsightTopic, string> = {
  efficiency: 'Efficiëntie',
  drift: 'Lange dagen',
  climb: 'Bergop',
  descent: 'Bergaf',
  form: 'Pas en vorm',
};

const TOPIC_SWITCH: Record<InsightTopic, InsightTopicSwitch> = {
  efficiency: 'efficiency',
  drift: 'longDays',
  climb: 'climbing',
  descent: 'climbing',
  form: 'form',
};

// Tie order of rule 5.
const ORDER: InsightTopic[] = ['drift', 'efficiency', 'climb', 'descent', 'form'];

const NUMBER_WORD: Record<number, string> = { 3: 'drie', 4: 'vier', 5: 'vijf' };
const count = (n: number) => NUMBER_WORD[n] ?? String(n);
const num = (n: number, decimals = 0) => formatNumberNL(n, decimals);
const rounded = (n: number) => Math.round(n);

// --- which topics apply -------------------------------------------------------------------

export function topicsFor(log: SessionLog, ctx: Pick<ComparisonContext, 'templates' | 'program'>): InsightTopic[] {
  const sport = logSport(log);
  if (!log.detail) return [];
  const treadmill = (log.cardioData ?? log.outdoorData)?.environment === 'treadmill';
  if (treadmill) return [];
  if (sport === 'hiking') return log.detail.stretches.length > 0 ? ['climb', 'descent'] : [];
  if (sport !== 'running' || !isEasyPlanned(log, ctx)) return [];
  return log.detail.movingSec >= LONG_RUN_SEC ? ['drift', 'efficiency', 'form'] : ['efficiency', 'form'];
}

// --- words ----------------------------------------------------------------------------------------------

export function reasonText(reason: NotComparable, noun: string): string {
  switch (reason.code) {
    case 'temperature': {
      const d = reason.diffC ?? 0;
      return `het was ${Math.abs(d)} graden ${d >= 0 ? 'warmer' : 'kouder'}`;
    }
    case 'windy':
      return 'het woei veel';
    case 'rainy':
      return 'het regende veel';
    case 'legsTired':
      return 'je benen waren niet uitgerust';
    case 'heartRateSource':
      return 'je hartslag kwam niet altijd van dezelfde bron';
    case 'tooFew':
      return reason.count ? `er zijn nog te weinig vergelijkbare ${noun}` : `er zijn nog geen vergelijkbare ${noun}`;
    case 'treadmill':
      return 'een loopband heeft zijn eigen cijfers';
    case 'noDetail':
      return 'de details van deze training ontbreken';
    case 'otherKind':
      return 'dit was een andere soort training';
    case 'noMatch':
      return 'er is geen eerdere klim op dezelfde helling en met hetzelfde rugzakgewicht';
    case 'unavailableMetric':
      switch (reason.metric) {
        case 'noSteadyBlock':
          return 'er was geen vlak, rustig stuk van 15 minuten';
        case 'noHeartRate':
          return 'er is geen hartslag bewaard';
        case 'hilly':
          return 'de route was te heuvelachtig';
        case 'outsideZone':
          return 'je hartslag lag buiten zone 2';
        case 'noStretch':
          return 'er was geen klim of daling om mee te vergelijken';
        case 'altitudeDisagrees':
          return 'de hoogtemeting wijkt te veel af van die van je horloge';
        case 'noDynamics':
          return 'je horloge gaf geen loopvorm';
        case 'paceChanged':
          return 'je tempo veranderde te veel';
        default:
          return 'de loop was te kort';
      }
  }
}

const PRIORITY: NotComparable['code'][] = ['windy', 'rainy', 'temperature', 'legsTired', 'heartRateSource', 'noMatch', 'unavailableMetric', 'treadmill', 'noDetail', 'otherKind'];

// The one reason worth telling: the one that took the most earlier trainings out,
// and "too few" when it is just that there were not many.
export function mainReason(reasons: NotComparable[]): NotComparable | undefined {
  if (reasons.length === 0) return undefined;
  if (reasons.length === 1) return reasons[0];
  const tooFew = reasons.find((r) => r.code === 'tooFew');
  const others = reasons.filter((r) => r.code !== 'tooFew').sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || PRIORITY.indexOf(a.code) - PRIORITY.indexOf(b.code));
  const top = others[0];
  if (top && (!tooFew || (top.count ?? 0) > (tooFew.count ?? 0))) return top;
  return tooFew ?? top;
}

function strengthWords(strength: number): string {
  const s = Math.abs(strength);
  if (s >= 3) return 'meer dan drie keer zo groot';
  if (s >= 2) return 'ruim twee keer zo groot';
  return 'ruim anderhalf keer zo groot';
}

const dateLabel = (iso: string) => `${Number(iso.slice(8, 10))}-${Number(iso.slice(5, 7))}`;

function basisFor(logs: SessionLog[], noun: string, extra: string[] = [], notes: string[] = []): InsightLine['basis'] {
  const criteria = [`${logs.length} ${noun} in de laatste ${WINDOW_DAYS / 7} weken`, ...extra];
  const temps = [...logs.map((l) => l.detail?.conditions?.tempC)].filter((t): t is number => t !== undefined);
  if (temps.length >= 2) {
    const lo = rounded(Math.min(...temps));
    const hi = rounded(Math.max(...temps));
    criteria.push(lo === hi ? `rond ${lo} graden` : `tussen ${lo} en ${hi} graden`);
  }
  return { logIds: logs.map((l) => l.id), criteria, notes };
}

function weatherNote(subject: SessionLog, logs: SessionLog[]): string | undefined {
  const own = subject.detail?.conditions;
  const mine = own ? (own.feelsC ?? own.tempC) : undefined;
  const theirs = logs.map((l) => l.detail?.conditions).map((c) => (c ? (c.feelsC ?? c.tempC) : undefined)).filter((v): v is number => v !== undefined);
  if (mine === undefined || theirs.length === 0) return undefined;
  const diff = rounded(mine - median(theirs));
  return `Het was ${Math.abs(diff)} graden ${diff >= 0 ? 'warmer' : 'kouder'} dan bij je laatste loopjes. Dat kan het verschil verklaren.`;
}

// --- one topic ----------------------------------------------------------------------------------------------

interface TopicResult {
  line?: InsightLine;
  // The comparison was possible and found nothing worth a line.
  compared?: boolean;
  reason?: NotComparable;
  weather?: string;
}

function efficiencyTopic(input: RunInsightInput, ctx: ComparisonContext): TopicResult {
  const { log } = input;
  const cmp = comparableLogs(log, 'efficiency', ctx);
  const reason = mainReason(cmp.reasons);
  if (!cmp.enough || cmp.referenceHr === undefined) return { reason };
  const zone = zoneBpm(2, input.hr);
  const value = (l: SessionLog) => {
    const r = efficiencyOf(l.detail, cmp.referenceHr as number, zone, windowOf('efficiency', l.detail?.movingSec ?? 0));
    return isUnavailable(r) ? undefined : r;
  };
  const mine = value(log);
  const earlier = cmp.logs.map((l) => ({ l, v: value(l) })).filter((x): x is { l: SessionLog; v: NonNullable<ReturnType<typeof value>> } => !!x.v);
  const base = baselineOf(earlier.map((x) => x.v.paceAtRefSec));
  if (!mine || !base) return { compared: false, reason };
  const sec = mine.paceAtRefSec - base.median;
  const pct = (sec / base.median) * 100;
  const strength = -pct / NOISE.efficiencyPct;
  const long = log.detail!.movingSec >= LONG_RUN_SEC;
  const noun = long ? 'loopjes' : 'rustige loopjes';
  const hrs = earlier.map((x) => x.v.blockHeartRate);
  const series: InsightLine['series'] = [...earlier].reverse().map((x) => ({ label: dateLabel(x.l.completedDate), value: -x.v.paceAtRefSec }));
  series.push({ label: dateLabel(log.completedDate), value: -mine.paceAtRefSec, current: true });
  const tone: InsightTone | undefined = strength >= STRENGTH_FOR_A_LINE ? 'better' : strength <= -STRENGTH_FOR_A_LINE ? 'watch' : undefined;
  if (!tone) return { compared: true };
  const n = base.n;
  const seconds = Math.abs(rounded(sec));
  const line: InsightLine = {
    topic: 'efficiency',
    tone,
    word: tone === 'better' ? 'Beter' : 'Let op',
    title: TITLE.efficiency,
    text:
      tone === 'better'
        ? `Bij dezelfde hartslag liep je ${seconds} seconden per km sneller dan je laatste ${count(n)} ${noun}.`
        : `Bij dezelfde hartslag liep je ${seconds} seconden per km trager dan je laatste ${count(n)} ${noun}. Eén loopje zegt weinig; kijk of je benen moe waren.`,
    change: -sec,
    unit: 'sPerKm',
    strength,
    figures: {
      todayLabel: 'Vandaag',
      middleLabel: `Je laatste ${count(n)}`,
      today: `${formatPace(mine.paceAtRefSec)} per km`,
      middle: `${formatPace(base.median)} per km`,
      difference: `${seconds} s per km ${tone === 'better' ? 'sneller' : 'trager'}`,
    },
    series,
    seriesFormat: 'pace',
    strengthText: `Eén loopje schommelt zelf zo'n 3 tot 4 procent. Dit verschil is ${num(Math.abs(pct), 1)} procent, ${strengthWords(strength)}, dus de moeite waard, maar de trend op Je stand zegt meer.`,
    meaning:
      tone === 'better'
        ? 'Bij hetzelfde tempo had je hart minder werk, of bij dezelfde hartslag ging je sneller. Eén loop is geen fitheid; die zie je pas in de trend over weken.'
        : 'Je hart had meer werk bij hetzelfde tempo. Dat gebeurt na slecht slapen, bij warmte of met moe gelopen benen. Eén loopje zegt weinig; neem de komende dagen rustig aan en kijk naar de trend.',
    basis: basisFor(
      earlier.map((x) => x.l),
      noun,
      ['vlak en rustig', rounded(Math.min(...hrs)) === rounded(Math.max(...hrs)) ? `hartslag rond ${rounded(hrs[0])}` : `hartslag ${rounded(Math.min(...hrs))} tot ${rounded(Math.max(...hrs))}`],
      cmp.verdict === 'explains-worse' || cmp.verdict === 'explains-better' ? [weatherNote(log, cmp.logs) ?? ''].filter(Boolean) : [],
    ),
  };
  return withWeather({ line }, cmp.verdict, log, cmp.logs);
}

// Rule 4: when the weather can explain the direction, there is no line for that
// topic, only the sentence that the weather played a part.
function withWeather(result: TopicResult, verdict: ReturnType<typeof comparableLogs>['verdict'], log: SessionLog, logs: SessionLog[]): TopicResult {
  const line = result.line;
  if (!line || line.tone === 'fact') return result;
  const explains = (verdict === 'explains-worse' && line.tone === 'watch') || (verdict === 'explains-better' && line.tone === 'better');
  if (!explains) return result;
  return { compared: true, weather: weatherNote(log, logs) };
}

function driftTopic(input: RunInsightInput, ctx: ComparisonContext): TopicResult {
  const { log } = input;
  const cmp = comparableLogs(log, 'drift', ctx);
  const reason = mainReason(cmp.reasons);
  if (!cmp.enough) return { reason };
  const mine = driftOf(log.detail);
  if (isUnavailable(mine)) return { reason };
  const earlier = cmp.logs.map((l) => ({ l, d: driftOf(l.detail) })).filter((x): x is { l: SessionLog; d: Exclude<ReturnType<typeof driftOf>, { unavailable: unknown }> } => !isUnavailable(x.d));
  const base = baselineOf(earlier.map((x) => x.d.percent));
  if (!base) return { reason };
  // Own thresholds of the research: 3 points lower is Beter; over 8 percent and
  // at least 3 points above the middle is Let op.
  const lower = base.median - mine.percent;
  const better = lower >= 3;
  const watch = mine.percent > 8 && mine.percent - base.median >= 3;
  if (!better && !watch) return { compared: true };
  const strength = lower / NOISE.driftPoints;
  const series: InsightLine['series'] = [...earlier].reverse().map((x) => ({ label: dateLabel(x.l.completedDate), value: -x.d.percent }));
  series.push({ label: dateLabel(log.completedDate), value: -mine.percent, current: true });
  const tone: InsightTone = better ? 'better' : 'watch';
  const line: InsightLine = {
    topic: 'drift',
    tone,
    word: better ? 'Beter' : 'Let op',
    title: TITLE.drift,
    text: better
      ? `Je tempo per hartslag zakte in de tweede helft ${num(Math.max(0, mine.percent), 1)} procent, tegen ${num(base.median, 1)} procent bij je laatste ${count(base.n)} lange loopjes.`
      : `Je tempo per hartslag zakte in de tweede helft ${num(mine.percent, 1)} procent, meer dan de ${num(base.median, 1)} procent van je laatste ${count(base.n)} lange loopjes. Eet en drink bij een lange loop eerder, of begin wat rustiger.`,
    change: lower,
    unit: 'pctPoints',
    strength,
    figures: {
      todayLabel: 'Vandaag',
      middleLabel: `Je laatste ${count(base.n)}`,
      today: `${num(mine.percent, 1)}%`,
      middle: `${num(base.median, 1)}%`,
      difference: `${num(Math.abs(lower), 1)} procentpunt ${lower > 0 ? 'lager' : 'hoger'}`,
    },
    series,
    seriesFormat: 'percent',
    strengthText: `Drift schommelt per loop zo'n 3 procentpunten en verschilt sterk per persoon. Dit verschil is ${num(Math.abs(lower), 1)} procentpunten. Onder de 5 procent noemt een coach goed; dat is een richtlijn en geen gemeten grens.`,
    meaning: better
      ? 'Je hartslag bleef beter bij je tempo in de tweede helft. Dat past bij een dag waarop eten, drinken en tempo klopten.'
      : 'Je hartslag liep in de tweede helft op bij hetzelfde tempo. Dat gebeurt bij warmte, te weinig eten en drinken of een te snel begin. Probeer de volgende lange loop iets rustiger te starten en eerder te eten en te drinken.',
    basis: basisFor(earlier.map((x) => x.l), 'lange loopjes', ['vlak en rustig', 'minstens 45 minuten in een stuk'], cmp.verdict === 'explains-worse' || cmp.verdict === 'explains-better' ? [weatherNote(log, cmp.logs) ?? ''].filter(Boolean) : []),
  };
  return withWeather({ line }, cmp.verdict, log, cmp.logs);
}

function climbTopic(input: RunInsightInput, ctx: ComparisonContext): TopicResult {
  const { log } = input;
  const cmp = comparableLogs(log, 'climb', ctx);
  const reason = mainReason(cmp.reasons);
  if (!cmp.enough) return { reason };
  const mine = climbsOf(log.detail);
  if (isUnavailable(mine)) return { reason };
  // The biggest climb that has earlier ones in its class.
  const forClass = (l: SessionLog, gradeFrom: number): ClimbFact | undefined => {
    const r = climbsOf(l.detail);
    return isUnavailable(r) ? undefined : r.filter((c) => c.gradeFrom === gradeFrom).sort((a, b) => b.metres - a.metres)[0];
  };
  for (const c of [...mine].sort((a, b) => b.metres - a.metres)) {
    const earlier = cmp.logs.map((l) => ({ l, c: forClass(l, c.gradeFrom) })).filter((x): x is { l: SessionLog; c: ClimbFact } => !!x.c);
    const base = baselineOf(earlier.map((x) => x.c.metresPerHour));
    if (!base) continue;
    const baseHr = (() => {
      const hrs = earlier.map((x) => x.c.heartRate).filter((h): h is number => h !== undefined);
      return hrs.length >= 3 ? median(hrs) : undefined;
    })();
    const speedPct = ((c.metresPerHour - base.median) / base.median) * 100;
    const hrDiff = c.heartRate !== undefined && baseHr !== undefined ? c.heartRate - baseHr : undefined;
    // Own assumptions of the research: 8 percent faster with a heart rate that is
    // no more than 4 beats higher, or 5 beats lower at a speed within 5 percent.
    const fasterBetter = speedPct >= 8 && (hrDiff === undefined || hrDiff <= 4);
    const calmerBetter = hrDiff !== undefined && hrDiff <= -5 && Math.abs(speedPct) <= 5;
    const slowerWatch = speedPct <= -8 && hrDiff !== undefined && hrDiff >= 0;
    if (!fasterBetter && !calmerBetter && !slowerWatch) return { compared: true };
    const better = fasterBetter || calmerBetter;
    const strength = fasterBetter ? speedPct / NOISE.climbPct : calmerBetter ? 1.5 + Math.max(0, -hrDiff! - 5) / 10 : speedPct / NOISE.climbPct;
    const mph = rounded(c.metresPerHour);
    const mid = rounded(base.median);
    const hrPhrase = hrDiff === undefined ? '' : hrDiff < -4 ? ', bij een lagere hartslag' : hrDiff <= 4 ? ', bij dezelfde hartslag' : ', bij een hogere hartslag';
    const text = fasterBetter
      ? `Je klom ${rounded(speedPct)} procent sneller, ${mph} meter per uur tegen ${mid}${hrPhrase}.`
      : calmerBetter
        ? `Je klom even snel, ${mph} tegen ${mid} meter per uur, met een hartslag die ${Math.abs(rounded(hrDiff!))} slagen lager lag.`
        : `Je klom ${Math.abs(rounded(speedPct))} procent trager, ${mph} meter per uur tegen ${mid}${hrPhrase}. Neem de volgende klim wat rustiger.`;
    const series: InsightLine['series'] = [...earlier].reverse().map((x) => ({ label: dateLabel(x.l.completedDate), value: x.c.metresPerHour }));
    series.push({ label: dateLabel(log.completedDate), value: c.metresPerHour, current: true });
    const line: InsightLine = {
      topic: 'climb',
      tone: better ? 'better' : 'watch',
      word: better ? 'Beter' : 'Let op',
      title: TITLE.climb,
      text,
      change: c.metresPerHour - base.median,
      unit: 'pct',
      strength,
      figures: {
        todayLabel: 'Vandaag',
        middleLabel: `Je laatste ${count(base.n)}`,
        today: `${mph} m per uur`,
        middle: `${mid} m per uur`,
        difference: `${Math.abs(rounded(speedPct))}% ${speedPct >= 0 ? 'sneller' : 'trager'}`,
      },
      series,
      seriesFormat: 'metresPerHour',
      strengthText: `Klimsnelheid schommelt zelf zo'n 8 procent en hangt sterk af van de helling en je rugzak. Daarom vergelijkt ASCEND alleen klimmen op ${c.gradeFrom} tot ${c.gradeFrom + 4} procent helling en met een rugzak binnen 2 kg. Dit verschil is ${num(Math.abs(speedPct), 1)} procent.`,
      meaning: better
        ? 'Je klom efficiënter dan je laatste tochten op vergelijkbare helling. Dat is wat je op de GR5 nodig hebt: dezelfde hoogtemeters met minder werk.'
        : 'Je klom langzamer terwijl je hartslag niet lager was. Dat gebeurt bij vermoeide benen, warmte of een zwaardere rugzak. Neem de volgende klim in een rustiger tempo.',
      basis: basisFor(earlier.map((x) => x.l), 'tochten', [`klim van ${c.gradeFrom} tot ${c.gradeFrom + 4} procent helling`, 'rugzak binnen 2 kg'], cmp.verdict === 'explains-worse' || cmp.verdict === 'explains-better' ? [weatherNote(log, cmp.logs) ?? ''].filter(Boolean) : []),
    };
    return withWeather({ line }, cmp.verdict, log, cmp.logs);
  }
  return { compared: true };
}

// Descending: facts only. No comparison with earlier tochten is needed for the
// one signal that is there (the last third of one descent against the first).
function descentTopic(input: RunInsightInput): TopicResult {
  const mine = descentsOf(input.log.detail);
  if (isUnavailable(mine) || mine.length === 0) return {};
  const biggest = [...mine].sort((a, b) => b.metres - a.metres)[0];
  const pct = biggest.speedChangePct;
  if (pct === undefined || pct > -15 || (biggest.heartRateChange !== undefined && biggest.heartRateChange > 0)) return {};
  const t = input.log.detail!.stretches.find((s) => s.kind === 'descent' && s.metres === biggest.metres)?.thirds;
  const line: InsightLine = {
    topic: 'descent',
    tone: 'fact',
    word: 'Bergaf',
    title: TITLE.descent,
    text: `Bergaf ging je laatste derde ${Math.abs(rounded(pct))} procent trager${biggest.heartRateChange !== undefined ? ' zonder dat je hartslag steeg' : ''}. Dat past bij moe worden in de benen.`,
    change: pct,
    unit: 'pct',
    strength: pct / NOISE.descentPct,
    figures: {
      todayLabel: 'Laatste derde',
      middleLabel: 'Eerste derde',
      today: `${t ? rounded(t[2].metresPerHour) : '?'} m per uur`,
      middle: `${t ? rounded(t[0].metresPerHour) : '?'} m per uur`,
      difference: `${Math.abs(rounded(pct))}% trager`,
    },
    series: t ? t.map((x, i) => ({ label: ['eerste derde', 'midden', 'laatste derde'][i], value: x.metresPerHour, current: i === 2 })) : [],
    seriesFormat: 'metresPerHour',
    strengthText: `Voor beheerst dalen is geen gevalideerde maat gevonden, dus dit is een feit en geen oordeel. Het gaat om een daling van ${biggest.metres} meter in ${rounded(biggest.sec / 60)} minuten.`,
    meaning: 'Bij vermoeide dijspieren zakt de snelheid bergaf zonder dat je hart harder werkt. Hartslagmaten missen dit. Het is een signaal om de volgende dag rustig te nemen, geen cijfer voor je techniek.',
    basis: { logIds: [], criteria: ['binnen één daling, het laatste derde tegen het eerste'], notes: [] },
  };
  return { line };
}

function formTopic(input: RunInsightInput): TopicResult {
  const { log } = input;
  const f = formOf(log.detail);
  if (isUnavailable(f)) return { reason: f.unavailable === 'tooShort' ? undefined : { code: 'unavailableMetric', metric: f.unavailable } };
  // Own assumptions of the research, from the spread of the measures plus a margin:
  // contact time 5 percent longer, step 4 percent shorter or cadence 3 steps per
  // minute lower, between the first and the last third at about the same pace. Two
  // of the three give a line; one alone only when it is twice the threshold.
  const signals: { ratio: number; kind: 'stance' | 'step' | 'cadence' }[] = [];
  if (f.stanceChangePct !== undefined && f.stanceChangePct >= 5) signals.push({ ratio: f.stanceChangePct / 5, kind: 'stance' });
  if (f.stepChangePct !== undefined && f.stepChangePct <= -4) signals.push({ ratio: -f.stepChangePct / 4, kind: 'step' });
  if (f.cadenceChange !== undefined && f.cadenceChange <= -3) signals.push({ ratio: -f.cadenceChange / 3, kind: 'cadence' });
  const strongest = Math.max(0, ...signals.map((s) => s.ratio));
  // Form is read inside the run: nothing to compare with, so no "equal to the last ones" either.
  if (!(signals.length >= 2 || strongest >= 2)) return {};
  const ms = f.first.stanceTimeMs !== undefined && f.last.stanceTimeMs !== undefined ? rounded(f.last.stanceTimeMs - f.first.stanceTimeMs) : undefined;
  const cm = f.first.stepLengthM !== undefined && f.last.stepLengthM !== undefined ? rounded((f.first.stepLengthM - f.last.stepLengthM) * 100) : undefined;
  const parts: string[] = [];
  if (signals.some((s) => s.kind === 'stance') && ms !== undefined) parts.push(`stond je ${ms} ms langer op de grond`);
  if (signals.some((s) => s.kind === 'step') && cm !== undefined) parts.push(`werd je pas ${cm} cm korter`);
  if (signals.some((s) => s.kind === 'cadence') && f.cadenceChange !== undefined) parts.push(`liep je ${Math.abs(rounded(f.cadenceChange))} stappen per minuut trager`);
  const sentence = `Aan het eind ${parts.join(' en ')} bij gelijk tempo.`;
  const line: InsightLine = {
    topic: 'form',
    tone: 'watch',
    word: 'Let op',
    title: TITLE.form,
    text: `${sentence} Neem het laatste derde wat rustiger.`,
    change: -(f.stanceChangePct ?? 0),
    unit: 'ms',
    strength: -strongest,
    figures: {
      todayLabel: 'Laatste derde',
      middleLabel: 'Eerste derde',
      today: f.last.stanceTimeMs !== undefined ? `${rounded(f.last.stanceTimeMs)} ms grondcontact` : f.last.stepLengthM !== undefined ? `${num(f.last.stepLengthM, 2)} m pas` : `${rounded(f.last.cadence ?? 0)} stappen per minuut`,
      middle: f.first.stanceTimeMs !== undefined ? `${rounded(f.first.stanceTimeMs)} ms grondcontact` : f.first.stepLengthM !== undefined ? `${num(f.first.stepLengthM, 2)} m pas` : `${rounded(f.first.cadence ?? 0)} stappen per minuut`,
      difference: f.stanceChangePct !== undefined ? `${num(Math.abs(f.stanceChangePct), 1)}% ${f.stanceChangePct >= 0 ? 'langer' : 'korter'}` : f.stepChangePct !== undefined ? `${num(Math.abs(f.stepChangePct), 1)}% ${f.stepChangePct >= 0 ? 'langer' : 'korter'}` : '',
    },
    series: [],
    seriesFormat: 'percent',
    strengthText: `Binnen één loop vallen schommelingen van dag tot dag en verschillen tussen mensen weg. De grenzen zijn eigen aannames (5 procent langer contact, 4 procent kortere pas, 3 stappen per minuut), te ijken op jouw gegevens. ${signals.length >= 2 ? 'Twee van de drie tekens klopten.' : 'Eén teken, maar ruim twee keer de grens.'}`,
    meaning: 'Bij moeheid wordt de grondcontacttijd langer en de pas korter. Het is geen diagnose. Een kort rustiger stuk of een rustiger tempo in het laatste derde geeft je benen lucht.',
    basis: { logIds: [], criteria: ['binnen één loop, het laatste derde tegen het eerste', 'tempo binnen 6 procent'], notes: [] },
  };
  return { line };
}

// --- the choice --------------------------------------------------------------------------------------------------

// Rule 7: the brake.
function braked(line: InsightLine, input: RunInsightInput): boolean {
  return (input.shown ?? []).some(
    (s) => s.logId !== input.log.id && s.topic === line.topic && s.tone === line.tone && input.today < addDays(s.date, BRAKE_DAYS) && Math.abs(line.strength) < Math.abs(s.strength) + BRAKE_FURTHER,
  );
}

export function runInsight(input: RunInsightInput): RunInsight {
  const s = resolveRunInsight(input.settings);
  if (!s.enabled || !input.detailsOn || !input.log.detail) return {};
  const ctx: ComparisonContext = {
    logs: input.logs,
    templates: input.templates,
    program: input.program,
    hr: input.hr,
    legs: input.legs,
    chestStrap: s.chestStrap,
  };
  const topics = topicsFor(input.log, ctx).filter((t) => s.topics[TOPIC_SWITCH[t]]);
  if (topics.length === 0) return {};
  const noun = logSport(input.log) === 'hiking' ? 'tochten' : 'loopjes';

  const results = new Map<InsightTopic, TopicResult>();
  for (const t of topics) {
    results.set(
      t,
      t === 'efficiency' ? efficiencyTopic(input, ctx) : t === 'drift' ? driftTopic(input, ctx) : t === 'climb' ? climbTopic(input, ctx) : t === 'descent' ? descentTopic(input) : formTopic(input),
    );
  }

  const quiet = input.log.subjectiveFeel === 'worse' || (input.log.painReports?.length ?? 0) > 0 || (input.log.painAreas?.length ?? 0) > 0;
  const lines = topics
    .map((t) => results.get(t)?.line)
    .filter((l): l is InsightLine => !!l)
    .filter((l) => !(quiet && l.tone === 'watch'))
    .filter((l) => !braked(l, input));
  const byOrder = (a: InsightLine, b: InsightLine) => ORDER.indexOf(a.topic) - ORDER.indexOf(b.topic);
  const better = lines.filter((l) => l.tone === 'better').sort((a, b) => b.strength - a.strength || byOrder(a, b))[0];
  const watch = lines.filter((l) => l.tone === 'watch' && l.topic !== better?.topic).sort((a, b) => a.strength - b.strength || byOrder(a, b))[0];
  const fact = !better || !watch ? lines.filter((l) => l.tone === 'fact' && l.topic !== better?.topic && l.topic !== watch?.topic)[0] : undefined;

  const out: RunInsight = {};
  if (better) out.better = better;
  if (watch) out.watch = watch;
  if (fact) out.fact = fact;

  const notCompared = topics.flatMap((t) => {
    const reason = results.get(t)?.reason;
    return reason ? [{ topic: t, reason, text: reasonText(reason, noun) }] : [];
  });
  if (notCompared.length > 0) out.notCompared = notCompared;

  if (!better && !watch && !fact) {
    const weather = topics.map((t) => results.get(t)?.weather).find((w) => !!w);
    if (weather) out.note = weather;
    else if (topics.some((t) => results.get(t)?.compared)) out.note = `Gelijk aan je laatste ${noun}.`;
    else if (notCompared.length > 0) out.note = `Niet te vergelijken met je laatste ${noun}: ${notCompared[0].text}.`;
  }
  return out;
}
