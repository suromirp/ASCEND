// ASCEND — Progression Spike Detection (sports-science review, September
// 2026, item D1).
//
// engine/demand.ts and data/algorithmRules.ts's *-progression-bands
// heuristics only ever expressed "how fast may weekly volume/distance grow"
// as a week-over-week percentage — but no code anywhere actually computed
// that percentage against real logs (TrainingGuardrail is a user on/off
// toggle, not a calculator). This file is the first thing that does.
//
// The reviewed evidence favors a different, more specific signal than a
// weekly percentage: Frandsen et al. (2023, n=5,205 recreational runners)
// found running-injury rate rose once a single session's distance exceeded
// roughly 10% above the longest run in the preceding 30 days, but found no
// comparable relationship for the classic week-over-week distance ratio.
// This module mirrors that shape — single-session-vs-30-day-baseline, not
// week-vs-week — for distance, and extends the same shape BY ANALOGY to
// D+/D-/pack weight, where no equivalent study exists (flagged in the
// research brief as low-confidence extrapolation, not a validated finding
// in its own right).

import type { SessionLog } from '../models/training';
import { addDays } from '../utils/dates';

export type SpikeDimension = 'distance' | 'elevationGain' | 'elevationLoss' | 'packWeight';

const DIMENSION_LABEL: Record<SpikeDimension, string> = {
  distance: 'afstand',
  elevationGain: 'D+',
  elevationLoss: 'D-',
  packWeight: 'rugzakgewicht',
};

const DIMENSION_UNIT: Record<SpikeDimension, string> = {
  distance: 'km',
  elevationGain: 'm',
  elevationLoss: 'm',
  packWeight: 'kg',
};

const ALL_DIMENSIONS: SpikeDimension[] = ['distance', 'elevationGain', 'elevationLoss', 'packWeight'];

// ASCEND_HEURISTIC(SPIKE-RATIO-THRESHOLD): ~10% above the 30-day baseline,
// taken directly from Frandsen et al.'s single-session-distance finding for
// `distance`; applied to elevationGain/elevationLoss/packWeight by analogy
// only — that extension itself has no direct supporting study (research
// brief D1/D2).
const SPIKE_RATIO_THRESHOLD = 1.1;
const BASELINE_WINDOW_DAYS = 30;

export interface SpikeSignal {
  detected: boolean;
  dimensions: SpikeDimension[];
  reason?: string;
}

function dimensionValue(log: SessionLog, dimension: SpikeDimension): number | undefined {
  switch (dimension) {
    case 'distance':
      return log.outdoorData?.distanceKm ?? log.cardioData?.distanceKm;
    case 'elevationGain':
      return log.outdoorData?.elevationGainM ?? log.cardioData?.elevationGainM;
    case 'elevationLoss':
      return log.outdoorData?.elevationLossM;
    case 'packWeight':
      return log.outdoorData?.backpackWeightKg;
  }
}

function formatValue(value: number, dimension: SpikeDimension): string {
  const rounded = dimension === 'distance' ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded}${DIMENSION_UNIT[dimension]}`;
}

// Checks only the SINGLE MOST RECENT log (logsMostRecentFirst[0]) against a
// baseline drawn from the 30 days strictly before it — never "today", so
// this reads the same regardless of when it's called. A session with no
// prior baseline for a dimension (first time ever logging that dimension)
// is never flagged — v0.2's "missing data is never interpreted as bad"
// applies here exactly as it does elsewhere in the engine: nothing to
// compare against is not evidence of a spike.
export function detectRecentSpike(logsMostRecentFirst: SessionLog[]): SpikeSignal {
  const [candidate, ...rest] = logsMostRecentFirst;
  if (!candidate) return { detected: false, dimensions: [] };

  const baselineCutoff = addDays(candidate.completedDate, -BASELINE_WINDOW_DAYS);
  const baselineLogs = rest.filter(
    (l) => l.completedDate >= baselineCutoff && l.completedDate < candidate.completedDate,
  );

  const dimensions: SpikeDimension[] = [];
  const parts: string[] = [];

  for (const dimension of ALL_DIMENSIONS) {
    const value = dimensionValue(candidate, dimension);
    if (value === undefined || value <= 0) continue;

    const baselineMax = baselineLogs.reduce((max, l) => Math.max(max, dimensionValue(l, dimension) ?? 0), 0);
    if (baselineMax === 0) continue;

    if (value > baselineMax * SPIKE_RATIO_THRESHOLD) {
      dimensions.push(dimension);
      parts.push(`${DIMENSION_LABEL[dimension]} (${formatValue(value, dimension)} t.o.v. eerder maximum ${formatValue(baselineMax, dimension)})`);
    }
  }

  if (dimensions.length === 0) return { detected: false, dimensions: [] };

  const reason = dimensions.length > 1
    ? `Deze sessie combineert meerdere nieuwe pieken tegelijk — ${parts.join(', ')}. Dat is een groter risico dan één enkele grotere sessie.`
    : `Deze sessie is aanzienlijk groter dan wat je de afgelopen ${BASELINE_WINDOW_DAYS} dagen gewend was — ${parts.join(', ')}.`;

  return { detected: true, dimensions, reason };
}
