// ASCEND: the Lopen section on Je stand: four rows, each a line of the last 12
// weeks and one word. Beter, Normaal, Slechter or Te weinig gegevens; a word, no score.
//
// The same functions as after a training (engine/runMetrics.ts), over a longer
// stretch. The efficiency row is `aerobicTrend` itself, not a second calculation:
// next to the GR5 percentage there is no second progress number
// (docs/beslissingen/2026-10-22-gr5-voortgang-een-percentage.md). The other rows
// only use trainings that have a compact profile, and are empty when the
// details switch is off.
//
// - Lange dagen: the drift of each long run; the middle of the last three against
//   the three before, a difference only from 3 percentage points.
// - Bergop en bergaf: climbing speed in the gradient class you climbed most; the
//   middle of the last three against the three before, from 8 percent with a heart
//   rate that is not higher. Descending only as numbers, no word.
// - Pas en vorm: ground contact time at about the same pace (within 6 percent), only
//   with three earlier runs, and only a word beyond Normaal when the last two runs in
//   a row agree.
//
// Pure: no React, no IndexedDB.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { TrendPoint } from './readiness';
import { aerobicTrend, formatPace, MEANINGFUL_CHANGE_SEC } from './aerobicTrend';
import type { HeartRateSettings } from './heartRateZones';
import { isIndoorLog, logSport } from './sports';
import { isEasyPlanned, median } from './runComparison';
import { climbsOf, descentsOf, driftOf, isUnavailable, type ClimbFact } from './runMetrics';
import { resolveRunInsight, type RunInsightSettings } from './runInsightSettings';
import type { SheetModel } from './runInsight';
import { addDays, mondayOfWeek } from '../utils/dates';
import { formatNumberNL } from '../utils/number';

export type TrendWord = 'Beter' | 'Normaal' | 'Slechter' | 'Te weinig gegevens';

export interface TrendRow {
  key: 'efficiency' | 'longDays' | 'climbing' | 'form';
  title: string;
  word: TrendWord;
  // Oldest first, higher = better, for the little line.
  points: TrendPoint[];
  // What the sheet shows when the row is tapped.
  model: SheetModel;
}

export interface RunTrends {
  rows: TrendRow[];
}

export interface RunTrendsInput {
  logs: SessionLog[];
  templates: SessionTemplate[];
  program: Program | null | undefined;
  hr: HeartRateSettings | undefined;
  settings: RunInsightSettings | undefined;
  detailsOn: boolean;
  today: string;
  // Trainings set to "Niet meetellen voor hartslag": out of the heart rate trends (engine/influence.ts).
  excludedLogIds?: ReadonlySet<string>;
}

export const TREND_WEEKS = 12;
const num = (n: number, decimals = 0) => formatNumberNL(n, decimals);
const rounded = (n: number) => Math.round(n);
const label = (iso: string) => `${Number(iso.slice(8, 10))}-${Number(iso.slice(5, 7))}`;
const NO = 'nog niet';

const empty = (topic: SheetModel['topic'], title: string, seriesFormat: SheetModel['seriesFormat'], why: string, criteria: string[]): SheetModel => ({
  topic,
  title,
  word: 'Te weinig gegevens',
  figures: { todayLabel: 'Laatste drie', middleLabel: 'Drie daarvoor', today: NO, middle: NO, difference: NO },
  series: [],
  seriesFormat,
  strengthText: why,
  meaning: 'Zodra er genoeg vergelijkbare trainingen zijn, zie je hier of het beter, normaal of slechter gaat. Eén training zegt weinig; het gaat om de lijn over weken.',
  basis: { logIds: [], criteria, notes: [] },
});

// Last three against the three before, as the middle of each. Needs six.
function lastThree<T>(items: T[]): { last: T[]; before: T[] } | undefined {
  if (items.length < 6) return undefined;
  return { last: items.slice(-3), before: items.slice(-6, -3) };
}

// --- efficiency: aerobicTrend itself ------------------------------------------------------------

