// ASCEND: which lines of the loopinzicht were shown, for the brake against
// repeating (engine/runInsight.ts, rule 7): the same topic with the same tone
// only after 14 days and only when it is at least half a noise unit further.
//
// One small record under its own meta key, on this device only. It is a reminder
// of what was said, not data of the training, so it is not part of a backup
// (buildBackupEnvelope names what it exports one by one).

import { MetaRepo } from './database';
import type { InsightTone, ShownInsight } from '../engine/runInsight';
import type { InsightTopic } from '../engine/runComparison';

const KEY = 'runInsightShown';
// Older than the brake needs is of no use.
const KEEP = 24;

const TOPICS: InsightTopic[] = ['efficiency', 'drift', 'climb', 'descent', 'form'];
const TONES: InsightTone[] = ['better', 'watch', 'fact'];

function valid(s: unknown): s is ShownInsight {
  const r = s as Partial<ShownInsight> | null;
  return !!r && typeof r.logId === 'string' && typeof r.date === 'string' && typeof r.strength === 'number' && Number.isFinite(r.strength) && TOPICS.includes(r.topic as InsightTopic) && TONES.includes(r.tone as InsightTone);
}

export async function getShownInsights(): Promise<ShownInsight[]> {
  const stored = await MetaRepo.get<unknown>(KEY);
  return Array.isArray(stored) ? stored.filter(valid) : [];
}

// Replaces what was recorded for this training, so a line that arrives late
// (the details come in after the save) is not held back by its own record.
export async function recordShownInsights(logId: string, lines: Pick<ShownInsight, 'topic' | 'tone' | 'strength'>[], date: string): Promise<void> {
  const kept = (await getShownInsights()).filter((s) => s.logId !== logId);
  const next = [...kept, ...lines.map((l) => ({ logId, topic: l.topic, tone: l.tone, strength: l.strength, date }))].slice(-KEEP);
  await MetaRepo.set(KEY, next);
}
