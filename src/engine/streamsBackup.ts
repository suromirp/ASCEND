// ASCEND: welke reeksen van je horloge mee gaan in een back-up
// (docs/beslissingen/2026-10-31-data-lange-termijn.md). Een reeks is ongeveer 100 KB per
// activiteit, een jaar loopjes en tochten 15 tot 25 MB. De samenvatting per loop (runDetail en
// bestEffort op de log) gaat altijd mee, want die staat op de log zelf.
//
// Puur: geen React, geen IndexedDB.

import type { AppSettings } from '../storage/database';
import type { SessionLog } from '../models/training';
import { monthsBefore } from './proposalTidy';

export type StreamsBackup = 'twoYears' | 'all' | 'none';
export const STREAMS_BACKUP_OPTIONS: readonly StreamsBackup[] = ['twoYears', 'all', 'none'];
export const DEFAULT_STREAMS_BACKUP: StreamsBackup = 'twoYears';
// "De laatste 2 jaar", in maanden.
export const STREAMS_BACKUP_MONTHS = 24;

export const isStreamsBackup = (v: unknown): v is StreamsBackup => (STREAMS_BACKUP_OPTIONS as readonly unknown[]).includes(v);

// De keuze van nu. Wie de oude schakelaar "Reeksen in back-up" uit zette, houdt Geen reeksen;
// verder geldt het advies.
export function resolveStreamsBackup(s: Pick<AppSettings, 'streamsBackup' | 'streamsInBackup'> | undefined): StreamsBackup {
  if (isStreamsBackup(s?.streamsBackup)) return s.streamsBackup;
  return s?.streamsInBackup === false ? 'none' : DEFAULT_STREAMS_BACKUP;
}

// De logs waarvan de reeks mee gaat. Bij de laatste 2 jaar telt de dag van de training.
export function logIdsForBackup(logs: readonly Pick<SessionLog, 'id' | 'completedDate'>[], choice: StreamsBackup, today: string): Set<string> {
  if (choice === 'none') return new Set();
  if (choice === 'all') return new Set(logs.map((l) => l.id));
  const from = monthsBefore(today, STREAMS_BACKUP_MONTHS);
  return new Set(logs.filter((l) => typeof l.completedDate === 'string' && l.completedDate.slice(0, 10) >= from).map((l) => l.id));
}