function efficiencyRow(input: RunTrendsInput): TrendRow {
  const trend = aerobicTrend(input.logs, input.templates, input.program, input.hr, input.today, input.excludedLogIds);
  const change = trend.changeSec;
  const word: TrendWord = change === undefined ? 'Te weinig gegevens' : Math.abs(change) < MEANINGFUL_CHANGE_SEC ? 'Normaal' : change < 0 ? 'Beter' : 'Slechter';
  const points = trend.points.map((p) => ({ label: p.label, value: p.value }));
  const criteria = [`${trend.runs} rustige en lange loopjes in de laatste ${TREND_WEEKS} weken`, 'vlak, hoogstens 15 meter stijging per km', trend.referenceHr > 0 ? `omgerekend naar ${trend.referenceHr} slagen per minuut` : 'in zone 2'];
  const model: SheetModel =
    change === undefined || trend.recentSec === undefined || trend.earlierSec === undefined
      ? empty('efficiency', 'Efficiëntie', 'pace', 'Voor een vergelijking zijn rustige loopjes nodig in de laatste twee weken en in de twee weken een maand eerder.', criteria)
      : {
          topic: 'efficiency',
          title: 'Efficiëntie',
          word,
          figures: {
            todayLabel: 'Laatste 2 weken',
            middleLabel: 'Een maand eerder',
            today: `${formatPace(trend.recentSec)} per km`,
            middle: `${formatPace(trend.earlierSec)} per km`,
            difference: `${rounded(Math.abs(change))} s per km ${change < 0 ? 'sneller' : 'trager'}`,
          },
          series: points,
          seriesFormat: 'pace',
          strengthText: `Dit is dezelfde trend als de kaart Tempo bij zone 2: je tempo bij één hartslag, gemiddeld over twee weken tegen twee weken een maand eerder. Eén rustige loop schommelt zelf zo'n 3 procent, een echte verbetering is ongeveer 1 tot 2 procent per maand. Onder de ${MEANINGFUL_CHANGE_SEC} seconden per km noemt ASCEND het Normaal.`,
          meaning:
            word === 'Beter'
              ? 'Je loopt bij dezelfde hartslag sneller dan een maand geleden. Dat is de vooruitgang die telt.'
              : word === 'Slechter'
                ? 'Je loopt bij dezelfde hartslag trager dan een maand geleden. Moe, warm of weinig geslapen? Kijk hoe het de komende weken gaat.'
                : 'Gelijk aan een maand geleden. Normaal: vooruitgang gaat in weken, niet per loop.',
          basis: { logIds: [], criteria, notes: trend.outsideZone > 0 ? [`${trend.outsideZone} loopjes lagen te ver van zone 2 en tellen niet mee.`] : [] },
        };
  return { key: 'efficiency', title: 'Efficiëntie', word, points, model };
}

// --- long days: drift --------------------------------------------------------------------------------------

interface Dated<T> {
  date: string;
  log: SessionLog;
  v: T;
}

function sinceOf(today: string): string {
  return addDays(mondayOfWeek(today), -7 * (TREND_WEEKS - 1));
}

