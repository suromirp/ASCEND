// ASCEND: wat de terugknop van Android doet (docs/beslissingen/2026-11-01-android-app.md).
//
// In de browser doet de browser het zelf: een stap terug in de geschiedenis, en een open laag
// (blad, dialoog, overlay) is zelf zo'n stap (utils/backLayers.ts). De app krijgt de knop van
// Capacitor en volgt dezelfde weg: een open laag of een andere pagina gaat terug in de
// geschiedenis. Alleen op Vandaag zonder laag sluit hij de app niet meteen, maar pas bij een
// tweede druk binnen twee seconden. Puur: geen React, geen browser.

export const EXIT_WINDOW_MS = 2000;

export type BackPress = 'back' | 'home' | 'warn' | 'exit';

export function backPressDecision(p: {
  // Er ligt een blad of overlay open (een eigen stap in de geschiedenis).
  layerOpen: boolean;
  // Je bent op Vandaag.
  atHome: boolean;
  // Er is een stap terug in de geschiedenis.
  canGoBack: boolean;
  // Wanneer de vorige druk op Vandaag een melding gaf.
  lastPressAt: number | undefined;
  now: number;
}): BackPress {
  if (p.layerOpen) return 'back';
  if (!p.atHome) return p.canGoBack ? 'back' : 'home';
  return p.lastPressAt !== undefined && p.now - p.lastPressAt <= EXIT_WINDOW_MS ? 'exit' : 'warn';
}
