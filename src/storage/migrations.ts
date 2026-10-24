// Migration scaffold. V1 only knows schema version 1, so this is a pass
// through with a guard rail — but the shape (versioned export, a migrate
// function keyed on the version found in the file) is what every future
// migration will slot into, so an export made today keeps opening in
// ASCEND years from now.

import { isLeavePeriod, isTrekDetails } from '../engine/leave';
import { RESUME_MINUTE_CHOICES, TAB_BACK_MODES, type TabBackMode } from '../engine/navigationSettings';
import type { LeavePeriod } from '../models/leave';
import type { ExternalOneRm, OneRmReading } from '../models/metrics';
import type { ActivityDetail, DetailConditions, DetailSlice, RunDynamics, TerrainStretch } from '../models/activityDetail';
import type { ExerciseSetLog, ManualMeasured, ManualStrength, MeasuredField, MetricSource, SessionLog, SetLog } from '../models/training';

// v2: SessionLog got an optional `externalId` (the id of an imported watch
// activity). Nothing in a v1 file has to change for it.
export const CURRENT_SCHEMA_VERSION = 2;

export interface AscendExport {
  schemaVersion: number;
  exportDate: string;
  program: unknown;
  templates: unknown;
  plannedSessions: unknown;
  sessionLogs: unknown;
  objectives: unknown;
  milestoneProgress: unknown;
  // Optional — absent on any export made before this field existed. Never
  // treat a missing value as "no injuries"; importFromFile falls back to an
  // empty array only for the write, not as a claim about what the backup
  // actually contained.
  injuryNotes?: unknown;
  settings: unknown;
}

// v1 -> v2: a pass-through. `externalId` is optional on every log, so a v1
// file is already a valid v2 file; only the version number moves. The step
// exists so the chain stays complete (and so a later step can rely on it).
export function migrateV1toV2(data: AscendExport): AscendExport {
  return { ...data, schemaVersion: 2 };
}

