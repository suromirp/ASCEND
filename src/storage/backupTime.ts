// ASCEND: Laatste back-up ligt nooit in de toekomst (docs/beslissingen/2026-11-20-backup-kopie-en-toekomst.md).
//
// Bij elke start (storage/bootMigrations.ts): staat `lastExportedAt` later dan nu, dan wordt hij nu, met de
// lijst die erbij hoort (engine/backupSince.ts#straightBackupPair). Anders staan de automatische back-up en
// de herinnering stil tot die datum. Klopt het tijdstip, dan kost dit één leesactie en schrijft het niets.
// De regel wordt opnieuw gelezen binnen de transactie die schrijft, zodat een back-up van net daarvoor blijft.
// Gooit nooit: een opslag die niet antwoordt houdt het openen niet tegen.

import { MetaRepo } from './databaseRepos';
import { straightBackupPair, type BackupPair } from '../engine/backupSince';

export type BackupTimeOutcome = 'ok' | 'straightened' | 'failed';

export async function straightenBackupTime(nowMs: number = Date.now()): Promise<BackupTimeOutcome> {
  try {
    const stored = await MetaRepo.get<BackupPair>('settings');
    if (!stored || straightBackupPair(stored, nowMs) === stored) return 'ok';
    let changed = false;
    await MetaRepo.update<BackupPair>('settings', (now) => {
      const base = now ?? {};
      const next = straightBackupPair(base, nowMs);
      changed = next !== base;
      return next;
    });
    return changed ? 'straightened' : 'ok';
  } catch {
    return 'failed';
  }
}
