// ASCEND: wat in de instellingen aandacht vraagt. Puur: geen React, geen opslag.
//
// Op het overzicht is er één plek waar goud verschijnt: het back-upvak, en
// alleen als de back-up ouder is dan 7 dagen of er nog nooit een is gemaakt
// (docs/beslissingen/2026-10-22-instellingen-in-groepen.md). Is de back-up
// recent, dan staat er geen goud.

import { daysBetween } from '../utils/dates';

export const BACKUP_OLD_AFTER_DAYS = 7;

export type BackupLevel = 'never' | 'old' | 'ok';

export interface BackupAge {
  // Hele dagen sinds de laatste back-up, of null als die er nooit was.
  days: number | null;
  level: BackupLevel;
}

// `lastExportedAt` is de tijd van de laatste back-up (ISO), zoals in AppSettings.
export function backupAge(lastExportedAt: string | undefined, today: string): BackupAge {
  if (!lastExportedAt) return { days: null, level: 'never' };
  const days = Math.max(0, daysBetween(lastExportedAt.slice(0, 10), today));
  return { days, level: days > BACKUP_OLD_AFTER_DAYS ? 'old' : 'ok' };
}

// "vandaag", "gisteren" of "12 dagen geleden".
export function backupAgoText(age: BackupAge): string {
  if (age.days === null) return 'Nog nooit';
  if (age.days === 0) return 'Vandaag';
  if (age.days === 1) return 'Gisteren';
  return `${age.days} dagen geleden`;
}

// Het back-upvak vraagt aandacht (goud) bij "nooit" en bij "oud".
export const backupNeedsAttention = (age: BackupAge): boolean => age.level !== 'ok';
