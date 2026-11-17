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
// De schatting staat in engine/thresholdEstimate.ts (I-79): per test de laatste 20 minuten van het
// teststuk, alleen met borstband en bij 24 tot 40 minuten; samen het midden van je laatste drie geldige
// tests binnen 12 maanden. Een antwoord geldt voor de test en het getal: een ander getal voor dezelfde
// test (een andere instelling, of oudere tests die nu meetellen) geeft hoogstens een nieuw voorstel.
//
// Puur: geen React, geen opslag.

import type { SessionLog } from '../models/training';
import type { HeartRateSettings } from './heartRateZones';
import { zoneBpm } from './heartRateZones';
import type { Intensity } from '../data/workoutStructure';
import { countedTests, type TestJudgmentOptions, type TestResult } from './racePrediction';
import type { StreamSet } from '../models/activityDetail';
import {
  basisLine, combinedLthr, lthrFromEffort, notForThresholdLine, strapExpected, testsLine,
  type EffortEstimate, type EffortRejected, type LthrFactorChoice, type NoStrapChoice, type NotForThreshold,
} from './thresholdEstimate';
import { racePaces } from './racePaces';
import { paceChangeRows, type PaceChangeRow } from './testJudgment';
import { heartRateProblem } from './inputLimits';
import { MAX_ZONE_ANSWERS, type ZoneAnswer } from '../models/zoneAnswer';

// Kleiner dan dit verschil is ruis: geen voorstel.
const MIN_LTHR_CHANGE = 3;

const ZONES: Intensity[] = [1, 2, 3, 4];

export interface ThresholdInputs {
  // De reeksen van de tests, per log, alleen als ze bij de totalen van het log passen.
  streams?: ReadonlyMap<string, StreamSet>;
  factor?: LthrFactorChoice;
  noStrap?: NoStrapChoice;
  // De tests waarbij je zei "Ik had hem wel om".
  strapWorn?: readonly string[];
}

// De tests waarvan de reeks nodig is: die meetellen en binnen het venster van 12 maanden kunnen vallen.
export function thresholdLogIds(logs: SessionLog[], options: TestJudgmentOptions, today: string): string[] {
  const from = `${Number(today.slice(0, 4)) - 1}${today.slice(4, 10)}`;
  return countedTests(logs, options).tests.filter((t) => t.logId && t.date >= from).map((t) => t.logId!);
}

// Elke test die meetelt, met zijn schatting of de reden waarom hij niet telt voor je drempel.
export function thresholdEstimates(logs: SessionLog[], tests: TestResult[], inputs: ThresholdInputs = {}): (EffortEstimate | EffortRejected)[] {
  const byId = new Map(logs.map((l) => [l.id, l]));
  const out: (EffortEstimate | EffortRejected)[] = [];
  for (const t of tests) {
    const log = t.logId ? byId.get(t.logId) : undefined;
    if (!log) continue;
    out.push(lthrFromEffort(log, t, { streams: inputs.streams?.get(log.id), factor: inputs.factor, noStrap: inputs.noStrap, strapSaid: inputs.strapWorn?.includes(log.id) }));
  }
  return out;
}

interface ZoneRow {
  label: string;
  from: string;
  to: string;
}

export interface ZoneOffer {
  logId: string;
  lthrFrom?: number;
  lthrTo: number;
  // De marge: waarschijnlijk tussen low en high.
  low: number;
  high: number;
  // "Gemeten met je borstband, over de laatste 20 minuten van je test."
  basis: string;
  // "Je laatste drie tests: 174, 177 en 176. Het midden is 176." Niet bij één test.
  tests?: string;
  hrRows: ZoneRow[];
  paceRows: PaceChangeRow[];
}

const bpm = (range: [number, number] | undefined) => (range ? `${range[0]} tot ${range[1]} bpm` : 'nog geen');

