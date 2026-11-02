// ASCEND: "Back-up maken" met de hand in de Android-app. Het bestand gaat naar Documenten/ASCEND, via
// dezelfde veilige weg als de automatische back-up (integrations/backupFolder.ts: tijdelijk bestand, dan
// hernoemen). Een bestand dat al bestaat wordt nooit overschreven: de naam krijgt dan een volgnummer.
// Hier staat geen beslissing over "Laatste back-up": dat gebeurt pas in exportData, na een gelukte
// schrijfactie.

import { AutoBackupError, NameTakenError } from '../engine/autoBackup';
import { failedBackupText, manualBackupName, type BackupOutcome } from '../engine/manualBackup';
import type { BackupFileAdapter } from './backupTypes';
import type { AppBackupFolder } from '../integrations/backupFolder';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

export const MANUAL_BACKUP_LIMIT_MS = 20_000;
const MAX_NAMES = 20;

export async function saveManualBackup(
  folder: AppBackupFolder,
  text: string,
  { now = new Date(), limitMs = MANUAL_BACKUP_LIMIT_MS }: { now?: Date; limitMs?: number } = {},
): Promise<{ name: string }> {
  try {
    return await withTimeout(write(folder, text, now), limitMs, 'Back-up');
  } catch (err) {
    if (err instanceof TimeoutError) throw new AutoBackupError('timeout');
    throw err;
  }
}

async function write(folder: AppBackupFolder, text: string, now: Date): Promise<{ name: string }> {
  // Op Android 10 en ouder moet er toestemming zijn; de tik van de gebruiker is het moment om te vragen.
  if ((await folder.access()) !== 'ready' && !(await folder.requestAccess())) throw new AutoBackupError('permission');
  const attemptId = `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  for (let n = 1; n <= MAX_NAMES; n++) {
    const name = manualBackupName(now, n);
    if (await folder.exists(name)) continue;
    try {
      await folder.write(name, text, attemptId);
    } catch (err) {
      if (err instanceof NameTakenError) continue;
      throw err instanceof AutoBackupError ? err : new AutoBackupError('write');
    }
    if (!(await folder.verify(name, new TextEncoder().encode(text).length))) {
      await folder.remove(name).catch(() => undefined);
      throw new AutoBackupError('write');
    }
    return { name };
  }
  throw new AutoBackupError('write');
}

// De hele weg van "Back-up maken": opslaan en pas na een gelukte schrijfactie "Laatste back-up"
// bijwerken. Gooit niet; elke afloop is een BackupOutcome die de aanroeper laat zien.
export async function runManualBackup(deps: {
  prepare: () => Promise<{ text: string; fileName: string }>;
  adapter: Pick<BackupFileAdapter, 'saveBackup'>;
  markMade: (at: string, where: { kind: 'folder'; label: string } | { kind: 'download' } | { kind: 'file' }) => Promise<void>;
}): Promise<BackupOutcome> {
  try {
    const { text, fileName } = await deps.prepare();
    const result = await deps.adapter.saveBackup(new Blob([text], { type: 'application/json' }), fileName);
    if (!result.success) return { status: 'cancelled' };
    await deps.markMade(new Date().toISOString(), result.folder ? { kind: 'folder', label: result.folder } : result.viaDownload ? { kind: 'download' } : { kind: 'file' });
    if (result.viaDownload) return { status: 'downloaded' };
    return { status: 'saved', name: result.savedTo ?? '', folder: result.folder ?? '' };
  } catch (err) {
    return { status: 'failed', message: failedBackupText(err instanceof AutoBackupError ? err.reason : 'unknown') };
  }
}
