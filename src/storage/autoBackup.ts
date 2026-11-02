// ASCEND: de automatische back-up uitvoeren (docs/beslissingen/2026-11-02-automatische-backup.md).
//
// Op het moment van engine/autoBackup.ts (zondagavond of elke avond) maakt dit dezelfde back-up als
// "Back-up maken": hetzelfde bestand, met de datum in de naam. In de Android-app gaat hij stil naar
// Documenten/ASCEND (integrations/backupFolder.ts), in de browser alleen stil naar de vaste map als de
// browser die zonder vragen vrijgeeft (storage/backupFileAdapter.ts#webFolderTarget). Kan het niet
// stil, dan is de uitkomst 'needs-tap' en zet Vandaag een kaart neer met de knop Back-up maken. Lukt
// het niet, dan wordt de reden bewaard en zegt ASCEND het in één regel; nooit stil falen.
//
// Wat hier bewaard wordt (de laatste back-up, waar die staat, een mislukte poging en de namen van de
// bestanden die ASCEND zelf schreef) hoort bij dit toestel en gaat nooit mee in een back-up. Opruimen
// raakt alleen die eigen bestanden, en alleen in de map waar ze geschreven zijn.

import {
  AutoBackupError,
  backupWhereText,
  filesToPrune,
  isAutoBackupDue,
  isAutoBackupName,
  isFailureReason,
  mayRetryAutoBackup,
  rememberFile,
  resolveAutoBackup,
  resolveAutoBackupKeep,
  type AutoBackupFailureReason,
  type BackupWhere,
} from '../engine/autoBackup';
import { appBackupFolder, type AutoBackupTarget } from '../integrations/backupFolder';
import { TimeoutError, withTimeout } from '../utils/withTimeout';
import { backupFileName, buildBackupEnvelope } from './backup';
import { webBackupFileAdapter, webFolderTarget } from './backupFileAdapter';
import { MetaRepo, PlannedSessionsRepo, SessionLogsRepo, SettingsRepo } from './database';
import { tidyOldProposals } from './proposalTidy';

const STATE_KEY = 'autoBackupState';
export const AUTO_BACKUP_WRITE_MS = 30_000;

export interface AutoBackupFailure {
  at: string;
  reason: AutoBackupFailureReason;
}

export interface AutoBackupState {
  // De laatste back-up op dit toestel, met de hand of vanzelf, en waar hij staat.
  lastAt?: string;
  where?: BackupWhere;
  failure?: AutoBackupFailure;
  // De bestanden die de automatische back-up schreef, en in welke map (het label van `where`).
  files: string[];
  filesIn?: string;
}

const isWhere = (v: unknown): v is BackupWhere => {
  if (!v || typeof v !== 'object') return false;
  const w = v as { kind?: unknown; label?: unknown };
  return w.kind === 'download' || w.kind === 'file' || (w.kind === 'folder' && typeof w.label === 'string');
};

// Defensief lezen: een kapotte waarde wordt een lege staat, nooit een fout.
export function cleanAutoBackupState(raw: unknown): AutoBackupState {
  if (!raw || typeof raw !== 'object') return { files: [] };
  const r = raw as Record<string, unknown>;
  const failure = r.failure as Record<string, unknown> | undefined;
  return {
    ...(typeof r.lastAt === 'string' ? { lastAt: r.lastAt } : {}),
    ...(isWhere(r.where) ? { where: r.where } : {}),
    ...(failure && typeof failure.at === 'string' && isFailureReason(failure.reason) ? { failure: { at: failure.at, reason: failure.reason } } : {}),
    files: Array.isArray(r.files) ? r.files.filter((f): f is string => typeof f === 'string' && isAutoBackupName(f)) : [],
    ...(typeof r.filesIn === 'string' ? { filesIn: r.filesIn } : {}),
  };
}

export async function readAutoBackupState(): Promise<AutoBackupState> {
  return cleanAutoBackupState(await MetaRepo.get<unknown>(STATE_KEY).catch(() => undefined));
}

async function writeState(next: AutoBackupState): Promise<void> {
  await MetaRepo.set(STATE_KEY, next);
}

// ---- de stand voor de schermen ----------------------------------------------------------

export type AutoBackupOutcome = 'off' | 'not-due' | 'saved' | 'needs-tap' | 'failed';

export interface AutoBackupStatus {
  // Er is na het openen al gekeken; tot dan staat er geen kaart.
  checked: boolean;
  outcome?: AutoBackupOutcome;
  failure?: AutoBackupFailure;
  platform: 'app' | 'browser';
}

export function autoBackupTarget(): AutoBackupTarget {
  return appBackupFolder() ?? webFolderTarget;
}

let status: AutoBackupStatus | undefined;
const listeners = new Set<() => void>();

export function getAutoBackupStatus(): AutoBackupStatus {
  status ??= { checked: false, platform: autoBackupTarget().platform };
  return status;
}

