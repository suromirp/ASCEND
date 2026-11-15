// ASCEND: "Back-up maken" met de hand in de Android-app. Het bestand gaat naar Documenten/ASCEND, via
// dezelfde veilige weg als de automatische back-up (integrations/backupFolder.ts: tijdelijk bestand, dan
// hernoemen). Een bestand dat al bestaat wordt nooit overschreven: de naam krijgt dan een volgnummer.
// Een fout wordt nooit gemeld terwijl het bestand er wel staat, en één back-up geeft nooit twee bestanden
// (docs/beslissingen/2026-11-15-backup-eerste-keer.md).
// "Laatste back-up" wordt pas bijgewerkt in runManualBackup (markMade), na een gelukte schrijfactie.

import { AutoBackupError, NameTakenError } from '../engine/autoBackup';
import { failedBackupText, manualBackupName, type BackupOutcome } from '../engine/manualBackup';
import type { BackupFileAdapter } from './backupTypes';
import { verifySettled, type AppBackupFolder } from '../integrations/backupFolder';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

const MANUAL_BACKUP_LIMIT_MS = 20_000;
// Het geheel, inclusief het klaarmaken van de tekst; langer dan het schrijven zelf.
const RUN_LIMIT_MS = 30_000;
const MAX_NAMES = 20;

// Een poging die al zo lang loopt antwoordt niet meer; een nieuwe tik begint dan opnieuw.
const STALE_WRITE_MS = 60_000;

interface Running {
  promise: Promise<{ name: string }>;
  startedAt: number;
  // De poging is opgegeven: hij begint niet meer aan een volgende naam. Wat hij al schreef blijft staan.
  abort: { aborted: boolean };
}

// Per map hoogstens één poging tegelijk. Een tweede tik terwijl de eerste nog loopt (ook als de eerste al
// "het duurde te lang" meldde en de telefoon daarna nog antwoordt) wacht op dezelfde poging: één bestand.
const running = new Map<AppBackupFolder, Running>();
// Namen die deze app zelf schreef, niet kon nakijken en niet kon weghalen. Een volgende poging mag zo'n
// naam vervangen in plaats van er een volgnummer naast te zetten. Alleen in het geheugen.
const orphans = new Map<AppBackupFolder, Set<string>>();

// Alleen voor tests: vergeet lopende pogingen en onthouden namen.
export function forgetManualBackupAttempts(): void {
  for (const r of running.values()) r.abort.aborted = true;
  running.clear();
  orphans.clear();
}

export async function saveManualBackup(
  folder: AppBackupFolder,
  text: string,
  { now = new Date(), limitMs = MANUAL_BACKUP_LIMIT_MS, staleMs = STALE_WRITE_MS, verifyPauseMs }: { now?: Date; limitMs?: number; staleMs?: number; verifyPauseMs?: number } = {},
): Promise<{ name: string }> {
  let current = running.get(folder);
  if (current && Date.now() - current.startedAt >= staleMs) {
    current.abort.aborted = true;
    current = undefined;
  }
  if (!current) {
    const abort = { aborted: false };
    const started: Running = { promise: write(folder, text, now, abort, verifyPauseMs), startedAt: Date.now(), abort };
    const clear = () => {
      if (running.get(folder) === started) running.delete(folder);
    };
    started.promise.then(clear, clear);
    running.set(folder, started);
    current = started;
  }
  try {
    return await withTimeout(current.promise, limitMs, 'Back-up');
  } catch (err) {
    if (err instanceof TimeoutError) throw new AutoBackupError('timeout');
    throw err;
  }
}

