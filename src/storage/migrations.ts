// Migration scaffold. V1 only knows schema version 1, so this is a pass
// through with a guard rail — but the shape (versioned export, a migrate
// function keyed on the version found in the file) is what every future
// migration will slot into, so an export made today keeps opening in
// ASCEND years from now.

import { isLeavePeriod } from '../engine/leave';
import type { LeavePeriod } from '../models/leave';
import type { ManualMeasured, ManualStrength, MeasuredField, MetricSource, SessionLog } from '../models/training';

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
  const periods = raw.filter(isLeavePeriod).map((p) => ({ id: p.id, kind: p.kind, startDate: p.startDate, endDate: p.endDate, ...(p.note ? { note: p.note } : {}) }));
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
