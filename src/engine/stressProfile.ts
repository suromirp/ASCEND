// ASCEND — Session stress profile resolution (Technical Architecture v0.3.1
// REVISED, review point 8, Phase 3).
//
// Layered, not duplicated: a SessionTemplate carries a base default
// (baseStressProfile), a TrainingPrescription may override a subset of
// fields for one specific occurrence (stressProfileOverride), and a third,
// distinct concern — what a session actually turned out to be, from real
// SessionLog data — is derived separately for capability-evidence/response-
// classification quality. resolveEffectiveStressProfile() is the ONLY place
// every guardrail check goes through; deriveObservedStressFromLog() is never
// merged into it.

import type { SessionLog } from '../models/training';
import type { LoadLevel, SessionStressProfile } from '../models/prescription';
import { isLegHeavy } from './scheduler';

// The legacy adapter (review point 8): maps the existing hardcoded
// leg-heavy template-id set to a real SessionStressProfile shape, so
// resolveEffectiveStressProfile() below has a fallback for any template
// that hasn't been backfilled with a real baseStressProfile yet. Every
// current template IS backfilled as of Phase 3 (data/defaultProgram.ts), so
// this only matters for content added later without a profile of its own —
// never a permanent second source of truth.
export function legacyIsLegHeavyToStressProfile(templateId: string): SessionStressProfile {
  return isLegHeavy(templateId)
    ? { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'light', intensity: 'moderate' }
    : { lowerBodyLoad: 'light', impact: 'light', eccentricLoad: 'none', intensity: 'moderate' };
}

// The one pure function every guardrail check goes through — never inlined
// elsewhere, never a read of template/prescription stress fields directly.
export function resolveEffectiveStressProfile(
  template: { baseStressProfile?: SessionStressProfile; id: string },
  prescription?: { stressProfileOverride?: Partial<SessionStressProfile> },
): SessionStressProfile {
  const base = template.baseStressProfile ?? legacyIsLegHeavyToStressProfile(template.id);
  return { ...base, ...(prescription?.stressProfileOverride ?? {}) };
}

function bumpLoad(level: LoadLevel, min: LoadLevel): LoadLevel {
  const order: LoadLevel[] = ['none', 'light', 'moderate', 'heavy'];
  return order.indexOf(level) >= order.indexOf(min) ? level : min;
}

// A separate, retrospective concern: what did a session's real recorded
// data show, regardless of what the template/prescription assumed
// beforehand — used for capability-evidence/response-classification
// quality, never for planning-time guardrail checks (never merged into
// resolveEffectiveStressProfile above).
export function deriveObservedStressFromLog(log: SessionLog): Partial<SessionStressProfile> {
  const observed: Partial<SessionStressProfile> = {};
  const elevationLossM = log.outdoorData?.elevationLossM;
  const elevationGainM = log.outdoorData?.elevationGainM ?? log.cardioData?.elevationGainM;
  const backpackWeightKg = log.outdoorData?.backpackWeightKg;

  // Real descent load, logged after the fact, is at least 'light' eccentric
  // — regardless of what the template/prescription assumed beforehand.
  if (elevationLossM !== undefined && elevationLossM > 0) {
    observed.eccentricLoad = bumpLoad('light', 'light');
    if (elevationLossM >= 500) observed.eccentricLoad = 'heavy';
    else if (elevationLossM >= 150) observed.eccentricLoad = 'moderate';
  }

  // Real ascent/descent volume and a heavy pack both raise observed
  // lower-body load, whatever the template's default assumed.
  if ((elevationGainM !== undefined && elevationGainM > 0) || (backpackWeightKg !== undefined && backpackWeightKg >= 8)) {
    observed.lowerBodyLoad = 'moderate';
  }
  if (backpackWeightKg !== undefined && backpackWeightKg >= 12) {
    observed.lowerBodyLoad = 'heavy';
  }

  if (log.rpe !== undefined) {
    observed.intensity = log.rpe >= 8 ? 'high' : log.rpe <= 4 ? 'low' : 'moderate';
  }

  return observed;
}
