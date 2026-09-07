// ASCEND — Concurrent-training same-day advisory (sports-science review,
// September 2026, item A2).
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

import type { PlannedSession, SessionTemplate } from '../models/training';

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

// A future refinement (not built yet — out of scope for this pass) could
// make the recommended order depend on which discipline the user's active
// goal currently prioritizes (Goal Focus), rather than always suggesting
// the same neutral separation advice.
export function suggestSameDayOrder(
  daySessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
): ConcurrentTrainingTip | null {
  const active = daySessions.filter((s) => s.status !== 'skipped');

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
