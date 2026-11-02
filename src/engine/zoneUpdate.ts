// ASCEND: "Zones bijwerken na een test" (docs/beslissingen/2026-11-02-week-en-vandaag-hulp.md).
//
// Na een testloop die meetelt (engine/racePrediction.ts#countedTests) en de laatste is, stelt de
// app een nieuwe drempelhartslag voor, met per zone het oude en het nieuwe getal. Je hartslagzones
// rekenen met die drempel (engine/heartRateZones.ts), dus Akkoord verandert alleen
// `AppSettings.heartRate.lthr`; Liever niet laat alles staan. Nooit stil.
//
// Je tempo's volgen je test al (pacesFromLogs, met de eigen vraag bij een twijfeltest en de Akkoord
// op een snelste 5 km); het voorstel laat ze zien zodat je weet wat er met je test meeverandert.
//
// De schatting: de gemiddelde hartslag van kilometer 2 tot en met 5 van je snelste 5 km, keer 0,98.
// Friel neemt bij een test van 30 minuten de laatste 20 minuten als drempel; een 5 km is korter en
// harder, dus iets eronder. Een aanname, in de uitleg zo genoemd.
//
// Puur: geen React, geen opslag.

import type { SessionLog } from '../models/training';
import type { HeartRateSettings } from './heartRateZones';
import { zoneBpm } from './heartRateZones';
import type { Intensity } from '../data/workoutStructure';
import { countedTests, type TestJudgmentOptions } from './racePrediction';
import { racePaces } from './racePaces';
import { paceChangeRows, type PaceChangeRow } from './testJudgment';
import { isStaleRunDetail, isUsableRunDetail } from './runDetail';
import { testTotals } from './bestEffort';
import { heartRateProblem } from './inputLimits';
import { MAX_ZONE_ANSWERS, type ZoneAnswer } from '../models/zoneAnswer';

export const LTHR_FROM_5K = 0.98;
// Kleiner dan dit verschil is ruis: geen voorstel.
export const MIN_LTHR_CHANGE = 3;
// Zoveel kilometers met hartslag (van 2 tot en met 5) zijn nodig voor een schatting.
const MIN_KMS = 3;

const ZONES: Intensity[] = [1, 2, 3, 4];

export function lthrFromTest(log: SessionLog): number | undefined {
  if (log.trim) return undefined;
  const rd = log.runDetail;
  if (!isUsableRunDetail(rd) || !rd.bestFive) return undefined;
  const { km, minutes } = testTotals(log);
  if (isStaleRunDetail(rd, km, minutes)) return undefined;
  const kms = [...rd.bestFive.kms].sort((a, b) => a.startM - b.startM).slice(1).filter((k) => typeof k.hrAvg === 'number' && k.hrAvg > 0 && k.sec > 0);
  if (kms.length < MIN_KMS) return undefined;
  const sec = kms.reduce((n, k) => n + k.sec, 0);
  const avg = kms.reduce((n, k) => n + k.hrAvg! * k.sec, 0) / sec;
  return Math.round(avg * LTHR_FROM_5K);
}

export interface ZoneRow {
  label: string;
  from: string;
  to: string;
}

export interface ZoneOffer {
  logId: string;
  lthrFrom?: number;
  lthrTo: number;
  hrRows: ZoneRow[];
  paceRows: PaceChangeRow[];
}

const bpm = (range: [number, number] | undefined) => (range ? `${range[0]} tot ${range[1]} bpm` : 'nog geen');

export function zoneOffer(args: {
  logId: string;
  logs: SessionLog[];
  options: TestJudgmentOptions;
  heartRate: HeartRateSettings | undefined;
  enabled: boolean;
  answers?: ZoneAnswer[];
}): ZoneOffer | undefined {
  const { logId, logs, options, heartRate, enabled, answers } = args;
  if (!enabled || answers?.some((a) => a.logId === logId)) return undefined;
  const counted = countedTests(logs, options).tests;
  const at = counted.findIndex((t) => t.logId === logId);
  // Alleen de laatste test die meetelt: een oudere zegt niets meer over je zones van nu.
  if (at < 0 || at !== counted.length - 1) return undefined;
  const log = logs.find((l) => l.id === logId);
  const next = log ? lthrFromTest(log) : undefined;
  if (next === undefined) return undefined;
  const current = heartRate?.lthr;
  if (current !== undefined && Math.abs(next - current) < MIN_LTHR_CHANGE) return undefined;
  if (heartRateProblem('lthr', next, heartRate ?? {})) return undefined;
  const after: HeartRateSettings = { ...heartRate, lthr: next };
  return {
    logId,
    ...(current !== undefined ? { lthrFrom: current } : {}),
    lthrTo: next,
    hrRows: ZONES.map((z) => ({ label: `Zone ${z}`, from: bpm(zoneBpm(z, heartRate)), to: bpm(zoneBpm(z, after)) })),
    paceRows: paceChangeRows(racePaces(counted.slice(0, at)), racePaces(counted)),
  };
}

// Eén antwoord per test; het nieuwste vervangt een ouder, de lijst houdt de laatste MAX_ZONE_ANSWERS.
export function recordZoneAnswer(list: ZoneAnswer[] | undefined, entry: ZoneAnswer): ZoneAnswer[] {
  return [...(list ?? []).filter((a) => a.logId !== entry.logId), entry].slice(-MAX_ZONE_ANSWERS);
}
