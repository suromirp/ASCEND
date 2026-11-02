// ASCEND: hoeveel van de minuten van een periode rustig waren en hoeveel hard.
//
// Vervangt "gem. zwaarte 9" in de weekterugblik. De grens is dezelfde als bij Intensiteit op Stand
// (engine/standing.ts#intensityMix): rustig is zone 2 of lager, hard is alles erboven. Per training, in
// deze volgorde:
// 1. gemeten hartslagzones van het horloge (engine/intensityMinutes.ts#minutesByZone), mits er een profiel is;
// 2. jouw eigen zwaarte (sRPE): 6 of hoger is hard, daaronder rustig (6 is wat het plan "gemiddeld" noemt);
// 3. wat het plan van de training zegt (stressprofiel: laag is rustig, de rest is hard).
// Kracht telt alleen mee met een eigen zwaarte; zonder die staat de tijd onder `uncounted`. Een rustdag
// telt nooit. Puur: geen React, geen opslag, niets wordt weggeschreven.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { HeartRateSettings } from './heartRateZones';
import { minutesByZone } from './intensityMinutes';
import { resolveEffectiveStressProfile } from './stressProfile';
import { hoursMinutes } from '../utils/hoursMinutes';

export interface EffortMinutes { easy: number; hard: number; uncounted: number }

// Vanaf deze zwaarte (1 tot 10) telt een training als hard.
export const HARD_RPE_FROM = 6;

export function effortMinutes(logs: SessionLog[], templateById: Map<string, SessionTemplate>, hr?: HeartRateSettings): EffortMinutes {
  const out: EffortMinutes = { easy: 0, hard: 0, uncounted: 0 };
  for (const l of logs) {
    if (l.type === 'recovery') continue;
    const minutes = l.durationMinutes || 0;
    if (minutes <= 0) continue;
    const measured = l.type === 'strength' ? undefined : minutesByZone(l, hr);
    if (measured) {
      out.easy += measured.easy;
      out.hard += measured.middle + measured.hard;
    } else if (l.rpe !== undefined) {
      out[l.rpe >= HARD_RPE_FROM ? 'hard' : 'easy'] += minutes;
    } else if (l.type === 'strength') {
      out.uncounted += minutes;
    } else {
      const t = templateById.get(l.templateId);
      const intensity = t ? resolveEffectiveStressProfile(t).intensity : 'low';
      out[intensity === 'low' ? 'easy' : 'hard'] += minutes;
    }
  }
  return { easy: Math.round(out.easy), hard: Math.round(out.hard), uncounted: Math.round(out.uncounted) };
}

const clock = (m: number): string => (m >= 60 ? `${hoursMinutes(m)} uur` : `${m} min`);

// "1:20 uur rustig, 36 min hard"; niets als er niets te zeggen valt.
export function effortLine(e: EffortMinutes): string | undefined {
  const parts = [e.easy > 0 ? `${clock(e.easy)} rustig` : '', e.hard > 0 ? `${clock(e.hard)} hard` : ''].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}
