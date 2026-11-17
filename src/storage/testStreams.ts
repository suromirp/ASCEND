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
// `complete` zegt of alles gelezen is: een log zonder bewaarde reeks is gelezen (de schatting valt dan
// terug op de kilometers), een log dat niet op tijd of niet te lezen was niet. Zonder `complete` hoort er
// geen voorstel te komen: een halve kaart zou stil op een andere rekenwijze terugvallen.
export interface TestStreamsRead {
  map: Map<string, StreamSet>;
  complete: boolean;
}

export async function streamsForLogs(logs: SessionLog[], timeoutMs = LIMIT_MS): Promise<TestStreamsRead> {
  const map = new Map<string, StreamSet>();
  let failed = false;
  const work = async () => {
    for (const log of logs) {
      if (log.trim) continue;
      try {
        const stored = await ActivityStreamsRepo.get(log.id);
        const { km, minutes } = testTotals(log);
        if (!stored || isStaleRunDetail(stored, km, minutes)) continue;
        const set = unpackStreams(stored);
        if (set) map.set(log.id, set);
      } catch {
        failed = true;
      }
    }
  };
  try {
    await withTimeout(work(), timeoutMs);
  } catch {
    return { map, complete: false };
  }
  return { map, complete: !failed };
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
