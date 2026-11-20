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

export interface BackupPair {
  lastExportedAt?: string;
  lastBackupLogs?: unknown;
}

const momentMs = (at: unknown): number => (typeof at === 'string' ? Date.parse(at) : NaN);

// Een Laatste back-up die in de toekomst ligt, rechtgezet: hij wordt nu (`nowMs`), en de lijst die bij dat
// tijdstip hoorde krijgt hetzelfde tijdstip, zodat de telling op id blijft. Een toestel met een klok die
// voorliep, of een oudere versie die het tijdstip van een bestand overnam, liet anders de automatische
// back-up en de herinnering stilstaan tot die datum (docs/beslissingen/2026-11-20-backup-kopie-en-toekomst.md).
// Geeft hetzelfde object terug als er niets recht te zetten is: nu of eerder, geen tijdstip, of onleesbaar.
export function straightBackupPair<T extends BackupPair>(pair: T, nowMs: number): T {
  const ms = momentMs(pair.lastExportedAt);
  if (!Number.isFinite(ms) || ms <= nowMs) return pair;
  const at = new Date(nowMs).toISOString();
  const known = readLastBackupLogs(pair.lastBackupLogs);
  const next: T = { ...pair, lastExportedAt: at };
  if (known && known.at === pair.lastExportedAt) next.lastBackupLogs = { at, ids: known.ids };
  return next;
}

// Na volledig terugzetten (docs/beslissingen/2026-11-20-backup-terugzetten.md). Laatste back-up en de lijst
// horen bij het toestel en gaan altijd als paar. In het bestand staat het tijdstip van de back-up daarvoor,
// dus dat lees je nooit over. Is het paar van het toestel even oud als of nieuwer dan het bestand, dan blijft
// het staan. Anders is het bestand zelf de laatste back-up: zijn tijdstip, met de trainingen die erin staan.
// Een bestand zonder bruikbaar tijdstip verandert niets. Een tijdstip uit een bestand is van een andere klok:
// ligt het in de toekomst, dan telt het als nu (`nowMs`), anders staan de automatische back-up en de
// herinnering stil tot die datum. Hetzelfde geldt voor een tijdstip dat al in de toekomst op het toestel staat.
export function backupPairAfterRestore(
  device: BackupPair,
  fileAt: string | undefined,
  fileLogIds: readonly string[],
  nowMs: number,
): BackupPair {
  const own = straightBackupPair({ lastExportedAt: device.lastExportedAt, lastBackupLogs: device.lastBackupLogs }, nowMs);
  const readMs = momentMs(fileAt);
  if (!Number.isFinite(readMs)) return own;
  const fileMs = Math.min(readMs, nowMs);
  const deviceMs = momentMs(own.lastExportedAt);
  if (Number.isFinite(deviceMs) && deviceMs >= fileMs) return own;
  return backupMadeSettings(new Date(fileMs).toISOString(), fileLogIds);
}

// Na het terugzetten van een kopie van voor een import (Ongedaan maken, of een kopie uit de lijst;
// docs/beslissingen/2026-11-20-backup-kopie-en-toekomst.md). De kopie is van dit toestel en draagt haar eigen
// paar. Het nieuwste van de twee paren blijft: Laatste back-up springt nooit terug in de tijd. Bij gelijke
// tijd blijft het toestel. Een kopie zonder leesbaar tijdstip verandert niets. Beide tellen hoogstens als nu.
export function newestBackupPair(device: BackupPair, copy: BackupPair, nowMs: number): BackupPair {
  const own = straightBackupPair({ lastExportedAt: device.lastExportedAt, lastBackupLogs: device.lastBackupLogs }, nowMs);
  const theirs = straightBackupPair({ lastExportedAt: copy.lastExportedAt, lastBackupLogs: copy.lastBackupLogs }, nowMs);
  const copyMs = momentMs(theirs.lastExportedAt);
  if (!Number.isFinite(copyMs)) return own;
  const deviceMs = momentMs(own.lastExportedAt);
  return Number.isFinite(deviceMs) && deviceMs >= copyMs ? own : theirs;
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
