// ASCEND: wat er voor de ochtendvraag alvast is ingevuld, en waar het vandaan komt
// (engine/morningCard.ts): slaap en energie uit het horloge, benen uit de beenindex.

import { useMemo } from 'react';
import { legFatigueOn } from '../engine/legFatigue';
import { morningPrefill, type MorningPrefill } from '../engine/morningCard';
import type { WellnessReading } from '../engine/wellnessCheck';
import { useLegFatigueInputs } from './LegFatigueCard';
import { useTodayWatch } from './useWellness';

export function useMorningPrefill(today: string): { prefill: MorningPrefill; reading: WellnessReading | undefined; linked: boolean; sleepOn: boolean } {
  const watch = useTodayWatch(today);
  const inputs = useLegFatigueInputs();
  const legIndex = useMemo(() => legFatigueOn(today, inputs), [today, inputs]);
  const prefill = useMemo(() => morningPrefill({ legIndex, reading: watch.reading }), [legIndex, watch.reading]);
  return { prefill, ...watch };
}
