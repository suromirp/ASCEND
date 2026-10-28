// A small memo for `derivedFactEntries` (engine/influence.ts): the 400 days are worked out again
// only when what they are made of changes. The key follows the content (a new array with the same
// content is a hit), so a tap on a chip, which rewrites the settings, does not start it over.
// Pure: no React, no IndexedDB.

import type { IllnessEpisode } from '../models/illness';
import type { NightJudgment } from '../models/checkIn';
import type { InfluenceEntry } from '../models/influence';
import type { RecoveryMetric } from '../models/metrics';
import type { SessionLog, SessionTemplate } from '../models/training';
import { derivedFactEntries } from './influence';
import { isLegHeavyTemplate } from './scheduler';

// A simple 32 bit hash over strings; enough to tell one content from another.
function hashOf(parts: Iterable<string | number | undefined>): string {
  let h = 5381;
  let n = 0;
  for (const p of parts) {
    const text = String(p);
    for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) | 0;
    h = ((h * 33) ^ 124) | 0;
    n++;
  }
  return `${n}:${(h >>> 0).toString(36)}`;
}

export interface FactsCacheInput {
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  recovery: readonly RecoveryMetric[];
  illness: readonly IllnessEpisode[] | undefined;
  judgments: readonly NightJudgment[] | undefined;
}

function factsKey(input: FactsCacheInput): string {
  const c = (l: SessionLog) => l.detail?.conditions;
  return JSON.stringify([
    hashOf(input.logs.flatMap((l) => [l.id, l.completedAt, l.templateId, c(l)?.feelsC, c(l)?.tempC, l.cardioData ? 1 : 0, l.outdoorData ? 1 : 0])),
    hashOf(input.templates.flatMap((t) => [t.id, isLegHeavyTemplate(t) ? 1 : 0, t.name])),
    hashOf(input.recovery.flatMap((m) => [m.id, m.date, m.sleepMinutes])),
    (input.illness ?? []).map((e) => [e.id, e.startDate, e.endDate]),
    (input.judgments ?? []).map((j) => [j.date, j.verdict, j.minutes]),
  ]);
}

export function createFactsCache() {
  let last: { logs: unknown; templates: unknown; recovery: unknown; illness: unknown; judgments: unknown; key: string; value: InfluenceEntry[] } | undefined;
  return {
    computed: 0,
    get(input: FactsCacheInput): InfluenceEntry[] {
      // The same lists: no need to look at the content.
      if (last && last.logs === input.logs && last.templates === input.templates && last.recovery === input.recovery && last.illness === input.illness && last.judgments === input.judgments) return last.value;
      const key = factsKey(input);
      if (last && last.key === key) {
        last = { ...last, logs: input.logs, templates: input.templates, recovery: input.recovery, illness: input.illness, judgments: input.judgments };
        return last.value;
      }
      this.computed += 1;
      const value = derivedFactEntries({ ...input, judgments: input.judgments ? [...input.judgments] : undefined });
      last = { logs: input.logs, templates: input.templates, recovery: input.recovery, illness: input.illness, judgments: input.judgments, key, value };
      return value;
    },
  };
}