async function write(folder: AppBackupFolder, text: string, now: Date, abort: { aborted: boolean }, verifyPauseMs?: number): Promise<{ name: string }> {
  // Op Android 10 en ouder moet er toestemming zijn; de tik van de gebruiker is het moment om te vragen.
  if ((await folder.access()) !== 'ready' && !(await folder.requestAccess())) throw new AutoBackupError('permission');
  const attemptId = `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const own = orphans.get(folder) ?? new Set<string>();
  orphans.set(folder, own);
  for (let n = 1; n <= MAX_NAMES; n++) {
    if (abort.aborted) throw new AutoBackupError('timeout');
    const name = manualBackupName(now, n);
    // Een bezette naam krijgt een volgnummer, behalve het eigen halve bestand van een mislukte poging.
    const mine = own.has(name);
    if (!mine && (await folder.exists(name))) continue;
    try {
      await folder.write(name, text, attemptId, { neverReplace: !mine });
    } catch (err) {
      if (err instanceof NameTakenError) continue;
      // Bleef er na een mislukte naam toch iets van deze poging staan, dan mag de volgende het vervangen.
      // Dat geldt ook voor een bestand dat na een fout bij de naam niet te lezen was (stap verify): de naam
      // was vrij, dus wat er staat is van deze poging.
      if (err instanceof AutoBackupError && (err.step === 'rename' || err.step === 'verify') && !mine && (await folder.exists(name).catch(() => false))) own.add(name);
      throw err instanceof AutoBackupError ? err : new AutoBackupError('write', 'temp');
    }
    // Het bestand staat er onder zijn naam. Nakijken geeft niet te vroeg op; lukt het echt niet, of is de
    // poging intussen opgegeven en klopt het bestand niet, dan gaat het weg. Lukt weghalen niet, dan
    // onthoudt de app de naam, zodat de volgende poging hem vervangt.
    const ok = await verifySettled(folder, name, new TextEncoder().encode(text).length, { pauseMs: verifyPauseMs });
    if (!ok) {
      const gone = await folder.remove(name).then(() => true, () => false);
      if (gone && !(await folder.exists(name).catch(() => true))) own.delete(name);
      else own.add(name);
      throw new AutoBackupError('write', 'verify');
    }
    own.delete(name);
    return { name };
  }
  throw new AutoBackupError('write', 'names');
}

// De hele weg van "Back-up maken": opslaan en pas na een gelukte schrijfactie "Laatste back-up"
// bijwerken. Gooit niet; elke afloop is een BackupOutcome die de aanroeper laat zien. Het geheel
// (ook het klaarmaken van de tekst) heeft een tijdsgrens. Een gelukte back-up wordt nooit als mislukt
// gemeld, ook niet als het bijwerken van Laatste back-up misgaat.
export async function runManualBackup(deps: {
  prepare: () => Promise<{ text: string; fileName: string }>;
  adapter: Pick<BackupFileAdapter, 'saveBackup'>;
  markMade: (at: string, where: { kind: 'folder'; label: string } | { kind: 'download' } | { kind: 'file' }) => Promise<void>;
  limitMs?: number;
}): Promise<BackupOutcome> {
  let abandoned = false;
  const work = async (): Promise<BackupOutcome> => {
    const { text, fileName } = await deps.prepare();
    const result = await deps.adapter.saveBackup(new Blob([text], { type: 'application/json' }), fileName);
    if (!result.success) return { status: 'cancelled' };
    if (!abandoned) {
      try {
        await deps.markMade(new Date().toISOString(), result.folder ? { kind: 'folder', label: result.folder } : result.viaDownload ? { kind: 'download' } : { kind: 'file' });
      } catch (err) {
        console.warn('Back-up gemaakt, maar Laatste back-up niet bijgewerkt', err);
      }
    }
    if (result.viaDownload) return { status: 'downloaded' };
    return { status: 'saved', name: result.savedTo ?? '', folder: result.folder ?? '' };
  };
  try {
    return await withTimeout(work(), deps.limitMs ?? RUN_LIMIT_MS, 'Back-up');
  } catch (err) {
    abandoned = true;
    if (err instanceof TimeoutError) return { status: 'failed', message: failedBackupText('timeout') };
    return { status: 'failed', message: err instanceof AutoBackupError ? failedBackupText(err.reason, err.step) : failedBackupText('unknown') };
  }
}