function usable(input: RunTrendsInput): SessionLog[] {
  const since = sinceOf(input.today);
  return input.logs
    .filter((l) => l.detail && l.completedDate >= since && l.completedDate <= input.today && !isIndoorLog(l))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

function driftRow(input: RunTrendsInput): TrendRow {
  const title = 'Lange dagen';
  const criteria = [`lange loopjes van een uur of meer in de laatste ${TREND_WEEKS} weken`, 'vlak, minstens 45 minuten in een stuk'];
  if (!input.detailsOn) return { key: 'longDays', title, word: 'Te weinig gegevens', points: [], model: empty('drift', title, 'percent', 'De details van loopjes en tochten staan uit. Zet ze aan bij Garmin koppelen.', criteria) };
  const runs: Dated<number>[] = [];
  for (const l of usable(input)) {
    // Drift is a heart rate measure: a training set to "Niet meetellen voor hartslag" stays out.
    if (logSport(l) !== 'running' || !isEasyPlanned(l, input) || input.excludedLogIds?.has(l.id)) continue;
    const d = driftOf(l.detail);
    if (!isUnavailable(d)) runs.push({ date: l.completedDate, log: l, v: d.percent });
  }
  const points = runs.map((r) => ({ label: label(r.date), value: -r.v }));
  const split = lastThree(runs);
  if (!split) {
    return { key: 'longDays', title, word: 'Te weinig gegevens', points, model: { ...empty('drift', title, 'percent', `Er zijn ${runs.length} lange loopjes met een bruikbare drift. Voor een vergelijking zijn er zes nodig: de laatste drie tegen de drie daarvoor.`, criteria), series: points } };
  }
  const now = median(split.last.map((r) => r.v));
  const before = median(split.before.map((r) => r.v));
  const lower = before - now;
  const word: TrendWord = lower >= 3 ? 'Beter' : lower <= -3 ? 'Slechter' : 'Normaal';
  const model: SheetModel = {
    topic: 'drift',
    title,
    word,
    figures: {
      todayLabel: 'Laatste drie',
      middleLabel: 'Drie daarvoor',
      today: `${num(now, 1)}%`,
      middle: `${num(before, 1)}%`,
      difference: `${num(Math.abs(lower), 1)} procentpunt ${lower >= 0 ? 'lager' : 'hoger'}`,
    },
    series: points,
    seriesFormat: 'percent',
    strengthText: 'Drift is het zakken van je tempo per hartslag van de eerste naar de tweede helft. Het schommelt per loop zo\'n 3 procentpunten en verschilt sterk per persoon, dus ASCEND zegt pas iets vanaf 3 procentpunten verschil tussen het midden van de laatste drie en de drie daarvoor. Onder de 5 procent noemt een coach goed; dat is een richtlijn en geen gemeten grens.',
    meaning:
      word === 'Beter'
        ? 'Je hartslag blijft op lange dagen beter bij je tempo. Dat is wat een lange dag in de bergen vraagt.'
        : word === 'Slechter'
          ? 'Je hartslag loopt op lange dagen meer op dan eerst. Let op eten en drinken, warmte en een te snel begin.'
          : 'Je drift is ongeveer gelijk aan die van de loopjes ervoor.',
    basis: { logIds: [...split.before, ...split.last].map((r) => r.log.id), criteria, notes: [] },
  };
  return { key: 'longDays', title, word, points, model };
}

// --- climbing and descending -----------------------------------------------------------------------------------

function climbingRow(input: RunTrendsInput): TrendRow {
  const title = 'Bergop en bergaf';
  const criteria = ['klimmen in dezelfde hellingklasse van vier procent', 'rugzak niet meegerekend in deze trend'];
  if (!input.detailsOn) return { key: 'climbing', title, word: 'Te weinig gegevens', points: [], model: empty('climb', title, 'metresPerHour', 'De details van loopjes en tochten staan uit. Zet ze aan bij Garmin koppelen.', criteria) };
  const items: Dated<ClimbFact>[] = [];
  let descents = 0;
  let metresDown = 0;
  for (const l of usable(input)) {
    const sport = logSport(l);
    if (sport !== 'hiking' && sport !== 'running') continue;
    const c = climbsOf(l.detail);
    if (!isUnavailable(c)) for (const climb of c) items.push({ date: l.completedDate, log: l, v: climb });
    const d = descentsOf(l.detail);
    if (!isUnavailable(d)) {
      descents += d.length;
      metresDown += d.reduce((n, x) => n + x.metres, 0);
    }
  }
  // The class you climbed most (the steeper one when they tie).
  const byClass = new Map<number, Dated<ClimbFact>[]>();
  for (const it of items) byClass.set(it.v.gradeFrom, [...(byClass.get(it.v.gradeFrom) ?? []), it]);
  const best = [...byClass.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0])[0];
  const series = best ? best[1] : [];
  const points = series.map((it) => ({ label: label(it.date), value: it.v.metresPerHour }));
  const descentText = descents > 0 ? ` Bergaf: ${descents} ${descents === 1 ? 'daling' : 'dalingen'}, samen ${num(metresDown)} meter omlaag. Dat zijn alleen feiten; er is geen oordeel over dalen.` : '';
  const split = lastThree(series);
  if (!best || !split) {
    return { key: 'climbing', title, word: 'Te weinig gegevens', points, model: { ...empty('climb', title, 'metresPerHour', `Er zijn ${items.length} klimmen gevonden. Voor een vergelijking zijn er zes nodig in dezelfde hellingklasse, en in Nederland zijn dat er niet veel.${descentText}`, criteria), series: points } };
  }
  const mph = (xs: Dated<ClimbFact>[]) => median(xs.map((x) => x.v.metresPerHour));
  const hrOf = (xs: Dated<ClimbFact>[]) => {
    const hrs = xs.map((x) => x.v.heartRate).filter((h): h is number => h !== undefined);
    return hrs.length >= 2 ? median(hrs) : undefined;
  };
  const now = mph(split.last);
  const before = mph(split.before);
  const pct = ((now - before) / before) * 100;
  const hrNow = hrOf(split.last);
  const hrBefore = hrOf(split.before);
  const hrDiff = hrNow !== undefined && hrBefore !== undefined ? hrNow - hrBefore : undefined;
  const word: TrendWord = pct >= 8 && (hrDiff === undefined || hrDiff <= 4) ? 'Beter' : pct <= -8 && hrDiff !== undefined && hrDiff >= 0 ? 'Slechter' : 'Normaal';
  const from = best[0];
  const model: SheetModel = {
    topic: 'climb',
    title,
    word,
    figures: {
      todayLabel: 'Laatste drie',
      middleLabel: 'Drie daarvoor',
      today: `${num(rounded(now))} m per uur`,
      middle: `${num(rounded(before))} m per uur`,
      difference: `${Math.abs(rounded(pct))}% ${pct >= 0 ? 'sneller' : 'trager'}`,
    },
    series: points,
    seriesFormat: 'metresPerHour',
    strengthText: `Klimsnelheid schommelt zelf zo'n 8 procent en hangt sterk af van de helling, dus dit zijn klimmen van ${from} tot ${from + 4} procent helling. ASCEND noemt het Beter bij 8 procent sneller met een hartslag die niet hoger is, en Slechter bij 8 procent trager zonder lagere hartslag.${descentText}`,
    meaning:
      word === 'Beter'
        ? 'Je klimt sneller dan eerst bij een vergelijkbare hartslag. Dat is wat je op de GR5 nodig hebt.'
        : word === 'Slechter'
          ? 'Je klimt trager dan eerst zonder dat je hartslag lager is. Kijk naar slaap, warmte en je rugzak.'
          : 'Je klimsnelheid is ongeveer gelijk aan die van de klimmen ervoor.',
    basis: { logIds: [...split.before, ...split.last].map((r) => r.log.id), criteria: [`klimmen van ${from} tot ${from + 4} procent helling`, ...criteria.slice(1)], notes: [] },
  };
  return { key: 'climbing', title, word, points, model };
}

