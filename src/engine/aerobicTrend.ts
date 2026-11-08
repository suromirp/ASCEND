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
// Pure: no React, no IndexedDB.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { RunDetail } from '../models/runDetail';
import { isStaleRunDetail } from './runDetail';
import { logSport } from './sports';
import { plannedRpeTop, EASY_RPE_TOP } from './coach';
import { zoneBpm, type HeartRateSettings } from './heartRateZones';
import { addDays, mondayOfWeek } from '../utils/dates';
import type { TrendPoint } from './readiness';

export interface AerobicTrend {
  referenceHr: number;
  points: (TrendPoint & { paceSec: number; runs: number })[]; // per week, oldest first
  runs: number;
  outsideZone: number; // easy runs left out: heart rate above zone 2, or far below it
  changeSec?: number; // last 2 weeks vs the 2 weeks a month earlier; negative = faster
  // The same change the other way round: at the same pace, about this many
  // beats more (negative = fewer). Pace and heart rate in proportion, as
  // above: an estimate, good for a trend.
  bpmChange?: number;
  // The two averages the change is made of, seconds per km at the reference heart
  // rate: the last 2 weeks and the 2 weeks a month before. Read by the Lopen
  // section on Je stand (engine/runTrends.ts), which shows this same trend and no
  // second one.
  recentSec?: number;
  earlierSec?: number;
}

const WEEKS = 12;
const MAX_CLIMB_PER_KM = 15;
// Met het vlakke tempo per km (run in detail) is meer helling te corrigeren (eigen aanname).
const MAX_CLIMB_PER_KM_FLAT = 30;
const BELOW_ZONE_BPM = 15;
// Eigen stijging tegen die van het horloge: verder uit elkaar dan dit en de hoogte van het horloge geldt niet (zoals runMetrics.ts).
const GAIN_AGREEMENT_RANGE: [number, number] = [60, 140];

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

export function aerobicTrend(logs: SessionLog[], templates: SessionTemplate[], program: Program | null | undefined, hr: HeartRateSettings | undefined, today: string, excludedLogIds?: ReadonlySet<string>): AerobicTrend {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const band = zoneBpm(2, hr);
  const since = addDays(mondayOfWeek(today), -7 * (WEEKS - 1));
  const candidates = logs.flatMap((l) => {
    if (l.completedDate < since || l.completedDate > today || logSport(l) !== 'running' || excludedLogIds?.has(l.id)) return [];
    const t = byId.get(l.templateId);
    const top = t ? plannedRpeTop(t, l.completedDate, program) : undefined;
    if (top === undefined || top > EASY_RPE_TOP) return [];
    const d = l.cardioData ?? l.outdoorData;
    const km = d?.distanceKm ?? 0;
    const minutes = d?.durationMinutes || l.durationMinutes;
    const bpm = d?.avgHeartRate ?? 0;
    if (km <= 0 || minutes <= 0 || bpm <= 0) return [];
    const rd = l.runDetail && !isStaleRunDetail(l.runDetail, km, minutes) ? l.runDetail : undefined;
    const climb = climbPerKm(d?.elevationGainM ?? 0, km, l, rd);
    // Met het vlakke tempo per km telt een heuvelachtige loop mee; zonder blijft de oude grens.
    const flat = rd ? flatFactor(rd) : undefined;
    if (climb > (flat !== undefined ? MAX_CLIMB_PER_KM_FLAT : MAX_CLIMB_PER_KM)) return [];
    return [{ date: l.completedDate, km, paceSec: ((minutes * 60) / km) * (flat ?? 1), bpm }];
  });
  // A little under zone 2 still counts (production feedback: two easy long
  // runs at 137 bpm, run with the watch on the old max-HR zones, left the
  // card empty): converted to the reference heart rate like the rest, a
  // bit less precise the further off. Above zone 2 is no easy run anymore.
  const inZone = band ? candidates.filter((c) => c.bpm >= band[0] - BELOW_ZONE_BPM && c.bpm <= band[1]) : candidates;
  const sortedHr = [...inZone.map((c) => c.bpm)].sort((a, b) => a - b);
  const referenceHr = band ? Math.round((band[0] + band[1]) / 2) : sortedHr[Math.floor(sortedHr.length / 2)] ?? 0;

  const weeks = new Map<string, { km: number; weighted: number; runs: number }>();
  for (const c of inZone) {
    // Pace at the reference heart rate: faster when you ran at a lower one.
    const adjusted = c.paceSec * (c.bpm / referenceHr);
    const w = mondayOfWeek(c.date);
    const acc = weeks.get(w) ?? { km: 0, weighted: 0, runs: 0 };
    acc.km += c.km;
    acc.weighted += adjusted * c.km;
    acc.runs += 1;
    weeks.set(w, acc);
  }
  const points = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([w, acc]) => {
      const paceSec = acc.weighted / acc.km;
      // Plotted as minus seconds, so faster reads as a line going up.
      return { label: `week van ${w.slice(8, 10).replace(/^0/, '')}-${w.slice(5, 7).replace(/^0/, '')}`, value: -paceSec, paceSec, runs: acc.runs };
    });

  // Last 2 weeks against the 2 weeks four weeks before, when both exist.
  const avg = (from: string, to: string) => {
    const xs = inZone.filter((c) => c.date >= from && c.date <= to);
    const km = xs.reduce((n, c) => n + c.km, 0);
    return km > 0 ? xs.reduce((n, c) => n + c.paceSec * (c.bpm / referenceHr) * c.km, 0) / km : undefined;
  };
  const monday = mondayOfWeek(today);
  const recent = avg(addDays(monday, -7), today);
  const earlier = avg(addDays(monday, -35), addDays(monday, -22));
  const changeSec = recent !== undefined && earlier !== undefined ? recent - earlier : undefined;
  const bpmChange = recent !== undefined && earlier !== undefined ? referenceHr * (recent / earlier - 1) : undefined;

  return { referenceHr, points, runs: inZone.length, outsideZone: candidates.length - inZone.length, changeSec, bpmChange, recentSec: recent, earlierSec: earlier };
}

// --- the moment you hear about it ------------------------------------------

export interface ProgressCelebrated {
  date: string;
  changeSec: number;
}

// At most every two weeks, and only when it got better again since the
// last time (at least 3 more seconds), so it stays news.
const CELEBRATE_EVERY_DAYS = 14;
const CELEBRATE_FURTHER_SEC = 3;

export function progressMoment(trend: AerobicTrend, last: ProgressCelebrated | undefined, today: string): string | undefined {
  const c = trend.changeSec;
  if (c === undefined || c > -MEANINGFUL_CHANGE_SEC) return undefined;
  if (last && (today < addDays(last.date, CELEBRATE_EVERY_DAYS) || c > last.changeSec - CELEBRATE_FURTHER_SEC)) return undefined;
  const sec = Math.round(-c);
  const bpm = trend.bpmChange !== undefined ? Math.round(-trend.bpmChange) : 0;
  return `Een goed teken: bij dezelfde hartslag loop je ${sec} seconden per km sneller dan een maand geleden${bpm >= 1 ? `; hetzelfde tempo kost je ongeveer ${bpm} ${bpm === 1 ? 'slag' : 'slagen'} minder` : ''}. Dat is de trend over weken, niet één loopje.`;
}
