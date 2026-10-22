// Made-up logs of runs and tochten, with a profile built from made-up series,
// for the tests of the loopinzicht. Nothing here belongs to a real person.

import { buildDefaultProgramData } from '../../data/defaultProgram';
import { buildActivityDetail } from '../activityDetail';
import type { ComparisonContext } from '../runComparison';
import type { DetailConditions } from '../../models/activityDetail';
import type { SessionLog, SessionTemplate } from '../../models/training';
import { makeStreams, type RunSpec } from './runStreams';

export const TEMPLATES: SessionTemplate[] = buildDefaultProgramData().templates;

export interface RunLogOptions {
  id: string;
  date: string;
  spec: RunSpec;
  templateId?: string;
  conditions?: DetailConditions;
  treadmill?: boolean;
  packKg?: number;
  // Leave the profile off (an old log).
  noDetail?: boolean;
  // The ground contact balance came along: a strap or a pod was on.
  strap?: boolean;
  hour?: string;
}

export function runLog(o: RunLogOptions): SessionLog {
  const spec = { ...o.spec, ...(o.strap === false || o.strap === undefined ? {} : { stanceBalance: 50 }) };
  const streams = makeStreams(spec);
  const detail = buildActivityDetail(streams, { source: 'garmin', conditions: o.conditions, treadmill: o.treadmill });
  const minutes = Math.round(o.spec.minutes);
  const dist = streams.distanceM ?? [0];
  const km = (dist[dist.length - 1] ?? 0) / 1000;
  const templateId = o.templateId ?? 'tpl_easy_run';
  const hiking = templateId === 'tpl_mountain_hike' || templateId === 'tpl_long_run';
  const metric = {
    durationMinutes: minutes,
    distanceKm: Math.round(km * 100) / 100,
    environment: o.treadmill ? ('treadmill' as const) : ('outdoor' as const),
    source: 'garmin' as const,
    ...(o.packKg !== undefined ? { backpackWeightKg: o.packKg } : {}),
  };
  return {
    id: o.id,
    templateId,
    type: hiking ? 'hiking' : 'cardio',
    sport: templateId === 'tpl_mountain_hike' ? 'hiking' : 'running',
    completedDate: o.date,
    completedAt: `${o.date}T${o.hour ?? '08'}:00:00.000Z`,
    variant: 'custom',
    durationMinutes: minutes,
    cardioData: hiking ? undefined : metric,
    outdoorData: hiking ? metric : undefined,
    externalId: `intervals.icu:${o.id}`,
    ...(o.noDetail || !detail ? {} : { detail }),
    source: 'garmin',
  };
}

// An easy flat run of 40 minutes in zone 2 for an LTHR of 170 (zone 2 is 136 to 151).
export const EASY: RunSpec = { minutes: 40, pace: 360, hr: 142, cadence: 172, hrNoise: 0.5, baroNoise: 0.8 };

export function context(logs: SessionLog[], over: Partial<ComparisonContext> = {}, today = '2026-10-20'): ComparisonContext {
  return {
    logs,
    templates: TEMPLATES,
    program: null,
    hr: { lthr: 170, restingHr: 50 },
    legs: { logs, plannedSessions: [], templates: TEMPLATES, today, program: null },
    chestStrap: true,
    ...over,
  };
}

// Four earlier easy runs, three days apart before 2026-10-18.
export const EARLIER_DATES = ['2026-10-15', '2026-10-12', '2026-10-09', '2026-10-06'];
