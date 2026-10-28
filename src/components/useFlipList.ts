import { useLayoutEffect } from 'react';
import { flipStyle } from './flip';
import { useMotionMode } from './motion';
import { playFlip } from '../utils/flipDom';

// Laat de rijen van Week naar hun nieuwe plek schuiven nadat een handeling de planning veranderde
// (utils/flipDom.ts). Doet bij een gewone render niets: alleen na `armFlip()` en binnen een seconde.
// Normaal schuift, Rustig laat de verplaatste rij kort verschijnen, Uit doet niets.
export function useFlipList(): void {
  const mode = useMotionMode();
  // Zonder lijst van afhankelijkheden: elke render kan de eerste na de nieuwe gegevens zijn.
  useLayoutEffect(() => {
    playFlip(flipStyle(mode));
  });
}
