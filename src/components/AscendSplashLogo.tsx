import { AscendAnimatedLogo } from './AscendAnimatedLogo';

// Het logo op het openingsscherm (BootScreen): het teken met het woord eronder,
// dat zich opbouwt zoals beschreven bij AscendAnimatedLogo en daarna stil
// blijft staan. Alle kleuren en de stappen van de beweging staan daar.
export function AscendSplashLogo({ size = 200 }: { size?: number }) {
  return <AscendAnimatedLogo size={size} withWord />;
}
