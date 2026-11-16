// ASCEND: hoeveel trainingen niet in je laatste back-up staan (docs/beslissingen/2026-11-15-backup-telling.md).
//
// Tellen op id, niet op tijd: een log kan een `completedAt` van voor de back-up hebben (Forge op een eerdere
// dag afgerond, horloge, MacroFactor) en toch pas na de back-up bewaard zijn. Bij elke gelukte back-up
// bewaart de app de ids van de trainingen in dat bestand, met het tijdstip van die back-up
// (AppSettings.lastBackupLogs). Hoort die lijst niet bij de laatste back-up (een oudere app, of instellingen
// die van een back-up terugkwamen), dan telt de app zoals eerst: op tijd.

export interface LastBackupLogs {
  // Hetzelfde tijdstip als lastExportedAt van die back-up.
  at: string;
  ids: string[];
}

// Defensief lezen: alleen een tijdstip met een lijst van teksten telt, al het andere is "niet bekend".
export function readLastBackupLogs(raw: unknown): LastBackupLogs | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { at?: unknown; ids?: unknown };
  if (typeof r.at !== 'string' || !Array.isArray(r.ids)) return undefined;
  return { at: r.at, ids: r.ids.filter((id): id is string => typeof id === 'string') };
}

// Wat er na een gelukte back-up in de instellingen komt: wanneer, en welke trainingen erin staan.
export function backupMadeSettings(at: string, logIds: readonly string[] | undefined): { lastExportedAt: string; lastBackupLogs?: LastBackupLogs } {
  return { lastExportedAt: at, ...(logIds ? { lastBackupLogs: { at, ids: [...logIds] } } : {}) };
}

// Trainingen op deze telefoon die niet in de laatste back-up staan. Nog nooit een back-up: alles.
export function logsNotInLastBackup(
  logs: readonly { id: string; completedAt: string }[],
  settings: { lastExportedAt?: string; lastBackupLogs?: unknown },
): number {
  const last = settings.lastExportedAt;
  if (!last) return logs.length;
  const known = readLastBackupLogs(settings.lastBackupLogs);
  if (!known || known.at !== last) return logs.filter((l) => l.completedAt > last).length;
  const ids = new Set(known.ids);
  return logs.filter((l) => !ids.has(l.id)).length;
}
