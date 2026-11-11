// Migratiestappen voor velden op een SessionLog en per set, en de testloop.

import { MAX_ZONE_ANSWERS, type ZoneAnswer } from '../models/zoneAnswer';
import type { TestJudgment } from '../models/testJudgment';
import { isUsableBestEffort } from '../engine/bestEffort';
import { cleanForgeLog } from '../engine/forgeLog';
import { validLinkedLater } from '../engine/missedTraining';
import { capTestJudgments } from '../engine/testJudgment';
import { SET_BANDS, type BestEffort, type ExerciseSetLog, type ManualMeasured, type ManualStrength, type MeasuredField, type MetricSource, type SessionLog, type SetBand, type SetLog } from '../models/training';
import { isObj, ISO_DAY } from './migrationsShared';

// --- Garmin is leidend: SessionLog.manualMeasured -----------------------------
// A log made by hand that took over the watch's numbers keeps the hand-made
// ones in `manualMeasured` (models/training.ts). The field is optional and
// additive: a file from before it has none, and every log travels whole, so the
// backup schema number does not move. This step is a pass-through for a log
// without the field; a log whose field is damaged (hand-edited, cut off) keeps
// everything else and loses only that field, because putting back from damaged
// values would write nonsense into the log.
const MEASURED_KEYS: MeasuredField[] = ['durationMinutes', 'distanceKm', 'elevationGainM', 'elevationLossM', 'avgHeartRate', 'maxHeartRate', 'cadence', 'estimatedElevation'];

export function migrateManualMeasured(raw: unknown): ManualMeasured | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const m = raw as Record<string, unknown>;
  const strength = migrateManualStrength(m.strength);
  if (m.strength !== undefined && !strength) return undefined;
  // A strength takeover has no block; every other replacement has one.
  if (typeof m.at !== 'string' || (!strength && m.block !== 'cardioData' && m.block !== 'outdoorData')) return undefined;
  if (m.block !== undefined && m.block !== 'cardioData' && m.block !== 'outdoorData') return undefined;
  if (typeof m.values !== 'object' || m.values === null || Array.isArray(m.values)) return undefined;
  const values: ManualMeasured['values'] = {};
  for (const [key, value] of Object.entries(m.values as Record<string, unknown>)) {
    if (!MEASURED_KEYS.includes(key as MeasuredField)) return undefined;
    const numeric = key !== 'estimatedElevation';
    if (value === null || (numeric ? typeof value === 'number' && Number.isFinite(value) : typeof value === 'boolean')) values[key as MeasuredField] = value as number | boolean | null;
    else return undefined;
  }
  const ids = m.clearedProgressIds;
  return {
    at: m.at,
    values,
    ...(m.block === 'cardioData' || m.block === 'outdoorData' ? { block: m.block } : {}),
    ...(m.blockAdded === true ? { blockAdded: true as const } : {}),
    ...(typeof m.blockSource === 'string' ? { blockSource: m.blockSource as ManualMeasured['blockSource'] } : {}),
    ...(Array.isArray(ids) && ids.every((i) => typeof i === 'string') && ids.length > 0 ? { clearedProgressIds: ids as string[] } : {}),
    ...(strength ? { strength } : {}),
  };
}

const isExerciseSets = (v: unknown): v is NonNullable<SessionLog['strengthData']> =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      typeof e === 'object' && e !== null && typeof (e as { exerciseId?: unknown }).exerciseId === 'string' &&
      typeof (e as { exerciseName?: unknown }).exerciseName === 'string' && Array.isArray((e as { sets?: unknown }).sets),
  );

// The strength part of a takeover by MacroFactor; undefined when damaged.
function migrateManualStrength(raw: unknown): ManualStrength | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const s = raw as Record<string, unknown>;
  if (typeof s.workoutId !== 'string') return undefined;
  const out: ManualStrength = { workoutId: s.workoutId };
  if ('strengthData' in s) {
    if (s.strengthData !== null && !isExerciseSets(s.strengthData)) return undefined;
    out.strengthData = s.strengthData;
  }
  if ('strengthRir' in s) {
    if (s.strengthRir !== null && !(typeof s.strengthRir === 'number' && Number.isFinite(s.strengthRir))) return undefined;
    out.strengthRir = s.strengthRir;
  }
  if (s.tied !== undefined) {
    const t = s.tied as { source?: unknown } | null;
    if (typeof t !== 'object' || t === null || typeof t.source !== 'string') return undefined;
    out.tied = { source: t.source as MetricSource };
  }
  return out;
}

