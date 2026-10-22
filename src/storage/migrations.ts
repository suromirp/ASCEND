// Migration scaffold. V1 only knows schema version 1, so this is a pass
// through with a guard rail — but the shape (versioned export, a migrate
// function keyed on the version found in the file) is what every future
// migration will slot into, so an export made today keeps opening in
// ASCEND years from now.

import { isLeavePeriod, isTrekDetails } from '../engine/leave';
import type { LeavePeriod } from '../models/leave';
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
  const periods = valid.map((p) => {
    const rec = p as LeavePeriod;
    const trek = isTrekDetails(rec.trek) ? rec.trek : undefined;
    return {
      id: rec.id, kind: rec.kind, startDate: rec.startDate, endDate: rec.endDate,
      ...(rec.note ? { note: rec.note } : {}),
      ...(trek ? { trek: { name: trek.name.trim(), terrain: trek.terrain, ...(trek.packKg ? { packKg: trek.packKg } : {}), tent: trek.tent, importance: trek.importance } } : {}),
    };
  });
  return { periods, skipped: raw.length - periods.length };
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