interface OfferArgs extends ThresholdInputs {
  logId: string;
  logs: SessionLog[];
  options: TestJudgmentOptions;
  heartRate: HeartRateSettings | undefined;
  enabled: boolean;
  answers?: ZoneAnswer[];
  // Vandaag, voor de 12 maanden; zonder: de dag van de test.
  today?: string;
}

// De laatste test die meetelt, als het deze is, met de schattingen tot en met hem.
function latest(args: OfferArgs) {
  const counted = countedTests(args.logs, args.options).tests;
  const at = counted.findIndex((t) => t.logId === args.logId);
  // Alleen de laatste test die meetelt: een oudere zegt niets meer over je zones van nu.
  if (at < 0 || at !== counted.length - 1) return undefined;
  const estimates = thresholdEstimates(args.logs, counted, args);
  const own = estimates.find((e) => e.logId === args.logId);
  if (!own) return undefined;
  return { counted, at, estimates, own };
}

export function zoneOffer(args: OfferArgs): ZoneOffer | undefined {
  const { logId, heartRate, enabled, answers } = args;
  if (!enabled) return undefined;
  const found = latest(args);
  if (!found || !found.own.ok) return undefined;
  const { counted, at, estimates, own } = found;
  const valid = estimates.filter((e): e is EffortEstimate => e.ok);
  const combined = combinedLthr(valid, args.today ?? own.date);
  if (!combined) return undefined;
  const next = combined.lthr;
  if (answers?.some((a) => a.logId === logId && a.lthrTo === next)) return undefined;
  const current = heartRate?.lthr;
  if (current !== undefined && Math.abs(next - current) < MIN_LTHR_CHANGE) return undefined;
  if (heartRateProblem('lthr', next, heartRate ?? {})) return undefined;
  const after: HeartRateSettings = { ...heartRate, lthr: next };
  const tests = testsLine(combined);
  return {
    logId,
    ...(current !== undefined ? { lthrFrom: current } : {}),
    lthrTo: next,
    low: combined.low,
    high: combined.high,
    basis: basisLine(own),
    ...(tests ? { tests } : {}),
    hrRows: ZONES.map((z) => ({ label: `Zone ${z}`, from: bpm(zoneBpm(z, heartRate)), to: bpm(zoneBpm(z, after)) })),
    paceRows: paceChangeRows(racePaces(counted.slice(0, at)), racePaces(counted)),
  };
}

export interface ZoneNotice {
  logId: string;
  reason: NotForThreshold;
  line: string;
  // De vraag "Had je hem om?" met de tekstknop "Ik had hem wel om": alleen als de band er bij de
  // meeste van je laatste lopen wel was.
  askStrap: boolean;
}

// Telt de laatste test niet voor je drempel, dan één zin waarom; je tempo's tellen gewoon.
export function zoneNotice(args: OfferArgs): ZoneNotice | undefined {
  if (!args.enabled) return undefined;
  const found = latest(args);
  if (!found || found.own.ok) return undefined;
  const line = notForThresholdLine(found.own, args.heartRate?.lthr);
  if (!line) return undefined;
  const askStrap = (found.own.reason === 'noStrap' || found.own.reason === 'strapLost') && strapExpected(args.logs, args.logId);
  return { logId: args.logId, reason: found.own.reason, line, askStrap };
}

// "Ik had hem wel om": de test erbij, hoogstens de laatste MAX_ZONE_ANSWERS.
export function recordStrapWorn(list: readonly string[] | undefined, logId: string): string[] {
  return [...(list ?? []).filter((id) => id !== logId), logId].slice(-MAX_ZONE_ANSWERS);
}

// Eén antwoord per test; het nieuwste vervangt een ouder, de lijst houdt de laatste MAX_ZONE_ANSWERS.
export function recordZoneAnswer(list: ZoneAnswer[] | undefined, entry: ZoneAnswer): ZoneAnswer[] {
  return [...(list ?? []).filter((a) => a.logId !== entry.logId), entry].slice(-MAX_ZONE_ANSWERS);
}
