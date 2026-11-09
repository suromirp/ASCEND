// ASCEND: the choices of a period without a gym (models/leave.ts#NoGymDetails), read
// with the advice where they are missing or damaged. Apart from engine/noGym.ts so
// that engine/leave.ts can use it without a cycle. Pure: no React, no IndexedDB.

import type { LeavePeriod, NoGymDetails } from '../models/leave';

// The short session with your own weight (data/defaultProgram.ts). Only a period without a gym
// puts it on the plan; it is never a MacroFactor workout's template by itself.
export const BODYWEIGHT_TEMPLATE_ID = 'tpl_bodyweight';

export const NO_GYM_ADVICE: NoGymDetails = { amount: 'light', strength: 'bodyweight', hills: false };

export function isNoGymDetails(v: unknown): v is NoGymDetails {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const d = v as Record<string, unknown>;
  return (d.amount === 'light' || d.amount === 'normal') && (d.strength === 'bodyweight' || d.strength === 'drop') && typeof d.hills === 'boolean';
}

// The choices of a period, the advice where they are missing or damaged.
export function resolveNoGym(period: Pick<LeavePeriod, 'noGym'> | undefined): NoGymDetails {
  return isNoGymDetails(period?.noGym) ? period.noGym : NO_GYM_ADVICE;
}

// What the day says in the week band.
export function noGymLine(period: Pick<LeavePeriod, 'noGym'>): string {
  const d = resolveNoGym(period);
  if (d.hills) return 'Lopen, rustig heuvels op';
  return d.strength === 'bodyweight' ? 'Lopen en eigen gewicht' : 'Alleen lopen';
}
