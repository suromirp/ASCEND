// Migration scaffold. V1 only knows schema version 1, so this is a pass
// through with a guard rail — but the shape (versioned export, a migrate
// function keyed on the version found in the file) is what every future
// migration will slot into, so an export made today keeps opening in
// ASCEND years from now.

import { isLeavePeriod } from '../engine/leave';
import type { LeavePeriod } from '../models/leave';

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