// --- form: ground contact time at the same pace --------------------------------------------------------------------

interface FormRun {
  log: SessionLog;
  stanceMs: number;
  paceSec: number;
}

function formOfRun(l: SessionLog): FormRun | undefined {
  const d = l.detail;
  if (!d || d.movingSec < 20 * 60) return undefined;
  let sum = 0;
  let covered = 0;
  let dist = 0;
  let sec = 0;
  for (const s of d.slices) {
    sec += s.sec;
    dist += s.distanceM;
    if (s.dynamics?.stanceTimeMs !== undefined) {
      sum += s.dynamics.stanceTimeMs * s.sec;
      covered += s.sec;
    }
  }
  if (dist <= 0 || covered < sec / 2) return undefined;
  return { log: l, stanceMs: sum / covered, paceSec: (sec / dist) * 1000 };
}

const FORM_PACE_PCT = 6;
// Own assumptions (docs/onderzoek, hoofdstuk 3): 4 percent or 10 ms.
const FORM_STANCE_PCT = 4;
const FORM_STANCE_MS = 10;

function formRow(input: RunTrendsInput): TrendRow {
  const title = 'Pas en vorm';
  const criteria = ['rustige loopjes met loopvorm van je borstband', 'tempo binnen 6 procent van elkaar'];
  if (!input.detailsOn) return { key: 'form', title, word: 'Te weinig gegevens', points: [], model: empty('form', title, 'ms', 'De details van loopjes en tochten staan uit. Zet ze aan bij Garmin koppelen.', criteria) };
  const runs: FormRun[] = [];
  for (const l of usable(input)) {
    if (logSport(l) !== 'running' || !isEasyPlanned(l, input)) continue;
    const r = formOfRun(l);
    if (r) runs.push(r);
  }
  const latest = runs.at(-1);
  if (!latest) return { key: 'form', title, word: 'Te weinig gegevens', points: [], model: empty('form', title, 'ms', 'Er zijn nog geen loopjes met loopvorm in de laatste 12 weken. Die komen van je borstband, als je horloge ze aan intervals.icu geeft.', criteria) };
  const sameSpeed = (of: FormRun, others: FormRun[]) => others.filter((o) => o !== of && o.log.completedAt < of.log.completedAt && (Math.abs(o.paceSec - of.paceSec) / of.paceSec) * 100 <= FORM_PACE_PCT);
  const verdict = (of: FormRun): 'better' | 'worse' | 'same' | undefined => {
    const earlier = sameSpeed(of, runs);
    if (earlier.length < 3) return undefined;
    const base = median(earlier.map((e) => e.stanceMs));
    const diff = of.stanceMs - base;
    const big = Math.abs(diff) >= FORM_STANCE_MS || (Math.abs(diff) / base) * 100 >= FORM_STANCE_PCT;
    return big ? (diff > 0 ? 'worse' : 'better') : 'same';
  };
  const comparable = [...sameSpeed(latest, runs), latest];
  const points = comparable.map((r) => ({ label: label(r.log.completedDate), value: -r.stanceMs }));
  const first = verdict(latest);
  if (first === undefined) {
    return { key: 'form', title, word: 'Te weinig gegevens', points, model: { ...empty('form', title, 'ms', `Voor een vergelijking zijn drie eerdere loopjes nodig op ongeveer hetzelfde tempo. Nu zijn er ${comparable.length - 1}.`, criteria), series: points } };
  }
  const prev = runs.length >= 2 ? verdict(runs[runs.length - 2]) : undefined;
  const word: TrendWord = first !== 'same' && prev === first ? (first === 'better' ? 'Beter' : 'Slechter') : 'Normaal';
  const earlier = sameSpeed(latest, runs);
  const base = median(earlier.map((e) => e.stanceMs));
  const diff = latest.stanceMs - base;
  const model: SheetModel = {
    topic: 'form',
    title,
    word,
    figures: {
      todayLabel: 'Laatste loop',
      middleLabel: `Midden van ${earlier.length}`,
      today: `${rounded(latest.stanceMs)} ms`,
      middle: `${rounded(base)} ms`,
      difference: `${Math.abs(rounded(diff))} ms ${diff >= 0 ? 'langer' : 'korter'}`,
    },
    series: points,
    seriesFormat: 'ms',
    strengthText: `Grondcontacttijd verschilt van dag tot dag zo'n 1 tot 2 procent, en meer op een heuvelachtige of onregelmatige route. ASCEND zegt pas iets bij 4 procent of 10 ms verschil, en alleen als de laatste twee loopjes op rij hetzelfde laten zien. Dat zijn eigen aannames, te ijken op jouw gegevens.`,
    meaning:
      word === 'Slechter'
        ? 'Je staat langer op de grond dan bij je eerdere loopjes op hetzelfde tempo. Dat past bij moe zijn. Het is geen diagnose; neem een paar dagen rustiger.'
        : word === 'Beter'
          ? 'Je staat korter op de grond dan eerder bij hetzelfde tempo. Garmin noemt een lagere grondcontacttijd meestal beter.'
          : 'Je loopvorm is ongeveer gelijk aan die van je eerdere loopjes op hetzelfde tempo.',
    basis: { logIds: [...earlier.map((e) => e.log.id), latest.log.id], criteria, notes: [] },
  };
  return { key: 'form', title, word, points, model };
}

// --- all rows ------------------------------------------------------------------------------------------------------------

export function runTrends(input: RunTrendsInput): RunTrends {
  const s = resolveRunInsight(input.settings);
  const rows: TrendRow[] = [];
  if (s.topics.efficiency) rows.push(efficiencyRow(input));
  if (s.topics.longDays) rows.push(driftRow(input));
  if (s.topics.climbing) rows.push(climbingRow(input));
  if (s.topics.form) rows.push(formRow(input));
  return { rows };
}
