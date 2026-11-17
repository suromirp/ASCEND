// ASCEND: de bewaarde reeksen die de drempel en "Klaar voor je test" lezen (I-79). Alleen lezen,
// nooit schrijven: de reeksen en de logs blijven zoals ze zijn.

import type { SessionLog } from '../models/training';
import type { StreamSet } from '../models/activityDetail';
import { ActivityStreamsRepo } from './databaseRepos';
import { unpackStreams } from '../engine/streamPack';
import { testTotals } from '../engine/bestEffort';
import { isStaleRunDetail } from '../engine/runDetail';
import { medianStepSec, type RunStreamFacts } from '../engine/testReadiness';
import { withTimeout } from '../utils/withTimeout';

const LIMIT_MS = 4000;

// De reeksen van deze logs, alleen als ze bij de totalen van het log passen en het log niet is ingekort.
// Wat niet te lezen is, ontbreekt: de schatting valt dan terug op de kilometers.
export async function streamsForLogs(logs: SessionLog[], timeoutMs = LIMIT_MS): Promise<Map<string, StreamSet>> {
  const out = new Map<string, StreamSet>();
  const work = async () => {
    for (const log of logs) {
      if (log.trim) continue;
      try {
        const stored = await ActivityStreamsRepo.get(log.id);
        const { km, minutes } = testTotals(log);
        if (!stored || isStaleRunDetail(stored, km, minutes)) continue;
        const set = unpackStreams(stored);
        if (set) out.set(log.id, set);
      } catch {
        // De volgende.
      }
    }
  };
  try {
    await withTimeout(work(), timeoutMs);
  } catch {
    // Wat binnen de tijd gelezen is, telt.
  }
  return out;
}

// De feiten van je laatste loop met een bewaarde reeks, voor "Klaar voor je test".
export async function lastRunStreamFacts(logs: SessionLog[], timeoutMs = LIMIT_MS): Promise<RunStreamFacts | undefined> {
  const work = async () => {
    const keys = new Set(await ActivityStreamsRepo.keys());
    const runs = logs
      .filter((l) => keys.has(l.id) && !!l.cardioData && !l.trim)
      .sort((a, b) => (b.completedAt ?? b.completedDate).localeCompare(a.completedAt ?? a.completedDate));
    for (const log of runs.slice(0, 3)) {
      const stored = await ActivityStreamsRepo.get(log.id);
      const set = stored ? unpackStreams(stored) : undefined;
      if (!stored || !set) continue;
      const balance = set.stanceBalanceLeftPct?.some((v) => v !== null) ?? false;
      return {
        logId: log.id,
        date: log.completedDate,
        strapSeen: log.detail?.quality.chestStrapSeen === true || balance,
        stepSec: medianStepSec(set.timeSec),
        rr: (stored.rrMs?.byteLength ?? 0) > 0,
      };
    }
    return undefined;
  };
  try {
    return await withTimeout(work(), timeoutMs);
  } catch {
    return undefined;
  }
}