export function migrateExport(data: AscendExport): AscendExport {
  if (data.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Dit bestand komt van een nieuwere versie van ASCEND (schema v${data.schemaVersion}). Werk de app bij voor je het importeert.`,
    );
  }
  let migrated = data;
  if (migrated.schemaVersion === 1) migrated = migrateV1toV2(migrated);
  // Future: chain migrateV2toV3(migrated) etc. here as the schema evolves.
  if (migrated.schemaVersion === CURRENT_SCHEMA_VERSION) return migrated;
  throw new Error(`Onbekende schemaversie: ${data.schemaVersion}`);
}

// --- vrije dagen en vakanties (backup schema 5) ------------------------------
// A period of free days, a holiday or a trek lives in `settings.leavePeriods`
// (models/leave.ts). Backups up to schema 4 do not have the key: that is
// "unknown", never "empty", so importing one leaves the periods on the device
// alone. A schema 5 file is read record by record; one that is incomplete,
// of an unknown kind or with an end before its start is dropped and counted,
// the rest is kept.
export function migrateLeavePeriods(raw: unknown): { periods: LeavePeriod[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { periods: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { periods: undefined, skipped: 1 };
  // A tocht (`trek`, models/leave.ts) is optional and additive: a file from
  // before it has none. One whose details are damaged stays a plain trek
  // period (the walking days are still true); only the details are dropped.
  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  const valid = raw.filter((p) => isLeavePeriod(p) || (isRecord(p) && isLeavePeriod({ ...p, trek: undefined })));
  // Damaged details are lost, so they are counted: you hear that they are gone.
  let lostDetails = 0;
  const periods = valid.map((p) => {
    const rec = p as LeavePeriod;
    const trek = isTrekDetails(rec.trek) ? rec.trek : undefined;
    if (rec.trek !== undefined && !trek) lostDetails++;
    return {
      id: rec.id, kind: rec.kind, startDate: rec.startDate, endDate: rec.endDate,
      ...(rec.note ? { note: rec.note } : {}),
      ...(trek ? { trek: { name: trek.name.trim(), terrain: trek.terrain, ...(trek.packKg ? { packKg: trek.packKg } : {}), tent: trek.tent, importance: trek.importance } } : {}),
    };
  });
  return { periods, skipped: raw.length - periods.length + lostDetails };
}

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
export function migrateManualStrength(raw: unknown): ManualStrength | undefined {
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

// --- meer per set: SetLog.rir en SetLog.kind ------------------------------------
// A set can carry the reps in reserve (`rir`, 0 to 10) and its kind (`kind`,
// 'warmup' or 'work'; absent is a working set). Both are optional and additive:
// every log travels whole, so the backup schema number does not move and a
// backup from before the fields (any schema) imports exactly as it did. A set
// whose new field is damaged (hand-edited) keeps its reps and weight and loses
// only that field.
export function migrateSetLog(raw: SetLog): SetLog {
  if (typeof raw !== 'object' || raw === null || (!('rir' in raw) && !('kind' in raw))) return raw;
  const { rir, kind, ...rest } = raw as SetLog;
  const out: SetLog = rest;
  if (typeof rir === 'number' && Number.isFinite(rir) && rir >= 0 && rir <= 10) out.rir = rir;
  if (kind === 'warmup' || kind === 'work') out.kind = kind;
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

// --- terugknop en hervatten (optionele instellingen) ---------------------------
// `settings.tabBack` en `settings.resumeMinutes` (engine/navigationSettings.ts)
// zijn optioneel en additief: een back-up van voor deze instellingen heeft ze
// niet en blijft zoals hij is, het advies geldt dan. Staat er wel iets, dan
// blijft alleen een bekende waarde over; de rest wordt weggelaten en geteld.
export function cleanNavigationSettings(raw: { tabBack?: unknown; resumeMinutes?: unknown }): {
  value: { tabBack?: TabBackMode; resumeMinutes?: number };
  skipped: number;
} {
  const value: { tabBack?: TabBackMode; resumeMinutes?: number } = {};
  let skipped = 0;
  if (raw.tabBack !== undefined) {
    const mode = TAB_BACK_MODES.find((m) => m === raw.tabBack);
    if (mode) value.tabBack = mode;
    else skipped++;
  }
  if (raw.resumeMinutes !== undefined) {
    const minutes = RESUME_MINUTE_CHOICES.find((m) => m === raw.resumeMinutes);
    if (minutes !== undefined) value.resumeMinutes = minutes;
    else skipped++;
  }
  return { value, skipped };
}

// --- loopinzicht: SessionLog.detail ---------------------------------------------------
// The compact profile of a run or tocht (models/activityDetail.ts). The field is
// optional and additive, and every log travels whole, so the backup schema
// number does not move (docs/beslissingen/2026-10-22-loopinzicht.md). It is
// derived from the watch's series and can be fetched again, so a profile that is
// damaged (hand-edited, cut off) is dropped as a whole and the log keeps
// everything else; a profile is never half repaired, because a comparison on
// invented numbers is worse than no comparison. Fields the reader does not know
// are not kept.
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optFin = (v: unknown): boolean => v === undefined || fin(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const DYNAMICS_KEYS: (keyof RunDynamics)[] = [
  'stanceTimeMs', 'stanceTimePercent', 'stanceBalanceLeftPct', 'verticalOscillationMm', 'verticalRatioPct', 'stepLengthM',
  'verticalSpeedMs', 'legSpringStiffness', 'impactLoadingRate',
];

function readDynamics(raw: unknown): RunDynamics | undefined | null {
  if (raw === undefined) return undefined;
  if (!isObj(raw)) return null;
  const out: RunDynamics = {};
  for (const key of DYNAMICS_KEYS) {
    if (raw[key] === undefined) continue;
    if (!fin(raw[key])) return null;
    out[key] = raw[key] as number;
  }
  return out;
}

function readSlice(raw: unknown): DetailSlice | undefined {
  if (!isObj(raw) || !fin(raw.sec) || !fin(raw.distanceM) || !fin(raw.gainM) || !fin(raw.lossM) || !optFin(raw.heartRate) || !optFin(raw.cadence)) return undefined;
  const dynamics = readDynamics(raw.dynamics);
  if (dynamics === null) return undefined;
  return {
    sec: raw.sec, distanceM: raw.distanceM, gainM: raw.gainM, lossM: raw.lossM,
    ...(raw.heartRate !== undefined ? { heartRate: raw.heartRate as number } : {}),
    ...(raw.cadence !== undefined ? { cadence: raw.cadence as number } : {}),
    ...(dynamics && Object.keys(dynamics).length > 0 ? { dynamics } : {}),
  };
}

function readStretch(raw: unknown): TerrainStretch | undefined {
  if (!isObj(raw) || (raw.kind !== 'climb' && raw.kind !== 'descent')) return undefined;
  if (!fin(raw.startSec) || !fin(raw.sec) || !fin(raw.distanceM) || !fin(raw.metres) || !fin(raw.gradientPct) || !optFin(raw.heartRate) || !optFin(raw.cadence)) return undefined;
  let thirds: TerrainStretch['thirds'];
  if (raw.thirds !== undefined) {
    if (!Array.isArray(raw.thirds) || raw.thirds.length !== 3) return undefined;
    thirds = [];
    for (const t of raw.thirds) {
      if (!isObj(t) || !fin(t.metresPerHour) || !optFin(t.heartRate) || !optFin(t.cadence)) return undefined;
      thirds.push({
        metresPerHour: t.metresPerHour,
        ...(t.heartRate !== undefined ? { heartRate: t.heartRate as number } : {}),
        ...(t.cadence !== undefined ? { cadence: t.cadence as number } : {}),
      });
    }
  }
  return {
    kind: raw.kind, startSec: raw.startSec, sec: raw.sec, distanceM: raw.distanceM, metres: raw.metres, gradientPct: raw.gradientPct,
    ...(raw.heartRate !== undefined ? { heartRate: raw.heartRate as number } : {}),
    ...(raw.cadence !== undefined ? { cadence: raw.cadence as number } : {}),
    ...(thirds ? { thirds } : {}),
  };
}

function readConditions(raw: unknown): DetailConditions | undefined {
  if (!isObj(raw) || (raw.source !== 'lookup' && raw.source !== 'manual' && raw.source !== 'import')) return undefined;
  const out: DetailConditions = { source: raw.source };
  for (const key of ['tempC', 'feelsC', 'windKmh', 'gustKmh', 'humidityPct', 'rainMm'] as const) {
    if (raw[key] === undefined) continue;
    if (!fin(raw[key])) return undefined;
    out[key] = raw[key] as number;
  }
  return out;
}

export function migrateActivityDetail(raw: unknown): ActivityDetail | undefined {
  if (!isObj(raw) || raw.version !== 1 || typeof raw.source !== 'string') return undefined;
  if (!Array.isArray(raw.slices) || !Array.isArray(raw.stretches) || !fin(raw.sliceCount) || raw.sliceCount !== raw.slices.length || raw.slices.length === 0 || raw.slices.length > 200) return undefined;
  if (!fin(raw.movingSec) || !isObj(raw.quality) || !fin(raw.quality.heartRateCoveragePct) || !optFin(raw.quality.gainAgreementPct)) return undefined;
  const slices = raw.slices.map(readSlice);
  if (slices.some((s) => !s)) return undefined;
  const stretches = raw.stretches.map(readStretch);
  if (stretches.some((s) => !s)) return undefined;
  const conditions = raw.conditions === undefined ? undefined : readConditions(raw.conditions);
  return {
    version: 1,
    source: raw.source as MetricSource,
    sliceCount: raw.sliceCount,
    slices: slices as DetailSlice[],
    stretches: stretches as TerrainStretch[],
    ...(conditions ? { conditions } : {}),
    movingSec: raw.movingSec,
    quality: {
      heartRateCoveragePct: raw.quality.heartRateCoveragePct,
      ...(raw.quality.gainAgreementPct !== undefined ? { gainAgreementPct: raw.quality.gainAgreementPct as number } : {}),
      ...(raw.quality.chestStrapSeen === true ? { chestStrapSeen: true as const } : {}),
    },
  };
}

// A log as it comes out of a file: the same log, with `detail` only when it is whole.
export function migrateLogDetail(log: SessionLog): SessionLog {
  if (!('detail' in log)) return log;
  const valid = migrateActivityDetail((log as { detail?: unknown }).detail);
  const { detail: _damaged, ...rest } = log;
  void _damaged;
  return valid ? { ...rest, detail: valid } : rest;
}

// --- 1RM uit MacroFactor: settings.externalOneRm -------------------------------
// The 1RM per exercise as another source reports it (models/metrics.ts#ExternalOneRm,
// engine/macrofactorOneRm.ts). It lives in the settings, optional and additive, so
// the backup schema number does not move (docs/beslissingen/2026-10-24-1rm-uit-macrofactor.md).
// A backup from before it has no key: that is "unknown", never "empty", so importing
// one leaves the readings on the device alone. A file that has it is read series by
// series and reading by reading: a reading without a real date or a weight between
// 0 and 1000 kg is dropped and counted, a series without name, source or any
// reading is dropped and counted, and what stays is sorted with one reading per day.
// Nothing is repaired or guessed, because a comparison on invented numbers is worse
// than no comparison.
const ONE_RM_SOURCES: MetricSource[] = ['manual', 'garmin', 'health-connect', 'macrofactor', 'import'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ONE_RM_SERIES = 300;
const MAX_ONE_RM_POINTS = 3000;
const MAX_ONE_RM_KG = 1000;

export function migrateExternalOneRm(raw: unknown): { series: ExternalOneRm[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { series: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { series: undefined, skipped: 1 };
  const series: ExternalOneRm[] = [];
  let skipped = 0;
  for (const item of raw) {
    if (series.length >= MAX_ONE_RM_SERIES) {
      skipped++;
      continue;
    }
    if (!isObj(item) || typeof item.exerciseName !== 'string' || item.exerciseName.trim() === '' || item.exerciseName.length > 120 || !ONE_RM_SOURCES.includes(item.source as MetricSource) || !Array.isArray(item.points)) {
      skipped++;
      continue;
    }
    const days = new Map<string, number>();
    for (const p of item.points.slice(0, MAX_ONE_RM_POINTS)) {
      if (isObj(p) && typeof p.date === 'string' && ISO_DAY.test(p.date) && fin(p.kg) && p.kg > 0 && p.kg <= MAX_ONE_RM_KG) days.set(p.date, p.kg);
      else skipped++;
    }
    skipped += Math.max(0, item.points.length - MAX_ONE_RM_POINTS);
    if (days.size === 0) {
      skipped++;
      continue;
    }
    const points: OneRmReading[] = [...days].map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date));
    series.push({ exerciseName: item.exerciseName.trim(), source: item.source as MetricSource, points });
  }
  return { series: series.length > 0 ? series : undefined, skipped };
}
