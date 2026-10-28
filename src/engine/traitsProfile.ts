// ASCEND: van sportkenmerken (data/sports.ts, 0 tot 3) naar het stressprofiel dat de
// planning al leest. Nog NIET aangesloten op de planning; klaar voor ronde 4, als er
// sporten bijkomen die geen eigen sjabloonprofiel hebben.
//
// De omzetting is afgeleid (docs/onderzoek, wetenschap deel 2) en niet getoetst:
// - impact en excentrisch werk gaan één op één over;
// - de benen worden zwaarder belast door het zwaarste van impact, excentrisch werk en
//   stop-en-start, en nooit lager dan licht (ook fietsen en zwemmen gebruiken de benen);
// - bovenlichaam gaat één op één over;
// - de hartbelasting volgt de intensiteit.

import type { LoadLevel, SessionStressProfile } from '../models/prescription';
import type { SportTraits, TraitLevel } from '../data/sports';

const LEVELS: LoadLevel[] = ['none', 'light', 'moderate', 'heavy'];

function traitToLoad(level: TraitLevel): LoadLevel {
  return LEVELS[level];
}

export function traitsToStressProfile(
  traits: SportTraits,
  intensity: SessionStressProfile['intensity'],
): SessionStressProfile {
  const legs = Math.max(traits.impact, traits.eccentric, traits.stopStart, 1) as TraitLevel;
  return {
    lowerBodyLoad: traitToLoad(legs),
    impact: traitToLoad(traits.impact),
    eccentricLoad: traitToLoad(traits.eccentric),
    intensity,
    upperBodyLoad: traitToLoad(traits.upperBody),
    cardioLoad: intensity === 'high' ? 'heavy' : intensity === 'moderate' ? 'moderate' : 'light',
  };
}