// A log as it comes out of a file: the same log, with `manualMeasured` only when
// it is whole.
export function migrateLogManualMeasured(log: SessionLog): SessionLog {
  if (!('manualMeasured' in log)) return log;
  const valid = migrateManualMeasured((log as { manualMeasured?: unknown }).manualMeasured);
  const { manualMeasured: _damaged, ...rest } = log;
  void _damaged;
  return valid ? { ...rest, manualMeasured: valid } : rest;
}

// --- SessionLog.gymProfileId --------------------------------------------------------
// The gym profile a strength log was done in (decision 2026-10-26-gewichten-per-toestel.md).
// Optional and additive; kept only as a non-empty text of at most 60 characters, so a
// hand-edited backup cannot make a training silently drop out of every gym.
export function migrateLogGymProfile(log: SessionLog): SessionLog {
  if (!('gymProfileId' in log)) return log;
  const raw = (log as { gymProfileId?: unknown }).gymProfileId;
  if (typeof raw === 'string' && raw.trim() !== '' && raw.length <= 60) return log;
  const { gymProfileId: _damaged, ...rest } = log;
  void _damaged;
  return rest;
}

// --- SessionLog.fileDurationMinutes ---------------------------------------------------------
// De duur die een MacroFactor-bestand gaf, als je hem zelf aanpaste (decision 2026-10-29-mf-training-te-lang.md).
// Alleen een eindig getal boven nul blijft; iets anders uit een bewerkte back-up valt weg, de log blijft.
export function migrateLogFileDuration(log: SessionLog): SessionLog {
  if (!('fileDurationMinutes' in log)) return log;
  const raw = (log as { fileDurationMinutes?: unknown }).fileDurationMinutes;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return log;
  const { fileDurationMinutes: _damaged, ...rest } = log;
  void _damaged;
  return rest;
}

// --- SessionLog.linkedLater ------------------------------------------------------------------
// Een log van het horloge of MacroFactor die na je Akkoord aan een geplande training werd gekoppeld
// (engine/missedTraining.ts, decision 2026-11-01-niet-doorgegaan.md). Optional and additive: een bestand
// van ervoor heeft het niet en leest zoals het was. Iets wat geen heel moment is uit een bewerkte back-up
// valt weg; de log en zijn verwijzing blijven.
export function migrateLogLinkedLater(log: SessionLog): SessionLog {
  if (!('linkedLater' in log)) return log;
  if (validLinkedLater((log as { linkedLater?: unknown }).linkedLater)) return log;
  const { linkedLater: _damaged, ...rest } = log;
  void _damaged;
  return rest;
}

// --- SessionLog.forgeLog ---------------------------------------------------------------------
// Het verloop van een krachttraining in Forge (engine/forgeLog.ts, decision
// 2026-10-28-forge-logboek.md). Optional and additive: a file from before it has none and imports as
// it was. Read event by event: what is whole stays, what is damaged is dropped, and a log with
// nothing left loses only the field, never the training.
export function migrateLogForgeLog(log: SessionLog): SessionLog {
  if (!('forgeLog' in log)) return log;
  const clean = cleanForgeLog((log as { forgeLog?: unknown }).forgeLog);
  const { forgeLog: _raw, ...rest } = log;
  void _raw;
  return clean ? { ...rest, forgeLog: clean } : rest;
}

