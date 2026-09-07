// ASCEND — Concurrent-training same-day advisory (sports-science review,
// September 2026, item A2; generalized for the time-budget scheduling
// redesign, production feedback).
//
// The reviewed concurrent-training literature (Schumann et al.'s updated
// meta-analysis, 43 studies) is notably less pessimistic than the classic
// "interference effect" framing: combining strength and endurance training
// showed no relevant average reduction in maximal strength or hypertrophy —
// only explosive/power strength showed a small negative signal, and mainly
// when the two sessions were stacked close together in time. That does not
// support a hard scheduling rule (ASCEND's key strength goals here are
// functional/hiking-relevant strength, not explosive power), so this is
// deliberately only ever a soft, dismissable-by-ignoring suggestion — never
// a blocking check, and never folded into the leg-heavy conflict logic in
// engine/scheduler.ts.
//
// Two distinct same-day concerns, both advisory: the original
// strength+endurance discipline pairing above (a session-quality concern —
// one discipline blunting the other's quality when stacked close together),
// and a newer same-axis load-stacking concern below (two sessions taxing
// the SAME system twice in one day — e.g. two upperBodyLoad:'heavy'
// sessions — a volume concern, not a discipline-interference one).
// pairingOverride('prefer') always wins over the same-axis signal, exactly
// like it does for engine/scheduler.ts's cross-day 48h exception — one
// generic "these two are a deliberate exception" mechanism, not two.

import type { PlannedSession, SessionTemplate } from '../models/training';
import type { LoadLevel } from '../models/prescription';
import { resolveEffectiveStressProfile } from './stressProfile';
import { isIntentionalBackToBack } from './scheduler';

export interface ConcurrentTrainingTip {
  reason: string;
}

// Any real strength template counts — the acute quality-of-session concern
// (soreness/fatigue affecting the other session) applies regardless of
// whether that day's lift is a max-strength or hypertrophy-focused one.
function isKeyStrengthSession(template: SessionTemplate): boolean {
  return template.type === 'strength';
}

function isKeyEnduranceSession(template: SessionTemplate): boolean {
  return template.type === 'cardio' || template.type === 'hiking';
}

// The same-axis load-stacking axes — deliberately excludes lowerBodyLoad:
// that axis already has its own, harder cross-day 48h rule
// (engine/scheduler.ts#requiredSpacingDays), which already correctly
// flags two leg-heavy sessions on the SAME day too (a 0-day gap is always
// <= any spacing requirement) — this file never duplicates that check.
const SAME_AXIS_LOAD_AXES = ['cardioLoad', 'upperBodyLoad', 'eccentricLoad'] as const;

function findSameAxisHighStacking(templateA: SessionTemplate, templateB: SessionTemplate): (typeof SAME_AXIS_LOAD_AXES)[number] | null {
  const profileA = resolveEffectiveStressProfile(templateA);
  const profileB = resolveEffectiveStressProfile(templateB);
  const isHeavy = (level: LoadLevel | undefined) => level === 'heavy';
  return SAME_AXIS_LOAD_AXES.find((axis) => isHeavy(profileA[axis]) && isHeavy(profileB[axis])) ?? null;
}

const AXIS_LABEL_NL: Record<(typeof SAME_AXIS_LOAD_AXES)[number], string> = {
  cardioLoad: 'cardiovasculaire belasting',
  upperBodyLoad: 'bovenlichaamsbelasting',
  eccentricLoad: 'excentrische belasting',
};

// A future refinement (not built yet — out of scope for this pass) could
// make the recommended order depend on which discipline the user's active
// goal currently prioritizes (Goal Focus), rather than always suggesting
// the same neutral separation advice.
export function suggestSameDayOrder(
  daySessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
): ConcurrentTrainingTip | null {
  const active = daySessions.filter((s) => s.status !== 'skipped');
  const activeTemplates = active
    .map((s) => templateById.get(s.templateId))
    .filter((t): t is SessionTemplate => !!t);

  // engine/scheduler.ts's own leg-heavy same-day case is already covered by
  // requiredSpacingDays elsewhere — this file only ever advises on the
  // OTHER axes, so a pairingOverride('prefer') pair (e.g. a future custom
  // same-day combo the user has explicitly approved) is checked once here
  // for those axes and skips the rest of this function entirely.
  for (let i = 0; i < activeTemplates.length; i++) {
    for (let j = i + 1; j < activeTemplates.length; j++) {
      if (isIntentionalBackToBack(activeTemplates[i], activeTemplates[j])) continue;

      const axis = findSameAxisHighStacking(activeTemplates[i], activeTemplates[j]);
      if (axis) {
        return {
          reason: `${activeTemplates[i].name} en ${activeTemplates[j].name} staan vandaag beide gepland en scoren allebei zwaar op ${AXIS_LABEL_NL[axis]}. Overweeg er een paar uur tussen te zetten, of één ervan een andere dag te geven — dit stapelt dezelfde belasting twee keer op één dag.`,
        };
      }
    }
  }

  const strengthSession = active.find((s) => {
    const template = templateById.get(s.templateId);
    return !!template && isKeyStrengthSession(template);
  });
  const enduranceSession = active.find((s) => {
    const template = templateById.get(s.templateId);
    return !!template && isKeyEnduranceSession(template);
  });
  if (!strengthSession || !enduranceSession) return null;

  const strengthName = templateById.get(strengthSession.templateId)?.name ?? strengthSession.templateId;
  const enduranceName = templateById.get(enduranceSession.templateId)?.name ?? enduranceSession.templateId;

  return {
    reason: `${strengthName} en ${enduranceName} staan vandaag beide gepland. Zet er bij voorkeur een paar uur tussen — een zware sessie vlak vóór de andere kan de kwaliteit ervan drukken, ook al is dat op de langere termijn meestal geen probleem.`,
  };
}
