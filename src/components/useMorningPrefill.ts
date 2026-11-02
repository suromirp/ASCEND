// ASCEND: wat er voor de ochtendvraag alvast is ingevuld, en waar het vandaan komt
// (engine/morningCard.ts): slaap en energie uit het horloge, benen uit de beenindex.

import { useMemo } from 'react';
import { legFatigueOn } from '../engine/legFatigue';
import { maxEffortYesterday, morningPrefill, type MaxEffortMorning, type MorningPrefill } from '../engine/morningCard';
import { askLegsAfterEffort } from '../engine/overviewSettings';
import { useAppData } from '../state/AppDataContext';
import type { WellnessReading } from '../engine/wellnessCheck';
import type { MorningRule } from '../engine/morningRule';
import { useLegFatigueInputs } from './LegFatigueCard';
import { useTodayWatch } from './useWellness';

// De ochtend na een test of wedstrijd (`afterEffort`): je benen open gevraagd, zonder voorstel uit de beenindex.
export function useMorningPrefill(today: string): { prefill: MorningPrefill; afterEffort: MaxEffortMorning | undefined; reading: WellnessReading | undefined; rule: MorningRule | undefined; linked: boolean; sleepOn: boolean } {
  const { sessionLogs, templates, settings } = useAppData();
  const watch = useTodayWatch(today);
  const inputs = useLegFatigueInputs();
  const legIndex = useMemo(() => legFatigueOn(today, inputs), [today, inputs]);
  const enabled = askLegsAfterEffort(settings.overviews);
  const afterEffort = useMemo(() => maxEffortYesterday({ logs: sessionLogs, templates, today, enabled }), [sessionLogs, templates, today, enabled]);
  const prefill = useMemo(() => morningPrefill({ legIndex, reading: watch.reading, afterEffort: !!afterEffort }), [legIndex, watch.reading, afterEffort]);
  return { prefill, afterEffort, ...watch };
}