// --- testloop lezen: SessionLog.bestEffort en settings.testJudgments ------------------------
// A test run may carry the fastest unbroken 5 km read from the watch's series
// (`bestEffort`, models/training.ts, engine/bestEffort.ts), and your own verdicts on test
// runs ("Telt mee", "Telt niet mee") are a list next to the logs. Both are optional and
// additive, so the backup schema number does not move: a file from before them has neither
// and imports as it was (the whole log then counts and every test counts, as before).
// A damaged best effort is dropped and the log keeps everything else; a damaged verdict
// loses only itself. One verdict per log, the last one wins.
export function migrateLogBestEffort(log: SessionLog): SessionLog {
  let out = log;
  if ('bestEffortTried' in out) {
    const tried = (out as { bestEffortTried?: unknown }).bestEffortTried;
    if (typeof tried !== 'string' || tried.length === 0 || tried.length > 40) {
      const { bestEffortTried: _t, ...rest } = out;
      void _t;
      out = rest;
    }
  }
  const rereadRaw = (out as { bestEffortReread?: unknown }).bestEffortReread;
  if ('bestEffortReread' in out) {
    const cand = isUsableBestEffort(rereadRaw) ? sanitizeBestEffort(rereadRaw) : undefined;
    // A candidate is always v 2 or later and never accepted; anything else is dropped.
    if (cand && cand.v !== undefined) {
      delete cand.accepted;
      out = { ...out, bestEffortReread: cand };
    } else {
      const { bestEffortReread: _r, ...rest } = out;
      void _r;
      out = rest;
    }
  }
  if (!('bestEffort' in out)) return out;
  const raw = (out as { bestEffort?: unknown }).bestEffort;
  if (isUsableBestEffort(raw)) return { ...out, bestEffort: sanitizeBestEffort(raw) };
  const { bestEffort: _damaged, ...rest } = out;
  void _damaged;
  return rest;
}

function sanitizeBestEffort(r: BestEffort): BestEffort {
  const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
  const kept: BestEffort = { km: r.km, minutes: r.minutes };
  if (fin(r.wholeKm) && fin(r.wholeMinutes)) {
    kept.wholeKm = r.wholeKm;
    kept.wholeMinutes = r.wholeMinutes;
  }
  if (r.accepted === true) kept.accepted = true;
  if (typeof r.v === 'number' && Number.isInteger(r.v) && r.v >= 2 && r.v <= 99) kept.v = r.v;
  const small = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  if (small(r.stops, 500) && small(r.stoppedSec, 36000)) {
    kept.stops = Math.round(r.stops);
    kept.stoppedSec = Math.round(r.stoppedSec);
  }
  if (fin(r.prevMinutes) && r.prevMinutes < 1000) kept.prevMinutes = r.prevMinutes;
  return kept;
}

