import { AscendAnimatedLogo } from './AscendAnimatedLogo';

// Het logo op het openingsscherm (BootScreen): het teken met het woord eronder,
// dat zich opbouwt zoals beschreven bij AscendAnimatedLogo en daarna een
// rustige omgevingsbeweging heeft (gloed, ademende ring, lichtpuntje langs het
// pad), zolang het openingsscherm in beeld is. Alle kleuren en de stappen van de beweging staan daar.
export function AscendSplashLogo({ size = 200 }: { size?: number }) {
  return <AscendAnimatedLogo size={size} withWord ambient />;
}
