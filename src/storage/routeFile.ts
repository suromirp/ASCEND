// ASCEND: het GPX-bestand van een voorgestelde lus opslaan. In de browser een gewone download; in de
// Android-app naar Documenten/ASCEND (dezelfde map als de back-up), want een download bestaat daar
// niet. Een bestaand bestand wordt nooit vervangen: de naam krijgt een volgnummer. Met een grens in
// tijd; gooit nooit.

import { appBackupFolder, APP_BACKUP_LABEL, type AppBackupFolder } from '../integrations/backupFolder';
import { NameTakenError } from '../engine/autoBackup';
import { gpxFileName } from '../engine/gpx';
import type { RouteStyle } from '../models/route';
import { withTimeout } from '../utils/withTimeout';

const SAVE_LIMIT_MS = 15_000;
const MAX_NAMES = 20;

export type RouteFileResult = { ok: true; where: 'download' | 'folder'; name: string; label?: string } | { ok: false };

async function toFolder(folder: AppBackupFolder, text: string, style: RouteStyle, date: string): Promise<RouteFileResult> {
  if ((await folder.access()) !== 'ready' && !(await folder.requestAccess())) return { ok: false };
  const attemptId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  for (let n = 1; n <= MAX_NAMES; n++) {
    const name = gpxFileName(style, date, n);
    if (await folder.exists(name)) continue;
    try {
      await folder.write(name, text, attemptId, { neverReplace: true });
    } catch (err) {
      if (err instanceof NameTakenError) continue;
      return { ok: false };
    }
    return { ok: true, where: 'folder', name, label: APP_BACKUP_LABEL };
  }
  return { ok: false };
}

function toDownload(text: string, name: string): RouteFileResult {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/gpx+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { ok: true, where: 'download', name };
}

export async function saveRouteGpx(text: string, style: RouteStyle, date: string, folder: AppBackupFolder | null = appBackupFolder()): Promise<RouteFileResult> {
  try {
    if (folder) return await withTimeout(toFolder(folder, text, style, date), SAVE_LIMIT_MS);
    return toDownload(text, gpxFileName(style, date));
  } catch {
    return { ok: false };
  }
}
