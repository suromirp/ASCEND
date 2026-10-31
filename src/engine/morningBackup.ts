// ASCEND: de ochtendgetallen in de back-up (docs/beslissingen/2026-10-31-kansen-stap-0.md).
//
// De slaap, rusthartslag en HRV van je horloge komen van intervals.icu en waren een cache die
// niet in de back-up ging. Valt die bron weg (Garmin scherpte in oktober 2026 zijn voorwaarden
// aan), dan is het toestel het enige exemplaar. Daarom gaan ze voortaan mee, alleen de datum en
// de vier getallen die ASCEND leest. Instelling "Ochtendgetallen in back-up", standaard aan.
//
// Puur: geen React, geen IndexedDB.

import type { AppSettings } from '../storage/database';
import type { RecoveryMetric } from '../models/metrics';

export type BackupMorning = Pick<RecoveryMetric, 'id' | 'date' | 'source' | 'restingHeartRate' | 'hrv' | 'sleepMinutes' | 'sleepScore'>;

export const resolveMorningBackup = (s: Pick<AppSettings, 'morningInBackup'> | undefined): boolean => s?.morningInBackup !== false;

// Alleen de velden die mee mogen, en alleen een ochtend waar er een van heeft.
export function morningsForBackup(metrics: readonly RecoveryMetric[]): BackupMorning[] {
  const out: BackupMorning[] = [];
  for (const r of metrics) {
    const row: BackupMorning = { id: r.id, date: r.date, source: r.source };
    if (r.restingHeartRate !== undefined) row.restingHeartRate = r.restingHeartRate;
    if (r.hrv !== undefined) row.hrv = r.hrv;
    if (r.sleepMinutes !== undefined) row.sleepMinutes = r.sleepMinutes;
    if (r.sleepScore !== undefined) row.sleepScore = r.sleepScore;
    if (Object.keys(row).length > 3) out.push(row);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
