// Migration scaffold. V1 only knows schema version 1, so this is a pass
// through with a guard rail — but the shape (versioned export, a migrate
// function keyed on the version found in the file) is what every future
// migration will slot into, so an export made today keeps opening in
// ASCEND years from now.

export const CURRENT_SCHEMA_VERSION = 1;

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

export function migrateExport(data: AscendExport): AscendExport {
  if (data.schemaVersion === CURRENT_SCHEMA_VERSION) return data;
  if (data.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Dit bestand komt van een nieuwere versie van ASCEND (schema v${data.schemaVersion}). Werk de app bij voor je het importeert.`,
    );
  }
  // Future: chain migrateV1toV2(data) etc. here as the schema evolves.
  throw new Error(`Onbekende schemaversie: ${data.schemaVersion}`);
}
