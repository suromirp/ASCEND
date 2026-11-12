// ASCEND — "tempo bij zone 2": progress on easy runs.
//
// The research behind it (docs/onderzoek, Trainingsopbouw, signals): the
// most reliable heart rate measure is heart rate at a given pace, or pace
// at a given heart rate (day to day ~3%, Buchheit 2014); compare averages
// over a couple of weeks, not single runs (Nuuttila et al. 2022), and only
// comparable runs: flat and easy, since hills, heat and a pack blur it.
//
// So: easy and long runs (planned at most RPE 4) with distance, time and
// average heart rate, at most 15 m climb per km (30 m when run in detail has
// the flat pace per km, which is then the pace used; if the watch's climb
// disagrees with ASCEND's own count, the own count is used), and, once your own heart
// rate values are set, an average inside zone 2. Each run's pace is
// converted to one reference heart rate (the middle of your zone 2) by
// simple proportion: a rough correction for running a few beats higher or
// lower, good enough for a trend, not for one run. Per week the average,
// weighted by distance.
//
// A training you set to "Niet meetellen voor hartslag" (engine/influence.ts) is left out
// here (`excludedLogIds`); load, leg index and the week still count it.
//
// Stabiele stukken (2026-11-09, docs/onderzoek/Tempo bij zone 2, stabiele stukken.md, besluit
// docs/beslissingen/2026-11-09-tempo-stabiele-stukken.md): een loop met stukken uit de reeks
// (`zone2Pieces`) of, zonder reeks, uit de kilometers met hartslag (`runDetail.kms`) telt met
// die stukken, ook als hij niet als rustige loop gepland was (geen test, wedstrijd of loopband).
// Pas hier worden de zones toegepast: een stuk in zone 2, voor de eerste zware herhaling,
// gecorrigeerd voor warmte. Eén meting per loop, gewogen naar zijn minuten in stukken. Het oude
// pad (gemiddelde van de hele loop) blijft voor lopen zonder stukken en zonder kilometers.
// De uitspraak komt uit één rechte lijn met een band van 80 procent; tekst, figuren en
// progressMoment lezen die ene lijn. Alle drempels in engine/zone2Rules.ts.
//
// Pure: no React, no IndexedDB. Plans nothing.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { RunDetail } from '../models/runDetail';
import { isStaleRunDetail } from './runDetail';
import { logSport } from './sports';
import { plannedRpeTop, EASY_RPE_TOP } from './coach';
import { zoneBpm, type HeartRateSettings } from './heartRateZones';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';
import type { TrendPoint } from './readiness';
import type { Zone2Piece } from '../models/zone2Pieces';
import { isStaleZone2Pieces, kmPieces, readZone2Pieces } from './zone2Pieces';
import { ZONE2_RULES as R } from './zone2Rules';
import { idIsTestOrRace, isTestOrRace } from './templateRoles';

// One measurement per run: its pieces (or the whole run) converted to the reference heart rate.
export interface Zone2Measurement {
  logId: string;
  date: string;
  // Seconds per km at the reference heart rate.
  paceSec: number;
  // Minutes in pieces (the whole run on the old path) and the weight they give, capped.
  minutes: number;
  weight: number;
  from: 'stream' | 'km' | 'whole';
  pieces: number;
  // A warm run is shown but does not count for the trend.
  counts: boolean;
  warm?: boolean;
  // The felt temperature when the heart rate was corrected for warmth.
  warmthC?: number;
}

// What can be said: a first estimate (too few runs), or a change with its band.
// Negative is faster. The rounded numbers are the ones in the text.
export type Zone2Statement =
  | { kind: 'eerste-schatting'; paceSec: number; runs: number }
  | {
      kind: 'uitspraak';
      runs: number;
      changeSec: number;
      lowSec: number;
      highSec: number;
      verdict: 'sneller' | 'langzamer' | 'geen-duidelijke-verandering' | 'te-veel-verschil';
      // The band in whole steps of 5 seconds, as the text says it (low below high).
      roundedLow: number;
      roundedHigh: number;
      // The line for the chart: from the first run in the window to today.
      line: { fromDate: string; toDate: string; fromSec: number; toSec: number };
    };