export function subscribeAutoBackup(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setStatus(patch: Partial<AutoBackupStatus>): void {
  status = { ...getAutoBackupStatus(), ...patch };
  for (const l of listeners) l();
}

// ---- met de hand ------------------------------------------------------------------------

// Na "Back-up maken": wanneer en waar, en een eerdere mislukte poging is opgelost.
export async function noteBackupMade(where: BackupWhere | undefined, at = new Date().toISOString()): Promise<void> {
  const state = await readAutoBackupState();
  const next: AutoBackupState = { ...state, lastAt: at, ...(where ? { where } : {}) };
  delete next.failure;
  await writeState(next);
  setStatus({ failure: undefined, ...(getAutoBackupStatus().outcome === 'failed' ? { outcome: 'saved' as const } : {}) });
}

// Een andere vaste map gekozen: de oude namen horen bij de oude map en worden nooit in de nieuwe
// opgeruimd. Een mislukte poging is daarmee ook voorbij.
export async function forgetAutoBackupFolder(): Promise<void> {
  const state = await readAutoBackupState();
  const next: AutoBackupState = { ...state, files: [] };
  delete next.failure;
  delete next.filesIn;
  await writeState(next);
  setStatus({ failure: undefined });
}

// De vaste map in de browser kiezen (Vaste map). Een andere map vergeet de oude namen.
export async function chooseBackupFolder(): Promise<void> {
  const chosen = await webBackupFileAdapter.choosePreferredDirectory?.();
  if (chosen) await forgetAutoBackupFolder();
}

// Toegang gegeven of de map nagekeken: de mislukte poging is voorbij, de volgende keer opnieuw.
export async function clearAutoBackupFailure(): Promise<void> {
  const state = await readAutoBackupState();
  if (!state.failure) return;
  const next: AutoBackupState = { ...state };
  delete next.failure;
  await writeState(next);
  setStatus({ failure: undefined });
}

// ---- vanzelf ----------------------------------------------------------------------------

export interface RunOptions {
  now?: Date;
  target?: AutoBackupTarget;
  // Na een gelukte back-up: lastExportedAt bijwerken via de app-staat (anders rechtstreeks).
  onSaved?: (at: string) => unknown;
  timeoutMs?: number;
}

let running: Promise<AutoBackupOutcome> | undefined;

// Kijkt of er een back-up nodig is en maakt hem als dat stil kan. Twee aanroepen tegelijk delen
// dezelfde poging.
export function runAutoBackupIfDue(options: RunOptions = {}): Promise<AutoBackupOutcome> {
  running ??= attempt(options).finally(() => {
    running = undefined;
  });
  return running;
}

async function attempt({ now = new Date(), target = autoBackupTarget(), onSaved, timeoutMs = AUTO_BACKUP_WRITE_MS }: RunOptions): Promise<AutoBackupOutcome> {
  const done = (outcome: AutoBackupOutcome, failure?: AutoBackupFailure) => {
    setStatus({ checked: true, outcome, failure, platform: target.platform });
    return outcome;
  };
  const settings = await SettingsRepo.get();
  const frequency = resolveAutoBackup(settings.autoBackup);
  const state = await readAutoBackupState();
  if (frequency === 'off') return done('off', state.failure);
  const due = (hasData: boolean) => isAutoBackupDue({ frequency, now, lastBackupAt: settings.lastExportedAt, dismissedAt: settings.lastExportReminderDismissedAt, hasData });
  if (!due(true)) return done('not-due', state.failure);
  const hasData = (await SessionLogsRepo.getAll()).length > 0 || (await PlannedSessionsRepo.getAll()).length > 0;
  if (!due(hasData)) return done('not-due', state.failure);
  // Net mislukt: niet bij elke keer terugkomen opnieuw, de regel blijft staan.
  if (state.failure && !mayRetryAutoBackup(state.failure.at, now)) return done('failed', state.failure);

  const fail = async (reason: AutoBackupFailureReason) => {
    const failure = { at: now.toISOString(), reason };
    await writeState({ ...state, failure });
    return done('failed', failure);
  };

  const access = await target.access().catch(() => 'denied' as const);
  if (access === 'needs-tap') return done('needs-tap', state.failure);
  if (access === 'denied') return fail('permission');

  try {
    // Zoals Back-up maken: eerst oude voorstellen samenvatten; lukt dat niet, dan gewoon door.
    await tidyOldProposals().catch(() => 0);
    const envelope = await buildBackupEnvelope();
    const name = backupFileName(envelope.createdAt);
    const where = await target.where();
    await withTimeout(target.write(name, JSON.stringify(envelope, null, 2)), timeoutMs);

    // Opruimen: alleen eigen bestanden uit deze map.
    const label = backupWhereText(where);
    let files = rememberFile(state.filesIn === undefined || state.filesIn === label ? state.files : [], name);
    for (const old of filesToPrune(files, resolveAutoBackupKeep(settings.autoBackupKeep))) {
      await target.remove(old).catch(() => undefined);
      files = files.filter((f) => f !== old);
    }

    const at = now.toISOString();
    const next: AutoBackupState = { lastAt: at, where, files, ...(label ? { filesIn: label } : {}) };
    await writeState(next);
    if (onSaved) await onSaved(at);
    else await SettingsRepo.set({ lastExportedAt: at });
    return done('saved');
  } catch (err) {
    if (err instanceof AutoBackupError) return fail(err.reason);
    if (err instanceof TimeoutError) return fail('timeout');
    return fail('write');
  }
}
