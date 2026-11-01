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
import { KEEP_DAYS } from './wellnessRange';
import { addDays } from '../utils/dates';

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

// De velden die een ochtend in de back-up heeft. Een ochtend met niets anders is al opgeruimd.
const BACKUP_KEYS: ReadonlySet<string> = new Set(['id', 'date', 'source', 'restingHeartRate', 'hrv', 'sleepMinutes', 'sleepScore']);

export function isBackupOnly(r: RecoveryMetric): boolean {
  return Object.entries(r).every(([key, value]) => value === undefined || BACKUP_KEYS.has(key));
}

export interface RetirePlan {
  remove: string[];
  put: BackupMorning[];
}

// Een opgehaalde ochtend die de cache verlaat (ontkoppelen, de grens van 400 dagen): met
// "Ochtendgetallen in back-up" aan blijven alleen de back-upvelden, anders gaat hij weg. Een
// ochtend die al alleen die velden heeft wordt overgeslagen, zodat niets dubbel of half
// opgeruimd wordt (docs/beslissingen/2026-11-01-ochtenden-archief.md).
export function planRetire(records: readonly RecoveryMetric[], keepMornings: boolean): RetirePlan {
  if (!keepMornings) return { remove: records.map((r) => r.id), put: [] };
  const remove: string[] = [];
  const put: BackupMorning[] = [];
  for (const r of records) {
    if (isBackupOnly(r)) continue;
    const [kept] = morningsForBackup([r]);
    if (kept) put.push(kept);
    else remove.push(r.id);
  }
  return { remove, put };
}

// "Ochtendgetallen in back-up" uitzetten: wat er daardoor van de telefoon verdwijnt.
// Zonder koppeling bleven de opgehaalde ochtenden alleen voor de back-up bewaard, en die gaan
// dan alle weg. Met een koppeling (ook met een verlopen sleutel) blijft het recente deel, want de
// bron levert het opnieuw, maar wat ouder is dan KEEP_DAYS haalt de volgende keer ophalen weg
// (storage/wellness.ts#syncWellness, dezelfde grens). Wat je zelf invulde wordt nooit opgeruimd.
export function archiveToClear(
  records: readonly RecoveryMetric[],
  { connected, fetchedPrefix, today }: { connected: boolean; fetchedPrefix: string; today: string },
): RecoveryMetric[] {
  const fetched = records.filter((r) => r.id.startsWith(fetchedPrefix));
  if (!connected) return fetched;
  const cutoff = addDays(today, -KEEP_DAYS);
  return fetched.filter((r) => r.date < cutoff);
}

// Ongedaan maken: alleen terug wat er nu niet staat, nooit over een nieuwere ochtend heen.
export function morningsToPutBack(removed: readonly RecoveryMetric[], current: readonly RecoveryMetric[]): RecoveryMetric[] {
  const have = new Set(current.map((r) => r.id));
  return removed.filter((r) => !have.has(r.id));
}
