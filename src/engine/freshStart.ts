// ASCEND — "started from scratch on this device?"
//
// A wiped browser or a reinstalled home-screen app leaves an empty
// database, and ASCEND quietly seeds the default program again. For the
// first days after that, Today offers to put a backup back, until there is
// something of your own (a log, a backup) or you choose to start fresh.
//
// Pure: no React, no IndexedDB.

import { daysBetween } from '../utils/dates';

export const FRESH_START_DAYS = 14;

export function shouldOfferRestore(input: {
  seededAt: string | undefined;
  today: string;
  logCount: number;
  lastExportedAt?: string;
  dismissedAt?: string;
}): boolean {
  const { seededAt, today, logCount, lastExportedAt, dismissedAt } = input;
  if (!seededAt || dismissedAt || lastExportedAt || logCount > 0) return false;
  return daysBetween(seededAt.slice(0, 10), today) < FRESH_START_DAYS;
}
