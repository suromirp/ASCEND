// ASCEND: wat een sport met je lijf doet, uit zijn kenmerken (docs/visie/Sporten die meetellen.md, 3.2).
// De vijf kenmerken van data/sports.ts worden een belastingsprofiel zoals elk sjabloon er een heeft, zodat
// de beenindex, de afstand tussen zware beendagen en de weekbelasting een sport lezen zonder code per sport.
// Puur: geen React, geen IndexedDB.

import type { SportDefinition, TraitLevel } from '../data/sports';
import type { LoadLevel, SessionStressProfile } from '../models/prescription';

export type SportIntensity = 'low' | 'moderate' | 'high';

const LEVEL: Record<TraitLevel, LoadLevel> = { 0: 'none', 1: 'light', 2: 'moderate', 3: 'heavy' };
const CARDIO: Record<SportIntensity, LoadLevel> = { low: 'light', moderate: 'moderate', high: 'heavy' };

// De omrekening (afgeleid): de hoogste van impact, remmen en stop en start bepaalt hoe zwaar de benen
// werken; impact, remmen en bovenlichaam volgen hun eigen kenmerk; de zwaarte is wat je koos of wat
// gebruikelijk is, en het hart volgt de zwaarte. Een eigen profiel van de sport gaat voor.
export function stressProfileOf(sport: Pick<SportDefinition, 'traits' | 'typicalIntensity' | 'stressOverride'>, intensity: SportIntensity = sport.typicalIntensity): SessionStressProfile {
  const t = sport.traits;
  const legs = Math.max(t.impact, t.eccentric, t.stopStart) as TraitLevel;
  const base: SessionStressProfile = {
    lowerBodyLoad: LEVEL[legs],
    impact: LEVEL[t.impact],
    eccentricLoad: LEVEL[t.eccentric],
    intensity,
    upperBodyLoad: LEVEL[t.upperBody],
    cardioLoad: CARDIO[intensity],
  };
  return { ...base, ...(sport.stressOverride ?? {}), intensity };
}

// Hoeveel uur je benen na deze belasting vrij blijven van een volgende zware beendag (afgeleid,
// docs/visie/Sporten die meetellen.md, 3.2 en vraag 1). 72 uur na veel afdalen op een tocht (de
// bestaande regel na een bergtocht, engine/scheduler.ts#legSpacingDays) en na een zware wedstrijd met
// zware impact en zwaar remmen; 48 uur na elke andere zware beendag; anders niets.
export function legRestHours(profile: Pick<SessionStressProfile, 'lowerBodyLoad' | 'impact' | 'eccentricLoad' | 'intensity'>, opts: { hike?: boolean } = {}): 0 | 48 | 72 {
  if (profile.lowerBodyLoad !== 'heavy') return 0;
  if (opts.hike && profile.eccentricLoad !== 'none') return 72;
  if (profile.impact === 'heavy' && profile.eccentricLoad === 'heavy' && profile.intensity === 'high') return 72;
  return 48;
}