export function migrateTestJudgments(raw: unknown): { list: TestJudgment[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const byLog = new Map<string, TestJudgment>();
  let skipped = 0;
  for (const item of raw) {
    if (!isObj(item) || typeof item.logId !== 'string' || item.logId.trim() === '' || item.logId.length > 80 || (item.verdict !== 'counts' && item.verdict !== 'ignore')) {
      skipped++;
      continue;
    }
    const date = typeof item.date === 'string' && ISO_DAY.test(item.date.slice(0, 10)) ? item.date.slice(0, 10) : undefined;
    if (!date) {
      skipped++;
      continue;
    }
    byLog.set(item.logId, { logId: item.logId, verdict: item.verdict, date });
  }
  return { list: capTestJudgments([...byLog.values()]), skipped };
}

// --- zones bijwerken na een test: settings.zoneAnswers ------------------------------------
// Je antwoord per test op het voorstel voor je drempelhartslag (engine/zoneUpdate.ts). Optioneel en
// additief: een oudere back-up heeft er geen en laat de antwoorden op het toestel staan. Antwoord voor
// antwoord gelezen; een beschadigd antwoord valt weg en wordt geteld, een los fout getal valt alleen
// zelf weg (lthrFrom).
export function migrateZoneAnswers(raw: unknown): { list: ZoneAnswer[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const hr = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 100 && n <= 220;
  const byLog = new Map<string, ZoneAnswer>();
  let skipped = 0;
  for (const item of raw) {
    const date = isObj(item) && typeof item.date === 'string' && ISO_DAY.test(item.date.slice(0, 10)) ? item.date.slice(0, 10) : undefined;
    if (!isObj(item) || typeof item.logId !== 'string' || item.logId.trim() === '' || item.logId.length > 80 || (item.answer !== 'accepted' && item.answer !== 'declined') || !hr(item.lthrTo) || !date) {
      skipped++;
      continue;
    }
    byLog.set(item.logId, { logId: item.logId, answer: item.answer, date, ...(hr(item.lthrFrom) ? { lthrFrom: Math.round(item.lthrFrom) } : {}), lthrTo: Math.round(item.lthrTo) });
  }
  return { list: [...byLog.values()].slice(-MAX_ZONE_ANSWERS), skipped };
}

// --- meer per set: SetLog.rir, SetLog.kind en SetLog.rirAssumed -------------------
// A set can carry the reps in reserve (`rir`, 0 to 10) and its kind (`kind`,
// 'warmup' or 'work'; absent is a working set). Both are optional and additive:
// every log travels whole, so the backup schema number does not move and a
// backup from before the fields (any schema) imports exactly as it did. A set
// whose new field is damaged (hand-edited) keeps its reps and weight and loses
// only that field. `rirAssumed` (true: the reps in reserve are the aim of the
// plan, not measured) is only kept as `true` and only next to a valid `rir`.
function migrateSetLog(raw: SetLog): SetLog {
  if (typeof raw !== 'object' || raw === null || (!('rir' in raw) && !('kind' in raw) && !('rirAssumed' in raw))) return raw;
  const { rir, kind, rirAssumed, ...rest } = raw as SetLog;
  const out: SetLog = rest;
  if (typeof rir === 'number' && Number.isFinite(rir) && rir >= 0 && rir <= 10) out.rir = rir;
  if (kind === 'warmup' || kind === 'work') out.kind = kind;
  if (rirAssumed === true && out.rir !== undefined) out.rirAssumed = true;
  return out;
}

function migrateExerciseSets(data: ExerciseSetLog[] | null | undefined): ExerciseSetLog[] | null | undefined {
  if (!Array.isArray(data)) return data;
  let changed = false;
  const next = data.map((e) => {
    if (!e || !Array.isArray(e.sets)) return e;
    const sets = e.sets.map(migrateSetLog);
    if (sets.every((s, i) => s === e.sets[i])) return e;
    changed = true;
    return { ...e, sets };
  });
  return changed ? next : data;
}

// --- SetLog.at -------------------------------------------------------------------------------
// The time a set was ticked (docs/beslissingen/2026-10-29-forge-als-sessie.md). Optional and additive:
// older files have none. Only a valid ISO time stays; a damaged one is dropped from that set and
// the set keeps its reps and weight.
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;
export function migrateLogSetTimes(log: SessionLog): SessionLog {
  let next = log;
  const data = cleanSetTimes(log.strengthData);
  if (data !== log.strengthData) next = { ...next, strengthData: data };
  // Ook de sets die bewaard zijn om terug te zetten (manualMeasured.strength).
  const kept = log.manualMeasured?.strength?.strengthData;
  const keptNext = cleanSetTimes(kept);
  if (keptNext !== kept && log.manualMeasured?.strength) {
    next = { ...next, manualMeasured: { ...log.manualMeasured, strength: { ...log.manualMeasured.strength, strengthData: keptNext } } };
  }
  return next;
}

function cleanSetTimes<T extends ExerciseSetLog[] | null | undefined>(data: T): T {
  if (!Array.isArray(data)) return data;
  let changed = false;
  const next = data.map((e) => {
    if (!e || !Array.isArray(e.sets)) return e;
    const sets = e.sets.map((s) => {
      if (!s || typeof s !== 'object' || !('at' in s)) return s;
      const at = (s as { at?: unknown }).at;
      if (typeof at === 'string' && ISO_TIME.test(at) && Number.isFinite(Date.parse(at))) return s;
      const { at: _bad, ...rest } = s;
      void _bad;
      changed = true;
      return rest as SetLog;
    });
    return sets.every((s, i) => s === e.sets[i]) ? e : { ...e, sets };
  });
  return (changed ? next : data) as T;
}

// --- SetLog.repsAsked, SetLog.weightKgAsked, SetLog.forgeKg en SetLog.rirAsked ------------------
// `forgeKg` (het gewicht dat Forge na een bijstelling in de rij zette) kwam op 9 november 2026 erbij, met
// dezelfde regel: docs/beslissingen/2026-11-09-forge-review-afvinken.md.
// Wat Forge vroeg bij een set ("Afvinken telt als het doel", docs/beslissingen/2026-11-08-forge-afvinken-doel.md).
// Sinds 9 november 2026 staat het bij elke werkset uit Forge, met `rirAsked` (de RIR van het doel) erbij, voor
// "Hoe goed kent Forge je" (docs/beslissingen/2026-11-09-hoe-goed-kent-forge-je.md). Optioneel en aanvullend:
// oudere bestanden hebben ze niet, of alleen naast `rirAssumed`, en lezen zoals altijd (met de onderkant van
// het bereik). Alleen een geldig getal blijft; een beschadigd veld valt weg en de set houdt zijn herhalingen en
// gewicht.
const okAskedReps = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 100;
const okAskedKg = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1000;
const okAskedRir = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 10;

function cleanSetAsked<T extends ExerciseSetLog[] | null | undefined>(data: T): T {
  if (!Array.isArray(data)) return data;
  let changed = false;
  const next = data.map((e) => {
    if (!e || !Array.isArray(e.sets)) return e;
    const sets = e.sets.map((s) => {
      if (!s || typeof s !== 'object' || (!('repsAsked' in s) && !('weightKgAsked' in s) && !('forgeKg' in s) && !('rirAsked' in s))) return s;
      const repsOk = !('repsAsked' in s) || okAskedReps(s.repsAsked);
      const kgOk = !('weightKgAsked' in s) || okAskedKg(s.weightKgAsked);
      const forgeOk = !('forgeKg' in s) || okAskedKg(s.forgeKg);
      const rirOk = !('rirAsked' in s) || okAskedRir(s.rirAsked);
      if (repsOk && kgOk && forgeOk && rirOk) return s;
      const { repsAsked, weightKgAsked, forgeKg, rirAsked, ...rest } = s;
      changed = true;
      return { ...rest, ...(okAskedReps(repsAsked) ? { repsAsked } : {}), ...(okAskedKg(weightKgAsked) ? { weightKgAsked } : {}), ...(okAskedKg(forgeKg) ? { forgeKg } : {}), ...(okAskedRir(rirAsked) ? { rirAsked } : {}) } as SetLog;
    });
    return sets.every((s, i) => s === e.sets[i]) ? e : { ...e, sets };
  });
  return (changed ? next : data) as T;
}

export function migrateLogSetAsked(log: SessionLog): SessionLog {
  let next = log;
  const data = cleanSetAsked(log.strengthData);
  if (data !== log.strengthData) next = { ...next, strengthData: data };
  const kept = log.manualMeasured?.strength?.strengthData;
  const keptNext = cleanSetAsked(kept);
  if (keptNext !== kept && log.manualMeasured?.strength) {
    next = { ...next, manualMeasured: { ...log.manualMeasured, strength: { ...log.manualMeasured.strength, strengthData: keptNext } } };
  }
  return next;
}

// --- SetLog.rowId -----------------------------------------------------------------------------------
// De rij in Forge waar een set vandaan kwam, zodat het verloop een gebeurtenis aan de goede set koppelt
// (docs/beslissingen/2026-11-11-forge-verloop.md). Optioneel en aanvullend: een oud bestand heeft hem niet en
// koppelt op nummer; alleen een korte tekst blijft, een beschadigde waarde valt weg en de set blijft gelijk.
const okRowId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 80;

function cleanSetRow<T extends ExerciseSetLog[] | null | undefined>(data: T): T {
  if (!Array.isArray(data)) return data;
  let changed = false;
  const next = data.map((e) => {
    if (!e || !Array.isArray(e.sets)) return e;
    const sets = e.sets.map((s) => {
      if (!s || typeof s !== 'object' || !('rowId' in s) || okRowId(s.rowId)) return s;
      const { rowId: _bad, ...rest } = s;
      void _bad;
      changed = true;
      return rest as SetLog;
    });
    return sets.every((s, i) => s === e.sets[i]) ? e : { ...e, sets };
  });
  return (changed ? next : data) as T;
}

export function migrateLogSetRow(log: SessionLog): SessionLog {
  let next = log;
  const data = cleanSetRow(log.strengthData);
  if (data !== log.strengthData) next = { ...next, strengthData: data };
  const kept = log.manualMeasured?.strength?.strengthData;
  const keptNext = cleanSetRow(kept);
  if (keptNext !== kept && log.manualMeasured?.strength) {
    next = { ...next, manualMeasured: { ...log.manualMeasured, strength: { ...log.manualMeasured.strength, strengthData: keptNext } } };
  }
  return next;
}

// --- SetLog.seconds, SetLog.band en SetLog.clean (calisthenics) ----------------------------------
// De houding in seconden, de band die hielp en "Ging het netjes?" (docs/beslissingen/2026-11-09-calisthenics-ontwerp.md).
// Optioneel en aanvullend, met dezelfde regel als `repsAsked`: een oud bestand heeft ze niet en leest gelijk;
// alleen een geldige waarde blijft, een beschadigde valt weg en de set houdt zijn herhalingen en gewicht.
const okSeconds = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 3600;
const okBand = (b: unknown): b is SetBand => typeof b === 'string' && (SET_BANDS as readonly string[]).includes(b);
const okClean = (c: unknown): c is boolean => typeof c === 'boolean';

function cleanSetSkill<T extends ExerciseSetLog[] | null | undefined>(data: T): T {
  if (!Array.isArray(data)) return data;
  let changed = false;
  const next = data.map((e) => {
    if (!e || !Array.isArray(e.sets)) return e;
    const sets = e.sets.map((s) => {
      if (!s || typeof s !== 'object' || (!('seconds' in s) && !('band' in s) && !('clean' in s))) return s;
      const secondsOk = !('seconds' in s) || okSeconds(s.seconds);
      const bandOk = !('band' in s) || okBand(s.band);
      const cleanOk = !('clean' in s) || okClean(s.clean);
      if (secondsOk && bandOk && cleanOk) return s;
      const { seconds, band, clean, ...rest } = s;
      changed = true;
      return { ...rest, ...(okSeconds(seconds) ? { seconds } : {}), ...(okBand(band) ? { band } : {}), ...(okClean(clean) ? { clean } : {}) } as SetLog;
    });
    return sets.every((s, i) => s === e.sets[i]) ? e : { ...e, sets };
  });
  return (changed ? next : data) as T;
}

export function migrateLogSetSkill(log: SessionLog): SessionLog {
  let next = log;
  const data = cleanSetSkill(log.strengthData);
  if (data !== log.strengthData) next = { ...next, strengthData: data };
  const kept = log.manualMeasured?.strength?.strengthData;
  const keptNext = cleanSetSkill(kept);
  if (keptNext !== kept && log.manualMeasured?.strength) {
    next = { ...next, manualMeasured: { ...log.manualMeasured, strength: { ...log.manualMeasured.strength, strengthData: keptNext } } };
  }
  return next;
}

// A log as it comes out of a file, with every set read by migrateSetLog (also
// the sets kept for putting back in `manualMeasured.strength`).
export function migrateLogSets(log: SessionLog): SessionLog {
  let next = log;
  const data = migrateExerciseSets(log.strengthData);
  if (data !== log.strengthData) next = { ...next, strengthData: data as ExerciseSetLog[] };
  const kept = log.manualMeasured?.strength?.strengthData;
  const keptNext = migrateExerciseSets(kept);
  if (keptNext !== kept && log.manualMeasured?.strength) {
    next = { ...next, manualMeasured: { ...log.manualMeasured, strength: { ...log.manualMeasured.strength, strengthData: keptNext } } };
  }
  return next;
}
