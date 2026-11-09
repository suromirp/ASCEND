// ASCEND: de stabiele stukken van een loop op het log zetten (`SessionLog.zone2Pieces`,
// engine/zone2Pieces.ts, docs/beslissingen/2026-11-09-tempo-stabiele-stukken.md).
//
// Afgeleid en append-only, zoals `runDetail`: één keer toegevoegd, in één transactie op het
// log zoals het nu bewaard is, alleen als het er nog niet is of bij andere totalen hoort.
// Een gemeten getal verandert nooit; dit is geen uitzondering op de regel over historie.
// Twee routes: tijdens het ophalen van de reeks (storage/activityDetail.ts) en voor oudere
// lopen uit de bewaarde reeks, op de achtergrond bij het openen.

import type { SessionLog } from '../models/training';
import type { StreamSet } from '../models/activityDetail';
import type { Zone2Pieces } from '../models/zone2Pieces';
import { buildZone2Pieces, isStaleZone2Pieces, readZone2Pieces } from '../engine/zone2Pieces';
import { unpackStreams } from '../engine/streamPack';
import { isStaleRunDetail, runDetailFingerprint } from '../engine/runDetail';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';
import { logSport } from '../engine/sports';
import { testTotals } from '../engine/racePrediction';
import { ActivityStreamsRepo, getDB, SessionLogsRepo } from './database';

// Of een log (nog) stukken wil: een buitenloop zonder bruikbaar veld voor zijn huidige totalen.
export function wantsZone2Pieces(log: SessionLog): boolean {
  if (logSport(log) !== 'running' || log.trim) return false;
  const block = log.cardioData ?? log.outdoorData;
  if (block?.environment === 'treadmill') return false;
  const { km, minutes } = testTotals(log);
  if (km <= 0 || minutes <= 0) return false;
  // Een reeks die niets gaf voor deze totalen wordt niet bij elke opening opnieuw gerekend.
  if (log.zone2PiecesTried === runDetailFingerprint(km, minutes)) return false;
  const cur = readZone2Pieces(log.zone2Pieces);
  return !cur || isStaleZone2Pieces(cur, km, minutes);
}

// Een log waarvan het rekenen faalde: de afdruk van zijn totalen, zodat het niet bij elke
// opening opnieuw gaat. Een correctie bij de bron verandert de totalen en probeert het nog eens.
async function markTried(logId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('sessionLogs', 'readwrite');
  const current = await tx.store.get(logId);
  if (current && wantsZone2Pieces(current)) {
    const { km, minutes } = testTotals(current);
    await tx.store.put({ ...current, zone2PiecesTried: runDetailFingerprint(km, minutes) });
  }
  await tx.done;
}

// Zet de stukken op het bewaarde log, alleen als ze er nog niet zijn voor deze totalen.
export async function attachZone2Pieces(logId: string, pieces: Zone2Pieces): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction('sessionLogs', 'readwrite');
  const current = await tx.store.get(logId);
  if (!current || !wantsZone2Pieces(current)) {
    await tx.done;
    return false;
  }
  const { km, minutes } = testTotals(current);
  if (isStaleZone2Pieces(pieces, km, minutes)) {
    await tx.done;
    return false;
  }
  await tx.store.put({ ...current, zone2Pieces: pieces });
  await tx.done;
  return true;
}

// Tijdens het ophalen: de reeks is er toch, de stukken komen erbij. Gooit nooit.
export async function attachZone2PiecesFromStreams(log: SessionLog, streams: StreamSet): Promise<boolean> {
  try {
    if (!wantsZone2Pieces(log)) return false;
    const { km, minutes } = testTotals(log);
    return await attachZone2Pieces(log.id, buildZone2Pieces(streams, km, minutes));
  } catch {
    return false;
  }
}

// De grenzen van de achtergrondstap bij het openen: alleen het venster dat aerobicTrend leest
// (12 weken), nieuwste eerst, en per opening hoogstens zoveel lopen en zoveel tijd. Wat
// overblijft volgt bij een volgende opening.
export const ZONE2_BACKFILL = { weeks: 12, maxLogs: 20, budgetMs: 3000 } as const;

export interface EnsureZone2Options {
  today?: string;
  maxLogs?: number;
  budgetMs?: number;
  // De klok, voor tests.
  now?: () => number;
}

const yieldToApp = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// Oudere lopen met een bewaarde reeks, één voor één, met een pauze voor de app ertussen.
// Gooit nooit; zegt of er iets bijkwam.
export async function ensureZone2Pieces(options: EnsureZone2Options = {}): Promise<boolean> {
  let added = false;
  const now = options.now ?? (() => Date.now());
  const start = now();
  const maxLogs = options.maxLogs ?? ZONE2_BACKFILL.maxLogs;
  const budgetMs = options.budgetMs ?? ZONE2_BACKFILL.budgetMs;
  try {
    const today = options.today ?? todayISO();
    const since = addDays(mondayOfWeek(today), -7 * (ZONE2_BACKFILL.weeks - 1));
    const keys = new Set(await ActivityStreamsRepo.keys());
    const logs = (await SessionLogsRepo.getAll())
      .filter((l) => keys.has(l.id) && l.completedDate >= since && l.completedDate <= today && wantsZone2Pieces(l))
      .sort((a, b) => b.completedDate.localeCompare(a.completedDate) || b.id.localeCompare(a.id));
    let done = 0;
    for (const log of logs) {
      if (done >= maxLogs || now() - start > budgetMs) break;
      if (done > 0) await yieldToApp();
      done++;
      try {
        const stored = await ActivityStreamsRepo.get(log.id);
        const { km, minutes } = testTotals(log);
        if (!stored || isStaleRunDetail(stored, km, minutes)) continue;
        const set = unpackStreams(stored);
        if (!set) {
          await markTried(log.id);
          continue;
        }
        if (await attachZone2Pieces(log.id, buildZone2Pieces(set, km, minutes))) added = true;
      } catch {
        try {
          await markTried(log.id);
        } catch {
          // De volgende.
        }
      }
    }
  } catch {
    // Nooit een fout naar buiten.
  }
  return added;
}
