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
  NameTakenError,
  autoBackupFileName,
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
import { buildBackupEnvelope } from './backup';
import { toISODate } from '../utils/dates';
import { webBackupFileAdapter, webFolderTarget } from './backupFileAdapter';
import { MetaRepo, PlannedSessionsRepo, SessionLogsRepo, SettingsRepo } from './database';
import { tidyOldProposals } from './proposalTidy';

const STATE_KEY = 'autoBackupState';
export const AUTO_BACKUP_WRITE_MS = 30_000;
// Zoveel namen die vrij leken maar bezet bleken, dan houdt de poging op.
const MAX_TAKEN = 5;

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
  // De installatie die de lijst maakte (AutoBackupTarget.installId). De lijst reist in de app mee in
  // de back-up van Android; op een nieuwe telefoon is hij dus niet van deze installatie.
  filesBy?: string;
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
    ...(typeof r.filesBy === 'string' ? { filesBy: r.filesBy } : {}),
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
  delete next.filesBy;
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

// De hele poging (toegang, bouwen, schrijven, nakijken, opruimen) duurt nooit langer dan dit, zodat
// een volgende poging altijd weer kan.
export const AUTO_BACKUP_ATTEMPT_MS = 120_000;

export interface RunOptions {
  now?: Date;
  target?: AutoBackupTarget;
  // Na een gelukte back-up: lastExportedAt bijwerken via de app-staat (anders rechtstreeks).
  onSaved?: (at: string) => unknown;
  // Tijdsgrens voor schrijven en nakijken, en voor de hele poging.
  timeoutMs?: number;
  attemptMs?: number;
}

let running: Promise<AutoBackupOutcome> | undefined;

// Kijkt of er een back-up nodig is en maakt hem als dat stil kan. Twee aanroepen tegelijk delen
// dezelfde poging; na de tijdsgrens is hij altijd voorbij.
export function runAutoBackupIfDue(options: RunOptions = {}): Promise<AutoBackupOutcome> {
  running ??= guarded(options).finally(() => {
    running = undefined;
  });
  return running;
}

interface Abort {
  aborted: boolean;
}

async function guarded(options: RunOptions): Promise<AutoBackupOutcome> {
  const abort: Abort = { aborted: false };
  try {
    return await withTimeout(attempt(options, abort), options.attemptMs ?? AUTO_BACKUP_ATTEMPT_MS);
  } catch (err) {
    abort.aborted = true;
    const failure: AutoBackupFailure = { at: (options.now ?? new Date()).toISOString(), reason: err instanceof TimeoutError ? 'timeout' : 'write' };
    try {
      const state = await withTimeout(readAutoBackupState(), 5_000);
      await withTimeout(writeState({ ...state, failure }), 5_000);
    } catch {
      // De regel komt hieronder toch op het scherm.
    }
    setStatus({ checked: true, outcome: 'failed', failure, platform: (options.target ?? autoBackupTarget()).platform });
    return 'failed';
  }
}

async function attempt({ now = new Date(), target = autoBackupTarget(), onSaved, timeoutMs = AUTO_BACKUP_WRITE_MS }: RunOptions, abort: Abort): Promise<AutoBackupOutcome> {
  const done = (outcome: AutoBackupOutcome, failure?: AutoBackupFailure) => {
    if (!abort.aborted) setStatus({ checked: true, outcome, failure, platform: target.platform });
    return outcome;
  };
  const settings = await SettingsRepo.get();
  const frequency = resolveAutoBackup(settings.autoBackup);
  const state = await readAutoBackupState();
  if (frequency === 'off') return done('off', state.failure);
  // "Niet nu" op de kaart geldt alleen voor de kaart (Today.tsx); de stille poging gaat gewoon door.
  const due = (hasData: boolean) => isAutoBackupDue({ frequency, now, lastBackupAt: settings.lastExportedAt, hasData });
  if (!due(true)) return done('not-due', state.failure);
  const hasData = (await SessionLogsRepo.getAll()).length > 0 || (await PlannedSessionsRepo.getAll()).length > 0;
  if (!due(hasData)) return done('not-due', state.failure);
  // Net mislukt: niet bij elke keer terugkomen opnieuw, de regel blijft staan.
  if (state.failure && !mayRetryAutoBackup(state.failure.at, now)) return done('failed', state.failure);

  const fail = async (reason: AutoBackupFailureReason) => {
    const failure = { at: now.toISOString(), reason };
    if (!abort.aborted) await writeState({ ...state, failure });
    return done('failed', failure);
  };

  const access = await target.access().catch(() => 'denied' as const);
  if (access === 'needs-tap') return done('needs-tap', state.failure);
  if (access === 'denied') return fail('permission');

  let name: string | undefined;
  let where: BackupWhere;
  let own: string[];
  let by: string | undefined;
  try {
    // Zoals Back-up maken: eerst oude voorstellen samenvatten; lukt dat niet, dan gewoon door.
    await tidyOldProposals().catch(() => 0);
    const envelope = await buildBackupEnvelope();
    where = await target.where();
    by = await target.installId().catch(() => undefined);
    // Eigen bestanden: alleen de lijst van deze installatie en van deze map.
    own = by !== undefined && state.filesBy === by && state.filesIn === backupWhereText(where) ? state.files : [];
    // Een vrije naam, of een eigen naam van vandaag: een vreemd bestand wordt nooit overschreven. Blijkt
    // een vrije naam toch bezet (een bestand dat de app niet ziet), dan het volgende volgnummer.
    const day = toISODate(now);
    const text = JSON.stringify(envelope, null, 2);
    const attemptId = `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    let taken = 0;
    for (let n = 1; n <= 99 && !name; n++) {
      const candidate = autoBackupFileName(day, n);
      if (!own.includes(candidate) && (await target.exists(candidate))) continue;
      try {
        await withTimeout(target.write(candidate, text, attemptId), timeoutMs);
        name = candidate;
      } catch (err) {
        if (err instanceof NameTakenError && ++taken < MAX_TAKEN) continue;
        throw err instanceof NameTakenError ? new AutoBackupError('write') : err;
      }
    }
    if (!name) throw new AutoBackupError('write');
    // Eerst nakijken of het bestand er heel staat; pas daarna opruimen.
    const ok = await withTimeout(target.verify(name, new TextEncoder().encode(text).length), timeoutMs).catch(() => false);
    if (!ok) throw new AutoBackupError('write');
  } catch (err) {
    if (err instanceof AutoBackupError) return fail(err.reason);
    if (err instanceof TimeoutError) return fail('timeout');
    return fail('write');
  }
  if (abort.aborted) return 'failed';

  // Het bestand staat er. Wat hierna misgaat (opruimen, bijhouden) maakt de back-up niet mislukt.
  const at = now.toISOString();
  const label = backupWhereText(where);
  let files = rememberFile(own, name);
  if (by !== undefined) {
    for (const old of filesToPrune(files, resolveAutoBackupKeep(settings.autoBackupKeep))) {
      await target.remove(old).catch(() => undefined);
      files = files.filter((f) => f !== old);
    }
  }
  try {
    await writeState({ lastAt: at, where, files, ...(label ? { filesIn: label } : {}), ...(by !== undefined ? { filesBy: by } : {}) });
  } catch (err) {
    console.warn('Automatische back-up gemaakt, maar niet bijgehouden', err);
  }
  try {
    if (onSaved) await onSaved(at);
    else await SettingsRepo.set({ lastExportedAt: at });
  } catch (err) {
    console.warn('Automatische back-up gemaakt, maar Laatste back-up niet bijgewerkt', err);
  }
  return done('saved');
}
