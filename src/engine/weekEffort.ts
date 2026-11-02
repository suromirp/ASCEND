// ASCEND: hoeveel van de minuten van een periode rustig waren en hoeveel hard.
//
// Vervangt "gem. zwaarte 9" in de weekterugblik. Het is dezelfde indeling als Intensiteit op Stand
// (engine/standing.ts#intensityMix): rustig is zone 2 of lager, hard is alles erboven (stevig en hard samen).
// Per training, in deze volgorde:
// 1. gemeten hartslagzones van het horloge (minutesByZone), mits de instelling "Intensiteit tellen" op hartslag
//    staat, er een profiel is en de hartslag genoeg van de training dekt; kracht heeft geen zones;
// 2. jouw eigen zwaarte (sRPE): hoger dan EASY_RPE_TOP (4, de grens van de coach) is hard, tot en met 4 rustig;
// 3. wat het plan van de training zegt (standing.ts#plannedEffortKind: een rol hard_effort telt als hard, een
//    training zonder template als rustig).
// Kracht telt alleen mee met een eigen zwaarte; zonder die staat de tijd onder `uncounted`. Een rustdag telt
// nooit. Puur: geen React, geen opslag, niets wordt weggeschreven.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { HeartRateSettings } from './heartRateZones';
import { minutesByZone } from './intensityMinutes';
import type { IntensityCounting } from './intensitySettings';
import { plannedEffortKind } from './standing';
import { EASY_RPE_TOP } from './coach';
import { hoursMinutes } from '../utils/hoursMinutes';

export interface EffortMinutes { easy: number; hard: number; uncounted: number }

export function effortMinutes(logs: SessionLog[], templateById: Map<string, SessionTemplate>, hr?: HeartRateSettings, counting: IntensityCounting = 'heartrate'): EffortMinutes {
  const out: EffortMinutes = { easy: 0, hard: 0, uncounted: 0 };
  for (const l of logs) {
    if (l.type === 'recovery') continue;
    const minutes = l.durationMinutes || 0;
    if (minutes <= 0) continue;
    const measured = l.type === 'strength' || counting === 'plan' ? undefined : minutesByZone(l, hr);
    if (measured) {
      out.easy += measured.easy;
      out.hard += measured.middle + measured.hard;
    } else if (l.rpe !== undefined) {
      out[l.rpe > EASY_RPE_TOP ? 'hard' : 'easy'] += minutes;
    } else if (l.type === 'strength') {
      out.uncounted += minutes;
    } else {
      out[plannedEffortKind(templateById.get(l.templateId)) === 'easy' ? 'easy' : 'hard'] += minutes;
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
