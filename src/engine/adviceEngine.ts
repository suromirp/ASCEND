// ASCEND — advice engine (Fase 3).
//
// Deterministic coaching: every piece of advice is one TRIGGER (something
// that happened), one RULE (a fixed, readable if-then), and one EFFECT
// (what ASCEND suggests, optionally as a concrete PlanChangeProposal the
// user can accept). No AI, no guessing — the same inputs always give the
// same advice, and the "waarom" line spells out trigger -> rule -> effect.
//
// Boundaries, on purpose:
// - Load feedback (too hard / too light) only for running, cycling and
//   hiking — the sports ASCEND actually measures. Strength is tracked in
//   MacroFactor: ASCEND only looks at whether sessions happened
//   (regularity), never at loads.
// - An effect never removes history and never stacks sessions: a missed
//   session is moved to a free day in the same week or let go.
// - Whether an accepted proposal is applied at once or asked first is not
//   decided here — that's the shared feedback pattern (changeImpact.ts);
//   accepting advice IS the user's confirmation.

export type { AdviceTrigger, Advice, AdviceOption, AdviceInputs } from './adviceShared';
export { testMoveAdvice } from './adviceTestRun';
export type { ForcedTestMove } from './adviceTestRun';
export { legEaseMoveAdvice, laterMoveAdvice, legCardSessionOf, previewLegCard, previewMorningAdvice, describeMorningPreview } from './adviceMorning';
export type { LaterMoveSpec } from './adviceMorning';
export { carryTargetTimeAnswers } from './adviceBlock';
export { retryTestRows, computeAdvice, adviceForLog } from './adviceCompute';