export interface AerobicTrend {
  referenceHr: number;
  points: (TrendPoint & { paceSec: number; runs: number; week: string })[]; // per week (week = its Monday), oldest first
  runs: number;
  outsideZone: number; // runs left out: no piece in zone 2 (or, without pieces, heart rate above zone 2 or far below it)
  // Every run with a measurement, oldest first; warm ones with counts: false.
  measurements: Zone2Measurement[];
  statement?: Zone2Statement;
  // From the line, only with a statement: change per 4 weeks; negative = faster.
  changeSec?: number;
  // The same change the other way round: at the same pace, about this many
  // beats more (negative = fewer). An estimate, good for a trend.
  bpmChange?: number;
  // The line today and 4 weeks earlier, seconds per km at the reference heart rate. Read by
  // the Lopen section on Je stand (engine/runTrends.ts), which shows this same trend.
  recentSec?: number;
  earlierSec?: number;
}

// The weeks the card shows (points); exported for the chart on the card (engine/zone2Chart.ts#zone2WeekChart).
export const WEEKS = 12;
const MAX_CLIMB_PER_KM = 15;
// Met het vlakke tempo per km (run in detail) is meer helling te corrigeren (eigen aanname).
const MAX_CLIMB_PER_KM_FLAT = 30;
const BELOW_ZONE_BPM = 15;
// Eigen stijging tegen die van het horloge: verder uit elkaar dan dit en de hoogte van het horloge geldt niet (zoals runMetrics.ts).
const GAIN_AGREEMENT_RANGE: [number, number] = [60, 140];
// A resting heart rate outside this range is not believed (then: simple proportion).
const RESTING_RANGE: [number, number] = [30, 100];

// Meters stijging per km. De stijging van het horloge, tenzij die niet te vertrouwen is
// (gainAgreementPct buiten de marge): dan ASCEND's eigen optelling per km. Zonder hoogtegegevens
// valt er niets te zeggen en geldt wat het horloge meldt (0 als dat ook niets zegt).
function climbPerKm(watchGainM: number, km: number, log: SessionLog, rd: RunDetail | undefined): number {
  const agree = log.detail?.quality.gainAgreementPct;
  const untrusted = agree !== undefined && (agree < GAIN_AGREEMENT_RANGE[0] || agree > GAIN_AGREEMENT_RANGE[1]);
  if (untrusted && rd) {
    const own = rd.kms.reduce((n, k) => n + (k.gainM ?? 0), 0);
    if (rd.kms.some((k) => k.gainM !== undefined)) return own / km;
  }
  return watchGainM / km;
}

// Het vlakke tempo tegen het echte tempo, over de afstand van elke km. Een km zonder
// gecorrigeerd tempo (minder dan 10 m op of neer, of geen hoogte) telt met zijn gewone tempo.
function flatFactor(rd: RunDetail): number | undefined {
  if (!rd.kms.some((k) => k.gapSecKm !== undefined)) return undefined;
  let real = 0;
  let flat = 0;
  for (const k of rd.kms) {
    real += k.paceSecKm * k.distanceM;
    flat += (k.gapSecKm ?? k.paceSecKm) * k.distanceM;
  }
  return real > 0 ? flat / real : undefined;
}
// Below this a change is within the normal day-to-day noise.
export const MEANINGFUL_CHANGE_SEC = 5;

export function formatPace(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// The pieces a run gives, or undefined when it has none to give (then the old path).
function piecesOfLog(l: SessionLog, km: number, minutes: number, rd: RunDetail | undefined): Zone2Piece[] | undefined {
  const z = readZone2Pieces(l.zone2Pieces);
  if (z && !isStaleZone2Pieces(z, km, minutes)) return z.pieces;
  if (rd && rd.kms.some((k) => k.hrAvg !== undefined)) return kmPieces(rd);
  return undefined;
}

// Seconds from the start where the first effort above zone 3 of more than 2 minutes begins,
// read from the line of run in detail. After it nothing counts (hoofdstuk 5).
function hardFrom(rd: RunDetail | undefined, top: number | undefined): number | undefined {
  if (!rd || top === undefined) return undefined;
  const { timeSec, hr } = rd.line;
  let since: number | undefined;
  for (let k = 0; k < timeSec.length; k++) {
    const h = hr[k];
    if (h !== null && h !== undefined && h > top) {
      since ??= timeSec[k];
      if (timeSec[k] - since > R.hardSec) return since;
    } else since = undefined;
  }
  return undefined;
}

// Heart rate after the small correction for warmth; `out` when it is too warm to count.
function warmth(l: SessionLog): { bpm: number; out: boolean; feels?: number } {
  const feels = l.detail?.conditions?.feelsC;
  if (feels === undefined || feels < R.heatFreeC) return { bpm: 0, out: false };
  if (feels > R.heatOutC) return { bpm: R.heatBpmPerC * (R.heatOutC - R.heatFreeC), out: true, feels };
  return { bpm: R.heatBpmPerC * (feels - R.heatFreeC), out: false, feels };
}

interface Candidate {
  logId: string;
  date: string;
  km: number;
  minutes: number;
  from: Zone2Measurement['from'];
  // Per piece (or the whole run): pace, heart rate after warmth, seconds.
  parts: { paceSec: number; bpm: number; sec: number }[];
  warm: boolean;
  warmthC?: number;
  // The old path: bpm of the whole run, for the zone check with room below.
  wholeBpm?: number;
}

// The setting "Tempo uit stabiele stukken": absent is on (the advice).
export const tempoPiecesOn = (s: { tempoStablePieces?: boolean } | undefined): boolean => s?.tempoStablePieces !== false;

export interface AerobicTrendOptions {
  // "Tempo uit stabiele stukken" (AppSettings.tempoStablePieces). Off: every run goes the old
  // path, the average heart rate of a planned easy or long run, as before 2026-11-09.
  pieces?: boolean;
}

export function aerobicTrend(logs: SessionLog[], templates: SessionTemplate[], program: Program | null | undefined, hr: HeartRateSettings | undefined, today: string, excludedLogIds?: ReadonlySet<string>, options: AerobicTrendOptions = {}): AerobicTrend {
  const usePieces = options.pieces !== false;
  const byId = new Map(templates.map((t) => [t.id, t]));
  const band = zoneBpm(2, hr);
  const hardTop = zoneBpm(R.hardZone, hr)?.[1];
  const since = addDays(mondayOfWeek(today), -7 * (WEEKS - 1));
  let outsideZone = 0;
  const candidates: Candidate[] = logs.flatMap((l): Candidate[] => {
    if (l.completedDate < since || l.completedDate > today || logSport(l) !== 'running' || excludedLogIds?.has(l.id)) return [];
    const d = l.cardioData ?? l.outdoorData;
    const km = d?.distanceKm ?? 0;
    const minutes = d?.durationMinutes || l.durationMinutes;
    const bpm = d?.avgHeartRate ?? 0;
    if (km <= 0 || minutes <= 0) return [];
    const rd = l.runDetail && !isStaleRunDetail(l.runDetail, km, minutes) ? l.runDetail : undefined;
    const heat = warmth(l);
    const t = byId.get(l.templateId);
    const pieces = !usePieces || d?.environment === 'treadmill' ? undefined : piecesOfLog(l, km, minutes, rd);
    if (pieces) {
      // Any outdoor run with pieces, except a test or race (no easy effort).
      if (t ? isTestOrRace(t) : idIsTestOrRace(l.templateId, byId)) return [];
      if (pieces.length === 0) return [];
      const cut = hardFrom(rd, hardTop);
      const usable = pieces.filter((p) => cut === undefined || p.startSec < cut);
      const parts = usable.map((p) => ({ paceSec: p.paceSecKm, bpm: p.hr - heat.bpm, sec: p.sec })).filter((p) => !band || (p.bpm >= band[0] && p.bpm <= band[1]));
      if (parts.length === 0) {
        outsideZone++;
        return [];
      }
      return [{ logId: l.id, date: l.completedDate, km, minutes, from: pieces[0].from, parts, warm: heat.out, warmthC: heat.feels }];
    }
    // The old path: planned easy and long runs, the whole run.
    const top = t ? plannedRpeTop(t, l.completedDate, program) : undefined;
    if (top === undefined || top > EASY_RPE_TOP || bpm <= 0) return [];
    const climb = climbPerKm(d?.elevationGainM ?? 0, km, l, rd);
    // Met het vlakke tempo per km telt een heuvelachtige loop mee; zonder blijft de oude grens.
    // Alleen boven de oude grens het vlakke tempo, zodat lopen met en zonder run in detail vergelijkbaar blijven.
    const flat = rd && climb > MAX_CLIMB_PER_KM ? flatFactor(rd) : undefined;
    if (climb > (flat !== undefined ? MAX_CLIMB_PER_KM_FLAT : MAX_CLIMB_PER_KM)) return [];
    // A little under zone 2 still counts on this path (production feedback: two easy long
    // runs at 137 bpm, run with the watch on the old max-HR zones, left the card empty).
    // Above zone 2 is no easy run anymore.
    const corrected = bpm - heat.bpm;
    if (band && (corrected < band[0] - BELOW_ZONE_BPM || corrected > band[1])) {
      outsideZone++;
      return [];
    }
    return [{ logId: l.id, date: l.completedDate, km, minutes, from: 'whole', parts: [{ paceSec: ((minutes * 60) / km) * (flat ?? 1), bpm: corrected, sec: minutes * 60 }], warm: heat.out, warmthC: heat.feels, wholeBpm: bpm }];
  });

  const allBpm = candidates.flatMap((c) => c.parts.map((p) => p.bpm)).sort((a, b) => a - b);
  const referenceHr = band ? Math.round((band[0] + band[1]) / 2) : Math.round(allBpm[Math.floor(allBpm.length / 2)] ?? 0);
  const rest = hr?.restingHr !== undefined && hr.restingHr >= RESTING_RANGE[0] && hr.restingHr <= RESTING_RANGE[1] && hr.restingHr < referenceHr - 10 ? hr.restingHr : 0;
  // Pace at the reference heart rate, through the heart rate reserve: faster when you ran lower.
  const atReference = (paceSec: number, bpm: number) => (bpm > rest ? paceSec * ((bpm - rest) / (referenceHr - rest)) : paceSec);

  const measurements: Zone2Measurement[] = candidates
    .map((c) => {
      const sec = c.parts.reduce((n, p) => n + p.sec, 0);
      const paceSec = c.parts.reduce((n, p) => n + atReference(p.paceSec, p.bpm) * p.sec, 0) / sec;
      const minutes = sec / 60;
      return {
        logId: c.logId,
        date: c.date,
        paceSec,
        minutes,
        weight: Math.min(minutes, R.runWeightCapMin),
        from: c.from,
        pieces: c.from === 'whole' ? 0 : c.parts.length,
        counts: !c.warm,
        ...(c.warm ? { warm: true } : {}),
        ...(c.warmthC !== undefined ? { warmthC: c.warmthC } : {}),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.logId.localeCompare(b.logId));
  const counted = measurements.filter((m) => m.counts);

  const weeks = new Map<string, { w: number; weighted: number; runs: number }>();
  for (const m of counted) {
    const wk = mondayOfWeek(m.date);
    const acc = weeks.get(wk) ?? { w: 0, weighted: 0, runs: 0 };
    acc.w += m.weight;
    acc.weighted += m.paceSec * m.weight;
    acc.runs += 1;
    weeks.set(wk, acc);
  }
  const points = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([w, acc]) => {
      const paceSec = acc.weighted / acc.w;
      // Plotted as minus seconds, so faster reads as a line going up.
      return { label: `week van ${w.slice(8, 10).replace(/^0/, '')}-${w.slice(5, 7).replace(/^0/, '')}`, value: -paceSec, paceSec, runs: acc.runs, week: w };
    });

  const statement = zone2Statement(counted, today);
  const base = { referenceHr, points, runs: counted.length, outsideZone, measurements, statement };
  if (statement?.kind !== 'uitspraak') return base;
  const recent = statement.line.toSec;
  const earlier = recent - statement.changeSec;
  return { ...base, changeSec: statement.changeSec, bpmChange: referenceHr * (recent / earlier - 1), recentSec: recent, earlierSec: earlier };
}

const roundTo = (v: number) => Math.round(v / R.roundSec) * R.roundSec + 0;

// Eén rechte lijn door de lopen van de laatste 8 weken, gewogen; de band van 80 procent uit de
// eigen spreiding rond die lijn, met een ondergrens. Deterministisch.
export function zone2Statement(counted: Zone2Measurement[], today: string): Zone2Statement | undefined {
  const from = addDays(today, -7 * R.lineWeeks);
  const xs = counted.filter((m) => m.date > from && m.date <= today);
  if (xs.length === 0) return undefined;
  const totalW = xs.reduce((n, m) => n + m.weight, 0);
  const mean = xs.reduce((n, m) => n + m.paceSec * m.weight, 0) / totalW;
  const span = daysBetween(xs[0].date, xs[xs.length - 1].date);
  const weekCount = new Set(xs.map((m) => mondayOfWeek(m.date))).size;
  if (xs.length < R.firstRuns || span < R.firstSpanDays || weekCount < R.firstWeeks) return { kind: 'eerste-schatting', paceSec: mean, runs: xs.length };
  const n = xs.length;
  // Gewichten zo geschaald dat ze samen n zijn; x in dagen tot vandaag (negatief).
  const pts = xs.map((m) => ({ x: -daysBetween(m.date, today), y: m.paceSec, w: (m.weight * n) / totalW }));
  const xbar = pts.reduce((s, p) => s + p.w * p.x, 0) / n;
  const ybar = pts.reduce((s, p) => s + p.w * p.y, 0) / n;
  const sxx = pts.reduce((s, p) => s + p.w * (p.x - xbar) ** 2, 0);
  const slope = pts.reduce((s, p) => s + p.w * (p.x - xbar) * (p.y - ybar), 0) / sxx;
  const at = (x: number) => ybar + slope * (x - xbar);
  const sse = pts.reduce((s, p) => s + p.w * (p.y - at(p.x)) ** 2, 0);
  const spread = Math.max(Math.sqrt(sse / (n - 2)), R.minSpread * ybar);
  const changeSec = slope * R.firstSpanDays;
  const half = R.bandZ * (spread / Math.sqrt(sxx)) * R.firstSpanDays;
  const lowSec = changeSec - half;
  const highSec = changeSec + half;
  const verdict = highSec - lowSec > R.tooWideSec ? 'te-veel-verschil' : lowSec < 0 && highSec > 0 ? 'geen-duidelijke-verandering' : changeSec < 0 ? 'sneller' : 'langzamer';
  return {
    kind: 'uitspraak',
    runs: n,
    changeSec,
    lowSec,
    highSec,
    verdict,
    roundedLow: roundTo(lowSec),
    roundedHigh: roundTo(highSec),
    line: { fromDate: xs[0].date, toDate: today, fromSec: at(pts[0].x), toSec: at(0) },
  };
}

// The rounded band in words, the same in every place that says it (the card, Je stand, the
// moment you hear about it): "ongeveer 10 tot 20 seconden sneller". Negative is faster.
export function bandPhrase(s: { roundedLow: number; roundedHigh: number }): string {
  const { roundedLow: lo, roundedHigh: hi } = s;
  if (lo === 0 && hi === 0) return 'gelijk';
  if (lo < 0 && hi > 0) return `tussen ${-lo} seconden sneller en ${hi} seconden langzamer`;
  const faster = hi <= 0;
  const [near, far] = faster ? [-hi, -lo] : [lo, hi];
  const word = faster ? 'sneller' : 'langzamer';
  if (near === far) return `ongeveer ${far} seconden ${word}`;
  if (near === 0) return `tot ongeveer ${far} seconden ${word}`;
  return `ongeveer ${near} tot ${far} seconden ${word}`;
}

// What counts, in two short lines, the same on the card and in Je stand.
// Without zones there is no zone 2 to name (the card then asks for your heart rate).
export function zone2Criteria(trend: Pick<AerobicTrend, 'runs' | 'referenceHr'>, pieces: boolean, zones = true): string[] {
  const runs = trend.runs > 0 ? ` (${trend.runs} ${trend.runs === 1 ? 'loop' : 'lopen'})` : '';
  const what = pieces
    ? `Telt mee: stukken van minstens 5 minuten stabiel${zones ? ' in zone 2' : ''} op vlak terrein, uit elke buitenloop${runs}`
    : `Telt mee: vlakke rustige en lange duurlopen, met de gemiddelde hartslag van de hele loop${runs}`;
  return [
    trend.referenceHr > 0 ? `${what}. Omgerekend naar ${trend.referenceHr} slagen per minuut.` : `${what}.`,
    `Een loop boven ${R.heatOutC} graden gevoelstemperatuur telt niet mee.`,
  ];
}

const capital = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;

// One sentence on what the trend says, from the same statement as the chart and the figures.
export function trendVerdict(trend: Pick<AerobicTrend, 'statement' | 'referenceHr'>): string | undefined {
  const s = trend.statement;
  if (!s) return undefined;
  if (s.kind === 'eerste-schatting') {
    return `Eerste schatting: rond ${formatPace(s.paceSec)} per km${trend.referenceHr > 0 ? ` bij ${trend.referenceHr} slagen` : ''}. Of het verandert, zie je na ${R.firstRuns} lopen over minstens 4 weken.`;
  }
  if (s.verdict === 'te-veel-verschil') return 'Nog te veel verschil tussen je lopen om iets te zeggen. Vooruitgang gaat in weken, niet per loop.';
  const phrase = bandPhrase(s);
  if (phrase === 'gelijk') return 'Gelijk aan een maand geleden. Vooruitgang gaat in weken, niet per loop.';
  if (s.verdict === 'geen-duidelijke-verandering') return `Nog geen duidelijke verandering: ${phrase} per km dan een maand geleden.`;
  return s.verdict === 'sneller'
    ? `${capital(phrase)} per km dan een maand geleden, bij dezelfde hartslag. Dat past bij fitter worden.`
    : `${capital(phrase)} per km dan een maand geleden. Moe, warm of weinig geslapen? Kijk hoe het de komende weken gaat.`;
}

// The big number on the card: the line today once there is one, else the first estimate, else
// the last week. The label says which, so the number never seems to be something else.
export function trendHeadline(trend: Pick<AerobicTrend, 'statement' | 'recentSec'> & { points: (TrendPoint & { paceSec: number; runs: number })[] }): { paceSec: number; label: string } | undefined {
  const s = trend.statement;
  if (s?.kind === 'uitspraak' && trend.recentSec !== undefined) return { paceSec: trend.recentSec, label: 'nu, op de lijn' };
  if (s?.kind === 'eerste-schatting') return { paceSec: s.paceSec, label: 'eerste schatting' };
  const last = trend.points.at(-1);
  return last ? { paceSec: last.paceSec, label: 'laatste week' } : undefined;
}

// --- the moment you hear about it ------------------------------------------

export interface ProgressCelebrated {
  date: string;
  // The side of the band closest to zero when it was said (negative = faster).
  changeSec: number;
}

// At most every two weeks, and only when it got better again since the
// last time (at least 3 more seconds), so it stays news.
const CELEBRATE_EVERY_DAYS = 14;
const CELEBRATE_FURTHER_SEC = 3;

// The side of the band closest to zero: what progressMoment reads and what is remembered.
export function celebratedChange(trend: Pick<AerobicTrend, 'statement'>): number | undefined {
  const s = trend.statement;
  return s?.kind === 'uitspraak' && s.verdict === 'sneller' ? s.highSec : undefined;
}

export function progressMoment(trend: Pick<AerobicTrend, 'statement'>, last: ProgressCelebrated | undefined, today: string): string | undefined {
  const near = celebratedChange(trend);
  const s = trend.statement;
  if (near === undefined || s?.kind !== 'uitspraak' || near > -R.celebrateSec) return undefined;
  if (last && (today < addDays(last.date, CELEBRATE_EVERY_DAYS) || near > last.changeSec - CELEBRATE_FURTHER_SEC)) return undefined;
  return `Een goed teken: bij dezelfde hartslag loop je ${bandPhrase(s)} per km dan een maand geleden. Dat is de trend over weken, niet één loopje.`;
}
